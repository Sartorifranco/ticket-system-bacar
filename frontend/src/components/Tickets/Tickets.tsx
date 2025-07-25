// frontend/src/components/Tickets/Tickets.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { TicketData, Department, User, TicketStatus, TicketPriority } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import TicketDetailModal from './TicketDetailModal'; // Importar el modal de detalle
import CreateTicketModal from './CreateTicketModal'; // Importar el modal de creación
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations';
import { Link } from 'react-router-dom'; // Para el enlace a detalles del ticket

interface TicketsProps {
    // Estas props son opcionales si el componente Tickets maneja su propia lógica de edición/creación
    // Si AdminDashboard necesita controlar los modales, estas props serían útiles.
    // Por simplicidad, este componente manejará sus propios modales de detalle y creación.
    // onEditTicket?: (ticket: TicketData | null) => void; // Si se necesita un modal de edición externo
    // onCreateTicket?: () => void; // Si se necesita un modal de creación externo
    // allDepartments: Department[]; // Necesario para los selectores en modales
    // allUsers: User[]; // Necesario para los selectores en modales
}

const Tickets: React.FC<TicketsProps> = () => {
    const { token, signOut } = useAuth();
    const { addNotification } = useNotification();

    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para modales de ticket
    const [isTicketDetailModalOpen, setIsTicketDetailModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
    const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);

    // Estados para filtros
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [filterDepartment, setFilterDepartment] = useState<string>('all');
    const [filterAgent, setFilterAgent] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Estados para listas de departamentos y usuarios (para filtros y modales)
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    // Función para obtener todos los tickets
    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }

            const queryParams = new URLSearchParams();
            if (filterStatus !== 'all') queryParams.append('status', filterStatus);
            if (filterPriority !== 'all') queryParams.append('priority', filterPriority);
            if (filterDepartment !== 'all') queryParams.append('department_id', filterDepartment);
            if (filterAgent !== 'all') queryParams.append('agent_id', filterAgent);
            if (searchTerm) queryParams.append('search', searchTerm);

            const response = await api.get(`/api/tickets?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTickets(response.data.tickets || []);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar tickets.');
                addNotification(`Error al cargar tickets: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar los tickets.');
            }
            console.error('Error fetching tickets:', err);
            setTickets([]); // Asegúrate de que tickets sea un array vacío en caso de error
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut, filterStatus, filterPriority, filterDepartment, filterAgent, searchTerm]);

    // Función para obtener usuarios y departamentos (para los filtros y modales)
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
            console.error('Error fetching users or departments for filters/modals:', err);
            if (isAxiosErrorTypeGuard(err) && err.response?.status === 401) {
                signOut();
            }
        }
    }, [token, signOut]);

    // Efecto para cargar tickets y datos de filtros al montar y cuando cambian los filtros
    useEffect(() => {
        fetchUsersAndDepartments(); // Cargar usuarios y departamentos para los filtros
        fetchTickets();
    }, [fetchTickets, fetchUsersAndDepartments]);

    // Handlers para modales de ticket
    const handleViewTicket = useCallback((ticket: TicketData) => {
        setSelectedTicket(ticket);
        setIsTicketDetailModalOpen(true);
    }, []);

    const handleCloseTicketDetailModal = useCallback(() => {
        setIsTicketDetailModalOpen(false);
        setSelectedTicket(null);
        fetchTickets(); // Refrescar la lista de tickets después de cerrar el modal de detalle
    }, [fetchTickets]);

    const handleCreateTicket = useCallback(() => {
        setIsCreateTicketModalOpen(true);
    }, []);

    const handleTicketCreatedOrUpdated = useCallback(() => {
        setIsCreateTicketModalOpen(false);
        // Si el modal de detalle también llama a esto, se cerrará y se refrescará
        setIsTicketDetailModalOpen(false); // Asegurarse de cerrar el modal de detalle si estaba abierto
        fetchTickets(); // Refrescar la lista de tickets
    }, [fetchTickets]);

    const handleDeleteTicket = useCallback(async (ticketId: number) => {
        const confirmed = window.confirm('¿Estás seguro de que quieres eliminar este ticket?');
        if (!confirmed) return;

        setLoading(true);
        try {
            if (!token) {
                addNotification('No autorizado para eliminar tickets.', 'error');
                return;
            }
            await api.delete(`/api/tickets/${ticketId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Ticket eliminado exitosamente.', 'success');
            fetchTickets(); // Refrescar la lista de tickets
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al eliminar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al eliminar el ticket.', 'error');
            }
            console.error('Error deleting ticket:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, fetchTickets]);

    if (loading) {
        return (
            <div className="loading-message text-center py-4">🔄 Cargando tickets...</div>
        );
    }

    if (error) {
        return (
            <div className="error-message text-center p-4">
                <p>{error}</p>
                <button onClick={fetchTickets} className="button primary-button mt-2">Reintentar</button>
            </div>
        );
    }

    return (
        <div className="tickets-management p-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Gestión de Tickets</h2>
            <p className="text-gray-700 mb-6 text-center">Administra todos los tickets del sistema.</p>

            {/* Controles de Filtrado y Búsqueda */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg shadow-sm">
                <input
                    type="text"
                    placeholder="Buscar por asunto, descripción, creador o agente..."
                    className="form-input flex-1 min-w-[200px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    className="form-select min-w-[150px]"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                >
                    <option value="all">Todos los estados</option>
                    {Object.entries(ticketStatusTranslations).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                    ))}
                </select>
                <select
                    className="form-select min-w-[150px]"
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                >
                    <option value="all">Todas las prioridades</option>
                    {Object.entries(ticketPriorityTranslations).map(([key, value]) => (
                        <option key={key} value={key}>{value}</option>
                    ))}
                </select>
                <select
                    className="form-select min-w-[150px]"
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                >
                    <option value="all">Todos los departamentos</option>
                    {allDepartments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>
                <select
                    className="form-select min-w-[150px]"
                    value={filterAgent}
                    onChange={(e) => setFilterAgent(e.target.value)}
                >
                    <option value="all">Todos los agentes</option>
                    <option value="unassigned">Sin asignar</option>
                    {allUsers.filter(u => u.role === 'agent').map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.username}</option>
                    ))}
                </select>
                <button
                    onClick={fetchTickets}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                >
                    Aplicar Filtros
                </button>
            </div>

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
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creador</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado a</th>
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
                                            {ticketStatusTranslations[ticket.status] || ticket.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${ticket.priority === 'low' ? 'bg-green-100 text-green-800' : ''}
                                            ${ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                                            ${ticket.priority === 'high' ? 'bg-red-100 text-red-800' : ''}
                                            ${ticket.priority === 'urgent' ? 'bg-purple-100 text-purple-800' : ''}
                                        `}>
                                            {ticketPriorityTranslations[ticket.priority] || ticket.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.department_name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.user_username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.agent_username || 'Sin asignar'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleViewTicket(ticket)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                        >
                                            Ver
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTicket(ticket.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="info-text text-center">No hay tickets disponibles con los filtros actuales.</p>
            )}

            {/* Modales de Ticket (controlados internamente por este componente) */}
            {isTicketDetailModalOpen && selectedTicket && (
                <TicketDetailModal
                    isOpen={isTicketDetailModalOpen}
                    onClose={handleCloseTicketDetailModal}
                    ticket={selectedTicket}
                    onTicketUpdated={handleTicketCreatedOrUpdated} // Se usa para refrescar la lista
                    token={token}
                    departments={allDepartments}
                    users={allUsers}
                />
            )}
            {isCreateTicketModalOpen && (
                <CreateTicketModal
                    isOpen={isCreateTicketModalOpen}
                    onClose={() => setIsCreateTicketModalOpen(false)}
                    onTicketCreated={handleTicketCreatedOrUpdated} // Se usa para refrescar la lista
                    token={token}
                    departments={allDepartments}
                    users={allUsers}
                />
            )}
        </div>
    );
};

export default Tickets;
