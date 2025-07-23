// frontend/src/components/Tickets/TicketDetailModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Common/Modal';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
// Importar los tipos actualizados
import { TicketData, User, Department, Comment, ActivityLog, TicketStatus, TicketPriority } from '../../types'; 
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { ticketStatusTranslations, ticketPriorityTranslations, userRoleTranslations, translateTerm, targetTypeTranslations } from '../../utils/traslations';

interface TicketDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: TicketData;
    onTicketUpdated: () => void;
    token: string | null;
    departments: Department[];
    users: User[];
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
    isOpen,
    onClose,
    ticket,
    onTicketUpdated,
    token,
    departments,
    users,
}) => {
    const { user, addNotification } = useAuth();
    const [currentTicket, setCurrentTicket] = useState<TicketData>(ticket);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Estados para campos editables
    const [title, setTitle] = useState(ticket.title); 
    const [description, setDescription] = useState(ticket.description);
    const [status, setStatus] = useState<TicketStatus>(ticket.status); // Usar el tipo TicketStatus
    const [priority, setPriority] = useState<TicketPriority>(ticket.priority); // Usar el tipo TicketPriority
    const [departmentId, setDepartmentId] = useState<number | null>(ticket.department_id);
    const [agentId, setAgentId] = useState<number | null>(ticket.assigned_to_user_id || null); 

    // Estado para el nuevo comentario
    const [commentText, setCommentText] = useState('');

    // Efecto para actualizar el estado local si el ticket prop cambia
    useEffect(() => {
        setCurrentTicket(ticket);
        setTitle(ticket.title);
        setDescription(ticket.description);
        setStatus(ticket.status);
        setPriority(ticket.priority);
        setDepartmentId(ticket.department_id);
        setAgentId(ticket.assigned_to_user_id || null); 
        setError(null);
        setIsEditing(false);
        setCommentText('');
    }, [ticket]);

    // Filtrar agentes por departamento seleccionado
    const agentsInSelectedDepartment = departmentId
        ? users.filter(u => u.role === 'agent' && u.department_id === departmentId)
        : users.filter(u => u.role === 'agent');

    const handleUpdateTicket = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }

            const updatedData = {
                title, 
                description,
                status,
                priority,
                department_id: departmentId,
                agent_id: agentId, 
            };

            const response = await api.put(`/api/tickets/${currentTicket.id}`, updatedData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCurrentTicket(response.data);
            addNotification('Ticket actualizado exitosamente.', 'success');
            setIsEditing(false);
            onTicketUpdated();
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al actualizar ticket.');
                addNotification(`Error al actualizar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al actualizar el ticket.');
            }
            console.error('Error updating ticket:', err);
        } finally {
            setLoading(false);
        }
    }, [
        token,
        currentTicket.id,
        title, 
        description,
        status,
        priority,
        departmentId,
        agentId,
        addNotification,
        onTicketUpdated,
    ]);

    const handleAddComment = useCallback(async () => {
        setLoading(true);
        setError(null);

        if (!commentText.trim()) {
            setError('El mensaje del comentario no puede estar vacío.');
            addNotification('El mensaje del comentario no puede estar vacío.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }

            const response = await api.post(`/api/tickets/${currentTicket.id}/comments`, {
                message_text: commentText,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setCurrentTicket(prev => ({
                ...prev,
                comments: [...(prev.comments || []), response.data],
            }));
            setCommentText('');
            addNotification('Comentario añadido exitosamente.', 'success');
            onTicketUpdated();
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
    }, [token, currentTicket.id, commentText, addNotification, onTicketUpdated]);


    const isAgentOrAdmin = user?.role === 'agent' || user?.role === 'admin';
    const isTicketCreator = user?.id === currentTicket.user_id;

    const canEdit = isAgentOrAdmin;
    const canComment = isTicketCreator || isAgentOrAdmin;

    const handleCancelEdit = useCallback(() => {
        setTitle(ticket.title);
        setDescription(ticket.description);
        setStatus(ticket.status);
        setPriority(ticket.priority);
        setDepartmentId(ticket.department_id);
        setAgentId(ticket.assigned_to_user_id || null); 
        setIsEditing(false);
        setError(null);
    }, [ticket]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Ticket #${currentTicket.id}: ${currentTicket.title}`}>
            <div className="p-4">
                {error && <div className="error-message text-center p-3 mb-4">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="detail-item">
                        <span className="detail-label">Asunto:</span>
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={loading}
                            />
                        ) : (
                            <span className="detail-value">{currentTicket.title}</span> /* CORRECCIÓN: Eliminado '>' extra */
                        )}
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Estado:</span>
                        {isEditing ? (
                            <select
                                className="form-select"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as TicketStatus)} 
                                disabled={loading}
                            >
                                {Object.entries(ticketStatusTranslations).map(([key, value]) => (
                                    <option key={key} value={key}>{value}</option>
                                ))}
                            </select>
                        ) : (
                            <span className={`status-badge status-${currentTicket.status}`}>
                                {ticketStatusTranslations[currentTicket.status]}
                            </span>
                        )}
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Prioridad:</span>
                        {isEditing ? (
                            <select
                                className="form-select"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as TicketPriority)} 
                                disabled={loading}
                            >
                                {Object.entries(ticketPriorityTranslations).map(([key, value]) => (
                                    <option key={key} value={key}>{value}</option>
                                ))}
                            </select>
                        ) : (
                            <span className={`priority-badge priority-${currentTicket.priority}`}>
                                {ticketPriorityTranslations[currentTicket.priority]}
                            </span>
                        )}
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Departamento:</span>
                        {isEditing ? (
                            <select
                                className="form-select"
                                value={departmentId || ''}
                                onChange={(e) => setDepartmentId(e.target.value ? parseInt(e.target.value) : null)}
                                disabled={loading}
                            >
                                <option value="">Seleccionar Departamento</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        ) : (
                            <span className="detail-value">{currentTicket.department_name || 'N/A'}</span>
                        )}
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Asignado a:</span>
                        {isEditing ? (
                            <select
                                className="form-select"
                                value={agentId || ''}
                                onChange={(e) => setAgentId(e.target.value ? parseInt(e.target.value) : null)}
                                disabled={loading}
                            >
                                <option value="">Sin Asignar</option>
                                {agentsInSelectedDepartment.map(agent => (
                                    <option key={agent.id} value={agent.id}>{agent.username}</option>
                                ))}
                            </select>
                        ) : (
                            <span className="detail-value">{currentTicket.agent_username || 'Sin Asignar'}</span>
                        )}
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Creado por:</span>
                        <span className="detail-value">{currentTicket.user_username}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Fecha Creación:</span>
                        <span className="detail-value">{new Date(currentTicket.created_at).toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Última Actualización:</span>
                        <span className="detail-value">{new Date(currentTicket.updated_at).toLocaleString()}</span>
                    </div>
                </div>

                <div className="mb-6">
                    <span className="detail-label block mb-2">Descripción:</span>
                    {isEditing ? (
                        <textarea
                            className="form-textarea w-full"
                            rows={5}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                        ></textarea>
                    ) : (
                        <p className="detail-value whitespace-pre-wrap">{currentTicket.description}</p>
                    )}
                </div>

                {canEdit && (
                    <div className="flex justify-end gap-2 mt-4">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleUpdateTicket}
                                    className="button primary-button"
                                    disabled={loading}
                                >
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="button secondary-button"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="button secondary-button"
                            >
                                Editar Ticket
                            </button>
                        )}
                    </div>
                )}

                {/* Sección de Comentarios */}
                <div className="mt-8 border-t border-border-color pt-6">
                    <h3 className="text-xl font-bold text-primary-color mb-4">Comentarios</h3>
                    <div className="comments-list space-y-4 max-h-60 overflow-y-auto pr-2">
                        {currentTicket.comments && currentTicket.comments.length > 0 ? (
                            currentTicket.comments.map((comment) => (
                                <div key={comment.id} className="bg-secondary-background p-3 rounded-lg shadow-sm">
                                    <p className="text-text-light dark:text-text-dark">
                                        <span className="font-semibold">{comment.user_username}:</span> {comment.message}
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
                <div className="mt-8 border-t border-border-color pt-6">
                    <h3 className="text-xl font-bold text-primary-color mb-4">Registro de Actividad</h3>
                    <div className="activity-log-list space-y-2 max-h-60 overflow-y-auto pr-2">
                        {currentTicket.activity_logs && currentTicket.activity_logs.length > 0 ? (
                            currentTicket.activity_logs.map((log) => (
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

                <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="button secondary-button">
                        Cerrar
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default TicketDetailModal;
