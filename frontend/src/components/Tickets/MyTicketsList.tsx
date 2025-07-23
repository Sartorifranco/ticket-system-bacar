// frontend/src/components/Tickets/MyTicketsList.tsx
import React, { useEffect, useState, useCallback } from 'react';
<<<<<<< HEAD
import api from '../../config/axiosConfig';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import { Link } from 'react-router-dom';
import '../../index.css';
import './Tickets.css';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations'; // MODIFICACIÓN: Ruta corregida
import { useAuth } from '../../context/AuthContext'; // MODIFICACIÓN: Importar useAuth desde el nuevo archivo de contexto

=======
import api from '../../config/axiosConfig'; 
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards'; 
import { Link } from 'react-router-dom'; 
import '../../index.css'; 
import './Tickets.css'; // <-- Importa los estilos para la tabla

// Interfaz para la estructura de la respuesta de error de la API (consistente)
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
interface ErrorResponseData {
  message?: string;
}

<<<<<<< HEAD
interface Ticket {
  id: number;
=======
// Interfaz para la estructura de un ticket recibido del backend
interface Ticket {
  id: number; 
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
  subject: string;
  description: string;
  status: string;
  priority: string;
<<<<<<< HEAD
  created_at: string;
  updated_at: string;
  user_username: string;
  department_name: string;
  agent_username?: string;
}

interface MyTicketsListProps {
  reload: boolean;
=======
  created_at: string; 
  updated_at: string;
  user_username: string; 
  department_name: string; 
  agent_username?: string; 
}

interface MyTicketsListProps {
  reload: boolean; 
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
  onReloaded: () => void;
}

const MyTicketsList: React.FC<MyTicketsListProps> = ({ reload, onReloaded }) => {
<<<<<<< HEAD
  const { token, addNotification } = useAuth();

=======
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
<<<<<<< HEAD
      if (!token) {
        setError('No autorizado. Token no disponible.');
        addNotification('No autorizado. Por favor, inicia sesión.', 'error');
        setLoading(false);
        return;
      }
      const response = await api.get<{ success: boolean; count: number; tickets: Ticket[] }>('/api/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(response.data.tickets);
    } catch (err: unknown) {
      if (isAxiosErrorTypeGuard(err)) {
        const apiError = err.response?.data as ErrorResponseData;
        setError(apiError?.message || 'Error al cargar tus tickets.');
        addNotification(`Error al cargar tickets: ${apiError?.message || 'Error desconocido'}`, 'error');
      } else {
        setError('Ocurrió un error inesperado al cargar los tickets.');
        addNotification('Ocurrió un error inesperado al cargar los tickets.', 'error');
      }
    } finally {
      setLoading(false);
      onReloaded();
    }
  }, [onReloaded, token, addNotification]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);
=======
      // Pide los tickets específicos del usuario logueado.
      // El backend (getAllTickets) ya filtra por rol si es 'user'.
      const response = await api.get<{ success: boolean; count: number; tickets: Ticket[] }>('/api/tickets'); 
      setTickets(response.data.tickets); // Accede a la propiedad 'tickets' dentro de la respuesta
    } catch (err: unknown) {
      if (isAxiosErrorTypeGuard(err)) {
        const apiError = err.response?.data as ErrorResponseData; 
        setError(apiError?.message || 'Error al cargar tus tickets.');
      } else {
        setError('Ocurrió un error inesperado al cargar los tickets.');
      }
    } finally {
      setLoading(false);
      onReloaded(); 
    }
  }, [onReloaded]); 

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]); 
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e

  useEffect(() => {
    if (reload) {
      fetchTickets();
    }
<<<<<<< HEAD
  }, [reload, fetchTickets]);

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    return date.toLocaleString(undefined, options);
  };
=======
  }, [reload, fetchTickets]); 
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e

  if (loading) return <p style={{ color: 'var(--text-color)' }}>Cargando tickets...</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (tickets.length === 0) return <p style={{ color: 'var(--text-color)' }}>No tienes tickets creados aún.</p>;

  return (
    <div className="my-tickets-list">
<<<<<<< HEAD
      <table className="tickets-table">
=======
      <table className="tickets-table"> 
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
        <thead>
          <tr>
            <th>ID</th>
            <th>Asunto</th>
            <th>Departamento</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Asignado a</th>
            <th>Fecha Creación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
<<<<<<< HEAD
          {tickets.map((ticket) => {
            console.log(`[DEBUG MyTicketsList] Ticket Status: ${ticket.status} -> Translated: ${ticketStatusTranslations[ticket.status]}`);
            console.log(`[DEBUG MyTicketsList] Ticket Priority: ${ticket.priority} -> Translated: ${ticketPriorityTranslations[ticket.priority]}`);
            return (
              <tr key={ticket.id}>
                <td>{ticket.id}</td>
                <td>{ticket.subject}</td>
                <td>{ticket.department_name}</td>
                <td><span className={`status-badge status-${ticket.status}`}>{ticketStatusTranslations[ticket.status] || ticket.status}</span></td>
                <td><span className={`priority-badge priority-${ticket.priority}`}>{ticketPriorityTranslations[ticket.priority] || ticket.priority}</span></td>
                <td>{ticket.agent_username || 'Nadie'}</td>
                <td>
                  {formatTimestamp(ticket.created_at)}
                </td>
                <td>
                  <Link to={`/ticket/${ticket.id}`} className="button secondary-button small-button">Ver Detalle</Link>
                </td>
              </tr>
            );
          })}
=======
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td>{ticket.id}</td>
              <td>{ticket.subject}</td>
              <td>{ticket.department_name}</td>
              <td>{ticket.status}</td>
              <td>{ticket.priority}</td>
              <td>{ticket.agent_username || 'Nadie'}</td>
              <td>
                {new Date(ticket.created_at).toLocaleDateString()}
              </td>
              <td>
                <Link to={`/ticket/${ticket.id}`} className="button secondary-button small-button">Ver Detalle</Link> 
              </td>
            </tr>
          ))}
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
        </tbody>
      </table>
    </div>
  );
};

export default MyTicketsList;