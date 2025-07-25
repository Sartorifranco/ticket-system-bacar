import React, { useEffect, useState, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import { Link } from 'react-router-dom';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations'; // Ruta corregida
import { useAuth } from '../../context/AuthContext'; // Importar useAuth
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification

interface ErrorResponseData {
    message?: string;
}

interface Ticket {
    id: number;
    subject: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    updated_at: string;
    user_username: string;
    department_name: string;
    agent_username?: string;
}

interface MyTicketsListProps {
    reload: boolean;
    onReloaded: () => void;
}

const MyTicketsList: React.FC<MyTicketsListProps> = ({ reload, onReloaded }) => {
    const { token } = useAuth(); // <-- MODIFICADO: Solo token de useAuth
    const { addNotification } = useNotification(); // <-- AÑADIDO: addNotification de useNotification

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
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

    useEffect(() => {
        if (reload) {
            fetchTickets();
        }
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

    if (loading) return <p className="text-gray-700 text-center py-4">Cargando tickets...</p>;
    if (error) return <p className="text-red-500 text-center py-4">{error}</p>;
    if (tickets.length === 0) return <p className="text-gray-700 text-center py-4">No tienes tickets creados aún.</p>;

    return (
        <div className="overflow-x-auto bg-white shadow-md rounded-lg p-4">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asunto</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado a</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Creación</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {tickets.map((ticket) => {
                        return (
                            <tr key={ticket.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.subject}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.department_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${ticket.status === 'open' ? 'bg-blue-100 text-blue-800' : ''}
                                        ${ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : ''}
                                        ${ticket.status === 'resolved' ? 'bg-green-100 text-green-800' : ''}
                                        ${ticket.status === 'closed' ? 'bg-gray-100 text-gray-800' : ''}
                                    `}>
                                        {ticketStatusTranslations[ticket.status] || ticket.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${ticket.priority === 'low' ? 'bg-green-100 text-green-800' : ''}
                                        ${ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                                        ${ticket.priority === 'high' ? 'bg-red-100 text-red-800' : ''}
                                    `}>
                                        {ticketPriorityTranslations[ticket.priority] || ticket.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.agent_username || 'Nadie'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatTimestamp(ticket.created_at)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link to={`/ticket/${ticket.id}`} className="text-indigo-600 hover:text-indigo-900">Ver Detalle</Link>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default MyTicketsList;
