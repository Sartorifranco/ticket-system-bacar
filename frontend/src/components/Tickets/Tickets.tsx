// src/components/Tickets/Tickets.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { TicketData, Department, User, ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';

interface TicketsProps {
    onEditTicket: (ticket: TicketData | null) => void;
    onCreateTicket: () => void;
    departments: Department[];
    users: User[];
}

const Tickets: React.FC<TicketsProps> = ({ onEditTicket, onCreateTicket, departments, users }) => {
    const { user, token, logout } = useAuth(); // CAMBIADO: signOut a logout. 'logout' se usa en el Layout, aquí no es estrictamente necesario desestructurarlo si no se usa directamente en este componente.
    const { addNotification } = useNotification();

    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [departmentFilter, setDepartmentFilter] = useState<string>('');
    const [assignedToFilter, setAssignedToFilter] = useState<string>('');
    const [createdByFilter, setCreatedByFilter] = useState<string>('');

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (statusFilter) queryParams.append('status', statusFilter);
            if (priorityFilter) queryParams.append('priority', priorityFilter);
            if (departmentFilter) queryParams.append('department_id', departmentFilter);
            if (assignedToFilter) queryParams.append('assigned_to_user_id', assignedToFilter);
            if (createdByFilter) queryParams.append('created_by_user_id', createdByFilter);

            const response = await api.get(`/api/tickets?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTickets(response.data.tickets);
        } catch (err: unknown) {
            console.error('Error fetching tickets:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar los tickets.');
                addNotification(`Error al cargar tickets: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar los tickets.'); // CORREGIDO: Solo un argumento para setError
                addNotification('Ocurrió un error inesperado al cargar los tickets.', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [token, statusFilter, priorityFilter, departmentFilter, assignedToFilter, createdByFilter, addNotification]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleDeleteTicket = async (ticketId: number) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este ticket? Esta acción no se puede deshacer.')) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await api.delete(`/api/tickets/${ticketId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Ticket eliminado exitosamente.', 'success');
            fetchTickets();
        } catch (err: unknown) {
            console.error('Error deleting ticket:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al eliminar el ticket.');
                addNotification(`Error al eliminar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al eliminar el ticket.'); // CORREGIDO: Solo un argumento para setError
                addNotification('Ocurrió un error inesperado al eliminar el ticket.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAssignTicket = async (ticketId: number, agentId: number | null) => {
        setLoading(true);
        setError(null);
        try {
            await api.put(`/api/tickets/${ticketId}/assign`, { agent_id: agentId }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Ticket asignado exitosamente.', 'success');
            fetchTickets();
        } catch (err: unknown) {
            console.error('Error assigning ticket:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al asignar el ticket.');
                addNotification(`Error al asignar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al asignar el ticket.'); // CORREGIDO: Solo un argumento para setError
                addNotification('Ocurrió un error inesperado al asignar el ticket.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (ticketId: number, newStatus: string) => {
        setLoading(true);
        setError(null);
        try {
            await api.put(`/api/tickets/${ticketId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Estado del ticket actualizado exitosamente.', 'success');
            fetchTickets();
        } catch (err: unknown) {
            console.error('Error changing ticket status:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cambiar el estado del ticket.');
                addNotification(`Error al cambiar estado: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cambiar el estado del ticket.'); // CORREGIDO: Solo un argumento para setError
                addNotification('Ocurrió un error inesperado al cambiar el estado del ticket.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePriorityChange = async (ticketId: number, newPriority: string) => {
        setLoading(true);
        setError(null);
        try {
            await api.put(`/api/tickets/${ticketId}/priority`, { priority: newPriority }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Prioridad del ticket actualizada exitosamente.', 'success');
            fetchTickets();
        } catch (err: unknown) {
            console.error('Error changing ticket priority:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cambiar la prioridad del ticket.');
                addNotification(`Error al cambiar prioridad: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cambiar la prioridad del ticket.'); // CORREGIDO: Solo un argumento para setError
                addNotification('Ocurrió un error inesperado al cambiar la prioridad del ticket.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDepartmentChange = async (ticketId: number, newDepartmentId: number) => {
        setLoading(true);
        setError(null);
        try {
            await api.put(`/api/tickets/${ticketId}/department`, { department_id: newDepartmentId }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Departamento del ticket actualizado exitosamente.', 'success');
            fetchTickets();
        } catch (err: unknown) {
            console.error('Error changing ticket department:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cambiar el departamento del ticket.');
                addNotification(`Error al cambiar departamento: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cambiar el departamento del ticket.'); // CORREGIDO: Solo un argumento para setError
                addNotification('Ocurrió un error inesperado al cambiar el departamento del ticket.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const getDepartmentName = (id: number | null) => {
        return departments.find(d => d.id === id)?.name || 'Desconocido';
    };

    const getUserUsername = (id: number | null) => {
        return users.find(u => u.id === id)?.username || 'Sin Asignar';
    };

    const isAgent = user?.role === 'agent';
    const isAdmin = user?.role === 'admin';

    if (loading) {
        return <div className="flex justify-center items-center h-full"><span className="text-lg">Cargando tickets...</span></div>;
    }

    if (error) {
        return <div className="text-red-500 text-center p-4">Error: {error}</div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-300 pb-2">Gestión de Tickets</h1>

            <button
                onClick={onCreateTicket}
                className="mb-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
            >
                Crear Nuevo Ticket
            </button>

            {/* Filtros */}
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="shadow border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
                <option value="">Todos los Estados</option>
                <option value="open">Abierto</option>
                <option value="in-progress">En Progreso</option>
                <option value="resolved">Resuelto</option>
                <option value="closed">Cerrado</option>
                <option value="reopened">Reabierto</option>
            </select>

            <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="shadow border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
                <option value="">Todas las Prioridades</option>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
            </select>

            <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="shadow border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
                <option value="">Todos los Departamentos</option>
                {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
            </select>

            {(isAdmin || isAgent) && (
                <select
                    value={assignedToFilter}
                    onChange={(e) => setAssignedToFilter(e.target.value)}
                    className="shadow border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                    <option value="">Todos los Agentes</option>
                    <option value="null">Sin Asignar</option>
                    {users.filter(u => u.role === 'agent').map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.username}</option>
                    ))}
                </select>
            )}

            {isAdmin && (
                <select
                    value={createdByFilter}
                    onChange={(e) => setCreatedByFilter(e.target.value)}
                    className="shadow border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                    <option value="">Todos los Clientes</option>
                    {users.filter(u => u.role === 'client').map(client => (
                        <option key={client.id} value={client.id}>{client.username}</option>
                    ))}
                </select>
            )}

            <button
                onClick={fetchTickets}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
            >
                Aplicar Filtros
            </button>
        </div>
    );
};

export default Tickets;
