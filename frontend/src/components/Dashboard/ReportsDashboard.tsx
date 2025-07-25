// frontend/src/components/Dashboard/ReportsDashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import api from '../../config/axiosConfig';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
// CORREGIDO: Eliminar importaciones individuales de tipos que ya están en ReportMetrics
import { ReportMetrics } from '../../types'; 
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations'; // Asegúrate de que la ruta sea correcta
import { useAuth } from '../../context/AuthContext'; // Importar useAuth
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification

interface ReportsDashboardProps {
    // No se necesitan props si los datos se cargan internamente
}

// Helper para el Tooltip de Recharts en Reportes
const CustomReportTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="label">{`Fecha: ${label}`}</p>
                {payload.map((entry: any, index: number) => {
                    let translatedName = entry.name;
                    if (ticketStatusTranslations[entry.name]) {
                        translatedName = ticketStatusTranslations[entry.name];
                    } else if (ticketPriorityTranslations[entry.name]) {
                        translatedName = ticketPriorityTranslations[entry.name];
                    }
                    return (
                        <p key={`item-${index}`} style={{ color: entry.color }}>
                            {`${translatedName}: ${entry.value}`}
                        </p>
                    );
                })}
            </div>
        );
    }
    return null;
};

const ReportsDashboard: React.FC<ReportsDashboardProps> = () => {
    const { token } = useAuth(); // <-- MODIFICADO: Solo token del contexto de autenticación
    const { addNotification } = useNotification(); // <-- AÑADIDO: addNotification del contexto de notificaciones
    const [reportData, setReportData] = useState<ReportMetrics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const today = useMemo(() => new Date(), []);
    const thirtyDaysAgo = useMemo(() => {
        const d = new Date(today);
        d.setDate(today.getDate() - 30);
        return d;
    }, [today]);

    const [startDate, setStartDate] = useState<string>(thirtyDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState<string>(today.toISOString().split('T')[0]);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                setError('No autorizado. Por favor, inicia sesión de nuevo.');
                addNotification('No autorizado para ver reportes.', 'error');
                return;
            }
            const response = await api.get(`/api/admin/reports?startDate=${startDate}&endDate=${endDate}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setReportData(response.data);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar los reportes.');
                addNotification(`Error al cargar reportes: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar los reportes.');
            }
            console.error('Error fetching reports:', err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, token, addNotification]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    return (
        <div className="reports-dashboard-container">
            <h3 className="text-2xl font-bold text-primary-color mb-4 text-center">Reportes y Análisis Avanzados</h3>
            <p className="info-text text-center mb-6">
                Visualiza métricas clave del sistema de tickets para una mejor toma de decisiones.
            </p>

            <div className="date-range-selector bg-card-background p-4 rounded-lg shadow-md mb-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
                <div className="form-group mb-0">
                    <label htmlFor="startDate" className="text-text-light dark:text-text-dark">Fecha de Inicio:</label>
                    <input
                        type="date"
                        id="startDate"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="form-input"
                    />
                </div>
                <div className="form-group mb-0">
                    <label htmlFor="endDate" className="text-text-light dark:text-text-dark">Fecha de Fin:</label>
                    <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="form-input"
                    />
                </div>
                <button onClick={fetchReports} className="button primary-button mt-4 sm:mt-0">
                    Aplicar Filtro
                </button>
            </div>

            {loading ? (
                <div className="loading-message">🔄 Cargando reportes...</div>
            ) : error ? (
                <p className="error-message">{error}</p>
            ) : reportData ? (
                <div className="reports-grid">
                    {/* Gráfico de Línea: Tickets por Estado a lo largo del tiempo */}
                    <div className="report-card">
                        <h4 className="report-card-title">Tickets por Estado (Tendencia)</h4>
                        <div className="chart-container-large">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={reportData.ticketsByStatusOverTime}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis dataKey="date" stroke="var(--chart-text-color)" tick={{ fill: 'var(--chart-text-color)' }} />
                                    <YAxis stroke="var(--chart-text-color)" tick={{ fill: 'var(--chart-text-color)' }} />
                                    <Tooltip content={<CustomReportTooltipContent />} />
                                    <Legend wrapperStyle={{ color: 'var(--chart-text-color)' }} />
                                    <Line type="monotone" dataKey="open" stroke="var(--chart-color-2)" name={ticketStatusTranslations['open']} />
                                    <Line type="monotone" dataKey="inProgress" stroke="var(--chart-color-1)" name={ticketStatusTranslations['in-progress']} />
                                    <Line type="monotone" dataKey="resolved" stroke="var(--chart-color-3)" name={ticketStatusTranslations['resolved']} />
                                    <Line type="monotone" dataKey="closed" stroke="var(--chart-color-4)" name={ticketStatusTranslations['closed']} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfico de Línea: Tickets por Prioridad a lo largo del tiempo */}
                    <div className="report-card">
                        <h4 className="report-card-title">Tickets por Prioridad (Tendencia)</h4>
                        <div className="chart-container-large">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={reportData.ticketsByPriorityOverTime}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis dataKey="date" stroke="var(--chart-text-color)" tick={{ fill: 'var(--chart-text-color)' }} />
                                    <YAxis stroke="var(--chart-text-color)" tick={{ fill: 'var(--chart-text-color)' }} />
                                    <Tooltip content={<CustomReportTooltipContent />} />
                                    <Legend wrapperStyle={{ color: 'var(--chart-text-color)' }} />
                                    <Line type="monotone" dataKey="low" stroke="var(--chart-color-3)" name={ticketPriorityTranslations['low']} />
                                    <Line type="monotone" dataKey="medium" stroke="var(--chart-color-6)" name={ticketPriorityTranslations['medium']} />
                                    <Line type="monotone" dataKey="high" stroke="var(--chart-color-5)" name={ticketPriorityTranslations['high']} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfico de Barras: Rendimiento de Agentes */}
                    <div className="report-card">
                        <h4 className="report-card-title">Rendimiento de Agentes</h4>
                        <div className="chart-container-large">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={reportData.agentPerformance}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis dataKey="agentName" stroke="var(--chart-text-color)" tick={{ fill: 'var(--chart-text-color)' }} />
                                    <YAxis yAxisId="left" orientation="left" stroke="var(--chart-text-color)" tick={{ fill: 'var(--chart-text-color)' }} name="Tickets Resueltos" />
                                    <YAxis yAxisId="right" orientation="right" stroke="var(--chart-text-color)" tick={{ fill: 'var(--chart-text-color)' }} name="Tiempo Promedio (Horas)" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }}
                                        itemStyle={{ color: 'var(--text-color)' }}
                                    />
                                    <Legend wrapperStyle={{ color: 'var(--chart-text-color)' }} />
                                    <Bar yAxisId="left" dataKey="resolvedTickets" name="Tickets Resueltos" fill="var(--chart-color-1)" />
                                    <Bar yAxisId="right" dataKey="avgResolutionTimeHours" name="Tiempo Promedio (Horas)" fill="var(--chart-color-2)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfico de Barras: Rendimiento de Departamentos */}
                    <div className="report-card">
                        <h4 className="report-card-title">Rendimiento de Departamentos</h4>
                        <div className="chart-container-large">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={reportData.departmentPerformance}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                    <XAxis dataKey="departmentName" stroke="var(--chart-text-color)" tick={{ fill: 'var(--chart-text-color)' }} />
                                    <YAxis yAxisId="left" orientation="left" stroke="var(--chart-text-color)" tick={{ fill: 'var(--chart-text-color)' }} name="Total Tickets" />
                                    <YAxis yAxisId="right" orientation="right" stroke="var(--chart-text-color)" tick={{ fill: 'var(--chart-text-color)' }} name="Tiempo Promedio (Horas)" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--card-background)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }}
                                        itemStyle={{ color: 'var(--text-color)' }}
                                    />
                                    <Legend wrapperStyle={{ color: 'var(--chart-text-color)' }} />
                                    <Bar yAxisId="left" dataKey="totalTickets" name="Total Tickets" fill="var(--chart-color-3)" />
                                    <Bar yAxisId="right" dataKey="avgResolutionTimeHours" name="Tiempo Promedio (Horas)" fill="var(--chart-color-7)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            ) : (
                <p className="info-text">No hay datos de reportes disponibles para el rango de fechas seleccionado.</p>
            )}
        </div>
    );
};

export default ReportsDashboard;
