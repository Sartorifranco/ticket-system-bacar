    // frontend/src/pages/ClientTicketDetailPage.tsx
    import React, { useState, useEffect, useCallback, useRef } from 'react';
    import { useParams, useNavigate } from 'react-router-dom';
    import api from '../config/axiosConfig';
    import { useAuth } from '../context/AuthContext';
    import { useNotification } from '../context/NotificationContext';
    import Layout from '../components/Layout/Layout';
    import io from 'socket.io-client';
    import { ApiResponseError, TicketData, Comment } from '../types';
    import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
    import { ticketStatusTranslations, ticketPriorityTranslations } from '../utils/traslations';

    const ClientTicketDetailPage: React.FC = () => {
        console.log('--- RENDERIZANDO: ClientTicketDetailPage ---');

        const { id } = useParams<{ id: string }>(); // Obtener el ID del ticket de la URL
        const { user, token } = useAuth();
        const { addNotification } = useNotification();
        const navigate = useNavigate();

        const [ticket, setTicket] = useState<TicketData | null>(null);
        const [comments, setComments] = useState<Comment[]>([]);
        const [newCommentText, setNewCommentText] = useState('');
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [submittingComment, setSubmittingComment] = useState(false);

        const socket = useRef<any>(null);

        const fetchTicketDetails = useCallback(async () => {
            if (!token || !id || !user?.id) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                // CORRECCIÓN 1: Ajustar el tipo genérico de la respuesta
                const ticketRes = await api.get<TicketData>(`/api/tickets/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                // CORRECCIÓN 2: Acceder directamente a ticketRes.data
                const fetchedTicket = ticketRes.data;

                // CLIENT AUTHORIZATION CHECK: Ensure the client can only see their own ticket
                if (fetchedTicket.user_id !== user.id) {
                    setError('No autorizado para ver este ticket.');
                    addNotification('Acceso denegado: No puedes ver tickets de otros usuarios.', 'error');
                    setLoading(false);
                    return;
                }

                setTicket(fetchedTicket);

                const commentsRes = await api.get<Comment[]>(`/api/tickets/${id}/comments`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setComments(Array.isArray(commentsRes.data) ? commentsRes.data : []);

            } catch (err: unknown) {
                console.error('Error fetching ticket details or comments:', err);
                if (isAxiosErrorTypeGuard(err)) {
                    const apiError = err.response?.data as ApiResponseError;
                    setError(apiError?.message || 'Error al cargar los detalles del ticket.');
                    addNotification(`Error al cargar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
                } else {
                    setError('Ocurrió un error inesperado al cargar los detalles del ticket.');
                    addNotification('Ocurrió un error inesperado al cargar los detalles del ticket.', 'error');
                }
            } finally {
                setLoading(false);
            }
        }, [token, id, user?.id, addNotification]);

        useEffect(() => {
            if (user && token && user.role === 'client' && id) {
                fetchTicketDetails();
            }
        }, [user, token, id, fetchTicketDetails]);

        // Socket.IO for real-time updates
        useEffect(() => {
            if (user && token && user.role === 'client' && id && !socket.current) {
                socket.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
                    auth: { token: token }
                });

                socket.current.on('connect', () => {
                    console.log('Conectado a Socket.IO (Client Ticket Detail Page)');
                    socket.current.emit('joinRoom', { roomName: `ticket-${id}`, userId: user.id }); // Unirse a la sala del ticket
                    socket.current.emit('joinRoom', { roomName: `user-${user.id}`, userId: user.id }); // Unirse a la sala del usuario
                });

                socket.current.on('ticketUpdated', (data: any) => {
                    addNotification(data.message, 'info');
                    fetchTicketDetails(); // Recargar detalles del ticket si hay una actualización
                });

                socket.current.on('newComment', (data: any) => {
                    addNotification(data.message, 'info');
                    fetchTicketDetails(); // Recargar comentarios si hay uno nuevo
                });

                socket.current.on('disconnect', () => {
                    console.log('Desconectado de Socket.IO (Client Ticket Detail Page)');
                });

                socket.current.on('connect_error', (err: any) => {
                    console.error('Socket.IO connection error (Client Ticket Detail Page):', err.message);
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
        }, [user, token, id, addNotification, fetchTicketDetails]);

        const handleAddComment = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!newCommentText.trim() || !id || !token) {
                addNotification('El comentario no puede estar vacío.', 'warning');
                return;
            }
            setSubmittingComment(true);
            try {
                await api.post(`/api/tickets/${id}/comments`, { comment_text: newCommentText }, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setNewCommentText('');
                addNotification('Comentario añadido exitosamente.', 'success');
                fetchTicketDetails(); // Recargar comentarios y detalles del ticket
            } catch (err: unknown) {
                console.error('Error adding comment:', err);
                if (isAxiosErrorTypeGuard(err)) {
                    const apiError = err.response?.data as ApiResponseError;
                    addNotification(`Error al añadir comentario: ${apiError?.message || 'Error desconocido'}`, 'error');
                } else {
                    addNotification('Ocurrió un error inesperado al añadir el comentario.', 'error');
                }
            } finally {
                setSubmittingComment(false);
            }
        };

        if (!user || user.role !== 'client') {
            return <Layout><div className="text-center p-4 text-red-500">Acceso denegado. Solo clientes pueden ver esta página.</div></Layout>;
        }

        if (loading) {
            return <Layout><div className="flex justify-center items-center h-full"><span className="text-lg">Cargando detalles del ticket...</span></div></Layout>;
        }

        if (error) {
            return <Layout><div className="text-red-500 text-center p-4">Error: {error}</div></Layout>;
        }

        if (!ticket) {
            return <Layout><div className="text-center p-4 text-gray-600">Ticket no encontrado.</div></Layout>;
        }

        return (
            <Layout>
                <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-800">Ticket #{ticket.id}: {ticket.title}</h1>
                        <button
                            onClick={() => navigate('/client/tickets')}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
                        >
                            Volver a Mis Tickets
                        </button>
                    </div>

                    {/* Detalles del Ticket */}
                    <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Detalles del Ticket</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                            <p><strong>Descripción:</strong> {ticket.description}</p>
                            <p><strong>Estado:</strong> 
                                <span className={`ml-2 px-2 inline-flex text-sm leading-5 font-semibold rounded-full
                                    ${ticket.status === 'open' ? 'bg-blue-100 text-blue-800' : ''}
                                    ${ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : ''}
                                    ${ticket.status === 'resolved' ? 'bg-green-100 text-green-800' : ''}
                                    ${ticket.status === 'closed' ? 'bg-gray-100 text-gray-800' : ''}
                                    ${ticket.status === 'reopened' ? 'bg-purple-100 text-purple-800' : ''}
                                `}>
                                    {ticketStatusTranslations[ticket.status]}
                                </span>
                            </p>
                            <p><strong>Prioridad:</strong> 
                                <span className={`ml-2 px-2 inline-flex text-sm leading-5 font-semibold rounded-full
                                    ${ticket.priority === 'low' ? 'bg-green-100 text-green-800' : ''}
                                    ${ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                                    ${ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' : ''}
                                    ${ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' : ''}
                                `}>
                                    {ticketPriorityTranslations[ticket.priority]}
                                </span>
                            </p>
                            <p><strong>Departamento:</strong> {ticket.department_name || 'N/A'}</p>
                            <p><strong>Asignado a:</strong> {ticket.agent_username || 'Sin Asignar'}</p>
                            <p><strong>Creado el:</strong> {new Date(ticket.created_at).toLocaleString()}</p>
                            {ticket.updated_at && <p><strong>Última actualización:</strong> {new Date(ticket.updated_at).toLocaleString()}</p>}
                            {ticket.closed_at && <p><strong>Cerrado el:</strong> {new Date(ticket.closed_at).toLocaleString()}</p>}
                        </div>
                    </div>

                    {/* Comentarios del Ticket */}
                    <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Comentarios</h2>
                        {comments.length === 0 ? (
                            <p className="text-gray-600">No hay comentarios para este ticket.</p>
                        ) : (
                            <div className="space-y-4">
                                {comments.map(comment => (
                                    <div key={comment.id} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {comment.user_username} <span className="text-gray-500 font-normal text-xs">- {new Date(comment.created_at).toLocaleString()}</span>
                                        </p>
                                        <p className="text-gray-700 mt-1">{comment.comment_text}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Añadir Nuevo Comentario */}
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Añadir Comentario</h2>
                        <form onSubmit={handleAddComment}>
                            <textarea
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[100px]"
                                placeholder="Escribe tu comentario aquí..."
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                disabled={submittingComment}
                            ></textarea>
                            <button
                                type="submit"
                                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={submittingComment}
                            >
                                {submittingComment ? 'Enviando...' : 'Enviar Comentario'}
                            </button>
                        </form>
                    </div>
                </div>
            </Layout>
        );
    };

    export default ClientTicketDetailPage;
    