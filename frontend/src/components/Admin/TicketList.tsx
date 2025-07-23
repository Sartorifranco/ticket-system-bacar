// frontend/src/components/Admin/TicketList.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Mantener axios para axios.isAxiosError
import ticketService, { Ticket } from '../../services/ticketService';
// import './TicketList.css'; // <-- Si tienes un archivo CSS para esto, impórtalo aquí

interface TicketListProps {
  onSelectTicket: (ticketId: number) => void;
}

const TicketList: React.FC<TicketListProps> = ({ onSelectTicket }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const data = await ticketService.getAllTickets();

        const statusOrder: { [key: string]: number } = {
          'open': 1,
          'assigned': 2,
          'in_progress': 3,
          'resolved': 4,
          'closed': 5,
        };

        const sortedTickets = data.sort((a, b) => {
          const statusA = statusOrder[a.status as keyof typeof statusOrder] || 99;
          const statusB = statusOrder[b.status as keyof typeof statusOrder] || 99;

          if (statusA !== statusB) {
            return statusA - statusB;
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        setTickets(sortedTickets);
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || `Error ${err.response?.status}: ${err.message || 'Error al cargar tickets.'}`);
        } else {
          setError('Ocurrió un error inesperado al cargar tickets.');
        }
        console.error('Error al cargar tickets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []); // El array de dependencias vacío significa que se ejecuta solo una vez al montar

  if (loading) return <p>Cargando tickets...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    // ELIMINA containerStyle y usa una clase CSS si es posible
    <div /* style={containerStyle} */>
      <h3>Lista de Tickets</h3>
      {tickets.length === 0 ? (
        <p>No hay tickets para mostrar.</p>
      ) : (
        // ELIMINA tableStyle y usa una clase CSS si es posible
        <table /* style={tableStyle} */>
          <thead>
            <tr>
              {/* ELIMINA thStyle y usa una clase CSS si es posible */}
              <th /* style={thStyle} */>ID</th>
              <th /* style={thStyle} */>Asunto</th>
              <th /* style={thStyle} */>Estado</th>
              <th /* style={thStyle} */>Prioridad</th>
              <th /* style={thStyle} */>Departamento</th>
              <th /* style={thStyle} */>Usuario</th>
              <th /* style={thStyle} */>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                {/* ELIMINA tdStyle y usa una clase CSS si es posible */}
                <td /* style={tdStyle} */>{ticket.id}</td>
                <td /* style={tdStyle} */>{ticket.subject}</td>
                <td /* style={tdStyle} */>{ticket.status}</td>
                <td /* style={tdStyle} */>{ticket.priority}</td>
                <td /* style={tdStyle} */>{ticket.department_name || 'N/A'}</td>
                <td /* style={tdStyle} */>{ticket.user_username || 'N/A'}</td>
                <td /* style={tdStyle} */>
                  {/* ELIMINA actionButtonStyle y usa una clase CSS si es posible */}
                  <button
                    onClick={() => onSelectTicket(ticket.id)}
                    /* style={{ ...actionButtonStyle, backgroundColor: '#007bff' }} */
                    title="Ver Detalles"
                  >
                    Ver Detalles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ELIMINA TODOS ESTOS ESTILOS EN LÍNEA
// const containerStyle: React.CSSProperties = { ... };
// const tableStyle: React.CSSProperties = { ... };
// const thStyle: React.CSSProperties = { ... };
// const tdStyle: React.CSSProperties = { ... };
// const actionButtonStyle: React.CSSProperties = { ... };

export default TicketList;