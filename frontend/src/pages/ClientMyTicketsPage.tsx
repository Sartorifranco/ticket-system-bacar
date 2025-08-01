// frontend/src/pages/ClientMyTicketsPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { TicketData, ApiResponseError, Department } from '../types'; // Importar Department
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import Layout from '../components/Layout/Layout';
import TicketFormModal from '../components/Tickets/TicketFormModal';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../utils/traslations';
import io from 'socket.io-client';

const ClientMyTicketsPage: React.FC = () => {
    console.log('--- RENDERIZANDO: ClientMyTicketsPage ---');

    const { user, token } = useAuth();
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]); // Nuevo estado para departamentos

    // Filtros específicos para el cliente (puede que no necesite todos los del admin)
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');

    const socket = useRef<any>(null);

    const fetchClientTicketsAndDepartments = useCallback(async () => { // Renombrado para incluir departamentos
        if (!token || !user?.id) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.append('user_id', user.id.toString()); // Filtrar por el ID del cliente
            if (filterStatus !== 'all') params.append('status', filterStatus);
            if (filterPriority !== 'all') params.append('priority', filterPriority);

            const [ticketsRes, departmentsRes] = await Promise.all([ // Peticiones en paralelo
                api.get<{ success: boolean; count: number; data: TicketData[] }>(`/api/tickets?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                api.get<{ success: boolean; data: Department[] }>('/api/departments', { // Obtener departamentos
                    headers: { Authorization: `Bearer ${token}` },
                })
            ]);
            
            setTickets(Array.isArray(ticketsRes.data.data) ? ticketsRes.data.data : []);
            setDepartments(Array.isArray(departmentsRes.data.data) ? departmentsRes.data.data : []); // Guardar departamentos

        } catch (err: unknown) {
            console.error('Error fetching client tickets or departments:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar tus tickets o departamentos.');
                addNotification(`Error al cargar tickets/departamentos: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar tus tickets o departamentos.');
                addNotification('Ocurrió un error inesperado al cargar tus tickets o departamentos.', 'error');
            }
            setTickets([]);
            setDepartments([]);
        } finally {
            setLoading(false);
        }
    }, [token, user?.id, addNotification, filterStatus, filterPriority]);

    useEffect(() => {
        if (user && token && user.role === 'client') {
            fetchClientTicketsAndDepartments(); // Llamar a la nueva función
        }
    }, [user, token, fetchClientTicketsAndDepartments]);

    useEffect(() => {
        if (user && token && user.role === 'client' && !socket.current) {
            socket.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
                auth: { token: token }
            });

            socket.current.on('connect', () => {
                console.log('Conectado a Socket.IO (Client Tickets Page)');
                socket.current.emit('joinRoom', { roomName: `user-${user.id}`, userId: user.id });
            });

            socket.current.on('ticketUpdated', (data: any) => {
                addNotification(data.message, 'info');
                fetchClientTicketsAndDepartments(); // Recargar tickets si uno del cliente se actualiza
            });

            socket.current.on('newComment', (data: any) => {
                addNotification(data.message, 'info');
            });

            socket.current.on('disconnect', () => {
                console.log('Desconectado de Socket.IO (Client Tickets Page)');
            });

            socket.current.on('connect_error', (err: any) => {
                console.error('Socket.IO connection error (Client Tickets Page):', err.message);
                addNotification(`Error de conexión con el servidor de notificaciones: ${err.message}`, 'error');
            });

            return () => {
                if (socket.current) {
                    socket.current.disconnect();
                    socket.current = null;
                }
            };
        }
    }, [user, token, addNotification, fetchClientTicketsAndDepartments]);

    const handleCreateTicketClick = () => { // Renombrado para claridad
        setIsCreateTicketModalOpen(true);
    };

    const handleSaveTicket = async (ticketData: any) => {
        try {
            await api.post('/api/tickets', { ...ticketData, user_id: user?.id }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Ticket creado exitosamente.', 'success');
            setIsCreateTicketModalOpen(false);
            fetchClientTicketsAndDepartments(); // Recargar la lista de tickets
        } catch (err: unknown) {
            console.error('Error saving ticket:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al crear ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al crear el ticket.', 'error');
            }
        }
    };

    if (!user || user.role !== 'client') {
        return <Layout><div className="text-center p-4 text-red-500">Acceso denegado. Solo clientes pueden ver esta página.</div></Layout>;
    }

    if (loading) {
        return <Layout><div className="flex justify-center items-center h-full"><span className="text-lg">Cargando tus tickets...</span></div></Layout>;
    }

    if (error) {
        return <Layout><div className="text-red-500 text-center p-4">Error: {error}</div></Layout>;
    }

    return (
        <Layout>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Mis Tickets</h1>
                    <button
                        onClick={handleCreateTicketClick} // Usar la función renombrada
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                    >
                        Crear Nuevo Ticket
                    </button>
                </div>

                {/* Filtros */}
                <div className="bg-white p-6 rounded-lg shadow-md mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <div className="flex items-end">
                        <button
                            onClick={fetchClientTicketsAndDepartments} // Usar la nueva función
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                        >
                            Aplicar Filtros
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                    {tickets.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">No tienes tickets registrados.</p>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{ticket.department_name || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{ticket.agent_username || 'Sin Asignar'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(ticket.created_at).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => navigate(`/client/tickets/${ticket.id}`)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-3"
                                                title="Ver Detalles"
                                            >
                                                Ver
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isCreateTicketModalOpen && (
                <TicketFormModal
                    isOpen={isCreateTicketModalOpen}
                    onClose={() => setIsCreateTicketModalOpen(false)}
                    onSave={handleSaveTicket}
                    initialData={null} // Para crear un nuevo ticket
                    departments={departments} // <-- Pasar la lista de departamentos aquí
                    users={[]} // Los clientes no asignan tickets, así que pasamos un array vacío
                />
            )}
        </Layout>
    );
};

export default ClientMyTicketsPage;
