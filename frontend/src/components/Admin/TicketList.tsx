// frontend/src/components/Admin/TicketList.tsx
import React, { useState, useEffect, useCallback } from 'react'; // Añadido useCallback
import ticketService, { Ticket } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext'; // Importar useAuth
import { useNotification } from '../../context/NotificationContext'; // Importar useNotification
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations'; // Importar traducciones

interface TicketListProps {
    onSelectTicket: (ticketId: number) => void;
}

const TicketList: React.FC<TicketListProps> = ({ onSelectTicket }) => {
    const { token } = useAuth(); // Obtener el token del contexto de autenticación
    const { addNotification } = useNotification(); // Obtener la función de notificación
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('No autorizado. Por favor, inicia sesión de nuevo.', 'error');
                setLoading(false);
                return;
            }
            const data = await ticketService.getAllTickets(token); // Pasar el token al servicio

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
            if (isAxiosErrorTypeGuard(err)) { // Usar el type guard consistente
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar tickets.');
                addNotification(`Error al cargar tickets: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar tickets.');
                addNotification('Ocurrió un error inesperado al cargar tickets.', 'error');
            }
            console.error('Error al cargar tickets:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]); // Añadir token y addNotification a las dependencias

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]); // El array de dependencias vacío significa que se ejecuta solo una vez al montar

    if (loading) {
        return <p className="text-center text-gray-600">Cargando tickets...</p>;
    }
    if (error) {
        return <p className="text-center text-red-500">Error: {error}</p>;
    }

    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Lista de Tickets</h3>
            {tickets.length === 0 ? (
                <p className="text-gray-600">No hay tickets para mostrar.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asunto</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tickets.map((ticket) => (
                                <tr key={ticket.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.subject}</td>
                                    {/* Aplicar traducciones para Estado y Prioridad */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {ticketStatusTranslations[ticket.status as keyof typeof ticketStatusTranslations] || ticket.status}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {ticketPriorityTranslations[ticket.priority as keyof typeof ticketPriorityTranslations] || ticket.priority}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.department_name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.user_username || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => onSelectTicket(ticket.id)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                                            title="Ver Detalles"
                                        >
                                            Ver Detalles
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TicketList;
