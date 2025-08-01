// frontend/src/pages/ClientDashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout/Layout';
import TicketFormModal from '../components/Tickets/TicketFormModal';
import FeedbackModal from '../components/Common/FeedBackModal';
import io from 'socket.io-client';
import { ApiResponseError, TicketData, ActivityLog, Department } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import { ticketPriorityTranslations } from '../utils/traslations';

const ClientDashboard: React.FC = () => {
    console.log('--- RENDERIZANDO: ClientDashboard ---');

    const { user, token } = useAuth();
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    // Métricas de tickets por estado
    const [totalClientTickets, setTotalClientTickets] = useState<number | null>(null);
    const [openClientTickets, setOpenClientTickets] = useState<number | null>(null);
    const [inProgressClientTickets, setInProgressClientTickets] = useState<number | null>(null);
    const [closedClientTickets, setClosedClientTickets] = useState<number | null>(null);

    // Métricas de tickets por prioridad
    const [lowPriorityTickets, setLowPriorityTickets] = useState<number | null>(null);
    const [mediumPriorityTickets, setMediumPriorityTickets] = useState<number | null>(null);
    const [highPriorityTickets, setHighPriorityTickets] = useState<number | null>(null);
    const [urgentPriorityTickets, setUrgentPriorityTickets] = useState<number | null>(null);

    const [recentClientTickets, setRecentClientTickets] = useState<TicketData[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);

    // Estado para tickets recientemente cerrados para feedback (ahora incluye la propiedad feedback)
    const [recentlyClosedTickets, setRecentlyClosedTickets] = useState<TicketData[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [ticketToFeedback, setTicketToFeedback] = useState<TicketData | null>(null);

    const socket = useRef<any>(null);

    const fetchClientDashboardData = useCallback(async () => {
        if (!token || !user?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [
                totalTicketsRes,
                openTicketsRes,
                inProgressTicketsRes,
                closedTicketsRes,
                lowPriorityRes,
                mediumPriorityRes,
                highPriorityRes,
                urgentPriorityRes,
                recentTicketsRes,
                departmentsRes,
                // NUEVO: Obtener tickets resueltos o cerrados, ordenados por fecha de cierre,
                // y que NO tengan feedback aún. Limitamos a 3 para la sección del dashboard.
                recentlyClosedForFeedbackRes
            ] = await Promise.all([
                api.get<{ success: boolean; count: number; data: TicketData[] }>(`/api/tickets?user_id=${user.id}`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; count: number; data: TicketData[] }>(`/api/tickets?user_id=${user.id}&status=open`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; count: number; data: TicketData[] }>(`/api/tickets?user_id=${user.id}&status=in-progress`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; count: number; data: TicketData[] }>(`/api/tickets?user_id=${user.id}&status=resolved,closed`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; count: number; data: TicketData[] }>(`/api/tickets?user_id=${user.id}&priority=low`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; count: number; data: TicketData[] }>(`/api/tickets?user_id=${user.id}&priority=medium`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; count: number; data: TicketData[] }>(`/api/tickets?user_id=${user.id}&priority=high`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; count: number; data: TicketData[] }>(`/api/tickets?user_id=${user.id}&priority=urgent`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; data: TicketData[] }>(`/api/tickets?user_id=${user.id}&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; data: Department[] }>('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
                // Asumiendo que el backend puede filtrar por 'has_feedback=false' o que la respuesta incluye el objeto 'feedback'
                // y luego filtramos en el frontend. La opción más robusta es que el backend lo filtre.
                // Por ahora, traemos todos los cerrados/resueltos y filtramos en frontend.
                api.get<{ success: boolean; data: TicketData[] }>(`/api/tickets?user_id=${user.id}&status=resolved,closed&sort_by=closed_at&sort_order=DESC&limit=5`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            setTotalClientTickets(totalTicketsRes.data.count);
            setOpenClientTickets(openTicketsRes.data.count);
            setInProgressClientTickets(inProgressTicketsRes.data.count);
            setClosedClientTickets(closedTicketsRes.data.count);

            setLowPriorityTickets(lowPriorityRes.data.count);
            setMediumPriorityTickets(mediumPriorityRes.data.count);
            setHighPriorityTickets(highPriorityRes.data.count);
            setUrgentPriorityTickets(urgentPriorityRes.data.count);

            setRecentClientTickets(Array.isArray(recentTicketsRes.data.data) ? recentTicketsRes.data.data : []);
            setDepartments(Array.isArray(departmentsRes.data.data) ? departmentsRes.data.data : []);

            // Filtrar tickets que no tienen feedback (si el backend no lo hace)
            const ticketsWithoutFeedback = (Array.isArray(recentlyClosedForFeedbackRes.data.data) ? recentlyClosedForFeedbackRes.data.data : [])
                                            .filter(ticket => !ticket.feedback)
                                            .slice(0, 3); // Limitar a 3 si hay muchos
            setRecentlyClosedTickets(ticketsWithoutFeedback);

        } catch (err: unknown) {
            console.error('Error fetching client dashboard data:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar los datos del dashboard de cliente.');
                addNotification(`Error al cargar dashboard de cliente: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar el dashboard de cliente.');
                addNotification('Ocurrió un error inesperado al cargar el dashboard de cliente.', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [token, user?.id, addNotification]);

    useEffect(() => {
        if (user && token && user.role === 'client') {
            fetchClientDashboardData();
        }
    }, [user, token, fetchClientDashboardData]);

    useEffect(() => {
        if (user && token && user.role === 'client' && !socket.current) {
            socket.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
                auth: { token: token }
            });

            socket.current.on('connect', () => {
                console.log('Conectado a Socket.IO (Client Dashboard)');
                socket.current.emit('joinRoom', { roomName: `user-${user.id}`, userId: user.id });
                socket.current.emit('joinRoom', { roomName: user.role, userId: user.id });
            });

            socket.current.on('ticketUpdated', (data: any) => {
                addNotification(data.message, 'info');
                fetchClientDashboardData();
            });

            socket.current.on('newComment', (data: any) => {
                addNotification(data.message, 'info');
                fetchClientDashboardData();
            });

            socket.current.on('activityLogged', (data: any) => {
                addNotification(data.message, 'info');
                fetchClientDashboardData();
            });

            socket.current.on('disconnect', () => {
                console.log('Desconectado de Socket.IO (Client Dashboard)');
            });

            socket.current.on('connect_error', (err: any) => {
                console.error('Socket.IO connection error (Client Dashboard):', err.message);
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
    }, [user, token, addNotification, fetchClientDashboardData]);

    const handleCreateTicketClick = () => {
        setIsCreateTicketModalOpen(true);
    };

    const handleSaveTicket = async (ticketData: any) => {
        try {
            await api.post('/api/tickets', { ...ticketData, user_id: user?.id }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Ticket creado exitosamente.', 'success');
            setIsCreateTicketModalOpen(false);
            fetchClientDashboardData();
        } catch (err: unknown) {
            console.error('Error saving ticket:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al crear ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al crear el ticket.', 'error');
            }
        }
    };

    const handleOpenFeedbackModal = (ticket: TicketData) => {
        setTicketToFeedback(ticket);
        setIsFeedbackModalOpen(true);
    };

    // FUNCIÓN ACTUALIZADA PARA ENVIAR EL FEEDBACK AL BACKEND
    const handleSaveFeedback = async (ticketId: number, rating: number, comment: string) => {
        if (!token || !user?.id) {
            addNotification('No estás autenticado para enviar feedback.', 'error');
            return;
        }
        try {
            // Asumiendo un endpoint POST /api/feedback para guardar el feedback
            await api.post('/api/feedback', {
                ticket_id: ticketId,
                user_id: user.id, // ID del cliente que deja el feedback
                rating: rating,
                comment: comment,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('¡Gracias por tu feedback!', 'success');
            setIsFeedbackModalOpen(false);
            setTicketToFeedback(null);
            fetchClientDashboardData(); // Recargar para que el ticket ya no aparezca en la lista de feedback pendiente
        } catch (err: unknown) {
            console.error('Error submitting feedback:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al enviar feedback: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al enviar el feedback.', 'error');
            }
        }
    };


    if (!user || user.role !== 'client') {
        return <Layout><div className="text-center p-4 text-red-500">Acceso denegado. Solo clientes pueden ver esta página.</div></Layout>;
    }

    if (loading) {
        return <Layout><div className="flex justify-center items-center h-full"><span className="text-lg">Cargando dashboard de cliente...</span></div></Layout>;
    }

    if (error) {
        return <Layout><div className="text-red-500 text-center p-4">Error: {error}</div></Layout>;
    }

    return (
        <Layout>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Mi Dashboard</h1>
                    <button
                        onClick={handleCreateTicketClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                    >
                        Crear Nuevo Ticket
                    </button>
                </div>

                {/* Resumen de Tickets del Cliente por Estado */}
                <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Tickets por Estado</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Mis Tickets Totales</p>
                            <p className="text-3xl font-bold text-gray-900">{totalClientTickets}</p>
                        </div>
                        <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M12 5a3 3 0 110 6 3 3 0 010-6zm0 6a3 3 0 110 6 3 3 0 010-6zm0 6a3 3 0 110 6 3 3 0 010-6z"></path></svg>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Tickets Abiertos</p>
                            <p className="text-3xl font-bold text-blue-600">{openClientTickets}</p>
                        </div>
                        <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Tickets En Progreso</p>
                            <p className="text-3xl font-bold text-yellow-600">{inProgressClientTickets}</p>
                        </div>
                        <svg className="w-10 h-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Tickets Resueltos/Cerrados</p>
                            <p className="text-3xl font-bold text-green-600">{closedClientTickets}</p>
                        </div>
                        <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                </div>

                {/* Resumen de Tickets del Cliente por Prioridad */}
                <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Tickets por Prioridad</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Prioridad Baja</p>
                            <p className="text-3xl font-bold text-green-600">{lowPriorityTickets}</p>
                        </div>
                        <span className="w-10 h-10 flex items-center justify-center text-green-500 text-4xl">↓</span>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Prioridad Media</p>
                            <p className="text-3xl font-bold text-yellow-600">{mediumPriorityTickets}</p>
                        </div>
                        <span className="w-10 h-10 flex items-center justify-center text-yellow-500 text-4xl">↔</span>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Prioridad Alta</p>
                            <p className="text-3xl font-bold text-orange-600">{highPriorityTickets}</p>
                        </div>
                        <span className="w-10 h-10 flex items-center justify-center text-orange-500 text-4xl">↑</span>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Prioridad Urgente</p>
                            <p className="text-3xl font-bold text-red-600">{urgentPriorityTickets}</p>
                        </div>
                        <span className="w-10 h-10 flex items-center justify-center text-red-500 text-4xl">❗</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Mis Tickets Recientes */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Mis Tickets Recientes</h2>
                        {recentClientTickets.length === 0 ? (
                            <p className="text-gray-600">No tienes tickets recientes.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {recentClientTickets.map(ticket => (
                                    <li key={ticket.id} className="py-3 flex justify-between items-center">
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900">{ticket.title}</p>
                                            <p className="text-sm text-gray-600">Estado: {ticket.status} | Prioridad: {ticket.priority}</p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/client/tickets/${ticket.id}`)}
                                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                        >
                                            Ver
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {totalClientTickets !== null && totalClientTickets > recentClientTickets.length && (
                            <div className="text-center mt-4">
                                <button
                                    onClick={() => navigate('/client/tickets')}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Ver Todos Mis Tickets
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Califica tu Experiencia Reciente (Ahora con prevención de re-calificación) */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Califica tu Experiencia Reciente</h2>
                        {recentlyClosedTickets.length === 0 ? (
                            <p className="text-gray-600">No hay tickets cerrados recientemente para calificar.</p>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {recentlyClosedTickets.map(ticket => (
                                    <li key={ticket.id} className="py-3 flex justify-between items-center">
                                        <div>
                                            <p className="text-lg font-semibold text-gray-900">Ticket #{ticket.id}: {ticket.title}</p>
                                            <p className="text-sm text-gray-600">Cerrado el: {ticket.closed_at ? new Date(ticket.closed_at).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                        {/* Condicional para mostrar el botón "Calificar" */}
                                        {ticket.feedback ? (
                                            <span className="text-green-600 font-semibold text-sm">Calificado ({ticket.feedback.rating}/5) ✅</span>
                                        ) : (
                                            <button
                                                onClick={() => handleOpenFeedbackModal(ticket)}
                                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded-lg shadow-md text-sm transition duration-300 ease-in-out"
                                            >
                                                Calificar
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {isCreateTicketModalOpen && (
                <TicketFormModal
                    isOpen={isCreateTicketModalOpen}
                    onClose={() => setIsCreateTicketModalOpen(false)}
                    onSave={handleSaveTicket}
                    initialData={null}
                    departments={departments}
                    users={[]}
                />
            )}

            {isFeedbackModalOpen && ticketToFeedback && (
                <FeedbackModal
                    isOpen={isFeedbackModalOpen}
                    onClose={() => setIsFeedbackModalOpen(false)}
                    ticket={ticketToFeedback}
                    onSaveFeedback={handleSaveFeedback}
                />
            )}
        </Layout>
    );
};

export default ClientDashboard;
