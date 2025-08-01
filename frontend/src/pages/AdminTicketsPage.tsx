// frontend/src/pages/AdminTicketsPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // No necesitamos useLocation aquí, la ruta es fija
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { TicketData, Department, User, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import Layout from '../components/Layout/Layout';
import TicketFormModal from '../components/Tickets/TicketFormModal';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../utils/traslations';
import io from 'socket.io-client';

const AdminTicketsPage: React.FC = () => {
    // ====================================================================
    // LOG ÚNICO Y CORRECTO PARA AdminTicketsPage (la lista)
    // ====================================================================
    console.log('--- RENDERIZANDO: AdminTicketsPage (Lista de Tickets) ---');
    // ====================================================================

    const { user, token } = useAuth();
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTicket, setCurrentTicket] = useState<TicketData | null>(null);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    // Filtros
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterDepartment, setFilterDepartment] = useState('all');
    const [filterAssignedTo, setFilterAssignedTo] = useState('all');
    const [filterCreatedBy, setFilterCreatedBy] = useState('all');
    const [filterTitle, setFilterTitle] = useState('');

    const socket = useRef<any>(null);

    const fetchTickets = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filterStatus !== 'all') params.append('status', filterStatus);
            if (filterPriority !== 'all') params.append('priority', filterPriority);
            if (filterDepartment !== 'all') params.append('department_id', filterDepartment);
            if (filterAssignedTo !== 'all') params.append('assigned_to_user_id', filterAssignedTo);
            if (filterCreatedBy !== 'all') params.append('user_id', filterCreatedBy);
            if (filterTitle) params.append('title', filterTitle);

            const response = await api.get<{ success: boolean; count: number; data: TicketData[] }>(`/api/tickets?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTickets(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (err: unknown) {
            console.error('Error fetching tickets:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar los tickets.');
                addNotification(`Error al cargar tickets: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar los tickets.');
                addNotification('Ocurrió un error inesperado al cargar los tickets.', 'error');
            }
            setTickets([]);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, filterStatus, filterPriority, filterDepartment, filterAssignedTo, filterCreatedBy, filterTitle]);

    const fetchAllDepartments = useCallback(async () => {
        if (!token) return;
        try {
            const response = await api.get<{ departments: Department[] }>('/api/departments', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAllDepartments(Array.isArray(response.data) ? response.data : (response.data.departments || []));
        } catch (err: unknown) {
            console.error('Error fetching departments:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al cargar departamentos: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al cargar los departamentos.', 'error');
            }
            setAllDepartments([]);
        }
    }, [token, addNotification]);

    const fetchAllUsers = useCallback(async () => {
        if (!token) return;
        try {
            const response = await api.get<{ success: boolean; count: number; data: User[] }>('/api/users', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAllUsers(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (err: unknown) {
            console.error('Error fetching users:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al cargar usuarios: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al cargar los usuarios.', 'error');
            }
            setAllUsers([]);
        }
    }, [token, addNotification]);

    useEffect(() => {
        if (user && token && user.role === 'admin') {
            fetchTickets();
            fetchAllDepartments();
            fetchAllUsers();
        }
    }, [user, token, fetchTickets, fetchAllDepartments, fetchAllUsers]);

    useEffect(() => {
        if (user && token && user.role === 'admin' && !socket.current) {
            socket.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
                auth: { token: token }
            });

            socket.current.on('connect', () => {
                console.log('Conectado a Socket.IO (Admin Tickets List)');
                socket.current.emit('joinRoom', { roomName: 'admin', userId: user.id });
            });

            socket.current.on('newTicket', (data: any) => {
                addNotification(data.message, 'info');
                fetchTickets();
            });

            socket.current.on('ticketUpdated', (data: any) => {
                addNotification(data.message, 'info');
                fetchTickets();
            });

            socket.current.on('ticketDeleted', (data: any) => {
                addNotification(data.message, 'info');
                fetchTickets();
            });

            socket.current.on('newComment', (data: any) => {
                addNotification(data.message, 'info');
            });

            socket.current.on('activityLogged', (data: any) => {
                addNotification(data.message, 'info');
            });

            socket.current.on('disconnect', () => {
                console.log('Desconectado de Socket.IO (Admin Tickets List)');
            });

            socket.current.on('connect_error', (err: any) => {
                console.error('Socket.IO connection error (Admin Tickets List Page):', err.message);
                addNotification(`Error de conexión con el servidor de notificaciones: ${err.message}`, 'error');
            });

            return () => {
                if (socket.current) {
                    socket.current.disconnect();
                    socket.current = null;
                }
            };
        }
    }, [user, token, addNotification, fetchTickets]);


    const handleCreateTicket = () => {
        setCurrentTicket(null);
        setIsModalOpen(true);
    };

    const handleEditTicket = (ticketToEdit: TicketData) => {
        setCurrentTicket(ticketToEdit);
        setIsModalOpen(true);
    };

    const handleSaveTicket = async (ticketData: any) => {
        try {
            if (currentTicket) {
                await api.put(`/api/tickets/${currentTicket.id}`, ticketData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Ticket actualizado exitosamente.', 'success');
            } else {
                await api.post('/api/tickets', { ...ticketData, user_id: user?.id }, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Ticket creado exitosamente.', 'success');
            }
            setIsModalOpen(false);
            fetchTickets();
        } catch (err: unknown) {
            console.error('Error saving ticket:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al guardar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al guardar el ticket.', 'error');
            }
        }
    };

    const handleDeleteTicket = async (ticketId: number) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este ticket?')) {
            return;
        }
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
                addNotification(`Error al eliminar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al eliminar el ticket.', 'error');
            }
        }
    };

    if (!user || user.role !== 'admin') {
        return <Layout><div className="text-center p-4 text-red-500">Acceso denegado. Solo administradores pueden ver esta página.</div></Layout>;
    }

    if (loading) {
        return <Layout><div className="flex justify-center items-center h-full"><span className="text-lg">Cargando tickets...</span></div></Layout>;
    }

    if (error) {
        return <Layout><div className="text-red-500 text-center p-4">Error: {error}</div></Layout>;
    }

    return (
        <Layout>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Gestión de Tickets</h1>
                    <button
                        onClick={handleCreateTicket}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                    >
                        Crear Nuevo Ticket
                    </button>
                </div>

                {/* Filtros */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label htmlFor="filterTitle" className="block text-sm font-medium text-gray-700">Título:</label>
                        <input
                            type="text"
                            id="filterTitle"
                            value={filterTitle}
                            onChange={(e) => setFilterTitle(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            placeholder="Buscar por título"
                        />
                    </div>
                    <div>
                        <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700">Estado:</label>
                        <select
                            id="filterStatus"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50"
                        >
                            <option value="all">Todos</option>
                            <option value="open">Abierto</option>
                            <option value="in-progress">En Progreso</option>
                            <option value="resolved">Resuelto</option>
                            <option value="closed">Cerrado</option>
                            <option value="reopened">Reabierto</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filterPriority" className="block text-sm font-medium text-gray-700">Prioridad:</label>
                        <select
                            id="filterPriority"
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50"
                        >
                            <option value="all">Todas</option>
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filterDepartment" className="block text-sm font-medium text-gray-700">Departamento:</label>
                        <select
                            id="filterDepartment"
                            value={filterDepartment}
                            onChange={(e) => setFilterDepartment(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50"
                        >
                            <option value="all">Todos</option>
                            {allDepartments.map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filterAssignedTo" className="block text-sm font-medium text-gray-700">Asignado A:</label>
                        <select
                            id="filterAssignedTo"
                            value={filterAssignedTo}
                            onChange={(e) => setFilterAssignedTo(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50"
                        >
                            <option value="all">Cualquiera</option>
                            <option value="null">Sin Asignar</option>
                            {allUsers.filter(u => u.role === 'agent').map(agent => (
                                <option key={agent.id} value={agent.id}>{agent.username}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="filterCreatedBy" className="block text-sm font-medium text-gray-700">Creado Por:</label>
                        <select
                            id="filterCreatedBy"
                            value={filterCreatedBy}
                            onChange={(e) => setFilterCreatedBy(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50"
                        >
                            <option value="all">Cualquiera</option>
                            {allUsers.filter(u => u.role === 'client').map(client => (
                                <option key={client.id} value={client.id}>{client.username}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={fetchTickets}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                        >
                            Aplicar Filtros
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                    {tickets.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">No hay tickets disponibles con los filtros actuales.</p>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado Por</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado A</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Creación</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tickets.map((ticket) => (
                                    <tr key={ticket.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{ticket.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                                ${ticket.status === 'open' ? 'bg-blue-100 text-blue-800' : ''}
                                                ${ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                ${ticket.status === 'resolved' ? 'bg-green-100 text-green-800' : ''}
                                                ${ticket.status === 'closed' ? 'bg-gray-100 text-gray-800' : ''}
                                                ${ticket.status === 'reopened' ? 'bg-purple-100 text-purple-800' : ''}
                                            `}>
                                                {ticketStatusTranslations[ticket.status]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                                ${ticket.priority === 'low' ? 'bg-green-100 text-green-800' : ''}
                                                ${ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
                                                ${ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' : ''}
                                                ${ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' : ''}
                                            `}>
                                                {ticketPriorityTranslations[ticket.priority]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{ticket.user_username || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{ticket.department_name || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{ticket.agent_username || 'Sin Asignar'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(ticket.created_at).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-3"
                                                title="Ver Detalles"
                                            >
                                                Ver
                                            </button>
                                            <button
                                                onClick={() => handleEditTicket(ticket)}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                                title="Editar Ticket"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTicket(ticket.id)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Eliminar Ticket"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <TicketFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveTicket}
                    initialData={currentTicket}
                    departments={allDepartments}
                    users={allUsers}
                />
            )}
        </Layout>
    );
};

export default AdminTicketsPage;
