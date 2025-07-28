// frontend/src/components/System/ActivityLogDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ActivityLog, User, Department } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { format } from 'date-fns';
import { translateTerm } from '../../utils/traslations';

const ActivityLogs: React.FC = () => {
    const { token, signOut } = useAuth();
    const { addNotification } = useNotification();

    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);

    const fetchActivityLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            const response = await api.get('/api/activity-logs', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setActivityLogs(response.data.logs || []);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar el registro de actividad.');
                addNotification(`Error al cargar actividad: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar el registro de actividad.');
            }
            console.error('Error fetching activity logs:', err);
            setActivityLogs([]);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut]);

    const fetchUsersAndDepartments = useCallback(async () => {
        try {
            if (!token) return;
            const [usersRes, departmentsRes] = await Promise.all([
                api.get('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setAllUsers(usersRes.data.users || []);
            setAllDepartments(departmentsRes.data.departments || []);
        } catch (err: unknown) {
            console.error('Error fetching users or departments for activity logs:', err);
            if (isAxiosErrorTypeGuard(err) && err.response?.status === 401) {
                signOut();
            }
        }
    }, [token, signOut]);

    useEffect(() => {
        fetchUsersAndDepartments();
        fetchActivityLogs();
    }, [fetchActivityLogs, fetchUsersAndDepartments]);

    // Función auxiliar para renderizar valores de log de manera inteligente
    const renderLogValue = useCallback((value: any, log: ActivityLog) => {
        const users = allUsers;
        const departments = allDepartments;

        if (typeof value === 'string') {
            if (log.action_type?.includes('status_changed')) {
                return <span className={`status-badge status-${value}`}>{translateTerm(value, 'status')}</span>;
            }
            if (log.action_type?.includes('priority_changed')) {
                return <span className={`priority-badge priority-${value}`}>{translateTerm(value, 'priority')}</span>;
            }
            if (log.target_type === 'user' && log.action_type?.includes('role_updated')) {
                return <span className={`role-badge role-${value}`}>{translateTerm(value, 'role')}</span>;
            }
            return String(value);
        }

        if (typeof value === 'number') {
            if (log.action_type?.includes('agent_assigned') || log.action_type?.includes('agent_changed')) {
                const agent = users.find(u => u.id === value);
                return agent ? <span className="font-semibold text-blue-600 dark:text-blue-400">{agent.username}</span> : `ID Agente: ${value}`;
            }
            if (log.action_type?.includes('department_changed')) {
                const dept = departments.find(d => d.id === value);
                return dept ? <span className="font-semibold text-purple-600 dark:text-purple-400">{dept.name}</span> : `ID Depto: ${value}`;
            }
            return String(value);
        }

        if (typeof value === 'object' && value !== null) {
            return (
                <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded-md overflow-x-auto">
                    {JSON.stringify(value, null, 2)}
                </pre>
            );
        }

        return String(value);
    }, [allUsers, allDepartments]);

    if (loading) {
        return (
            <div className="loading-message text-center py-4">🔄 Cargando registro de actividad...</div>
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
        <div className="activity-log-dashboard p-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Registro de Actividad del Sistema</h2>
            <p className="text-gray-700 mb-6 text-center">Visualiza todas las acciones realizadas en el sistema.</p>

            {activityLogs.length > 0 ? (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Acción</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Objetivo</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Objetivo</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Anterior</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Nuevo</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {activityLogs.map((log) => (
                                <tr key={log.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.user_username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{translateTerm(log.user_role, 'role')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{translateTerm(log.action_type, 'actionType')}</td> {/* CORREGIDO: Usar 'actionType' */}
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis">{log.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{translateTerm(log.target_type, 'targetType')}</td> {/* CORREGIDO: Usar 'targetType' */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.target_id}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis">
                                        {renderLogValue(log.old_value, log)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden text-ellipsis">
                                        {renderLogValue(log.new_value, log)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="info-text text-center">No hay registros de actividad disponibles.</p>
            )}
        </div>
    );
};

export default ActivityLogs;
