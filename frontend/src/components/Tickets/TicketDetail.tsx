// frontend/src/pages/TicketDetail.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
// Importar los tipos actualizados
import { TicketData, Comment, ActivityLog, User, Department, TicketStatus, TicketPriority } from '../../types'; 
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { ticketStatusTranslations, ticketPriorityTranslations, userRoleTranslations, translateTerm } from '../../utils/traslations';
import TicketDetailModal from '../../components/Tickets/TicketDetailModal'; 

const TicketDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, token, addNotification, signOut } = useAuth();

    const [ticket, setTicket] = useState<TicketData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');

    // Estados para los modales de edición (si se usan en esta página)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);

    // Estados para los campos editables si se edita directamente en la página (no en el modal)
    // Los mantengo por si hay lógica de edición directa en la página, aunque se recomienda usar el modal.
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [editedStatus, setEditedStatus] = useState<TicketStatus>('open');
    const [editedPriority, setEditedPriority] = useState<TicketPriority>('medium');
    const [editedDepartmentId, setEditedDepartmentId] = useState<number | null>(null);
    const [editedAgentId, setEditedAgentId] = useState<number | null>(null);


    const fetchTicketDetails = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token || !id) {
                throw new Error('No autorizado o ID de ticket no proporcionado.');
            }
            const response = await api.get(`/api/tickets/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const fetchedTicket: TicketData = response.data;
            setTicket(fetchedTicket);

            // Inicializar estados de edición con los datos del ticket
            setEditedTitle(fetchedTicket.title); // CORRECCIÓN: 'subject' -> 'title'
            setEditedDescription(fetchedTicket.description);
            setEditedStatus(fetchedTicket.status);
            setEditedPriority(fetchedTicket.priority);
            setEditedDepartmentId(fetchedTicket.department_id || null);
            setEditedAgentId(fetchedTicket.assigned_to_user_id || null); // CORRECCIÓN: 'agent_id' -> 'assigned_to_user_id'

        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar los detalles del ticket.');
                addNotification(`Error al cargar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar los detalles del ticket.');
            }
            console.error('Error fetching ticket details:', err);
            setTicket(null);
        } finally {
            setLoading(false);
        }
    }, [id, token, addNotification, signOut]);

    const fetchUsersAndDepartments = useCallback(async () => {
        try {
            if (!token) return;
            const [usersRes, departmentsRes] = await Promise.all([
                api.get('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setAllUsers(usersRes.data || []); 
            setAllDepartments(departmentsRes.data.departments || []);
        } catch (err: unknown) {
            console.error('Error fetching users or departments for modals:', err);
        }
    }, [token]);

    // Función para manejar la actualización del ticket si se edita directamente en la página
    const handleUpdateTicketDirectly = useCallback(async () => {
        if (!ticket) return;

        setLoading(true);
        setError(null);

        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }

            const updatedFields: any = {};
            // Comparar y añadir solo los campos que han cambiado
            if (editedTitle !== ticket.title) updatedFields.title = editedTitle; // CORRECCIÓN: 'subject' -> 'title'
            if (editedDescription !== ticket.description) updatedFields.description = editedDescription;
            if (editedStatus !== ticket.status) updatedFields.status = editedStatus;
            if (editedPriority !== ticket.priority) updatedFields.priority = editedPriority;
            
            // Manejar department_id y assigned_to_user_id
            if (editedDepartmentId !== (ticket.department_id || null)) updatedFields.department_id = editedDepartmentId;
            // Aquí, si el backend espera 'agent_id' para la asignación, lo mantenemos.
            // Si el backend espera 'assigned_to_user_id', deberías cambiar updatedFields.agent_id a updatedFields.assigned_to_user_id
            if (editedAgentId !== (ticket.assigned_to_user_id || null)) updatedFields.agent_id = editedAgentId; 

            if (Object.keys(updatedFields).length > 0) {
                await api.put(`/api/tickets/${ticket.id}`, updatedFields, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Ticket actualizado exitosamente.', 'success');
                fetchTicketDetails(); // Recargar los detalles del ticket
            } else {
                addNotification('No se detectaron cambios para actualizar.', 'info');
            }
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al actualizar el ticket.');
                addNotification(`Error al actualizar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al actualizar el ticket.');
            }
            console.error('Error updating ticket directly:', err);
        } finally {
            setLoading(false);
        }
    }, [ticket, editedTitle, editedDescription, editedStatus, editedPriority, editedDepartmentId, editedAgentId, token, addNotification, fetchTicketDetails]);


    useEffect(() => {
        fetchTicketDetails();
        fetchUsersAndDepartments(); 
    }, [fetchTicketDetails, fetchUsersAndDepartments]);

    const handleAddComment = useCallback(async () => {
        setLoading(true);
        setError(null);
        if (!commentText.trim()) {
            setError('El comentario no puede estar vacío.');
            addNotification('El comentario no puede estar vacío.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (!token || !id) {
                throw new Error('No autorizado o ID de ticket no proporcionado.');
            }
            await api.post(`/api/tickets/${id}/comments`, { message_text: commentText }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCommentText('');
            addNotification('Comentario añadido exitosamente.', 'success');
            fetchTicketDetails(); 
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
    }, [id, token, commentText, addNotification, fetchTicketDetails]);

    const handleTicketUpdated = useCallback(() => {
        setIsEditModalOpen(false);
        fetchTicketDetails(); 
    }, [fetchTicketDetails]);

    const getDepartmentName = (departmentId: number | null) => {
        if (!departmentId) return 'N/A';
        const department = allDepartments.find(dep => dep.id === departmentId);
        return department ? department.name : 'Desconocido';
    };

    const getAgentUsername = (agentId: number | null) => {
        if (!agentId) return 'N/A';
        const agent = allUsers.find(user => user.id === agentId);
        return agent ? agent.username : 'Desconocido';
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    if (loading) {
        return <div className="loading-message">Cargando ticket...</div>;
    }

    if (error) {
        return (
            <div className="error-message text-center p-4">
                <p>{error}</p>
                <button onClick={fetchTicketDetails} className="button primary-button mt-2">Reintentar</button>
            </div>
        );
    }

    if (!ticket) {
        return <div className="info-text text-center p-4">Ticket no encontrado.</div>;
    }

    const isAgentOrAdmin = user?.role === 'agent' || user?.role === 'admin';
    // Determinar si el usuario actual puede editar el ticket
    // Un admin puede editar cualquier ticket. Un agente puede editar tickets asignados a él o sin asignar.
    const canEdit = user?.role === 'admin' || (user?.role === 'agent' && (ticket.assigned_to_user_id === user.id || ticket.assigned_to_user_id === null)); 

    const canComment = isAgentOrAdmin || user?.id === ticket.user_id;

    return (
        <div className="ticket-detail-page p-4 md:p-8 bg-background-color min-h-screen">
            <h1 className="text-3xl font-bold text-primary-color mb-6 text-center">Detalles del Ticket #{ticket.id}</h1>

            <div className="ticket-details-card bg-card-background p-6 rounded-lg shadow-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="detail-item">
                        <span className="detail-label">Asunto:</span>
                        {/* Si el ticket se edita directamente en esta página, usar editedTitle */}
                        {/* De lo contrario, si solo se usa el modal, puedes simplificar esto */}
                        <span className="detail-value">{ticket.title}</span> {/* CORRECCIÓN: 'subject' -> 'title' */}
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Estado:</span>
                        <span className={`status-badge status-${ticket.status}`}>
                            {ticketStatusTranslations[ticket.status]}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Prioridad:</span>
                        <span className={`priority-badge priority-${ticket.priority}`}>
                            {ticketPriorityTranslations[ticket.priority]}
                        </span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Departamento:</span>
                        <span className="detail-value">{ticket.department_name || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Asignado a:</span>
                        <span className="detail-value">{ticket.agent_username || 'Sin Asignar'}</span> {/* CORRECCIÓN: 'agent_id' -> 'agent_username' */}
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Creado por:</span>
                        <span className="detail-value">{ticket.user_username}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Fecha Creación:</span>
                        <span className="detail-value">{formatTimestamp(ticket.created_at)}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Última Actualización:</span>
                        <span className="detail-value">{formatTimestamp(ticket.updated_at)}</span>
                    </div>
                    {ticket.closed_at && ( 
                        <div className="detail-item">
                            <span className="detail-label">Fecha Cierre:</span>
                            <span className="detail-value">{formatTimestamp(ticket.closed_at)}</span> {/* CORRECCIÓN: 'resolved_at' -> 'closed_at' */}
                        </div>
                    )}
                </div>

                <div className="mb-6">
                    <span className="detail-label block mb-2">Descripción:</span>
                    <p className="detail-value whitespace-pre-wrap">{ticket.description}</p>
                </div>

                {/* Botón para abrir el modal de edición (si se usa aquí) */}
                {canEdit && (
                    <div className="flex justify-end mt-4">
                        <button onClick={() => setIsEditModalOpen(true)} className="button primary-button">
                            Editar Ticket
                        </button>
                    </div>
                )}
            </div>

            {/* Sección de Comentarios */}
            <div className="comments-section bg-card-background p-6 rounded-lg shadow-lg mb-8">
                <h3 className="text-xl font-bold text-primary-color mb-4">Comentarios</h3>
                <div className="comments-list space-y-4 max-h-60 overflow-y-auto pr-2">
                    {ticket.comments && ticket.comments.length > 0 ? (
                        ticket.comments.map((comment) => (
                            <div key={comment.id} className="bg-secondary-background p-3 rounded-lg shadow-sm">
                                <p className="text-text-light dark:text-text-dark">
                                    <span className="font-semibold">{comment.user_username}:</span> {comment.message} {/* CORRECCIÓN: 'comment_text' -> 'message' */}
                                </p>
                                <p className="text-sm text-gray-500 text-right">
                                    {new Date(comment.created_at).toLocaleString()}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="text-text-light dark:text-text-dark">No hay comentarios aún.</p>
                    )}
                </div>

                {canComment && (
                    <div className="mt-6">
                        <h4 className="text-lg font-semibold text-primary-color mb-2">Añadir Comentario</h4>
                        <textarea
                            className="form-textarea w-full mb-3"
                            rows={3}
                            placeholder="Escribe tu comentario aquí..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            disabled={loading}
                        ></textarea>
                        <div className="flex justify-end">
                            <button
                                onClick={handleAddComment}
                                className="button primary-button"
                                disabled={loading || !commentText.trim()}
                            >
                                {loading ? 'Enviando...' : 'Añadir Comentario'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sección de Registro de Actividad */}
            <div className="activity-log-section bg-card-background p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold text-primary-color mb-4">Registro de Actividad</h3>
                <div className="activity-log-list space-y-2 max-h-60 overflow-y-auto pr-2">
                    {ticket.activity_logs && ticket.activity_logs.length > 0 ? (
                        ticket.activity_logs.map((log) => (
                            <div key={log.id} className="bg-secondary-background p-3 rounded-lg shadow-sm">
                                <p className="text-text-light dark:text-text-dark">
                                    <span className="font-semibold">{log.user_username || 'Sistema'}</span>{' '}
                                    {log.description}
                                </p>
                                <p className="text-sm text-gray-500 text-right">
                                    {new Date(log.created_at).toLocaleString()}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="text-text-light dark:text-text-dark">No hay registro de actividad para este ticket.</p>
                    )}
                </div>
            </div>

            {/* Modal de edición del ticket (si se abre desde esta página) */}
            {isEditModalOpen && ticket && (
                <TicketDetailModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    ticket={ticket}
                    onTicketUpdated={handleTicketUpdated}
                    token={token}
                    departments={allDepartments}
                    users={allUsers}
                />
            )}
        </div>
    );
};

export default TicketDetailPage;
