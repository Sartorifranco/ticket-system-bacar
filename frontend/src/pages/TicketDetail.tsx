<<<<<<< HEAD
// frontend/src/pages/TicketDetail.tsx
// Este es el componente de página TicketDetail.
// Contiene la lógica para ver y editar un ticket directamente en la página.

// DEBUG_MARKER_UNIQUE_STRING_20250718_1530_UNIFIED

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig'; // Asegúrate de que la ruta sea correcta
import { TicketData, Comment, User, Department } from '../types';
import { useAuth } from '../context/AuthContext';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../utils/typeGuards';
// CORREGIDO: Ruta de importación a traslations.ts
import { ticketStatusTranslations, ticketPriorityTranslations, translateTerm } from '../utils/traslations';

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Obtener el ID del ticket de la URL
  const ticketId = parseInt(id || '0');
  const navigate = useNavigate();
  const { token, user, addNotification } = useAuth(); // Obtener el usuario logueado para verificar roles

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false); // Estado para el modo edición de la página
  const [editedSubject, setEditedSubject] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedStatus, setEditedStatus] = useState<TicketData['status']>('open');
  const [editedPriority, setEditedPriority] = useState<TicketData['priority']>('medium');
  const [editedDepartmentId, setEditedDepartmentId] = useState<number | ''>('');
  const [editedAgentId, setEditedAgentId] = useState<number | ''>('');
  const [allUsers, setAllUsers] = useState<User[]>([]); // Para el select de agentes
  const [allDepartments, setAllDepartments] = useState<Department[]>([]); // Para el select de departamentos

  // Función para cargar los detalles del ticket y datos relacionados
  const fetchTicketAndRelatedData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        setError('No autorizado. Por favor, inicia sesión de nuevo.');
        addNotification('No autorizado para ver detalles del ticket.', 'error');
        navigate('/login'); // Redirigir si no hay token
        return;
      }
      if (!ticketId) {
        setError('ID de ticket no válido.');
        setLoading(false);
        return;
      }

      // Realizar todas las llamadas a la API en paralelo
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
      setEditedSubject(fetchedTicket.subject);
      setEditedDescription(fetchedTicket.description);
      setEditedStatus(fetchedTicket.status);
      setEditedPriority(fetchedTicket.priority);
      setEditedDepartmentId(fetchedTicket.department_id || '');
      setEditedAgentId(fetchedTicket.agent_id || '');

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
  }, [ticketId, token, addNotification, navigate]); // Añadir navigate a las dependencias

  // Efecto para cargar los datos cuando el componente se monta o el ID del ticket cambia
  useEffect(() => {
    fetchTicketAndRelatedData();
  }, [fetchTicketAndRelatedData]);

  // Manejador para añadir un nuevo comentario
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !ticket) return;

    setLoading(true); // Bloquear UI mientras se añade el comentario
    setError(null);
    try {
      if (!token) {
        setError('No autorizado. Por favor, inicia sesión de nuevo.');
        addNotification('No autorizado para añadir comentarios.', 'error');
        return;
      }
      await api.post(`/api/tickets/${ticket.id}/comments`, { comment: newComment }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewComment(''); // Limpiar el campo de comentario
      addNotification('Comentario añadido exitosamente.', 'success');
      fetchTicketAndRelatedData(); // Recargar ticket y comentarios para ver el nuevo
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

  // Manejador para guardar los cambios del ticket en modo edición
  const handleSaveEdits = async () => {
    if (!ticket) return;

    setLoading(true); // Bloquear UI mientras se guardan los cambios
    setError(null);
    try {
      if (!token) {
        setError('No autorizado. Por favor, inicia sesión de nuevo.');
        addNotification('No autorizado para guardar cambios.', 'error');
        return;
      }

      const updatedFields: any = {};
      // Comparar y añadir solo los campos que han cambiado
      if (editedSubject !== ticket.subject) updatedFields.subject = editedSubject;
      if (editedDescription !== ticket.description) updatedFields.description = editedDescription;
      if (editedStatus !== ticket.status) updatedFields.status = editedStatus;
      if (editedPriority !== ticket.priority) updatedFields.priority = editedPriority;
      // Manejar department_id y agent_id para permitir 'null' si se desasigna
      if (editedDepartmentId !== (ticket.department_id || '')) updatedFields.department_id = editedDepartmentId === '' ? null : editedDepartmentId;
      if (editedAgentId !== (ticket.agent_id || '')) updatedFields.agent_id = editedAgentId === '' ? null : editedAgentId;

      if (Object.keys(updatedFields).length > 0) {
        await api.put(`/api/tickets/${ticket.id}`, updatedFields, {
          headers: { Authorization: `Bearer ${token}` },
        });
        addNotification('Ticket actualizado exitosamente.', 'success');
        fetchTicketAndRelatedData(); // Recargar el ticket para ver los cambios actualizados
        setIsEditing(false); // Salir del modo edición
      } else {
        addNotification('No se detectaron cambios para guardar.', 'info');
        setIsEditing(false); // Salir del modo edición si no hay cambios
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
  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
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
    return <div className="loading-message">Cargando detalles del ticket...</div>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  if (!ticket) {
    return <p className="info-text">Ticket no encontrado.</p>;
  }

  // Determinar si el usuario actual puede editar el ticket
  // Un admin puede editar cualquier ticket. Un agente puede editar tickets asignados a él o sin asignar.
  const canEdit = user?.role === 'admin' || (user?.role === 'agent' && (ticket.agent_id === user.id || ticket.agent_id === null));


  return (
    <div className="ticket-detail-container">
      <h2 className="text-3xl font-bold text-primary-color mb-6 text-center">Detalles del Ticket #{ticket.id}</h2>

      <div className="ticket-info-grid">
        <div className="ticket-info-item">
          <strong>Asunto:</strong>
          {isEditing && canEdit ? (
            <input
              type="text"
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              className="form-input mt-1"
            />
          ) : (
            <span> {ticket.subject}</span>
          )}
        </div>
        <div className="ticket-info-item">
          <strong>Estado:</strong>
          {isEditing && canEdit ? (
            <select
              value={editedStatus}
              onChange={(e) => setEditedStatus(e.target.value as TicketData['status'])}
              className="form-select mt-1"
            >
              {Object.entries(ticketStatusTranslations).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          ) : (
            <span className={`status-badge status-${ticket.status} ml-2`}>
              {ticketStatusTranslations[ticket.status] || ticket.status}
            </span>
          )}
        </div>
        <div className="ticket-info-item">
          <strong>Prioridad:</strong>
          {isEditing && canEdit ? (
            <select
              value={editedPriority}
              onChange={(e) => setEditedPriority(e.target.value as TicketData['priority'])}
              className="form-select mt-1"
            >
              {Object.entries(ticketPriorityTranslations).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
              ))}
            </select>
          ) : (
            <span className={`priority-badge priority-${ticket.priority} ml-2`}>
              {ticketPriorityTranslations[ticket.priority] || ticket.priority}
            </span>
          )}
        </div>
        <div className="ticket-info-item">
          <strong>Departamento:</strong>
          {isEditing && canEdit ? (
            <select
              value={editedDepartmentId}
              onChange={(e) => setEditedDepartmentId(parseInt(e.target.value) || '')}
              className="form-select mt-1"
            >
              <option value="">Seleccionar Departamento</option>
              {allDepartments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          ) : (
            <span> {getDepartmentName(ticket.department_id)}</span>
          )}
        </div>
        <div className="ticket-info-item">
          <strong>Cliente:</strong> <span>{ticket.user_username}</span>
        </div>
        <div className="ticket-info-item">
          <strong>Agente Asignado:</strong>
          {isEditing && canEdit ? (
            <select
              value={editedAgentId}
              onChange={(e) => setEditedAgentId(parseInt(e.target.value) || '')}
              className="form-select mt-1"
            >
              <option value="">Sin asignar</option>
              {allUsers.filter(u => u.role === 'agent').map(agent => (
                <option key={agent.id} value={agent.id}>{agent.username}</option>
              ))}
            </select>
          ) : (
            <span> {getAgentUsername(ticket.agent_id)}</span>
          )}
        </div>
        <div className="ticket-info-item">
          <strong>Creado:</strong> <span>{formatTimestamp(ticket.created_at)}</span>
        </div>
        <div className="ticket-info-item">
          <strong>Última Actualización:</strong> <span>{formatTimestamp(ticket.updated_at)}</span>
        </div>
        {ticket.resolved_at && (
          <div className="ticket-info-item">
            <strong>Resuelto:</strong> <span>{formatTimestamp(ticket.resolved_at)}</span>
          </div>
        )}
      </div>

      <div className="ticket-info-item full-width">
        <strong>Descripción:</strong>
        {isEditing && canEdit ? (
          <textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            className="form-textarea mt-1"
            rows={4}
          ></textarea>
        ) : (
          <p className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded">{ticket.description}</p>
        )}
      </div>

      <h3 className="text-xl font-bold text-primary-color mb-4 mt-6">Comentarios</h3>
      <div className="ticket-comments-list">
        {ticket.comments && ticket.comments.length > 0 ? (
          ticket.comments.map((comment: Comment) => {
            // AÑADIDO: Log para inspeccionar el objeto 'comment' en tiempo de ejecución
            console.log("DEBUG: Comment object in TicketDetail.tsx:", comment);
            return (
              <div key={comment.id} className="ticket-comment-item">
                <p className="ticket-comment-author">
                  {comment.user_username}
                  <span className="ticket-comment-date">
                    {formatTimestamp(comment.created_at)}
                  </span>
                </p>
                {/* ¡ESTA ES LA LÍNEA CRÍTICA! DEBE SER comment.comment_text */}
                <p className="ticket-detail-comment-text">{comment.comment_text}</p>
              </div>
            );
          })
        ) : (
          <p className="info-text">No hay comentarios para este ticket.</p>
        )}
      </div>

      <form onSubmit={handleAddComment} className="ticket-add-comment">
        <textarea
          className="form-textarea"
          placeholder="Añadir un nuevo comentario..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          disabled={loading}
        ></textarea>
        <button type="submit" className="button primary-button" disabled={loading}>
          {loading ? 'Añadiendo...' : 'Añadir Comentario'}
        </button>
      </form>

      {canEdit && ( // Solo mostrar botones de edición si el usuario tiene permiso
        <div className="ticket-actions mt-6">
          {isEditing ? (
            <>
              <button onClick={handleSaveEdits} className="button primary-button mr-2" disabled={loading}>
                {loading ? 'Guardando Edición...' : 'Guardar Edición'}
              </button>
              <button onClick={() => setIsEditing(false)} className="button secondary-button" disabled={loading}>
                Cancelar Edición
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="button secondary-button" disabled={loading}>
              Editar Ticket
            </button>
          )}
        </div>
      )}
=======
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../config/axiosConfig'; // Ruta relativa desde pages/
import { isAxiosErrorTypeGuard } from '../utils/typeGuards'; // Ruta relativa desde pages/
import { useAuth } from '../context/AuthContext'; // Para obtener el usuario y su rol

// Interfaz para el objeto de Ticket (debe coincidir con la respuesta de tu backend para GET /api/tickets/:id)
interface Ticket {
  id: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  user_username: string; // Nombre de usuario del creador del ticket
  department_name: string; // Nombre del departamento
  agent_username?: string | null; // Nombre del agente asignado (puede ser null)
  user_id: number; // ID del usuario creador (para validaciones de permiso)
  agent_id?: number | null; // ID del agente asignado
  department_id: number; // ID del departamento
}

// Interfaz para el objeto de Comentario
interface Comment {
  id: number;
  ticket_id: number;
  user_id: number;
  user_username: string;
  comment_text: string;
  created_at: string;
}

// Interfaz para la respuesta de error de la API
interface ErrorResponseData {
  message?: string;
}

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Obtiene el ID del ticket de la URL
  const { user } = useAuth(); // Obtiene el usuario actual del contexto de autenticación

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Función para obtener los detalles del ticket y sus comentarios
  const fetchTicketDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // El endpoint getTicketById en el backend ya debería devolver los comentarios
      const response = await api.get(`/api/tickets/${id}`);
      setTicket(response.data.ticket);
      setComments(response.data.comments || []); // Asegura que comments es un array
    } catch (err: unknown) {
      if (isAxiosErrorTypeGuard(err)) {
        const apiError = err.response?.data as ErrorResponseData;
        setError(apiError?.message || 'Error al cargar los detalles del ticket.');
      } else {
        setError('Ocurrió un error inesperado al cargar el ticket.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para enviar un nuevo comentario
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentSending(true);
    setCommentError(null);

    if (!newCommentText.trim()) {
      setCommentError('El comentario no puede estar vacío.');
      setCommentSending(false);
      return;
    }

    try {
      // Envía el comentario al backend
      await api.post(`/api/tickets/${id}/comments`, { comment_text: newCommentText });
      setNewCommentText(''); // Limpia el input del comentario
      fetchTicketDetails(); // Vuelve a cargar los detalles del ticket para ver el nuevo comentario
    } catch (err: unknown) {
      if (isAxiosErrorTypeGuard(err)) {
        const apiError = err.response?.data as ErrorResponseData;
        setCommentError(apiError?.message || 'Error al añadir el comentario.');
      } else {
        setCommentError('Ocurrió un error inesperado al añadir el comentario.');
      }
    } finally {
      setCommentSending(false);
    }
  };

  // Carga los detalles del ticket al montar el componente o cuando el ID cambia
  useEffect(() => {
    if (id) {
      fetchTicketDetails();
    }
  }, [id]); // Dependencia del efecto

  if (loading) return <p>Cargando detalles del ticket...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (!ticket) return <p>Ticket no encontrado.</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', backgroundColor: '#f9f9f9', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#333' }}>Detalle del Ticket #{ticket.id}</h2>
      
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #eee' }}>
        <p><strong>Asunto:</strong> {ticket.subject}</p>
        <p><strong>Descripción:</strong> {ticket.description}</p>
        <p><strong>Departamento:</strong> {ticket.department_name}</p>
        <p><strong>Estado:</strong> {ticket.status}</p>
        <p><strong>Prioridad:</strong> {ticket.priority}</p>
        <p><strong>Creado por:</strong> {ticket.user_username}</p>
        <p><strong>Asignado a:</strong> {ticket.agent_username || 'Nadie'}</p>
        <p><strong>Fecha de Creación:</strong> {new Date(ticket.created_at).toLocaleString()}</p>
        <p><strong>Última Actualización:</strong> {new Date(ticket.updated_at).toLocaleString()}</p>
      </div>

      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
        <h3>Comentarios ({comments.length})</h3>
        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px', border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
          {comments.length === 0 ? (
            <p>No hay comentarios para este ticket.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} style={{ marginBottom: '15px', padding: '10px', borderBottom: '1px dashed #eee' }}>
                <p><strong>{comment.user_username}:</strong> {comment.comment_text}</p>
                <small style={{ color: '#777' }}>{new Date(comment.created_at).toLocaleString()}</small>
              </div>
            ))
          )}
        </div>

        {/* Formulario para añadir comentarios */}
        <form onSubmit={handleAddComment}>
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="newComment" style={{ display: 'block', marginBottom: '5px' }}>Añadir un comentario:</label>
            <textarea
              id="newComment"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              rows={3}
              required
              disabled={commentSending}
              style={{ width: 'calc(100% - 20px)', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            ></textarea>
          </div>
          {commentError && <p style={{ color: 'red', marginBottom: '10px' }}>{commentError}</p>}
          <button
            type="submit"
            disabled={commentSending || !newCommentText.trim()}
            style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' }}
          >
            {commentSending ? 'Enviando...' : 'Añadir Comentario'}
          </button>
        </form>
      </div>
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
    </div>
  );
};

<<<<<<< HEAD
export default TicketDetail;
=======
export default TicketDetail;
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
