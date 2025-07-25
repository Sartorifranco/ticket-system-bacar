// frontend/src/components/Tickets/TicketDetailModal.tsx
// Este componente es un modal para ver y editar los detalles de un ticket.
// Recibe los datos del ticket y otras dependencias como props.

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Common/Modal'; // Asegúrate de que la ruta sea correcta para tu componente Modal
import api from '../../config/axiosConfig';
import { TicketData, User, Department, TicketStatus, TicketPriority, Comment } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext'; 
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations';
import { format } from 'date-fns'; // Importar format de date-fns

interface TicketDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: TicketData;
    onTicketUpdated: () => void; // Callback para cuando el ticket se actualiza
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
    users 
}) => {
    const { user: currentUser } = useAuth(); 
    const { addNotification } = useNotification(); 

    const [currentTicket, setCurrentTicket] = useState<TicketData>(ticket);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [title, setTitle] = useState(ticket.title); 
    const [description, setDescription] = useState(ticket.description);
    const [status, setStatus] = useState<TicketStatus>(ticket.status);
    const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
    const [departmentId, setDepartmentId] = useState<number | null>(ticket.department_id);
    const [agentId, setAgentId] = useState<number | null>(ticket.assigned_to_user_id || null); 

    const [commentText, setCommentText] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (isOpen) { 
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
        }
    }, [isOpen, ticket]); 

    const handleSaveEdits = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('No autorizado para actualizar el ticket.', 'error');
                return;
            }

            const updatedFields: Partial<TicketData> = {}; 
            if (title !== currentTicket.title) updatedFields.title = title; 
            if (description !== currentTicket.description) updatedFields.description = description;
            if (status !== currentTicket.status) updatedFields.status = status;
            if (priority !== currentTicket.priority) updatedFields.priority = priority;
            
            if (departmentId !== currentTicket.department_id) updatedFields.department_id = departmentId;
            if (agentId !== currentTicket.assigned_to_user_id) updatedFields.assigned_to_user_id = agentId; 

            if (Object.keys(updatedFields).length === 0) {
                addNotification('No se detectaron cambios para guardar.', 'info');
                setIsEditing(false);
                return;
            }

            const response = await api.put(`/api/tickets/${currentTicket.id}`, updatedFields, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCurrentTicket(response.data); 
            addNotification('Ticket actualizado exitosamente.', 'success');
            onTicketUpdated(); 
            setIsEditing(false);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al actualizar el ticket.');
                addNotification(`Error al actualizar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al actualizar el ticket.');
                addNotification('Ocurrió un error inesperado al actualizar el ticket.', 'error');
            }
            console.error('Error updating ticket:', err);
        } finally {
            setLoading(false);
        }
    }, [title, description, status, priority, departmentId, agentId, currentTicket, token, addNotification, onTicketUpdated]);

    const handleAddComment = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) {
            addNotification('El comentario no puede estar vacío.', 'warning');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('No autorizado para añadir comentarios.', 'error');
                return;
            }

            // --- INICIO DE DEBUGGING ---
            console.log('[DEBUG TicketDetailModal] Valor de commentText antes de enviar:', commentText);
            // --- FIN DE DEBUGGING ---

            const response = await api.post(`/api/tickets/${currentTicket.id}/comments`, { message_text: commentText }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            
            const updatedTicketResponse = await api.get(`/api/tickets/${currentTicket.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCurrentTicket(updatedTicketResponse.data);
            setCommentText('');
            addNotification('Comentario añadido exitosamente.', 'success');
            onTicketUpdated(); 
        } catch (err: unknown) {
            // --- INICIO DE DEBUGGING ---
            console.error('[DEBUG TicketDetailModal] Error completo al añadir comentario:', err);
            if (isAxiosErrorTypeGuard(err)) {
                console.error('[DEBUG TicketDetailModal] Datos de respuesta de error de Axios:', err.response?.data);
            }
            // --- FIN DE DEBUGGING ---

            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al añadir comentario.');
                addNotification(`Error al añadir comentario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al añadir el comentario.');
                addNotification('Ocurrió un error inesperado al añadir el comentario.', 'error');
            }
            console.error('Error adding comment:', err);
        } finally {
            setLoading(false);
        }
    }, [commentText, currentTicket, token, addNotification, onTicketUpdated]);

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

    const formatTimestamp = (isoString: string | null) => { 
        if (!isoString) return 'N/A'; 
        return format(new Date(isoString), 'dd/MM/yyyy HH:mm:ss');
    };

    const getDepartmentName = (id: number | null) => {
        if (!id) return 'N/A';
        const dept = departments.find(d => d.id === id);
        return dept ? dept.name : 'Desconocido';
    };

    const getAgentUsername = (id: number | null) => {
        if (!id) return 'Sin asignar';
        const agent = users.find(u => u.id === id && u.role === 'agent');
        return agent ? agent.username : 'Desconocido';
    };

    const isAgentOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'agent';
    const canEdit = isAgentOrAdmin || (currentUser?.id === currentTicket.user_id && (currentTicket.status === 'open' || currentTicket.status === 'in-progress' || currentTicket.status === 'reopened'));
    const canAssign = currentUser?.role === 'admin' || (currentUser?.role === 'agent' && (currentTicket.assigned_to_user_id === currentUser.id || currentTicket.assigned_to_user_id === null));

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Ticket #${currentTicket.id}: ${currentTicket.title}`}>
            <div className="p-4">
                {error && <div className="error-message text-center p-3 mb-4">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="detail-item">
                        <span className="detail-label">Asunto:</span>
                        {isEditing && canEdit ? (
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="form-input"
                            />
                        ) : (
                            <span className="detail-value">{currentTicket.title}</span> 
                        )}
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Estado:</span>
                        {isEditing && canEdit ? (
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                                className="form-select"
                            >
                                {Object.entries(ticketStatusTranslations).map(([key, value]) => (
                                    <option key={key} value={key}>{value}</option>
                                ))}
                            </select>
                        ) : (
                            <span className={`status-badge status-${currentTicket.status}`}>
                                {ticketStatusTranslations[currentTicket.status] || currentTicket.status}
                            </span>
                        )}
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Prioridad:</span>
                        {isEditing && canEdit ? (
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                                className="form-select"
                            >
                                {Object.entries(ticketPriorityTranslations).map(([key, value]) => (
                                    <option key={key} value={key}>{value}</option>
                                ))}
                            </select>
                        ) : (
                            <span className={`priority-badge priority-${currentTicket.priority}`}>
                                {ticketPriorityTranslations[currentTicket.priority] || currentTicket.priority}
                            </span>
                        )}
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Departamento:</span>
                        {isEditing && canEdit ? (
                            <select
                                value={departmentId === null ? '' : departmentId}
                                onChange={(e) => setDepartmentId(parseInt(e.target.value) || null)}
                                className="form-select"
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
                        <span className="detail-label">Cliente:</span>
                        <span className="detail-value">{currentTicket.user_username}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Asignado a:</span>
                        {isEditing && canAssign ? ( 
                            <select
                                value={agentId === null ? '' : agentId}
                                onChange={(e) => setAgentId(parseInt(e.target.value) || null)}
                                className="form-select"
                            >
                                <option value="">Sin asignar</option>
                                {users.filter(u => u.role === 'agent').map(agent => (
                                    <option key={agent.id} value={agent.id}>{agent.username}</option>
                                ))}
                            </select>
                        ) : (
                            <span className="detail-value">{currentTicket.agent_username || 'N/A'}</span>
                        )}
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Creado:</span>
                        <span className="detail-value">{formatTimestamp(currentTicket.created_at)}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Última Actualización:</span>
                        <span className="detail-value">{formatTimestamp(currentTicket.updated_at)}</span>
                    </div>
                    {currentTicket.closed_at && ( 
                        <div className="detail-item">
                            <span className="detail-label">Fecha Cierre:</span>
                            <span className="detail-value">{formatTimestamp(currentTicket.closed_at)}</span> 
                        </div>
                    )}
                </div>

                <div className="mb-6">
                    <span className="detail-label block mb-2">Descripción:</span>
                    {isEditing && canEdit ? (
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="form-input w-full"
                            rows={4}
                        ></textarea>
                    ) : (
                        <p className="p-3 bg-gray-50 rounded-md border border-gray-200 text-gray-800 whitespace-pre-wrap">{currentTicket.description}</p>
                    )}
                </div>

                <h3 className="text-xl font-bold text-gray-800 mb-4 border-t pt-4">Comentarios</h3>
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3 mb-4 bg-gray-50">
                    {currentTicket.comments && currentTicket.comments.length > 0 ? (
                        currentTicket.comments.map((comment: Comment) => (
                            <div key={comment.id} className="bg-white p-3 rounded-lg shadow-sm mb-3 last:mb-0">
                                <p className="text-gray-700">
                                    <span className="font-semibold">{comment.user_username}:</span> {comment.message} 
                                </p>
                                <p className="text-sm text-gray-500 text-right">
                                    {formatTimestamp(comment.created_at)}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-600">No hay comentarios para este ticket.</p>
                    )}
                </div>

                <form onSubmit={handleAddComment} className="flex flex-col gap-3">
                    <textarea
                        className="form-input w-full"
                        placeholder="Añadir un nuevo comentario..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={3}
                        disabled={loading}
                    ></textarea>
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 self-end"
                        disabled={loading}
                    >
                        {loading ? 'Añadiendo...' : 'Añadir Comentario'}
                    </button>
                </form>

                <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                    {isEditing && canEdit ? (
                        <>
                            <button
                                onClick={handleSaveEdits}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                                disabled={loading}
                            >
                                {loading ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors duration-200"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                        </>
                    ) : (
                        canEdit && ( 
                            <button
                                onClick={() => setIsEditing(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                                disabled={loading}
                            >
                                Editar Ticket
                            </button>
                        )
                    )}
                    <button
                        onClick={onClose}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                        disabled={loading}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default TicketDetailModal;
