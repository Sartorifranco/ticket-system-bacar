// frontend/src/pages/AdminReportsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ReportMetrics, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import Layout from '../components/Layout/Layout';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../utils/traslations';

const AdminReportsPage: React.FC = () => {
    const { user, token } = useAuth();
    const { addNotification } = useNotification();

    const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReports = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const response = await api.get<ReportMetrics>('/api/dashboard/metrics', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMetrics(response.data);
        } catch (err: unknown) {
            console.error('Error fetching reports:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar los reportes.');
                addNotification(`Error al cargar reportes: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar los reportes.');
                addNotification('Ocurrió un error inesperado al cargar los reportes.', 'error');
            }
            setMetrics(null);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        if (user && token && user.role === 'admin') {
            fetchReports();
        }
    }, [user, token, fetchReports]);

    if (!user || user.role !== 'admin') {
        return <Layout><div className="text-center p-4 text-red-500">Acceso denegado. Solo administradores pueden ver esta página.</div></Layout>;
    }

    if (loading) {
        return <Layout><div className="flex justify-center items-center h-full"><span className="text-lg">Cargando reportes...</span></div></Layout>;
    }

    if (error) {
        return <Layout><div className="text-red-500 text-center p-4">Error: {error}</div></Layout>;
    }

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

    return (
        <Layout>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Reportes y Métricas</h1>

                {metrics ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <p className="text-gray-500 text-sm font-medium">Tickets Totales</p>
                                <p className="text-3xl font-bold text-gray-900">{metrics.totalTickets}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <p className="text-gray-500 text-sm font-medium">Tickets Abiertos</p>
                                <p className="text-3xl font-bold text-gray-900">{metrics.openTickets}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <p className="text-gray-500 text-sm font-medium">Tickets En Progreso</p>
                                <p className="text-3xl font-bold text-gray-900">{metrics.inProgressTickets}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <p className="text-gray-500 text-sm font-medium">Tickets Cerrados</p>
                                <p className="text-3xl font-bold text-gray-900">{metrics.closedTickets}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <p className="text-gray-500 text-sm font-medium">Tickets Reabiertos</p>
                                <p className="text-3xl font-bold text-gray-900">{metrics.reopenedTickets}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <p className="text-gray-500 text-sm font-medium">Total Usuarios</p>
                                <p className="text-3xl font-bold text-gray-900">{metrics.totalUsers}</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <p className="text-gray-500 text-sm font-medium">Total Departamentos</p>
                                <p className="text-3xl font-bold text-gray-900">{metrics.totalDepartments}</p>
                            </div>
                        </div>

                        {/* Gráficos */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Tickets por Estado</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={metrics.ticketsByStatus.map(item => ({
                                        name: ticketStatusTranslations[item.status as keyof typeof ticketStatusTranslations] || item.status,
                                        count: item.count
                                    }))}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="count" fill="#8884d8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-md">
                                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Tickets por Prioridad</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={metrics.ticketsByPriority.map(item => ({
                                        name: ticketPriorityTranslations[item.priority as keyof typeof ticketPriorityTranslations] || item.priority,
                                        count: item.count
                                    }))}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="count" fill="#82ca9d" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Tickets por Departamento</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={metrics.ticketsByDepartment}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="departmentName" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="count" fill="#ffc658" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                ) : (
                    <p className="text-gray-600">No hay datos de reportes disponibles.</p>
                )}
            </div>
        </Layout>
    );
};

export default AdminReportsPage;
