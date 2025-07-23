// frontend/src/pages/AdminTicketsPage.tsx
// ¡IMPORTANTE! Asegúrate de que este archivo se llame AdminTicketPage.tsx (sin 's' al final) en tu sistema de archivos
import React, { useEffect, useState } from 'react';
import axios from '../config/axiosConfig'; // Asegúrate de que esta ruta sea correcta
import { useAuth } from '../context/AuthContext'; // Para obtener el token
import '../index.css'; // Estilos globales
// ¡IMPORTACIÓN CORREGIDA! Ahora apunta a 'AdminTicketPage.css' (sin 's' al final)
import './AdminTicketPage.css'; // Estilos específicos de la página de tickets (¡ASEGÚRATE DE QUE ESTE ARCHIVO EXISTA Y SE LLAME ASÍ!)
import { format } from 'date-fns'; // Para formatear fechas

// Definición de tipos para el ticket y los comentarios
interface Ticket {
    id: number;
    user_id: number;
    user_username: string;
    agent_id: number | null;
    agent_username: string | null;
    department_id: number;
    department_name: string;
    subject: string;
    description: string;
    status: 'open' | 'in-progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    created_at: string;
    updated_at: string;
}

interface Comment {
    id: number;
    ticket_id: number;
    user_id: number;
    user_username: string;
    comment_text: string;
    created_at: string;
}

const AdminTicketPage: React.FC = () => {
    const { user, token } = useAuth(); // Obtener el usuario y el token del contexto de autenticación
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para el modal de detalle del ticket
    const [showModal, setShowModal] = useState<boolean>(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [ticketComments, setTicketComments] = useState<Comment[]>([]);
    const [commentLoading, setCommentLoading] = useState<boolean>(false);
    const [commentError, setCommentError] = useState<string | null>(null);

    // Estado para la asignación de agente
    const [agents, setAgents] = useState<{ id: number; username: string }[]>([]);
    const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null); // Para el select de asignación

    useEffect(() => {
        const fetchTicketsAndAgents = async () => {
            if (!token) {
                setError('No autenticado. Por favor, inicia sesión.');
                setLoading(false);
                return;
            }

            try {
                // Obtener tickets
                const ticketsResponse = await axios.get('/api/tickets', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setTickets(ticketsResponse.data.tickets);

                // Obtener agentes para la asignación
                const agentsResponse = await axios.get('/api/users', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                // Filtrar solo los usuarios con rol 'agent'
                const agentUsers = agentsResponse.data.users.filter((u: any) => u.role === 'agent');
                setAgents(agentUsers);

            } catch (err: any) {
                console.error('Error al cargar tickets o agentes:', err);
                setError(err.response?.data?.message || 'Error al cargar los datos.');
            } finally {
                setLoading(false);
            }
        };

        fetchTicketsAndAgents();
    }, [token]);

    // Función para abrir el modal y cargar los comentarios del ticket
    const openTicketDetailsModal = async (ticket: Ticket) => {
        console.log("openTicketDetailsModal llamado con el ticket:", ticket); // DEBUG: Verifica si la función se llama
        setSelectedTicket(ticket);
        setShowModal(true);
        console.log("showModal state set to true. Current value:", true); // DEBUG: Confirma el estado
        setCommentLoading(true);
        setCommentError(null);
        try {
            const commentsResponse = await axios.get(`/api/tickets/${ticket.id}/comments`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setTicketComments(commentsResponse.data.comments);
            console.log("Comentarios cargados:", commentsResponse.data.comments); // DEBUG: Verifica los comentarios
        } catch (err: any) {
            console.error('Error al cargar comentarios:', err);
            setCommentError(err.response?.data?.message || 'Error al cargar los comentarios.');
        } finally {
            setCommentLoading(false);
        }
    };

    const closeTicketDetailsModal = () => {
        console.log("closeTicketDetailsModal llamado."); // DEBUG
        setShowModal(false);
        console.log("showModal state set to false. Current value:", false); // DEBUG: Confirma el estado
        setSelectedTicket(null);
        setTicketComments([]);
    };

    // Función para asignar ticket a agente
    const handleAssignTicket = async (ticketId: number) => {
        if (!selectedAgentId) {
            alert('Por favor, selecciona un agente.'); // Usar un modal personalizado en un entorno real
            return;
        }

        if (!token) {
            setError('No autenticado. Por favor, inicia sesión.');
            return;
        }

        try {
            await axios.put(`/api/tickets/${ticketId}/assign`, 
                { agent_id: selectedAgentId },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            alert('Ticket asignado exitosamente!'); // Usar un modal personalizado en un entorno real
            closeTicketDetailsModal(); // Cerrar modal después de asignar
            // Refrescar la lista de tickets
            const ticketsResponse = await axios.get('/api/tickets', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTickets(ticketsResponse.data.tickets);
        } catch (err: any) {
            console.error('Error al asignar ticket:', err);
            setError(err.response?.data?.message || 'Error al asignar el ticket.');
            alert(err.response?.data?.message || 'Error al asignar el ticket.'); // Mostrar error en alert
        }
    };

    if (loading) {
        return <div className="loading-message">Cargando tickets...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="admin-page-container">
            <h1 className="page-title">Gestión de Tickets</h1>

            <div className="tickets-table-container">
                <table className="tickets-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Asunto</th>
                            <th>Usuario</th>
                            <th>Departamento</th>
                            <th>Agente Asignado</th>
                            <th>Estado</th>
                            <th>Prioridad</th>
                            <th>Creado</th>
                            <th>Última Actualización</th>
                            <th>Acciones</th> {/* Columna para el botón de asignar */}
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.map((ticket) => (
                            <tr key={ticket.id} className="ticket-row">{/* Eliminar espacios y saltos de línea aquí para evitar validateDOMNesting */}
                                <td onClick={() => openTicketDetailsModal(ticket)} className="ticket-cell-clickable">{ticket.id}</td>
                                <td onClick={() => openTicketDetailsModal(ticket)} className="ticket-cell-clickable">{ticket.subject}</td>
                                <td onClick={() => openTicketDetailsModal(ticket)} className="ticket-cell-clickable">{ticket.user_username}</td>
                                <td onClick={() => openTicketDetailsModal(ticket)} className="ticket-cell-clickable">{ticket.department_name}</td>
                                <td onClick={() => openTicketDetailsModal(ticket)} className="ticket-cell-clickable">{ticket.agent_username || 'Sin asignar'}</td>
                                <td onClick={() => openTicketDetailsModal(ticket)} className="ticket-cell-clickable">{ticket.status}</td>
                                <td onClick={() => openTicketDetailsModal(ticket)} className="ticket-cell-clickable">{ticket.priority}</td>
                                <td onClick={() => openTicketDetailsModal(ticket)} className="ticket-cell-clickable">{format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm')}</td>
                                <td onClick={() => openTicketDetailsModal(ticket)} className="ticket-cell-clickable">{format(new Date(ticket.updated_at), 'dd/MM/yyyy HH:mm')}</td>
                                <td>
                                    <select 
                                        onChange={(e) => setSelectedAgentId(e.target.value ? parseInt(e.target.value) : null)}
                                        onClick={(e) => e.stopPropagation()} // Evita que el click en el select abra el modal
                                        value={ticket.agent_id || ''} // Valor inicial del select
                                        className="assign-select"
                                    >
                                        <option value="">Asignar Agente</option>
                                        {agents.map((agent) => (
                                            <option key={agent.id} value={agent.id}>
                                                {agent.username}
                                            </option>
                                        ))}
                                    </select>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation(); // Evita que el click en el botón abra el modal
                                            handleAssignTicket(ticket.id);
                                        }}
                                        className="button small-button primary-button"
                                    >
                                        Asignar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Detalle del Ticket */}
            {showModal && selectedTicket && (
                <div className="modal-overlay" style={{ display: 'flex', zIndex: 9999 }}> {/* DEBUG: Fuerza visibilidad */}
                    <div className="modal-content">
                        <span className="close-button" onClick={closeTicketDetailsModal}>&times;</span>
                        <h2>Detalles del Ticket #{selectedTicket.id}</h2>
                        <p><strong>Asunto:</strong> {selectedTicket.subject}</p>
                        <p><strong>Descripción:</strong> {selectedTicket.description}</p>
                        <p><strong>Usuario:</strong> {selectedTicket.user_username}</p>
                        <p><strong>Departamento:</strong> {selectedTicket.department_name}</p>
                        <p><strong>Agente Asignado:</strong> {selectedTicket.agent_username || 'Sin asignar'}</p>
                        <p><strong>Estado:</strong> {selectedTicket.status}</p>
                        <p><strong>Prioridad:</strong> {selectedTicket.priority}</p>
                        <p><strong>Creado:</strong> {format(new Date(selectedTicket.created_at), 'dd/MM/yyyy HH:mm')}</p>
                        <p><strong>Última Actualización:</strong> {format(new Date(selectedTicket.updated_at), 'dd/MM/yyyy HH:mm')}</p>

                        <h3>Comentarios:</h3>
                        {commentLoading ? (
                            <p>Cargando comentarios...</p>
                        ) : commentError ? (
                            <p className="error-message">{commentError}</p>
                        ) : ticketComments.length > 0 ? (
                            <div className="comments-list">
                                {ticketComments.map((comment) => (
                                    <div key={comment.id} className="comment-item">
                                        <p><strong>{comment.user_username}:</strong> {comment.comment_text}</p>
                                        <small>{format(new Date(comment.created_at), 'dd/MM/yyyy HH:mm')}</small>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No hay comentarios para este ticket.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTicketPage;