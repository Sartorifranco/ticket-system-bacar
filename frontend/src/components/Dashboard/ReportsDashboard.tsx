// src/components/Dashboard/ReportsDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
// CORREGIDO: Importar TicketData en lugar de Ticket
import { ReportMetrics, TicketData, ActivityLog, ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

// Registrar los componentes necesarios de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const ReportsDashboard: React.FC = () => {
    const { token } = useAuth();
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [totalTickets, setTotalTickets] = useState(0);
    const [openTickets, setOpenTickets] = useState(0);
    const [inProgressTickets, setInProgressTickets] = useState(0);
    const [closedTickets, setClosedTickets] = useState(0);
    const [reopenedTickets, setReopenedTickets] = useState(0);
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalDepartments, setTotalDepartments] = useState(0);
    // Asegúrate de que estos estados coincidan con la estructura de ReportMetrics
    const [ticketsByDepartment, setTicketsByDepartment] = useState<{ departmentName: string; count: number }[]>([]);
    const [ticketsByStatus, setTicketsByStatus] = useState<{ status: string; count: number }[]>([]);
    const [ticketsByPriority, setTicketsByPriority] = useState<{ priority: string; count: number }[]>([]);
    const [recentActivityLogs, setRecentActivityLogs] = useState<ActivityLog[]>([]);

    const fetchReportData = useCallback(async () => {
        if (!token) {
            setLoading(false);
            setError('No autorizado para cargar reportes.');
            addNotification('No autorizado para cargar reportes.', 'error');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [
                metricsResponse,
                ticketsByDeptResponse,
                ticketsByStatusResponse,
                ticketsByPriorityResponse,
                activityLogsResponse
            ] = await Promise.all([
                api.get<ReportMetrics>('/api/dashboard/metrics', { headers: { Authorization: `Bearer ${token}` } }),
                // El backend debería devolver un array de objetos con { department_name: string; count: number }
                api.get<{ department_name: string; count: number }[]>('/api/reports/tickets-by-department', { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ status: string; count: number }[]>('/api/reports/tickets-by-status', { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ priority: string; count: number }[]>('/api/reports/tickets-by-priority', { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ logs: ActivityLog[] }>('/api/activity-logs?limit=10', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setTotalTickets(metricsResponse.data.totalTickets);
            setOpenTickets(metricsResponse.data.openTickets);
            setInProgressTickets(metricsResponse.data.inProgressTickets);
            setClosedTickets(metricsResponse.data.closedTickets);
            setReopenedTickets(metricsResponse.data.reopenedTickets);
            setTotalUsers(metricsResponse.data.totalUsers);
            setTotalDepartments(metricsResponse.data.totalDepartments);

            // CORREGIDO: Mapear a { departmentName: string; count: number } si el backend devuelve department_name
            const transformedTicketsByDepartment = (ticketsByDeptResponse.data || []).map(item => ({
                departmentName: item.department_name, // Usar department_name del backend
                count: item.count
            }));
            setTicketsByDepartment(transformedTicketsByDepartment);

            setTicketsByStatus(ticketsByStatusResponse.data || []);
            setTicketsByPriority(ticketsByPriorityResponse.data || []);
            setRecentActivityLogs(activityLogsResponse.data.logs || []);

        } catch (err: unknown) {
            console.error('Error fetching report data:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar los datos del reporte.');
                addNotification(`Error al cargar reportes: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar los datos del reporte.');
                addNotification('Ocurrió un error inesperado al cargar los datos del reporte.', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    const departmentChartData = {
        // CORREGIDO: Usar departmentName para las etiquetas del gráfico
        labels: ticketsByDepartment.map(d => d.departmentName),
        datasets: [
            {
                label: 'Tickets por Departamento',
                data: ticketsByDepartment.map(d => d.count),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
        ],
    };

    const statusChartData = {
        labels: ticketsByStatus.map(s => s.status),
        datasets: [
            {
                label: 'Tickets por Estado',
                data: ticketsByStatus.map(s => s.count),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)', // open
                    'rgba(54, 162, 235, 0.6)', // in-progress
                    'rgba(255, 206, 86, 0.6)', // resolved
                    'rgba(75, 192, 192, 0.6)', // closed
                    'rgba(153, 102, 255, 0.6)', // reopened
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const priorityChartData = {
        labels: ticketsByPriority.map(p => p.priority),
        datasets: [
            {
                label: 'Tickets por Prioridad',
                data: ticketsByPriority.map(p => p.count),
                backgroundColor: [
                    'rgba(255, 159, 64, 0.6)', // low
                    'rgba(255, 99, 132, 0.6)', // medium
                    'rgba(54, 162, 235, 0.6)', // high
                    'rgba(153, 102, 255, 0.6)', // urgent
                ],
                borderColor: [
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(153, 102, 255, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><span className="text-lg">Cargando reportes...</span></div>;
    }

    if (error) {
        return <div className="text-red-500 text-center p-4">Error: {error}</div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-300 pb-2">Reportes y Estadísticas</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                    <div><p className="text-gray-500 text-sm font-medium">Tickets Totales</p><p className="text-3xl font-bold text-gray-900">{totalTickets}</p></div>
                    <div className="text-blue-500"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                    <div><p className="text-gray-500 text-sm font-medium">Tickets Abiertos</p><p className="text-3xl font-bold text-gray-900">{openTickets}</p></div>
                    <div className="text-green-500"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                    <div><p className="text-gray-500 text-sm font-medium">Tickets En Progreso</p><p className="text-3xl font-bold text-gray-900">{inProgressTickets}</p></div>
                    <div className="text-yellow-500"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                    <div><p className="text-gray-500 text-sm font-medium">Tickets Cerrados</p><p className="text-3xl font-bold text-gray-900">{closedTickets}</p></div>
                    <div className="text-red-500"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                    <div><p className="text-gray-500 text-sm font-medium">Tickets Reabiertos</p><p className="text-3xl font-bold text-gray-900">{reopenedTickets}</p></div>
                    <div className="text-purple-500"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 0020 13a8 8 0 00-15.356-2m0 0v5h.581m15.356-5H21"></path></svg></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                    <div><p className="text-gray-500 text-sm font-medium">Total Usuarios</p><p className="text-3xl font-bold text-gray-900">{totalUsers}</p></div>
                    <div className="text-indigo-500"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M17 20v-2c0-.653-.127-1.285-.356-1.857M2 20v-2A3 3 0 017.356 16.143M12 10a6 6 0 110-12 6 6 0 010 12zm0 0a6 6 0 00-6-6h-2a2 2 0 00-2 2v4a2 2 0 002 2h2a6 6 0 006-6z"></path></svg></div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                    <div><p className="text-gray-500 text-sm font-medium">Total Departamentos</p><p className="text-3xl font-bold text-gray-900">{totalDepartments}</p></div>
                    <div className="text-teal-500"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m8-10h1m-1 4h1m-1 4h1m0 0h-9"></path></svg></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Tickets por Departamento</h2>
                    {ticketsByDepartment.length > 0 ? (
                        <Bar data={departmentChartData} />
                    ) : (
                        <p className="text-gray-600">No hay datos de tickets por departamento.</p>
                    )}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Tickets por Estado</h2>
                    {ticketsByStatus.length > 0 ? (
                        <Pie data={statusChartData} />
                    ) : (
                        <p className="text-gray-600">No hay datos de tickets por estado.</p>
                    )}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Tickets por Prioridad</h2>
                    {ticketsByPriority.length > 0 ? (
                        <Pie data={priorityChartData} />
                    ) : (
                        <p className="text-gray-600">No hay datos de tickets por prioridad.</p>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Actividad Reciente</h2>
                {recentActivityLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {recentActivityLogs.map((log) => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.user_username}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.user_role}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-600">No hay logs de actividad recientes.</p>
                )}
            </div>
        </div>
    );
};

export default ReportsDashboard;