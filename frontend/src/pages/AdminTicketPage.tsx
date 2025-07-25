import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification
import { TicketData, Comment, User, Department, TicketStatus, TicketPriority } from '../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../utils/typeGuards';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../utils/traslations';
import Layout from '../components/Layout/Layout';
import { format } from 'date-fns'; // Para formatear fechas

// Este componente AdminTicketPage es la página de detalle de ticket para el panel de administración.

const AdminTicketPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const ticketId = parseInt(id || '0');
    const navigate = useNavigate();
    const { token, user } = useAuth(); // <-- MODIFICADO: addNotification eliminado de useAuth
    const { addNotification } = useNotification(); // <-- AÑADIDO: Obtener addNotification del contexto de notificaciones

    const [ticket, setTicket] = useState<TicketData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Estados para campos editables
    const [editedTitle, setEditedTitle] = useState(''); 
    const [editedDescription, setEditedDescription] = useState('');
    const [editedStatus, setEditedStatus] = useState<TicketStatus>('open');
    const [editedPriority, setEditedPriority] = useState<TicketPriority>('medium');
    // CORREGIDO: Permitir null en los estados de ID de departamento y agente
    const [editedDepartmentId, setEditedDepartmentId] = useState<number | '' | null>('');
    const [editedAgentId, setEditedAgentId] = useState<number | '' | null>(''); 

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);

    const fetchTicketAndRelatedData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('No autorizado. Por favor, inicia sesión de nuevo.', 'error');
                navigate('/login');
                return;
            }
            if (!ticketId) {
                setError('ID de ticket no válido.');
                setLoading(false);
                return;
            }

            const [ticketResponse, usersResponse, departmentsResponse] = await Promise.all([
                api.get(`/api/tickets/${ticketId}`, { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const fetchedTicket: TicketData = ticketResponse.data;
            setTicket(fetchedTicket);
            setAllUsers(usersResponse.data.users);
            setAllDepartments(departmentsResponse.data.departments);

            // Inicializar estados de edición con los datos del ticket
            setEditedTitle(fetchedTicket.title); 
            setEditedDescription(fetchedTicket.description);
            setEditedStatus(fetchedTicket.status);
            setEditedPriority(fetchedTicket.priority);
            // Asegurar que los valores iniciales manejen null correctamente
            setEditedDepartmentId(fetchedTicket.department_id || null);
            setEditedAgentId(fetchedTicket.assigned_to_user_id || null); 

        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar detalles del ticket.');
                addNotification(`Error al cargar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar los detalles del ticket.');
            }
            console.error('Error fetching ticket details or related data:', err);
        } finally {
            setLoading(false);
        }
    }, [ticketId, token, addNotification, navigate]);

    useEffect(() => {
        if (user?.role === 'admin' || user?.role === 'agent') { // Solo admins y agentes pueden ver esta página
            fetchTicketAndRelatedData();
        } else if (user) {
            addNotification('Acceso denegado. Solo administradores y agentes pueden ver esta página.', 'error');
            navigate('/client-dashboard'); // Redirigir si no tiene el rol adecuado
        }
    }, [user, fetchTicketAndRelatedData, navigate, addNotification]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !ticket) return;

        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('No autorizado para añadir comentarios.', 'error');
                return;
            }
            // CORREGIDO: Usar 'message' en lugar de 'comment_text' para el cuerpo de la solicitud
            await api.post(`/api/tickets/${ticket.id}/comments`, { message: newComment }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNewComment('');
            addNotification('Comentario añadido exitosamente.', 'success');
            fetchTicketAndRelatedData();
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al añadir comentario.');
                addNotification(`Error al añadir comentario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al añadir el comentario.');
            }
            console.error('Error adding comment:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEdits = async () => {
        if (!ticket) return;

        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('No autorizado para guardar cambios.', 'error');
                return;
            }

            const updatedFields: Partial<TicketData> = {}; // Usar Partial<TicketData> para tipado seguro
            if (editedTitle !== ticket.title) updatedFields.title = editedTitle; 
            if (editedDescription !== ticket.description) updatedFields.description = editedDescription;
            if (editedStatus !== ticket.status) updatedFields.status = editedStatus;
            if (editedPriority !== ticket.priority) updatedFields.priority = editedPriority;
            // CORREGIDO: Manejar null correctamente para department_id
            if (editedDepartmentId !== (ticket.department_id || null)) updatedFields.department_id = editedDepartmentId === '' ? null : editedDepartmentId;
            // CORREGIDO: Manejar null correctamente para assigned_to_user_id
            if (editedAgentId !== (ticket.assigned_to_user_id || null)) updatedFields.assigned_to_user_id = editedAgentId === '' ? null : editedAgentId; 

            if (Object.keys(updatedFields).length > 0) {
                await api.put(`/api/tickets/${ticket.id}`, updatedFields, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Ticket actualizado exitosamente.', 'success');
                fetchTicketAndRelatedData();
                setIsEditing(false);
            } else {
                addNotification('No se detectaron cambios para guardar.', 'info');
                setIsEditing(false);
            }
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al guardar cambios.');
                addNotification(`Error al guardar cambios: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al guardar los cambios.');
            }
            console.error('Error saving edits:', err);
        } finally {
            setLoading(false);
        }
    };

    // Función de utilidad para formatear fechas
    const formatTimestamp = (isoString: string | null) => { // CORREGIDO: Permitir null
        if (!isoString) return 'N/A';
        return format(new Date(isoString), 'dd/MM/yyyy HH:mm:ss');
    };

    // Funciones de utilidad para obtener nombres de IDs
    const getDepartmentName = (id: number | null) => {
        if (!id) return 'N/A';
        const dept = allDepartments.find(d => d.id === id);
        return dept ? dept.name : 'Desconocido';
    };

    const getAgentUsername = (id: number | null) => {
        if (!id) return 'Sin asignar';
        const agent = allUsers.find(u => u.id === id && u.role === 'agent');
        return agent ? agent.username : 'Desconocido';
    };

    // Renderizado condicional basado en el estado de carga y error
    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center min-h-screen bg-gray-100 text-gray-700">
                    <p>Cargando detalles del ticket...</p>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="text-center p-8 text-red-500 bg-white rounded-lg shadow-lg m-4">
                    <h2 className="text-2xl font-bold mb-4">Error al cargar el Ticket</h2>
                    <p>{error}</p>
                    <button onClick={fetchTicketAndRelatedData} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4">Reintentar</button>
                </div>
            </Layout>
        );
    }

    if (!ticket) {
        return (
            <Layout>
                <div className="flex justify-center items-center min-h-screen bg-gray-100 text-gray-700">
                    <p className="text-gray-700">Ticket no encontrado.</p>
                </div>
            </Layout>
        );
    }

    // Determinar si el usuario actual puede editar el ticket
    // Un admin puede editar cualquier ticket. Un agente puede editar tickets asignados a él o sin asignar.
    const canEdit = user?.role === 'admin' || (user?.role === 'agent' && (ticket.assigned_to_user_id === user.id || ticket.assigned_to_user_id === null));
    const canComment = (user?.role === 'admin' || user?.role === 'agent') || user?.id === ticket.user_id;


    return (
        <Layout>
            <div className="admin-ticket-page p-4 md:p-8 bg-gray-100 min-h-screen">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Detalles del Ticket #{ticket.id}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="detail-item">
                            <strong className="text-gray-700">Asunto:</strong>
                            {isEditing && canEdit ? (
                                <input
                                    type="text"
                                    value={editedTitle} 
                                    onChange={(e) => setEditedTitle(e.target.value)} 
                                    className="form-input mt-1 w-full p-2 border border-gray-300 rounded-md"
                                />
                            ) : (
                                <span className="text-gray-900 ml-2"> {ticket.title}</span> 
                            )}
                        </div>
                        <div className="detail-item">
                            <strong className="text-gray-700">Estado:</strong>
                            {isEditing && canEdit ? (
                                <select
                                    value={editedStatus}
                                    onChange={(e) => setEditedStatus(e.target.value as TicketStatus)}
                                    className="form-select mt-1 w-full p-2 border border-gray-300 rounded-md"
                                >
                                    {Object.entries(ticketStatusTranslations).map(([key, value]) => (
                                        <option key={key} value={key}>{value}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${ticket.status === 'open' ? 'bg-blue-100 text-blue-800' : ''}
                                    ${ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : ''}
                                    ${ticket.status === 'resolved' ? 'bg-green-100 text-green-800' : ''}
                                    ${ticket.status === 'closed' ? 'bg-gray-100 text-gray-800' : ''}
                                `}>
                                    {ticketStatusTranslations[ticket.status] || ticket.status}
                                </span>
                            )}
                        </div>
                        <div className="detail-item">
                            <strong className="text-gray-700">Prioridad:</strong>
                            {isEditing && canEdit ? (
                                <select
                                    value={editedPriority}
                                    onChange={(e) => setEditedPriority(e.target.value as TicketPriority)}
                                    className="form-select mt-1 w-full p-2 border border-gray-300 rounded-md"
                                >
                                    {Object.entries(ticketPriorityTranslations).map(([key, value]) => (
                                        <option key={key} value={key}>{value}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${ticket.priority === 'low' ? 'bg-green-100 text-green-800' : ''}
                                    ${ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                                    ${ticket.priority === 'high' ? 'bg-red-100 text-red-800' : ''}
                                `}>
                                    {ticketPriorityTranslations[ticket.priority] || ticket.priority}
                                </span>
                            )}
                        </div>
                        <div className="detail-item">
                            <strong className="text-gray-700">Departamento:</strong>
                            {isEditing && canEdit ? (
                                <select
                                    value={editedDepartmentId === null ? '' : editedDepartmentId} // Manejar null para el select
                                    onChange={(e) => setEditedDepartmentId(e.target.value === '' ? null : parseInt(e.target.value))}
                                    className="form-select mt-1 w-full p-2 border border-gray-300 rounded-md"
                                >
                                    <option value="">Seleccionar Departamento</option>
                                    {allDepartments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className="text-gray-900 ml-2"> {getDepartmentName(ticket.department_id)}</span>
                            )}
                        </div>
                        <div className="detail-item">
                            <strong className="text-gray-700">Cliente:</strong> <span className="text-gray-900 ml-2">{ticket.user_username}</span>
                        </div>
                        <div className="detail-item">
                            <strong className="text-gray-700">Agente Asignado:</strong>
                            {isEditing && canEdit ? (
                                <select
                                    value={editedAgentId === null ? '' : editedAgentId} // Manejar null para el select
                                    onChange={(e) => setEditedAgentId(e.target.value === '' ? null : parseInt(e.target.value))}
                                    className="form-select mt-1 w-full p-2 border border-gray-300 rounded-md"
                                >
                                    <option value="">Sin asignar</option>
                                    {allUsers.filter(u => u.role === 'agent').map(agent => (
                                        <option key={agent.id} value={agent.id}>{agent.username}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className="text-gray-900 ml-2"> {getAgentUsername(ticket.assigned_to_user_id)}</span> 
                            )}
                        </div>
                        <div className="detail-item">
                            <strong className="text-gray-700">Creado:</strong> <span className="text-gray-900 ml-2">{formatTimestamp(ticket.created_at)}</span>
                        </div>
                        <div className="detail-item">
                            <strong className="text-gray-700">Última Actualización:</strong> <span className="text-gray-900 ml-2">{formatTimestamp(ticket.updated_at)}</span>
                        </div>
                        {ticket.closed_at && ( 
                            <div className="detail-item">
                                <strong className="text-gray-700">Resuelto:</strong> <span className="text-gray-900 ml-2">{formatTimestamp(ticket.closed_at)}</span> 
                            </div>
                        )}
                    </div>

                    <div className="ticket-info-item col-span-full mb-6">
                        <strong className="text-gray-700 block mb-2">Descripción:</strong>
                        {isEditing && canEdit ? (
                            <textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                className="form-textarea mt-1 w-full p-2 border border-gray-300 rounded-md"
                                rows={4}
                            ></textarea>
                        ) : (
                            <p className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200 text-gray-800 whitespace-pre-wrap">{ticket.description}</p>
                        )}
                    </div>

                    <h3 className="text-xl font-bold text-gray-800 mb-4 mt-6 border-t pt-4">Comentarios</h3>
                    <div className="ticket-comments-list max-h-80 overflow-y-auto border border-gray-200 rounded-md p-4 mb-6 bg-gray-50">
                        {ticket.comments && ticket.comments.length > 0 ? (
                            ticket.comments.map((comment: Comment) => {
                                return (
                                    <div key={comment.id} className="ticket-comment-item mb-4 pb-2 border-b border-gray-200 last:border-b-0">
                                        <p className="ticket-comment-author text-sm font-semibold text-gray-700">
                                            {comment.user_username}
                                            <span className="ticket-comment-date text-gray-500 ml-2 font-normal text-xs">
                                                {formatTimestamp(comment.created_at)}
                                            </span>
                                        </p>
                                        <p className="ticket-detail-comment-text text-gray-800 mt-1 whitespace-pre-wrap">{comment.message}</p> 
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-gray-600">No hay comentarios para este ticket.</p>
                        )}
                    </div>

                    {canComment && (
                        <form onSubmit={handleAddComment} className="ticket-add-comment flex flex-col gap-4">
                            <textarea
                                className="form-textarea w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Añadir un nuevo comentario..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                rows={3}
                                disabled={loading}
                            ></textarea>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 self-end" disabled={loading}>
                                {loading ? 'Añadiendo...' : 'Añadir Comentario'}
                            </button>
                        </form>
                    )}

                    {canEdit && (
                        <div className="ticket-actions mt-6 flex justify-end gap-3">
                            {isEditing ? (
                                <>
                                    <button onClick={handleSaveEdits} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200" disabled={loading}>
                                        {loading ? 'Guardando Edición...' : 'Guardar Edición'}
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors duration-200" disabled={loading}>
                                        Cancelar Edición
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200" disabled={loading}>
                                    Editar Ticket
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default AdminTicketPage;
