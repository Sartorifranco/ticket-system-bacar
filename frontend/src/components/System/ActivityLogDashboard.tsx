// frontend/src/components/System/ActivityLogDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { ActivityLog, User, Department } from '../../types'; 
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { translateTerm, ticketStatusTranslations, ticketPriorityTranslations, userRoleTranslations, targetTypeTranslations } from '../../utils/traslations';

const ActivityLogDashboard: React.FC = () => {
    const { token, addNotification, signOut } = useAuth();
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [users, setUsers] = useState<User[]>([]); 
    const [departments, setDepartments] = useState<Department[]>([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchActivityLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            const [logsResponse, usersResponse, departmentsResponse] = await Promise.all([
                api.get('/api/activity-logs', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setActivityLogs(logsResponse.data.logs || []);
            setUsers(usersResponse.data || []); 
            setDepartments(departmentsResponse.data.departments || []);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar el registro de actividad.');
                addNotification(`Error al cargar registro de actividad: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar el registro de actividad.');
            }
            console.error('Error fetching activity logs:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut]);

    useEffect(() => {
        fetchActivityLogs();
    }, [fetchActivityLogs]);

    // Helper para renderizar valores de old_value/new_value
    const renderLogValue = useCallback((value: any, log: ActivityLog) => {
        if (typeof value === 'string') {
            if (log.activity_type?.includes('status_changed')) { // Usar ?. para propiedades opcionales
                return <span className={`status-badge status-${value}`}>{translateTerm(value, 'status')}</span>;
            }
            if (log.activity_type?.includes('priority_changed')) { // Usar ?. para propiedades opcionales
                return <span className={`priority-badge priority-${value}`}>{translateTerm(value, 'priority')}</span>;
            }
            if (log.target_type === 'user' && log.activity_type?.includes('role_updated')) { // Usar ?. para propiedades opcionales
                return <span className={`role-badge role-${value}`}>{translateTerm(value, 'role')}</span>;
            }
            return String(value);
        }

        if (typeof value === 'number') {
            if (log.activity_type?.includes('agent_assigned') || log.activity_type?.includes('agent_changed')) { // Usar ?.
                const agent = users.find(u => u.id === value);
                return agent ? <span className="font-semibold text-blue-600 dark:text-blue-400">{agent.username}</span> : `ID Agente: ${value}`;
            }
            if (log.activity_type?.includes('department_changed')) { // Usar ?.
                const dept = departments.find(d => d.id === value);
                return dept ? <span className="font-semibold text-purple-600 dark:text-purple-400">{dept.name}</span> : `ID Depto: ${value}`;
            }
            return String(value);
        }

        if (typeof value === 'object' && value !== null) {
            try {
                // Si el backend envía JSON string, parsearlo
                // Nota: Si el backend ya lo envía parseado, esto no será necesario.
                // Asumo que 'value' podría ser un JSON string si viene de la DB directamente.
                const parsedValue = JSON.parse(value);
                return (
                    <pre className="bg-gray-100 dark:bg-gray-700 p-2 rounded-md text-xs overflow-x-auto">
                        {JSON.stringify(parsedValue, null, 2)}
                    </pre>
                );
            } catch (e) {
                return String(value); 
            }
        }

        return String(value);
    }, [users, departments]);

    if (loading) {
        return (
            <div className="loading-message">🔄 Cargando registro de actividad...</div>
        );
    }

    if (error) {
        return (
            <div className="error-message text-center p-4">
                <p>{error}</p>
                <button onClick={fetchActivityLogs} className="button primary-button mt-2">Reintentar</button>
            </div>
        );
    }

    return (
        <div className="activity-log-dashboard">
            <h2 className="text-2xl font-bold text-primary-color mb-4 text-center">Registro de Actividad</h2>
            <p className="info-text text-center mb-6">Visualiza todas las acciones realizadas en el sistema.</p>

            {activityLogs.length > 0 ? (
                <div className="space-y-4">
                    {activityLogs.map((log) => (
                        <div key={log.id} className="bg-secondary-background p-4 rounded-lg shadow-sm">
                            <p className="text-text-light dark:text-text-dark mb-1">
                                <span className="font-semibold">{log.user_username || 'Sistema'}</span>{' '}
                                <span className="text-sm text-gray-500 ml-2">
                                    {new Date(log.created_at).toLocaleString()}
                                </span>
                            </p>
                            <p className="activity-log-description">{log.description}</p>
                            {log.target_type && (
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    <span className="font-semibold">Entidad Afectada:</span> {translateTerm(log.target_type, 'targetType') || log.target_type} {log.target_id ? `(#${log.target_id})` : ''}
                                </p>
                            )}
                            {(log.old_value !== null && log.old_value !== undefined) && (
                                <div className="flex items-start mt-2">
                                    <span className="activity-log-value-label">De:</span>
                                    {renderLogValue(log.old_value, log)}
                                </div>
                            )}
                            {(log.new_value !== null && log.new_value !== undefined) && (
                                <div className="flex items-start mt-1">
                                    <span className="activity-log-value-label">A:</span>
                                    {renderLogValue(log.new_value, log)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="info-text">No hay registros de actividad disponibles.</p>
            )}
        </div>
    );
};

export default ActivityLogDashboard;
