// frontend/src/pages/AdminTicketDetailPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { TicketData, Comment, User, Department, ApiResponseError, Feedback } from '../types'; // Importar Feedback
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import Layout from '../components/Layout/Layout';
import TicketFormModal from '../components/Tickets/TicketFormModal';
import CommentForm from '../components/Common/CommentForm';
import CommentList from '../components/Common/CommentList';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../utils/traslations';
import io from 'socket.io-client';

const AdminTicketDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const { addNotification } = useNotification();

    console.log('+++ RENDERIZANDO: AdminTicketDetailPage (Detalle del Ticket) para ID:', id, '+++');

    const [ticket, setTicket] = useState<TicketData | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    // CORRECCIÓN CLAVE AQUÍ: useState debe inicializarse como una función
    const [loadingTicket, setLoadingTicket] = useState(true);
    const [loadingComments, setLoadingComments] = useState(true); // <-- ¡CORREGIDO AQUÍ!
    const [errorTicket, setErrorTicket] = useState<string | null>(null);
    const [errorComments, setErrorComments] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    const socket = useRef<any>(null);

    const fetchTicket = useCallback(async () => {
        if (!token || !id) {
            console.log('fetchTicket: Token o ID no presentes. Abortando fetch.');
            setLoadingTicket(false);
            return;
        }
        setLoadingTicket(true);
        setErrorTicket(null);
        try {
            console.log(`fetchTicket: Intentando obtener ticket con ID: ${id}`);
            const response = await api.get<TicketData>(`/api/tickets/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('fetchTicket: Respuesta COMPLETA del API para ticket:', response);
            console.log('fetchTicket: Datos del ticket (response.data):', response.data);
            setTicket(response.data);
        } catch (err: unknown) {
            console.error('fetchTicket: Error al cargar el ticket:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setErrorTicket(apiError?.message || 'Error al cargar el ticket.');
                addNotification(`Error al cargar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setErrorTicket('Ocurrió un error inesperado al cargar el ticket.');
                addNotification('Ocurrió un error inesperado al cargar el ticket.', 'error');
            }
            setTicket(null);
        } finally {
            setLoadingTicket(false);
        }
    }, [token, id, addNotification]);

    const fetchComments = useCallback(async () => {
        if (!token || !id) {
            console.log('fetchComments: Token o ID no presentes. Abortando fetch.');
            setLoadingComments(false);
            return;
        }
        setLoadingComments(true);
        setErrorComments(null);
        try {
            console.log(`fetchComments: Intentando obtener comentarios para ticket ID: ${id}`);
            const response = await api.get<Comment[]>(`/api/tickets/${id}/comments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('fetchComments: Respuesta COMPLETA del API para comentarios:', response);
            console.log('fetchComments: Datos de comentarios (response.data):', response.data);
            setComments(Array.isArray(response.data) ? response.data : []);
        } catch (err: unknown) {
            console.error('fetchComments: Error al cargar los comentarios:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setErrorComments(apiError?.message || 'Error al cargar los comentarios.');
                addNotification(`Error al cargar comentarios: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al cargar los comentarios.', 'error');
            }
            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    }, [token, id, addNotification]);

    const fetchAllDepartmentsAndUsers = useCallback(async () => {
        if (!token) {
            console.log('fetchAllDepartmentsAndUsers: Token no presente. Abortando fetch.');
            return;
        }
        try {
            console.log('fetchAllDepartmentsAndUsers: Intentando obtener departamentos y usuarios.');
            const [departmentsRes, usersRes] = await Promise.all([
                api.get<{ success: boolean; data: Department[] }>('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
                api.get<{ success: boolean; count: number; data: User[] }>('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            console.log('fetchAllDepartmentsAndUsers: Respuesta COMPLETA del API para departamentos:', departmentsRes);
            console.log('fetchAllDepartmentsAndUsers: Datos de departamentos (departmentsRes.data.data):', departmentsRes.data.data);
            console.log('fetchAllDepartmentsAndUsers: Respuesta COMPLETA del API para usuarios:', usersRes);
            console.log('fetchAllDepartmentsAndUsers: Datos de usuarios (usersRes.data.data):', usersRes.data.data);

            setAllDepartments(Array.isArray(departmentsRes.data.data) ? departmentsRes.data.data : []);
            setAllUsers(Array.isArray(usersRes.data.data) ? usersRes.data.data : []);
            console.log('fetchAllDepartmentsAndUsers: Departamentos y usuarios obtenidos y estados actualizados.');
        } catch (err: unknown) {
            console.error('fetchAllDepartmentsAndUsers: Error al cargar departamentos o usuarios para el modal:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al cargar datos para el modal: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al cargar datos para el modal.', 'error');
            }
        }
    }, [token, addNotification]);

    useEffect(() => {
        if (user && token && id) {
            console.log('useEffect principal: Iniciando fetches para ticket, comentarios, departamentos y usuarios.');
            fetchTicket();
            fetchComments();
            fetchAllDepartmentsAndUsers();
        } else {
            console.log('useEffect principal: No se cumplen las condiciones para iniciar fetches (user, token, o id faltantes).');
            if (!id && !loadingTicket) {
                 navigate('/admin/tickets', { replace: true });
            }
        }
    }, [user, token, id, fetchTicket, fetchComments, fetchAllDepartmentsAndUsers, navigate, loadingTicket]);

    useEffect(() => {
        if (user && token && id && !socket.current) {
            console.log('useEffect Socket.IO: Intentando conectar a Socket.IO.');
            socket.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
                auth: { token: token }
            });

            socket.current.on('connect', () => {
                console.log(`Conectado a Socket.IO para ticket-${id} (Detalle)`);
                socket.current.emit('joinRoom', { roomName: `ticket-${id}`, userId: user.id });
                socket.current.emit('joinRoom', { roomName: `user-${user.id}`, userId: user.id });
                if (user.role === 'admin') socket.current.emit('joinRoom', { roomName: 'admin', userId: user.id });
                if (user.role === 'agent') socket.current.emit('joinRoom', { roomName: 'agent', userId: user.id });
            });

            socket.current.on('ticketUpdated', (data: any) => {
                addNotification(data.message, 'info');
                console.log('Socket.IO: Ticket actualizado. Recargando ticket...');
                fetchTicket();
            });

            socket.current.on('newComment', (data: any) => {
                addNotification(data.message, 'info');
                console.log('Socket.IO: Nuevo comentario. Recargando comentarios...');
                fetchComments();
            });

            socket.current.on('disconnect', () => {
                console.log(`Desconectado de Socket.IO para ticket-${id} (Detalle)`);
            });

            socket.current.on('connect_error', (err: any) => {
                console.error('Socket.IO connection error (Ticket Detail Page):', err.message);
                addNotification(`Error de conexión con el servidor de notificaciones: ${err.message}`, 'error');
            });

            return () => {
                if (socket.current) {
                    console.log('Socket.IO cleanup: Desconectando socket.');
                    socket.current.disconnect();
                    socket.current = null;
                }
            };
        } else {
            console.log('useEffect Socket.IO: No se cumplen las condiciones para conectar (user, token, id o socket ya conectado).');
        }
    }, [user, token, id, addNotification, fetchTicket, fetchComments]);

    const handleAddComment = async (commentText: string) => {
        if (!commentText.trim() || !ticket || !token) {
            addNotification('El comentario no puede estar vacío.', 'warning');
            return;
        }

        try {
            console.log('handleAddComment: Enviando comentario...');
            await api.post(`/api/tickets/${ticket.id}/comments`, { comment_text: commentText, user_id: user?.id }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Comentario añadido exitosamente.', 'success');
            fetchComments();
        } catch (err: unknown) {
            console.error('handleAddComment: Error al añadir comentario:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al añadir comentario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al añadir el comentario.', 'error');
            }
        }
    };

    const handleUpdateTicket = async (updatedData: Partial<TicketData>) => {
        if (!ticket || !token) {
            addNotification('No se puede actualizar el ticket sin datos.', 'warning');
            return;
        }
        try {
            console.log(`handleUpdateTicket: Actualizando ticket ${ticket.id} con datos:`, updatedData);
            await api.put(`/api/tickets/${ticket.id}`, updatedData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Ticket actualizado exitosamente.', 'success');
            setIsEditModalOpen(false);
            fetchTicket();
        } catch (err: unknown) {
            console.error('handleUpdateTicket: Error al actualizar ticket:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al actualizar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al actualizar el ticket.', 'error');
            }
        }
    };

    if (!user || user.role !== 'admin' || !id) {
        console.log('Render: Acceso denegado o ID de ticket no proporcionado (user, role o id faltante).');
        return <Layout><div className="text-center p-4 text-red-500">Acceso denegado o ID de ticket no proporcionado. Solo administradores pueden ver esta página.</div></Layout>;
    }

    if (loadingTicket || loadingComments) {
        console.log('Render: Cargando ticket o comentarios...');
        return <Layout><div className="flex justify-center items-center h-full"><span className="text-lg">Cargando ticket...</span></div></Layout>;
    }

    if (errorTicket) {
        console.log('Render: Error al cargar ticket:', errorTicket);
        return <Layout><div className="text-red-500 text-center p-4">Error: {errorTicket}</div></Layout>;
    }

    if (!ticket) {
        console.log('Render: Ticket no encontrado o no tienes permiso para verlo.');
        return <Layout><div className="text-center p-4 text-gray-600">Ticket no encontrado o no tienes permiso para verlo.</div></Layout>;
    }

    console.log('Render: Ticket cargado. Mostrando UI.');
    return (
        <Layout>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Ticket #{ticket.id}: {ticket.title}</h1>
                    <div className="flex space-x-3">
                        {(user.role === 'admin' || user.role === 'agent') && (
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                            >
                                Editar Ticket
                            </button>
                        )}
                        <button
                            onClick={() => navigate(-1)}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
                        >
                            Volver
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Detalles del Ticket</h2>
                        <div className="space-y-3 text-gray-700">
                            <p><strong>Descripción:</strong> {ticket.description}</p>
                            <p>
                                <strong>Estado:</strong>{' '}
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                    ${ticket.status === 'open' ? 'bg-blue-100 text-blue-800' : ''}
                                    ${ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : ''}
                                    ${ticket.status === 'resolved' ? 'bg-green-100 text-green-800' : ''}
                                    ${ticket.status === 'closed' ? 'bg-gray-100 text-gray-800' : ''}
                                    ${ticket.status === 'reopened' ? 'bg-purple-100 text-purple-800' : ''}
                                `}>
                                    {ticketStatusTranslations[ticket.status]}
                                </span>
                            </p>
                            <p>
                                <strong>Prioridad:</strong>{' '}
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                    ${ticket.priority === 'low' ? 'bg-green-100 text-green-800' : ''}
                                    ${ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                                    ${ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' : ''}
                                    ${ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' : ''}
                                `}>
                                    {ticketPriorityTranslations[ticket.priority]}
                                </span>
                            </p>
                            <p><strong>Creado Por:</strong> {ticket.user_username}</p>
                            <p><strong>Departamento:</strong> {ticket.department_name || 'N/A'}</p>
                            <p><strong>Asignado A:</strong> {ticket.agent_username || 'Sin Asignar'}</p>
                            <p><strong>Fecha Creación:</strong> {new Date(ticket.created_at).toLocaleString()}</p>
                            <p><strong>Última Actualización:</strong> {new Date(ticket.updated_at).toLocaleString()}</p>
                            {ticket.closed_at && <p><strong>Fecha Cierre:</strong> {new Date(ticket.closed_at).toLocaleString()}</p>}

                            {/* Mostrar el feedback del cliente si existe */}
                            {ticket.feedback && (
                                <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                    <h3 className="text-lg font-bold text-purple-800 mb-2">Feedback del Cliente</h3>
                                    <p className="text-gray-700">
                                        <strong>Calificación:</strong>{' '}
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className={`text-xl ${i < ticket.feedback!.rating ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>
                                        ))}
                                        {' '} ({ticket.feedback.rating}/5)
                                    </p>
                                    {ticket.feedback.comment && (
                                        <p className="text-gray-700 mt-2">
                                            <strong>Comentario:</strong> {ticket.feedback.comment}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500 text-right mt-2">
                                        Enviado el: {new Date(ticket.feedback.created_at).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Comentarios</h2>
                        <div className="h-64 overflow-y-auto mb-4 border rounded-md p-2 bg-gray-50">
                            {comments.length === 0 ? (
                                <p className="text-gray-600 text-sm">No hay comentarios aún.</p>
                            ) : (
                                comments.map((comment) => (
                                    <div key={comment.id} className="mb-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                                        <p className="text-sm font-semibold text-gray-900">{comment.user_username}</p>
                                        <p className="text-gray-700 text-sm mt-1">{comment.comment_text}</p>
                                        <p className="text-xs text-gray-500 text-right">{new Date(comment.created_at).toLocaleString()}</p>
                                    </div>
                                ))
                            )}
                        </div>
                        <CommentForm onAddComment={handleAddComment} />
                    </div>
                </div>
            </div>

            {isEditModalOpen && ticket && (
                <TicketFormModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleUpdateTicket}
                    initialData={ticket}
                    departments={allDepartments}
                    users={allUsers.filter(u => u.role === 'agent')}
                />
            )}
        </Layout>
    );
};

export default AdminTicketDetailPage;
