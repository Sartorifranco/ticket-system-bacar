// frontend/src/components/Dashboard/ReportsDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    LineChart, Line
} from 'recharts';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ReportMetrics, TicketStatus, TicketPriority } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { ticketStatusTranslations, ticketPriorityTranslations, translateTerm } from '../../utils/traslations';

// Componente de Tooltip personalizado para Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        let translatedName = payload[0].name;
        // Intentar traducir como estado de ticket
        if (ticketStatusTranslations[payload[0].name as TicketStatus]) {
            translatedName = ticketStatusTranslations[payload[0].name as TicketStatus];
        } 
        // Si no es un estado, intentar traducir como prioridad de ticket
        else if (ticketPriorityTranslations[payload[0].name as TicketPriority]) {
            translatedName = ticketPriorityTranslations[payload[0].name as TicketPriority];
        }

        return (
            <div className="custom-tooltip bg-white p-3 border border-gray-300 rounded-lg shadow-md">
                <p className="label text-gray-800 font-semibold">{`${translatedName}`}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={`item-${index}`} style={{ color: entry.color }} className="text-gray-700">
                        {`${entry.name === 'avgResolutionTimeHours' ? 'Tiempo Resolución (Horas)' : entry.name === 'resolvedTickets' ? 'Tickets Resueltos' : entry.name === 'totalTickets' ? 'Total Tickets' : translatedName}: ${entry.value}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};


const Reports: React.FC = () => {
    const { token, signOut } = useAuth();
    const { addNotification } = useNotification();

    const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchReportMetrics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            const response = await api.get('/api/dashboard/metrics', { // Reutilizamos el endpoint de métricas
                headers: { Authorization: `Bearer ${token}` },
            });
            setMetrics(response.data);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar los informes.');
                addNotification(`Error al cargar informes: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar los informes.');
            }
            console.error('Error fetching report metrics:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut]);

    useEffect(() => {
        fetchReportMetrics();
    }, [fetchReportMetrics]);

    // Datos para los gráficos, memoizados para optimizar el rendimiento
    const ticketsByStatusData = React.useMemo(() => {
        return metrics?.ticketsByStatus?.map(item => ({
            name: translateTerm(item.name, 'status'),
            value: item.value
        })) || [];
    }, [metrics]);

    const ticketsByPriorityData = React.useMemo(() => {
        return metrics?.ticketsByPriority?.map(item => ({
            name: translateTerm(item.name, 'priority'),
            value: item.value
        })) || [];
    }, [metrics]);

    const ticketsCreatedOverTimeData = React.useMemo(() => {
        return metrics?.ticketsCreatedOverTime || [];
    }, [metrics]);

    const ticketsByStatusOverTimeData = React.useMemo(() => {
        return metrics?.ticketsByStatusOverTime || [];
    }, [metrics]);

    const ticketsByPriorityOverTimeData = React.useMemo(() => {
        return metrics?.ticketsByPriorityOverTime || [];
    }, [metrics]);

    const agentPerformanceData = React.useMemo(() => {
        return metrics?.agentPerformance?.map(agent => ({
            agentName: agent.agentName,
            resolvedTickets: agent.resolvedTickets,
            avgResolutionTimeHours: agent.avgResolutionTimeHours
        })) || [];
    }, [metrics]);

    const departmentPerformanceData = React.useMemo(() => {
        return metrics?.departmentPerformance?.map(dept => ({
            departmentName: dept.departmentName,
            totalTickets: dept.totalTickets,
            avgResolutionTimeHours: dept.avgResolutionTimeHours
        })) || [];
    }, [metrics]);


    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B'];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100 text-gray-700">
                <p className="text-lg">Cargando informes...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8 text-red-500 bg-white rounded-lg shadow-lg m-4">
                <h2 className="text-2xl font-bold mb-4">Error al cargar los Informes</h2>
                <p>{error}</p>
                <button onClick={fetchReportMetrics} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4">Recargar</button>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="text-center p-8 text-gray-700 bg-white rounded-lg shadow-lg m-4">
                <p className="text-lg">No hay datos de informes disponibles.</p>
            </div>
        );
    }

    return (
        <div className="reports-dashboard p-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Informes y Estadísticas del Sistema</h2>
            <p className="text-gray-700 mb-8 text-center">Visualiza métricas clave y tendencias de tickets, usuarios y departamentos.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tickets por Estado (Pie Chart) */}
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Tickets por Estado</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={ticketsByStatusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                            >
                                {ticketsByStatusData.map((entry, index) => (
                                    <Cell key={`status-pie-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend layout="vertical" align="right" verticalAlign="middle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Tickets por Prioridad (Pie Chart) */}
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Tickets por Prioridad</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={ticketsByPriorityData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                fill="#82ca9d"
                                dataKey="value"
                                nameKey="name"
                                label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                            >
                                {ticketsByPriorityData.map((entry, index) => (
                                    <Cell key={`priority-pie-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend layout="vertical" align="right" verticalAlign="middle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Tickets Creados a lo largo del tiempo (Line Chart) */}
                <div className="col-span-1 lg:col-span-2 bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Tickets Creados (Tendencia)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={ticketsCreatedOverTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="#8884d8" name="Tickets Creados" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Tickets por Estado a lo largo del tiempo (Line Chart) */}
                <div className="col-span-1 lg:col-span-2 bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Tickets por Estado (Tendencia)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={ticketsByStatusOverTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="open" stroke="#8884d8" name="Abiertos" />
                            <Line type="monotone" dataKey="inProgress" stroke="#82ca9d" name="En Progreso" />
                            <Line type="monotone" dataKey="closed" stroke="#ffc658" name="Cerrados" />
                            <Line type="monotone" dataKey="reopened" stroke="#ff7300" name="Reabiertos" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Tickets por Prioridad a lo largo del tiempo (Line Chart) */}
                <div className="col-span-1 lg:col-span-2 bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Tickets por Prioridad (Tendencia)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={ticketsByPriorityOverTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="low" stroke="#4CAF50" name="Baja" />
                            <Line type="monotone" dataKey="medium" stroke="#FFC107" name="Media" />
                            <Line type="monotone" dataKey="high" stroke="#F44336" name="Alta" />
                            <Line type="monotone" dataKey="urgent" stroke="#9C27B0" name="Urgente" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Rendimiento de Agentes (Bar Chart) */}
                <div className="col-span-1 lg:col-span-2 bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Rendimiento de Agentes</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={agentPerformanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                            <XAxis dataKey="agentName" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="resolvedTickets" fill="#8884d8" name="Tickets Resueltos" />
                            <Bar dataKey="avgResolutionTimeHours" fill="#82ca9d" name="Tiempo Resolución (Horas)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Rendimiento de Departamentos (Bar Chart) */}
                <div className="col-span-1 lg:col-span-2 bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Rendimiento de Departamentos</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={departmentPerformanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                            <XAxis dataKey="departmentName" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="totalTickets" fill="#FFC107" name="Total Tickets" />
                            <Bar dataKey="avgResolutionTimeHours" fill="#F44336" name="Tiempo Resolución (Horas)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Reports;
