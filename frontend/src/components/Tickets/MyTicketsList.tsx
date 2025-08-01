// src/components/Tickets/MyTicketsList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { TicketData, User, Department, TicketStatus, TicketPriority } from '../../types'; // Importar los tipos
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations';
import TicketDetailModal from './TicketDetailModal'; // Asumiendo que este es el modal para ver detalles

interface MyTicketsListProps {
    // Si este componente solo lista, no necesita onEditTicket ni onCreateTicket
    // Si permite editar, entonces sí
    // onEditTicket: (ticket: TicketData | null) => void;
    // onCreateTicket: () => void;
    // departments: Department[];
    // users: User[];
}

const MyTicketsList: React.FC<MyTicketsListProps> = () => {
    const { user, token } = useAuth();
    const { addNotification } = useNotification();

    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);

    const fetchClientTickets = useCallback(async () => {
        if (!token || !user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await api.get<{ tickets: TicketData[] }>(`/api/tickets?created_by_user_id=${user.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTickets(response.data.tickets);
        } catch (err: unknown) {
            console.error('Error fetching client tickets:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar tus tickets.');
                addNotification(`Error al cargar tickets: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar tus tickets.');
                addNotification('Ocurrió un error inesperado al cargar tus tickets.', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [token, user, addNotification]);

    useEffect(() => {
        fetchClientTickets();
    }, [fetchClientTickets]);

    const handleViewDetails = (ticket: TicketData) => {
        setSelectedTicket(ticket);
        setIsDetailModalOpen(true);
    };

    const handleSaveTicketChanges = async (updatedFields: Partial<TicketData>) => {
        if (!selectedTicket || !token) return;
        try {
            await api.put(`/api/tickets/${selectedTicket.id}`, updatedFields, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Ticket actualizado exitosamente.', 'success');
            fetchClientTickets(); // Recargar la lista después de la actualización
        } catch (err: unknown) {
            console.error('Error saving ticket changes:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al actualizar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al actualizar el ticket.', 'error');
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><span className="text-lg">Cargando tus tickets...</span></div>;
    }

    if (error) {
        return <div className="text-red-500 text-center p-4">Error: {error}</div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-300 pb-2">Mis Tickets</h1>

            {tickets.length === 0 ? (
                <p className="text-gray-600">No tienes tickets registrados. ¡Crea uno para empezar!</p>
            ) : (
                <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Título</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Prioridad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Departamento</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Asignado A</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Creado En</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticketStatusTranslations[ticket.status]}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticketPriorityTranslations[ticket.priority]}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.department_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ticket.agent_username || 'Sin Asignar'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(ticket.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleViewDetails(ticket)}
                                            className="text-blue-600 hover:text-blue-900 mr-3 transition duration-150 ease-in-out"
                                            title="Ver Detalles"
                                        >
                                            <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isDetailModalOpen && selectedTicket && (
                <TicketDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => setIsDetailModalOpen(false)}
                    ticket={selectedTicket}
                    onSave={handleSaveTicketChanges}
                    departments={[]} // No se necesitan todos los departamentos para ver detalles
                    users={[]} // No se necesitan todos los usuarios para ver detalles
                />
            )}
        </div>
    );
};

export default MyTicketsList;
