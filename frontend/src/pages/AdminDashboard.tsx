// frontend/src/pages/AdminDashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout/Layout';
import io from 'socket.io-client';
import { ApiResponseError, TicketData, User, Department, ActivityLog } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';

const AdminDashboard: React.FC = () => {
    console.log('--- RENDERIZANDO: AdminDashboard ---');

    const { user, token } = useAuth();
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    const [totalTickets, setTotalTickets] = useState<number | null>(null);
    const [openTickets, setOpenTickets] = useState<number | null>(null);
    const [inProgressTickets, setInProgressTickets] = useState<number | null>(null);
    const [closedTickets, setClosedTickets] = useState<number | null>(null);
    const [totalUsers, setTotalUsers] = useState<number | null>(null);
    const [totalDepartments, setTotalDepartments] = useState<number | null>(null);
    const [recentTickets, setRecentTickets] = useState<TicketData[]>([]);
    const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]); // Estado para la actividad reciente

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const socket = useRef<any>(null);

    const fetchDashboardData = useCallback(async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [
                ticketsRes,
                usersRes,
                departmentsRes,
                recentTicketsRes,
                activityLogsRes // Nueva petición para logs de actividad
            ] = await Promise.all([
                api.get<{ success: boolean; count: number }>('/api/tickets', { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; count: number }>('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; count: number }>('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; data: TicketData[] }>('/api/tickets?status=open,in-progress&limit=5', { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; data: ActivityLog[] }>('/api/activity-logs?limit=5', { headers: { Authorization: `Bearer ${token}` } }) // Petición a la nueva ruta
            ]);

            setTotalTickets(ticketsRes.data.count);
            setTotalUsers(usersRes.data.count);
            setTotalDepartments(departmentsRes.data.count);
            setRecentTickets(Array.isArray(recentTicketsRes.data.data) ? recentTicketsRes.data.data : []);
            
            // Asegúrate de que activityLogsRes.data.data sea un array y tenga el formato correcto
            console.log("[AdminDashboard] Datos de actividad reciente recibidos:", activityLogsRes.data.data);
            setRecentActivity(Array.isArray(activityLogsRes.data.data) ? activityLogsRes.data.data : []); // Guardar la actividad reciente

            // Fetch specific ticket counts
            const [openRes, inProgressRes, closedRes] = await Promise.all([
                api.get<{ success: boolean; count: number }>('/api/tickets?status=open', { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; count: number }>('/api/tickets?status=in-progress', { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; count: number }>('/api/tickets?status=closed', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setOpenTickets(openRes.data.count);
            setInProgressTickets(inProgressRes.data.count);
            setClosedTickets(closedRes.data.count);

        } catch (err: unknown) {
            console.error('Error fetching dashboard data:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar los datos del dashboard.');
                addNotification(`Error al cargar dashboard: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar el dashboard.');
                addNotification('Ocurrió un error inesperado al cargar el dashboard.', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        if (user && token && user.role === 'admin') {
            fetchDashboardData();
        }
    }, [user, token, fetchDashboardData]);

    useEffect(() => {
        if (user && token && user.role === 'admin' && !socket.current) {
            socket.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
                auth: { token: token }
            });

            socket.current.on('connect', () => {
                console.log('Conectado a Socket.IO (Admin Dashboard)');
                socket.current.emit('joinRoom', { roomName: 'admin', userId: user.id });
                socket.current.emit('joinRoom', { roomName: `user-${user.id}`, userId: user.id });
            });

            socket.current.on('newTicket', (data: any) => {
                addNotification(data.message, 'info');
                fetchDashboardData(); // Recargar datos al crear un ticket
            });

            socket.current.on('ticketUpdated', (data: any) => {
                addNotification(data.message, 'info');
                fetchDashboardData(); // Recargar datos al actualizar un ticket
            });

            socket.current.on('ticketDeleted', (data: any) => {
                addNotification(data.message, 'info');
                fetchDashboardData(); // Recargar datos al eliminar un ticket
            });

            socket.current.on('newComment', (data: any) => {
                addNotification(data.message, 'info');
                // No es necesario recargar todo el dashboard por un comentario,
                // pero podrías querer una notificación más específica o un refresh parcial.
            });

            socket.current.on('activityLogged', (data: any) => {
                addNotification(data.message, 'info');
                fetchDashboardData(); // Recargar datos cuando se registra una actividad
            });


            socket.current.on('disconnect', () => {
                console.log('Desconectado de Socket.IO (Admin Dashboard)');
            });

            socket.current.on('connect_error', (err: any) => {
                console.error('Socket.IO connection error (Admin Dashboard):', err.message);
                addNotification(`Error de conexión con el servidor de notificaciones: ${err.message}`, 'error');
            });

            return () => {
                if (socket.current) {
                    console.log('Desconectado de Socket.IO');
                    socket.current.disconnect();
                    socket.current = null;
                }
            };
        }
    }, [user, token, addNotification, fetchDashboardData]);

    if (!user || user.role !== 'admin') {
        return <Layout><div className="text-center p-4 text-red-500">Acceso denegado. Solo administradores pueden ver esta página.</div></Layout>;
    }

    if (loading) {
        return <Layout><div className="flex justify-center items-center h-full"><span className="text-lg">Cargando dashboard...</span></div></Layout>;
    }

    if (error) {
        return <Layout><div className="text-red-500 text-center p-4">Error: {error}</div></Layout>;
    }

    return (
        <Layout>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard de Administración</h1>

                {/* Resumen de Tickets y Usuarios */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Tickets Totales</p>
                            <p className="text-3xl font-bold text-gray-900">{totalTickets}</p>
                        </div>
                        <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M12 5a3 3 0 110 6 3 3 0 010-6zm0 6a3 3 0 110 6 3 3 0 010-6zm0 6a3 3 0 110 6 3 3 0 010-6z"></path></svg>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Tickets Abiertos</p>
                            <p className="text-3xl font-bold text-blue-600">{openTickets}</p>
                        </div>
                        <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Tickets En Progreso</p>
                            <p className="text-3xl font-bold text-yellow-600">{inProgressTickets}</p>
                        </div>
                        <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Tickets Cerrados</p>
                            <p className="text-3xl font-bold text-red-600">{closedTickets}</p>
                        </div>
                        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Usuarios Totales</p>
                            <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
                        </div>
                        <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M17 20v-2c0-.653-.135-1.278-.38-1.857m0 0A9.003 9.003 0 0012 10a9.003 9.003 0 00-4.62-1.857M12 10a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Departamentos Totales</p>
                            <p className="text-3xl font-bold text-gray-900">{totalDepartments}</p>
                        </div>
                        <svg className="w-10 h-10 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H7a2 2 0 00-2 2v2m7-7h.01M7 16h.01"></path></svg>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Tickets Recientes */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Tickets Recientes (Abiertos/En Progreso)</h2>
                        {recentTickets.length === 0 ? (
                            <p className="text-gray-600">No hay tickets recientes.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {recentTickets.map(ticket => (
                                    <li key={ticket.id} className="py-3 flex justify-between items-center">
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900">{ticket.title}</p>
                                            <p className="text-sm text-gray-600">Creado por: {ticket.user_username} | Estado: {ticket.status}</p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                        >
                                            Ver
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Actividad Reciente */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Actividad Reciente</h2>
                        {recentActivity.length === 0 ? (
                            <p className="text-gray-600">No hay actividad reciente.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {recentActivity.map(log => (
                                    <li key={log.id} className="py-3">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {log.username || 'Usuario Desconocido'} - {log.action.replace(/_/g, ' ')}
                                        </p>
                                        {log.details && (
                                            <p className="text-xs text-gray-600 break-words">
                                                Detalles: {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-500 text-right">
                                            {new Date(log.created_at).toLocaleString()}
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

export default AdminDashboard;
