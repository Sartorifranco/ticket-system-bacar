// src/components/Tickets/TicketDetailModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
// CORREGIDO: Importar TicketComment en lugar de Comment
import { TicketData, Comment, User, Department, TicketStatus, TicketPriority } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations';
import { format } from 'date-fns'; // Importar format si lo usas para fechas

interface TicketDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: TicketData; // El ticket completo para mostrar detalles
    onSave: (updatedTicket: Partial<TicketData>) => Promise<void>; // Para guardar cambios en el ticket
    departments: Department[]; // Lista completa de departamentos
    users: User[]; // Lista completa de usuarios (agentes)
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ isOpen, onClose, ticket, onSave, departments, users }) => {
    const { token, user: currentUser } = useAuth();
    const { addNotification } = useNotification();

    const [editedTitle, setEditedTitle] = useState(ticket.title);
    const [editedDescription, setEditedDescription] = useState(ticket.description);
    const [editedStatus, setEditedStatus] = useState<TicketStatus>(ticket.status);
    const [editedPriority, setEditedPriority] = useState<TicketPriority>(ticket.priority);
    const [editedDepartmentId, setEditedDepartmentId] = useState<number | null>(ticket.department_id);
    const [editedAgentId, setEditedAgentId] = useState<number | null>(ticket.assigned_to_user_id);

    // CORREGIDO: Usar TicketComment[]
    const [comments, setComments] = useState<Comment[]>([]);
    const [newCommentText, setNewCommentText] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);

    const isAdmin = currentUser?.role === 'admin';
    const isAgent = currentUser?.role === 'agent';
    const isClient = currentUser?.role === 'client';
    const isAssignedAgent = isAgent && ticket.assigned_to_user_id === currentUser?.id;
    const isTicketCreator = isClient && ticket.user_id === currentUser?.id;

    const canEditTicket = isAdmin || isAssignedAgent;
    const canAddComment = (isAdmin || isAgent || isTicketCreator); // Admins, agentes, y el creador del ticket pueden comentar

    // Fetch comments for the ticket
    const fetchComments = useCallback(async () => {
        setLoadingComments(true);
        try {
            const response = await api.get(`/api/tickets/${ticket.id}/comments`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Asumiendo que el backend devuelve un array de TicketComment
            setComments(response.data);
        } catch (err: unknown) {
            console.error('Error fetching comments:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al cargar comentarios: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al cargar los comentarios.', 'error');
            }
        } finally {
            setLoadingComments(false);
        }
    }, [ticket.id, token, addNotification]);

    useEffect(() => {
        if (isOpen) { // Solo cargar comentarios cuando el modal está abierto
            fetchComments();
        }
    }, [isOpen, fetchComments]);

    const handleSave = async () => {
        const updatedFields: Partial<TicketData> = {};

        if (editedTitle !== ticket.title) updatedFields.title = editedTitle;
        if (editedDescription !== ticket.description) updatedFields.description = editedDescription;
        if (editedStatus !== ticket.status) updatedFields.status = editedStatus;
        if (editedPriority !== ticket.priority) updatedFields.priority = editedPriority;

        const newDepartmentId = editedDepartmentId === null ? null : editedDepartmentId;
        if (newDepartmentId !== (ticket.department_id === null ? null : ticket.department_id)) {
            updatedFields.department_id = newDepartmentId;
        }

        const newAgentId = editedAgentId === null ? null : editedAgentId;
        if (newAgentId !== (ticket.assigned_to_user_id === null ? null : ticket.assigned_to_user_id)) {
            updatedFields.assigned_to_user_id = newAgentId;
        }

        if (Object.keys(updatedFields).length > 0) {
            await onSave(updatedFields);
        }
        onClose();
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCommentText.trim() || !token || !currentUser) {
            addNotification('El comentario no puede estar vacío o no estás autenticado.', 'warning');
            return;
        }

        try {
            const response = await api.post(`/api/tickets/${ticket.id}/comments`, {
                comment_text: newCommentText,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Comentario añadido exitosamente.', 'success');
            setNewCommentText('');
            fetchComments(); // Recargar comentarios
        } catch (err: unknown) {
            console.error('Error adding comment:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al añadir comentario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al añadir el comentario.', 'error');
            }
        }
    };

    // Estas funciones son útiles si el ticket no trae los nombres directamente
    // Pero si TicketData ya tiene user_username y department_name, no son estrictamente necesarias
    // Las mantengo por si las usas en otros lugares o como fallback
    const getDepartmentName = (id: number | null) => {
        return departments.find(d => d.id === id)?.name || 'N/A';
    };

    const getUserUsername = (id: number | null) => {
        return users.find(u => u.id === id)?.username || 'Sin Asignar';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 overflow-y-auto p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl my-8">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">Detalles del Ticket #{ticket.id}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">Título:</label>
                        <input
                            type="text"
                            id="title"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            disabled={!canEditTicket}
                        />
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-gray-700 text-sm font-bold mb-2">Estado:</label>
                        <select
                            id="status"
                            value={editedStatus}
                            onChange={(e) => setEditedStatus(e.target.value as TicketStatus)}
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            disabled={!canEditTicket}
                        >
                            <option value="open">Abierto</option>
                            <option value="in-progress">En Progreso</option>
                            <option value="resolved">Resuelto</option>
                            <option value="closed">Cerrado</option>
                            <option value="reopened">Reabierto</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">Prioridad:</label>
                        <select
                            id="priority"
                            value={editedPriority}
                            onChange={(e) => setEditedPriority(e.target.value as TicketPriority)}
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            disabled={!canEditTicket}
                        >
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="department" className="block text-gray-700 text-sm font-bold mb-2">Departamento:</label>
                        <select
                            id="department"
                            value={editedDepartmentId || ''}
                            onChange={(e) => setEditedDepartmentId(e.target.value ? parseInt(e.target.value) : null)}
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            disabled={!canEditTicket}
                        >
                            <option value="">Seleccionar Departamento</option>
                            {departments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="assignedTo" className="block text-gray-700 text-sm font-bold mb-2">Asignado a:</label>
                        <select
                            id="assignedTo"
                            value={editedAgentId || ''}
                            onChange={(e) => setEditedAgentId(e.target.value ? parseInt(e.target.value) : null)}
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            disabled={!isAdmin && !isAgent} // Solo admins y agentes pueden asignar
                        >
                            <option value="">Sin Asignar</option>
                            {users.filter(u => u.role === 'agent').map(agent => (
                                <option key={agent.id} value={agent.id}>{agent.username}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Creado por:</label>
                        {/* Usar ticket.user_username directamente si el backend lo proporciona */}
                        <p className="py-2 px-3 bg-gray-100 rounded text-gray-700">{ticket.user_username}</p>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Fecha de Creación:</label>
                        <p className="py-2 px-3 bg-gray-100 rounded text-gray-700">{new Date(ticket.created_at).toLocaleString()}</p>
                    </div>
                    {/* Mostrar closed_at solo si existe */}
                    {ticket.closed_at && (
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Fecha de Cierre:</label>
                            <p className="py-2 px-3 bg-gray-100 rounded text-gray-700">{new Date(ticket.closed_at).toLocaleString()}</p>
                        </div>
                    )}
                </div>
                <div className="mb-6">
                    <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Descripción:</label>
                    <textarea
                        id="description"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32"
                        disabled={!canEditTicket}
                    ></textarea>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
                    >
                        Cerrar
                    </button>
                    {canEditTicket && (
                        <button
                            type="button"
                            onClick={handleSave}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                        >
                            Guardar Cambios
                        </button>
                    )}
                </div>

                <h3 className="text-xl font-bold text-gray-800 mb-4 mt-6 border-t pt-4">Comentarios</h3>
                <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-md p-4 mb-6 bg-gray-50">
                    {loadingComments ? (
                        <p className="text-gray-600">Cargando comentarios...</p>
                    ) : comments.length > 0 ? (
                        comments.map((comment: Comment) => (
                            <div key={comment.id} className="mb-4 pb-2 border-b border-gray-200 last:border-b-0">
                                <p className="text-sm font-semibold text-gray-700">
                                    {comment.user_username} <span className="text-gray-500 text-xs">- {new Date(comment.created_at).toLocaleString()}</span>
                                </p>
                                <p className="text-gray-800 mt-1 whitespace-pre-wrap">{comment.comment_text}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-600">No hay comentarios para este ticket.</p>
                    )}
                </div>

                {canAddComment && (
                    <form onSubmit={handleAddComment} className="mt-4">
                        <textarea
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24 mb-4"
                            placeholder="Añadir un comentario..."
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            required
                        ></textarea>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
                            >
                                Añadir Comentario
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default TicketDetailModal;
