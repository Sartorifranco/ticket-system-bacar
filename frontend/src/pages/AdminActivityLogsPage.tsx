// frontend/src/pages/AdminActivityLogsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ActivityLog, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import Layout from '../components/Layout/Layout';

const AdminActivityLogsPage: React.FC = () => {
    console.log('--- RENDERIZANDO: AdminActivityLogsPage ---');

    const { user, token } = useAuth();
    const { addNotification } = useNotification();

    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const logsPerPage = 10; // Coincide con el límite por defecto del backend

    const fetchActivityLogs = useCallback(async (page: number) => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const offset = (page - 1) * logsPerPage;
            console.log(`[AdminActivityLogsPage] Fetching logs with limit=${logsPerPage}, offset=${offset}`);
            
            const response = await api.get<{ success: boolean; data: ActivityLog[]; count: number; total: number }>(
                `/api/activity-logs?limit=${logsPerPage}&offset=${offset}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            
            console.log("[AdminActivityLogsPage] Datos de actividad recientes recibidos:", response.data.data);
            setActivityLogs(Array.isArray(response.data.data) ? response.data.data : []);
            setTotalPages(Math.ceil(response.data.total / logsPerPage));
            setCurrentPage(page);

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
            setActivityLogs([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, logsPerPage]);

    useEffect(() => {
        if (user && token && user.role === 'admin') {
            fetchActivityLogs(currentPage);
        }
    }, [user, token, fetchActivityLogs, currentPage]);

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    if (!user || user.role !== 'admin') {
        return <Layout><div className="text-center p-4 text-red-500">Acceso denegado. Solo administradores pueden ver esta página.</div></Layout>;
    }

    if (loading) {
        return <Layout><div className="flex justify-center items-center h-full"><span className="text-lg">Cargando logs de actividad...</span></div></Layout>;
    }

    if (error) {
        return <Layout><div className="text-red-500 text-center p-4">Error: {error}</div></Layout>;
    }

    return (
        <Layout>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Registro de Actividad</h1>

                <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                    {activityLogs.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">No hay logs de actividad disponibles.</p>
                    ) : (
                        <>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo Objetivo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Objetivo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {activityLogs.map(log => (
                                        <tr key={log.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{log.username || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{log.user_role || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{log.action.replace(/_/g, ' ')}</td>
                                            <td className="px-6 py-4 text-sm text-gray-800 max-w-xs overflow-hidden text-ellipsis">{log.details || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{log.target_type || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{log.target_id || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(log.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Controles de Paginación */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center mt-6 space-x-2">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-gray-700">Página {currentPage} de {totalPages}</span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default AdminActivityLogsPage;
