// frontend/src/components/Tickets/MyTicketsList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { TicketData, Department, User, TicketStatus, TicketPriority } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import TicketDetailModal from './TicketDetailModal';
import CreateTicketModal from './CreateTicketModal';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations';

const MyTicketsList: React.FC = () => {
    const { user, token, signOut } = useAuth();
    const { addNotification } = useNotification();

    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isTicketDetailModalOpen, setIsTicketDetailModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
    const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);

    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    const fetchMyTickets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            // Los clientes solo ven sus propios tickets, los agentes y admins ven todos
            const endpoint = user?.role === 'client' ? `/api/tickets?user_id=${user.id}` : '/api/tickets';
            const response = await api.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTickets(response.data.tickets || []);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar tus tickets.');
                addNotification(`Error al cargar tickets: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar tus tickets.');
            }
            console.error('Error fetching my tickets:', err);
            setTickets([]);
        } finally {
            setLoading(false);
        }
    }, [token, user, addNotification, signOut]);

    const fetchUsersAndDepartments = useCallback(async () => {
        try {
            if (!token) return;
            const [usersRes, departmentsRes] = await Promise.all([
                api.get('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setAllUsers(usersRes.data.users || []);
            setAllDepartments(departmentsRes.data.departments || []);
        } catch (err: unknown) {
            console.error('Error fetching users or departments for modals:', err);
            if (isAxiosErrorTypeGuard(err) && err.response?.status === 401) {
                signOut();
            }
        }
    }, [token, signOut]);

    useEffect(() => {
        fetchUsersAndDepartments();
        fetchMyTickets();
    }, [fetchMyTickets, fetchUsersAndDepartments]);

    const handleViewTicket = useCallback(async (ticket: TicketData) => {
        setLoading(true);
        try {
            if (!token) {
                addNotification('No autorizado. Token no disponible.', 'error');
                return;
            }
            const response = await api.get(`/api/tickets/${ticket.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSelectedTicket(response.data);
            setIsTicketDetailModalOpen(true);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al cargar detalle del ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al cargar el detalle del ticket.', 'error');
            }
            console.error('Error fetching single ticket for detail:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    const handleCloseTicketDetailModal = useCallback(() => {
        setIsTicketDetailModalOpen(false);
        setSelectedTicket(null);
        fetchMyTickets(); // Refrescar la lista de tickets al cerrar el modal
    }, [fetchMyTickets]);

    const handleCreateTicket = useCallback(() => {
        setIsCreateTicketModalOpen(true);
    }, []);

    const handleTicketCreatedOrUpdated = useCallback(() => {
        setIsCreateTicketModalOpen(false);
        fetchMyTickets(); // Refrescar la lista de tickets al crear/actualizar
    }, [fetchMyTickets]);

    if (loading) {
        return (
            <div className="loading-message text-center py-4">🔄 Cargando tus tickets...</div>
        );
    }

    if (error) {
        return (
            <div className="error-message text-center p-4">
                <p>{error}</p>
                <button onClick={fetchMyTickets} className="button primary-button mt-2">Reintentar</button>
            </div>
        );
    }

    return (
        <div className="my-tickets-list p-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Mis Tickets</h2>
            <p className="text-gray-700 mb-6 text-center">Aquí puedes ver el estado de tus tickets y crear nuevos.</p>

            <div className="flex justify-end mb-4">
                <button onClick={handleCreateTicket} className="button primary-button">
                    Crear Nuevo Ticket
                </button>
            </div>

            {tickets.length > 0 ? (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asunto</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado a</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tickets.map((ticket) => (
                                <tr key={ticket.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${ticket.status === 'open' ? 'bg-blue-100 text-blue-800' : ''}
                                            ${ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : ''}
                                            ${ticket.status === 'resolved' ? 'bg-green-100 text-green-800' : ''}
                                            ${ticket.status === 'closed' ? 'bg-gray-100 text-gray-800' : ''}
                                            ${ticket.status === 'reopened' ? 'bg-purple-100 text-purple-800' : ''}
                                        `}>
                                            {ticketStatusTranslations[ticket.status as TicketStatus] || ticket.status} {/* Corregido: Type assertion */}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${ticket.priority === 'low' ? 'bg-green-100 text-green-800' : ''}
                                            ${ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                                            ${ticket.priority === 'high' ? 'bg-red-100 text-red-800' : ''}
                                            ${ticket.priority === 'urgent' ? 'bg-purple-100 text-purple-800' : ''}
                                        `}>
                                            {ticketPriorityTranslations[ticket.priority as TicketPriority] || ticket.priority} {/* Corregido: Type assertion */}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.agent_username || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(ticket.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleViewTicket(ticket)}
                                            className="text-indigo-600 hover:text-indigo-900"
                                        >
                                            Ver
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="info-text text-center">No tienes tickets creados. ¡Crea uno nuevo!</p>
            )}

            {/* Modales de Ticket */}
            {isTicketDetailModalOpen && selectedTicket && (
                <TicketDetailModal
                    isOpen={isTicketDetailModalOpen}
                    onClose={handleCloseTicketDetailModal}
                    ticket={selectedTicket}
                    onTicketUpdated={() => handleTicketCreatedOrUpdated()}
                    token={token}
                    departments={allDepartments}
                    users={allUsers}
                />
            )}
            {isCreateTicketModalOpen && (
                <CreateTicketModal
                    isOpen={isCreateTicketModalOpen}
                    onClose={() => setIsCreateTicketModalOpen(false)}
                    onTicketCreated={handleTicketCreatedOrUpdated}
                    token={token}
                    departments={allDepartments}
                    users={allUsers}
                />
            )}
        </div>
    );
};

export default MyTicketsList;
