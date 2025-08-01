// frontend/src/pages/AgentDashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../config/axiosConfig';
import { TicketData, ReportMetrics, ActivityLog, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import Layout from '../components/Layout/Layout';
import io from 'socket.io-client';

const AgentDashboard: React.FC = () => {
    const { user, token } = useAuth();
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    const [totalAssignedTickets, setTotalAssignedTickets] = useState(0);
    const [openAssignedTickets, setOpenAssignedTickets] = useState(0);
    const [inProgressAssignedTickets, setInProgressAssignedTickets] = useState(0);
    const [closedAssignedTickets, setClosedAssignedTickets] = useState(0);
    const [recentAssignedTickets, setRecentAssignedTickets] = useState<TicketData[]>([]);
    const [recentActivityLogs, setRecentActivityLogs] = useState<ActivityLog[]>([]);

    const socket = useRef<any>(null);

    const fetchAgentMetrics = useCallback(async () => {
        if (!token || !user?.id) return;
        try {
            const response = await api.get<ReportMetrics>(`/api/dashboard/agent-metrics/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTotalAssignedTickets(response.data.totalTickets);
            setOpenAssignedTickets(response.data.openTickets);
            setInProgressAssignedTickets(response.data.inProgressTickets);
            setClosedAssignedTickets(response.data.closedTickets);
        } catch (err: unknown) {
            console.error('Error fetching agent metrics:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al cargar métricas del agente: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al cargar las métricas del agente.', 'error'); // CORREGIDO: Un solo argumento
            }
        }
    }, [token, user?.id, addNotification]);

    const fetchRecentAssignedTickets = useCallback(async () => {
        if (!token || !user?.id) return;
        try {
            const response = await api.get<{ tickets: TicketData[] }>(`/api/tickets?assigned_to_user_id=${user.id}&status=open,in-progress&limit=5`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRecentAssignedTickets(Array.isArray(response.data.tickets) ? response.data.tickets : []);
        } catch (err: unknown) {
            console.error('Error fetching recent assigned tickets:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al cargar tickets asignados recientes: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al cargar los tickets asignados recientes.', 'error'); // CORREGIDO: Un solo argumento
            }
            setRecentAssignedTickets([]);
        }
    }, [token, user?.id, addNotification]);

    const fetchRecentActivityLogs = useCallback(async () => {
        if (!token || !user?.id) return;
        try {
            const response = await api.get<{ logs: ActivityLog[] }>(`/api/activity-logs?user_id=${user.id}&limit=5`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRecentActivityLogs(Array.isArray(response.data.logs) ? response.data.logs : []);
        } catch (err: unknown) {
            console.error('Error fetching recent activity logs for agent:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al cargar logs de actividad recientes: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al cargar los logs de actividad recientes.', 'error'); // CORREGIDO: Un solo argumento
            }
            setRecentActivityLogs([]);
        }
    }, [token, user?.id, addNotification]);

    useEffect(() => {
        if (user && token && user.role === 'agent') {
            fetchAgentMetrics();
            fetchRecentAssignedTickets();
            fetchRecentActivityLogs();
        }
    }, [user, token, fetchAgentMetrics, fetchRecentAssignedTickets, fetchRecentActivityLogs]);

    useEffect(() => {
        if (user && token && user.role === 'agent' && !socket.current) {
            socket.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
                auth: { token: token }
            });

            socket.current.on('connect', () => {
                console.log('Conectado a Socket.IO (Agente)');
                socket.current.emit('joinRoom', { roomName: 'agent', userId: user.id });
                socket.current.emit('joinRoom', { roomName: `user-${user.id}`, userId: user.id });
            });

            socket.current.on('ticketAssigned', (data: any) => {
                addNotification(data.message, 'info');
                fetchRecentAssignedTickets();
                fetchAgentMetrics();
            });

            socket.current.on('ticketUpdated', (data: any) => {
                addNotification(data.message, 'info');
                fetchRecentAssignedTickets();
                fetchAgentMetrics();
            });

            socket.current.on('newComment', (data: any) => {
                addNotification(data.message, 'info');
            });

            socket.current.on('activityLogged', (data: any) => {
                addNotification(data.message, 'info');
                fetchRecentActivityLogs();
            });

            socket.current.on('disconnect', () => {
                console.log('Desconectado de Socket.IO (Agente)');
            });

            socket.current.on('connect_error', (err: any) => {
                console.error('Socket.IO connection error (Agent):', err.message);
                addNotification(`Error de conexión con el servidor de notificaciones: ${err.message}`, 'error');
            });

            return () => {
                if (socket.current) {
                    socket.current.disconnect();
                    socket.current = null;
                }
            };
        }
    }, [user, token, addNotification, fetchAgentMetrics, fetchRecentAssignedTickets, fetchRecentActivityLogs]);


    if (!user || user.role !== 'agent') {
        return <Layout><div className="text-center p-4 text-red-500">Acceso denegado. Solo agentes pueden ver esta página.</div></Layout>;
    }

    return (
        <Layout>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-100">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-300 pb-2">Dashboard de Agente</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Tickets Asignados Totales</p>
                            <p className="text-3xl font-bold text-gray-900">{totalAssignedTickets}</p>
                        </div>
                        <div className="text-blue-500">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Tickets Asignados Abiertos</p>
                            <p className="text-3xl font-bold text-gray-900">{openAssignedTickets}</p>
                        </div>
                        <div className="text-green-500">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Tickets Asignados En Progreso</p>
                            <p className="text-3xl font-bold text-gray-900">{inProgressAssignedTickets}</p>
                        </div>
                        <div className="text-yellow-500">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Tickets Asignados Cerrados</p>
                            <p className="text-3xl font-bold text-gray-900">{closedAssignedTickets}</p>
                        </div>
                        <div className="text-red-500">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Tickets Asignados Recientes</h2>
                        {recentAssignedTickets.length === 0 ? (
                            <p className="text-gray-600">No hay tickets asignados recientes.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {recentAssignedTickets.map(ticket => (
                                    <li key={ticket.id} className="py-3 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{ticket.title}</p>
                                            <p className="text-xs text-gray-500">Estado: {ticket.status} | Prioridad: {ticket.priority}</p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/agent/tickets/${ticket.id}`)}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Ver
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Actividad Reciente (Agente)</h2>
                        {recentActivityLogs.length === 0 ? (
                            <p className="text-gray-600">No hay actividad reciente.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {recentActivityLogs.map(log => (
                                    <li key={log.id} className="py-3">
                                        <p className="text-sm font-semibold text-gray-900">{log.description}</p>
                                        <p className="text-xs text-gray-500">
                                            {log.user_username} ({log.user_role}) - {new Date(log.created_at).toLocaleString()}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AgentDashboard;
