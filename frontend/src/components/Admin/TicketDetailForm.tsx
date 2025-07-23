// frontend/src/components/Admin/TicketDetailForm.tsx
import React, { useState, useEffect } from 'react';
import ticketService, { Ticket, Comment } from '../../services/ticketService';
import userService, { User } from '../../services/userService';
import departmentService, { Department } from '../../services/departmentService';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios'; // Importa axios completo para usar axios.isAxiosError

// Define UpdateTicketData y NewCommentInput si no están en ticketService.ts
export interface UpdateTicketData { // Renombrada para evitar conflicto con el tipo Ticket
  subject?: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'assigned';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  agent_id?: number | null;
  department_id?: number;
}

export interface NewCommentInput {
  comment_text: string;
}

interface TicketDetailFormProps {
  ticketId: number | null;
  onClose: () => void;
  onTicketUpdated: () => void; // Callback para indicar que un ticket se ha actualizado
}

const TicketDetailForm: React.FC<TicketDetailFormProps> = ({ ticketId, onClose, onTicketUpdated }) => {
  const { user } = useAuth(); // Obtener el usuario autenticado (para comentarios)
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [agents, setAgents] = useState<User[]>([]); // Para la lista de agentes
  const [departments, setDepartments] = useState<Department[]>([]); // Para la lista de departamentos
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updateFormData, setUpdateFormData] = useState<UpdateTicketData>({}); // Estado para los datos a actualizar

  const fetchTicketDetails = async (id: number) => {
    try {
      setLoading(true);
      const { ticket: fetchedTicket, comments: fetchedComments } = await ticketService.getTicketById(id);
      setTicket(fetchedTicket);
      setComments(fetchedComments);
      
      // Inicializar updateFormData con los datos actuales del ticket
      setUpdateFormData({
        subject: fetchedTicket.subject,
        description: fetchedTicket.description,
        status: fetchedTicket.status,
        priority: fetchedTicket.priority,
        agent_id: fetchedTicket.agent_id,
        department_id: fetchedTicket.department_id,
      });

      setError(null);
    } catch (err: unknown) { // <-- Tipado correcto
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Error al cargar los detalles del ticket.');
      } else {
        setError('Ocurrió un error inesperado al cargar los detalles del ticket.');
      }
      console.error('Error al cargar detalles del ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentsAndDepartments = async () => {
    try {
      // Obtener solo agentes (users con role 'agent')
      const allUsers = await userService.getAllUsers();
      const fetchedAgents = allUsers.filter(u => u.role === 'agent');
      setAgents(fetchedAgents);

      // Obtener departamentos
      const fetchedDepartments = await departmentService.getAllDepartments();
      setDepartments(fetchedDepartments);
    } catch (err: unknown) { // <-- Tipado correcto
      if (axios.isAxiosError(err)) {
        console.error('Error al cargar agentes o departamentos:', err.response?.data?.message || err);
        setError(prev => prev ? prev + ' Error al cargar recursos adicionales.' : 'Error al cargar agentes o departamentos.');
      } else {
        console.error('Error al cargar agentes o departamentos:', err);
        setError(prev => prev ? prev + ' Error al cargar recursos adicionales.' : 'Ocurrió un error inesperado al cargar agentes o departamentos.');
      }
    }
  };

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails(ticketId);
      fetchAgentsAndDepartments();
    }
  }, [ticketId]);

  const handleUpdateFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUpdateFormData((prev) => ({ // <-- CORREGIDO: 'prev' infiere el tipo correctamente aquí
      ...prev,
      [name]: value === 'null' ? null : (name === 'agent_id' || name === 'department_id' ? parseInt(value) : value),
    }));
  };

  const handleUpdateTicket = async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      await ticketService.updateTicket(ticketId, updateFormData);
      onTicketUpdated(); // Notificar al componente padre que se actualizó el ticket
      fetchTicketDetails(ticketId); // Recargar los datos para ver los cambios
      setError(null);
    } catch (err: unknown) { // <-- Tipado correcto
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Error al actualizar el ticket.');
      } else {
        setError('Ocurrió un error inesperado al actualizar el ticket.');
      }
      console.error('Error al actualizar ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!ticketId || !newCommentText.trim() || !user?.id) {
      setError('El comentario no puede estar vacío y el usuario debe estar autenticado.');
      return;
    }
    try {
      setLoading(true);
      // Usar la función correcta del servicio y pasar los parámetros esperados
      await ticketService.addCommentToTicket(ticketId, newCommentText); // <-- CORREGIDO: Usar addCommentToTicket
      setNewCommentText('');
      fetchTicketDetails(ticketId); // Recargar comentarios
      setError(null);
    } catch (err: unknown) { // <-- Tipado correcto
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Error al agregar comentario.');
      } else {
        setError('Ocurrió un error inesperado al agregar comentario.');
      }
      console.error('Error al agregar comentario:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Cargando detalles del ticket...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;
  if (!ticket) return <p>No se encontró el ticket o hubo un error al cargarlo.</p>;

  return (
    <div style={containerStyle}>
      <h3>Detalles del Ticket #{ticket.id}</h3>
      <button onClick={onClose} style={closeButtonStyle}>Cerrar</button>

      <div style={detailGridStyle}>
        <div><strong>Asunto:</strong> <input type="text" name="subject" value={updateFormData.subject || ''} onChange={handleUpdateFieldChange} style={inputStyle} /></div>
        <div><strong>Descripción:</strong> <textarea name="description" value={updateFormData.description || ''} onChange={handleUpdateFieldChange} style={textareaStyle}></textarea></div>
        <div>
          <strong>Estado:</strong>
          <select name="status" value={updateFormData.status || ''} onChange={handleUpdateFieldChange} style={selectStyle}>
            <option value="open">Abierto</option>
            <option value="assigned">Asignado</option>
            <option value="in_progress">En progreso</option>
            <option value="resolved">Resuelto</option>
            <option value="closed">Cerrado</option>
          </select>
        </div>
        <div>
          <strong>Prioridad:</strong>
          <select name="priority" value={updateFormData.priority || ''} onChange={handleUpdateFieldChange} style={selectStyle}>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>
        <div>
          <strong>Departamento:</strong>
          <select name="department_id" value={updateFormData.department_id || ''} onChange={handleUpdateFieldChange} style={selectStyle}>
            <option value="">Seleccionar Departamento</option>
            {departments.map(dep => (
              <option key={dep.id} value={dep.id}>{dep.name}</option>
            ))}
          </select>
        </div>
        <div>
          <strong>Agente Asignado:</strong>
          <select name="agent_id" value={updateFormData.agent_id === null ? 'null' : (updateFormData.agent_id || '')} onChange={handleUpdateFieldChange} style={selectStyle}>
            <option value="null">Sin Asignar</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.username}</option>
            ))}
          </select>
        </div>
        <div><strong>Creado por:</strong> {ticket.user_username}</div>
        <div><strong>Creado en:</strong> {new Date(ticket.created_at).toLocaleString()}</div>
        <div><strong>Última Actualización:</strong> {new Date(ticket.updated_at).toLocaleString()}</div>
      </div>

      <button onClick={handleUpdateTicket} style={{ ...actionButtonStyle, backgroundColor: '#28a745', marginTop: '15px' }}>Actualizar Ticket</button>

      {/* Sección de Comentarios */}
      <h4 style={{ marginTop: '20px' }}>Comentarios</h4>
      <div style={commentsContainerStyle}>
        {comments.length === 0 ? (
          <p>No hay comentarios para este ticket.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} style={commentStyle}>
              <strong>{comment.user_username}:</strong> {comment.comment_text}
              <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '10px' }}>
                {new Date(comment.created_at).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={newCommentStyle}>
        <textarea
          placeholder="Añadir un nuevo comentario..."
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          style={textareaCommentStyle}
        />
        <button onClick={handleAddComment} style={{ ...actionButtonStyle, backgroundColor: '#17a2b8' }}>Añadir Comentario</button>
      </div>
    </div>
  );
};

// --- Estilos ---
const containerStyle: React.CSSProperties = {
  marginTop: '20px',
  padding: '20px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  backgroundColor: '#f9f9f9',
  position: 'relative',
};

const closeButtonStyle: React.CSSProperties = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  padding: '8px 12px',
  backgroundColor: '#6c757d',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
};

const detailGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '15px',
  marginTop: '15px',
};

const inputStyle: React.CSSProperties = {
  width: 'calc(100% - 10px)',
  padding: '8px',
  margin: '5px 0',
  borderRadius: '4px',
  border: '1px solid #ccc',
};

const textareaStyle: React.CSSProperties = {
  width: 'calc(100% - 10px)',
  padding: '8px',
  margin: '5px 0',
  borderRadius: '4px',
  border: '1px solid #ccc',
  minHeight: '80px',
  verticalAlign: 'top',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  margin: '5px 0',
  borderRadius: '4px',
  border: '1px solid #ccc',
};

const commentsContainerStyle: React.CSSProperties = {
  borderTop: '1px solid #eee',
  marginTop: '20px',
  paddingTop: '15px',
  maxHeight: '300px',
  overflowY: 'auto',
};

const commentStyle: React.CSSProperties = {
  backgroundColor: '#e9ecef',
  padding: '10px',
  borderRadius: '5px',
  marginBottom: '10px',
};

const newCommentStyle: React.CSSProperties = {
  marginTop: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const textareaCommentStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  borderRadius: '5px',
  border: '1px solid #ccc',
  minHeight: '60px',
};

const actionButtonStyle: React.CSSProperties = {
  padding: '8px 15px',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '1rem',
};

export default TicketDetailForm;