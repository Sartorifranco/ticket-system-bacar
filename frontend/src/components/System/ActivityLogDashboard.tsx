// src/components/System/ActivityLogDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ActivityLog, ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';

const ActivityLogs: React.FC = () => {
    const { token, logout } = useAuth(); // CAMBIADO: signOut a logout
    const { addNotification } = useNotification();

    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState({
        user_username: '',
        action_type: 'all',
        target_type: 'all',
        start_date: '',
        end_date: ''
    });

    const fetchActivityLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const response = await api.get(`/api/activity-logs?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setActivityLogs(response.data.logs);
        } catch (err: unknown) {
            console.error('Error fetching activity logs:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar los logs de actividad.');
                addNotification(`Error al cargar logs: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar los logs de actividad.');
                addNotification('Ocurrió un error inesperado al cargar los logs de actividad.', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [token, filters, addNotification]);

    useEffect(() => {
        fetchActivityLogs();
    }, [fetchActivityLogs]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: value
        }));
    };

    const handleApplyFilters = () => {
        fetchActivityLogs();
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><span className="text-lg">Cargando logs de actividad...</span></div>;
    }

    if (error) {
        return <div className="text-red-500 text-center p-4">Error: {error}</div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-300 pb-2">Registro de Actividad</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="user_username" className="block text-gray-700 text-sm font-bold mb-2">Usuario:</label>
                    <input
                        type="text"
                        id="user_username"
                        name="user_username"
                        value={filters.user_username}
                        onChange={handleFilterChange}
                        placeholder="Nombre de usuario"
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>
                <div>
                    <label htmlFor="action_type" className="block text-gray-700 text-sm font-bold mb-2">Tipo de Acción:</label>
                    <select
                        id="action_type"
                        name="action_type"
                        value={filters.action_type}
                        onChange={handleFilterChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    >
                        <option value="all">Todos</option>
                        <option value="user_created">Usuario Creado</option>
                        <option value="user_updated">Usuario Actualizado</option>
                        <option value="user_deleted">Usuario Eliminado</option>
                        <option value="password_changed">Contraseña Cambiada</option>
                        <option value="ticket_created">Ticket Creado</option>
                        <option value="ticket_updated">Ticket Actualizado</option>
                        <option value="ticket_deleted">Ticket Eliminado</option>
                        <option value="ticket_assigned">Ticket Asignado</option>
                        <option value="ticket_status_changed">Estado Ticket Cambiado</option>
                        <option value="ticket_priority_changed">Prioridad Ticket Cambiada</option>
                        <option value="ticket_department_changed">Departamento Ticket Cambiado</option>
                        <option value="department_created">Departamento Creado</option>
                        <option value="department_updated">Departamento Actualizado</option>
                        <option value="department_deleted">Departamento Eliminado</option>
                        <option value="comment_added">Comentario Añadido</option>
                        <option value="notification_read">Notificación Leída</option>
                        <option value="notification_read_all">Notificaciones Leídas (Todas)</option>
                        <option value="notification_deleted">Notificación Eliminada</option>
                        <option value="notification_deleted_all">Notificaciones Eliminadas (Todas)</option>
                        {/* Añadir más tipos de acción según sea necesario */}
                    </select>
                </div>
                <div>
                    <label htmlFor="target_type" className="block text-gray-700 text-sm font-bold mb-2">Tipo de Entidad:</label>
                    <select
                        id="target_type"
                        name="target_type"
                        value={filters.target_type}
                        onChange={handleFilterChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    >
                        <option value="all">Todos</option>
                        <option value="user">Usuario</option>
                        <option value="ticket">Ticket</option>
                        <option value="department">Departamento</option>
                        <option value="notification">Notificación</option>
                        <option value="system">Sistema</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="start_date" className="block text-gray-700 text-sm font-bold mb-2">Fecha Inicio:</label>
                    <input
                        type="date"
                        id="start_date"
                        name="start_date"
                        value={filters.start_date}
                        onChange={handleFilterChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>
                <div>
                    <label htmlFor="end_date" className="block text-gray-700 text-sm font-bold mb-2">Fecha Fin:</label>
                    <input
                        type="date"
                        id="end_date"
                        name="end_date"
                        value={filters.end_date}
                        onChange={handleFilterChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleApplyFilters}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                    >
                        Aplicar Filtros
                    </button>
                </div>
            </div>

            {activityLogs.length === 0 ? (
                <p className="text-gray-600">No hay logs de actividad que coincidan con los filtros.</p>
            ) : (
                <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Tipo de Acción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Entidad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID Entidad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Valor Anterior</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Nuevo Valor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Fecha/Hora</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {activityLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.user_username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.user_role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.action_type}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs overflow-hidden text-ellipsis">{log.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.target_type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.target_id || 'N/A'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs overflow-hidden text-ellipsis">{log.old_value ? JSON.stringify(log.old_value) : 'N/A'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs overflow-hidden text-ellipsis">{log.new_value ? JSON.stringify(log.new_value) : 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(log.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ActivityLogs;
