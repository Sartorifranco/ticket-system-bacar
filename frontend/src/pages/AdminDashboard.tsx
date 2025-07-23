// frontend/src/pages/AdminDashboard.tsx
<<<<<<< HEAD
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    LineChart, Line
} from 'recharts';

import api from '../config/axiosConfig';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../utils/typeGuards';
import { Notification, TicketData, User, Department, ActivityLog, ReportMetrics, TicketStatus, TicketPriority } from '../types'; 
import TicketDetailModal from '../components/Tickets/TicketDetailModal'; 
import CreateTicketModal from '../components/Tickets/CreateTicketModal';

import UserEditModal from '../components/Users/UserEditModal';
import DepartmentEditModal from '../components/Departments/DepartmentEditModal';
import BacarKeys from '../components/BacarKeys/BacarKeys';

import Users from '../components/Users/Users';
import Departments from '../components/Departments/Departments'; 
// ELIMINADA: La importación de TicketsList (que era TicketDetail) ya que no es un componente de lista.
// Si necesitas una lista de tickets aquí, deberás crear un componente TicketsList.tsx dedicado.

import ActivityLogs from '../components/System/ActivityLogDashboard'; 
import Reports from '../components/Dashboard/ReportsDashboard'; 

import { ticketStatusTranslations, ticketPriorityTranslations, userRoleTranslations, targetTypeTranslations, translateTerm } from '../utils/traslations';
import { useAuth } from '../context/AuthContext';

const AdminDashboard: React.FC = () => { 
    const { user, token, addNotification, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);

    const [activeTab, setActiveTab] = useState<string>(queryParams.get('tab') || 'overview');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Estados para datos del dashboard (ej. para el overview)
    const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
    const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
    const [recentTickets, setRecentTickets] = useState<TicketData[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]); 

    // Estados para modales
    const [isTicketDetailModalOpen, setIsTicketDetailModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
    const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);

    // Estados para modales de usuario y departamento
    const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDepartmentEditModalOpen, setIsDepartmentEditModalOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

    // Estados para listas completas de usuarios y departamentos (para pasar a modales)
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);


    // Efecto para cambiar la pestaña activa según la URL
    useEffect(() => {
        const tab = queryParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [location.search]);

    // Función para cambiar de pestaña y actualizar la URL
    const handleTabChange = useCallback((tabName: string) => {
        setActiveTab(tabName);
        navigate(`?tab=${tabName}`);
    }, [navigate]);

    // Función para obtener métricas del dashboard
    const fetchDashboardMetrics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            const response = await api.get('/api/dashboard/metrics', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMetrics(response.data);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar métricas del dashboard.');
                addNotification(`Error al cargar métricas: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut(); 
            } else {
                setError('Ocurrió un error inesperado al cargar las métricas.');
            }
            console.error('Error fetching dashboard metrics:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut]);

    // Función para obtener actividades recientes
    const fetchRecentActivities = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            const response = await api.get('/api/activity-logs?limit=5', { 
                headers: { Authorization: `Bearer ${token}` },
            });
            setRecentActivities(response.data.logs || []);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar actividades recientes.');
                addNotification(`Error al cargar actividades: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar las actividades.');
            }
            console.error('Error fetching recent activities:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut]);

    // Función para obtener tickets recientes (ej. los 5 últimos tickets abiertos/en progreso)
    const fetchRecentTickets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            const response = await api.get('/api/tickets?status=open,in-progress&limit=5', { 
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log('[AdminDashboard] Respuesta cruda de tickets recientes:', response.data);

            setRecentTickets(Array.isArray(response.data.tickets) ? response.data.tickets : []);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar tickets recientes.');
                addNotification(`Error al cargar tickets: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar los tickets.');
            }
            console.error('Error fetching recent tickets:', err);
            setRecentTickets([]);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut]);

    // Función para obtener notificaciones para la pestaña de notificaciones
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            const response = await api.get('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications(Array.isArray(response.data) ? response.data : response.data.notifications || []);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar notificaciones.');
                addNotification(`Error al cargar notificaciones: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar las notificaciones.');
            }
            console.error('Error fetching notifications:', err);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut]);

    // Función para obtener todos los usuarios y departamentos (para pasar a modales)
    const fetchUsersAndDepartments = useCallback(async () => {
        try {
            if (!token) return;
            const [usersRes, departmentsRes] = await Promise.all([
                api.get('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setAllUsers(usersRes.data || []); 
            setAllDepartments(departmentsRes.data.departments || []);
        } catch (err: unknown) {
            console.error('Error fetching users or departments for modals:', err);
        }
    }, [token]);

    // Función para marcar una notificación como leída
    const handleMarkNotificationAsRead = useCallback(async (notificationId: number) => {
        try {
            if (!token) {
                addNotification('No autorizado para marcar notificaciones.', 'error');
                return;
            }
            await api.put(`/api/notifications/${notificationId}/read`, {}, { 
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Notificación marcada como leída.', 'success');
            fetchNotifications(); 
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al marcar notificación: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al marcar la notificación.', 'error');
            }
            console.error('Error marking notification as read:', err);
        }
    }, [token, addNotification, fetchNotifications]);

    // Función para eliminar una notificación
    const handleDeleteNotification = useCallback(async (notificationId: number) => {
        const confirmed = window.confirm('¿Estás seguro de que quieres eliminar esta notificación?'); 
        if (!confirmed) return;

        try {
            if (!token) {
                addNotification('No autorizado para eliminar notificaciones.', 'error');
                return;
            }
            await api.delete(`/api/notifications/${notificationId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Notificación eliminada.', 'success');
            fetchNotifications(); 
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al eliminar notificación: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al eliminar la notificación.', 'error');
            }
            console.error('Error deleting notification:', err);
        }
    }, [token, addNotification, fetchNotifications]);


    // Efecto para cargar datos al cambiar de pestaña y al montar
    useEffect(() => {
        if (user?.role !== 'admin') {
            addNotification('Acceso denegado. Solo administradores pueden acceder a este panel.', 'error');
            navigate('/login'); 
            return;
        }

        fetchUsersAndDepartments();

        switch (activeTab) {
            case 'overview':
                fetchDashboardMetrics();
                fetchRecentActivities();
                fetchRecentTickets(); 
                break;
            case 'users':
                // No es necesario fetchUsers aquí, el componente Users ya lo hace
                break;
            case 'tickets':
                // No es necesario fetchTickets aquí, el componente TicketsList (si existiera) lo haría
                break;
            case 'departments':
                // No es necesario fetchDepartments aquí, el componente Departments ya lo hace
                break;
            case 'activityLogs':
                // No es necesario fetchActivityLogs aquí, el componente ActivityLogs ya lo hace
                break;
            case 'reports':
                // No es necesario fetchReports aquí, el componente Reports ya lo hace
                break;
            case 'notifications':
                fetchNotifications(); 
                break;
            case 'bacarKeys':
                // No es necesario fetchBacarKeys aquí, el componente BacarKeys ya lo hace
                break;
            default:
                break;
        }
    }, [activeTab, user, navigate, addNotification, fetchDashboardMetrics, fetchRecentActivities, fetchRecentTickets, fetchNotifications, fetchUsersAndDepartments]);


    // Funciones para modales de Tickets
    const handleViewTicket = useCallback((ticket: TicketData) => {
        setSelectedTicket(ticket);
        setIsTicketDetailModalOpen(true);
    }, []);

    const handleCloseTicketDetailModal = useCallback(() => {
        setIsTicketDetailModalOpen(false);
        setSelectedTicket(null);
    }, []);

    const handleCreateTicket = useCallback(() => {
        setIsCreateTicketModalOpen(true);
    }, []);

    const handleTicketCreatedOrUpdated = useCallback(() => {
        setIsCreateTicketModalOpen(false);
        handleTabChange('tickets'); 
        if (activeTab === 'overview') {
            fetchRecentTickets();
        }
    }, [handleTabChange, activeTab, fetchRecentTickets]);

    // Funciones para modales de Usuarios
    const handleEditUser = useCallback((user: User | null) => {
        setSelectedUser(user);
        setIsUserEditModalOpen(true);
    }, []);

    const handleCloseUserEditModal = useCallback(() => {
        setIsUserEditModalOpen(false);
        setSelectedUser(null);
    }, []);

    const handleUserUpdated = useCallback(() => {
        handleCloseUserEditModal();
    }, [handleCloseUserEditModal]);

    // Funciones para modales de Departamentos
    const handleEditDepartment = useCallback((department: Department | null) => {
        setSelectedDepartment(department);
        setIsDepartmentEditModalOpen(true);
    }, []);

    const handleCloseDepartmentEditModal = useCallback(() => {
        setIsDepartmentEditModalOpen(false);
        setSelectedDepartment(null);
    }, []);

    const handleDepartmentUpdated = useCallback(() => {
        handleCloseDepartmentEditModal();
    }, [handleCloseDepartmentEditModal]);


    // Datos para los gráficos de Recharts (ejemplo, adaptados de las métricas)
    const ticketsByStatusData = useMemo(() => {
        return metrics?.ticketsByStatus?.map(item => ({
            name: translateTerm(item.name, 'status'),
            value: item.value
        })) || [];
    }, [metrics]);

    const ticketsByPriorityData = useMemo(() => {
        return metrics?.ticketsByPriority?.map(item => ({
            name: translateTerm(item.name, 'priority'),
            value: item.value
        })) || [];
    }, [metrics]);

    const ticketsByStatusOverTimeData = useMemo(() => {
        return metrics?.ticketsByStatusOverTime || [];
    }, [metrics]);

    const ticketsByPriorityOverTimeData = useMemo(() => {
        return metrics?.ticketsByPriorityOverTime || [];
    }, [metrics]);

    const agentPerformanceData = useMemo(() => {
        return metrics?.agentPerformance || [];
    }, [metrics]);

    const departmentPerformanceData = useMemo(() => {
        return metrics?.departmentPerformance || [];
    }, [metrics]);


    // Colores para los gráficos Pie
    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B'];


    if (loading && activeTab === 'overview') {
        return (
            <div className="flex justify-center items-center h-screen bg-background-color">
                <p className="text-primary-color text-lg">Cargando dashboard...</p>
            </div>
        );
    }

    if (error && activeTab === 'overview') {
        return (
            <div className="text-center p-8 text-red-500 bg-card-background rounded-lg shadow-lg m-4">
                <h2 className="text-2xl font-bold mb-4">Error al cargar el Dashboard</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="button primary-button mt-4">Recargar</button>
            </div>
        );
    }

    if (user?.role !== 'admin') {
        return null; 
    }

    return (
        <div className="admin-dashboard p-4 md:p-8 bg-background-color min-h-screen flex flex-col md:flex-row gap-6">
            <h1 className="text-3xl font-bold text-primary-color mb-8 text-center md:hidden">Panel de Administración</h1>

            <div className="tabs-sidebar bg-card-background p-4 rounded-lg shadow-lg md:w-64 w-full flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-hidden">
                <h2 className="text-2xl font-bold text-primary-color mb-4 hidden md:block">Navegación</h2> 
                
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'overview' 
                      ? 'bg-[#800020] text-white shadow-md' 
                      : 'bg-transparent text-text-light hover:bg-hover-background hover:text-primary-color'}
                  `} onClick={() => handleTabChange('overview')}>
                    Resumen
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'users' 
                      ? 'bg-[#800020] text-white shadow-md' 
                      : 'bg-transparent text-text-light hover:bg-hover-background hover:text-primary-color'}
                  `} onClick={() => handleTabChange('users')}>
                    Usuarios
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'tickets' 
                      ? 'bg-[#800020] text-white shadow-md' 
                      : 'bg-transparent text-text-light hover:bg-hover-background hover:text-primary-color'}
                  `} onClick={() => handleTabChange('tickets')}>
                    Tickets
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'departments' 
                      ? 'bg-[#800020] text-white shadow-md' 
                      : 'bg-transparent text-text-light hover:bg-hover-background hover:text-primary-color'}
                  `} onClick={() => handleTabChange('departments')}>
                    Departamentos
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'activityLogs' 
                      ? 'bg-[#800020] text-white shadow-md' 
                      : 'bg-transparent text-text-light hover:bg-hover-background hover:text-primary-color'}
                  `} onClick={() => handleTabChange('activityLogs')}>
                    Registro de Actividad
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'reports' 
                      ? 'bg-[#800020] text-white shadow-md' 
                      : 'bg-transparent text-text-light hover:bg-hover-background hover:text-primary-color'}
                  `} onClick={() => handleTabChange('reports')}>
                    Informes
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'notifications' 
                      ? 'bg-[#800020] text-white shadow-md' 
                      : 'bg-transparent text-text-light hover:bg-hover-background hover:text-primary-color'}
                  `} onClick={() => handleTabChange('notifications')}>
                    Notificaciones
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'bacarKeys' 
                      ? 'bg-[#800020] text-white shadow-md' 
                      : 'bg-transparent text-text-light hover:bg-hover-background hover:text-primary-color'}
                  `} onClick={() => handleTabChange('bacarKeys')}>
                    Claves Bacar
                </button>
            </div>

            <div className="tab-content bg-card-background p-6 rounded-lg shadow-lg flex-1 w-full">
                <h1 className="text-3xl font-bold text-primary-color mb-8 text-center hidden md:block">Panel de Administración</h1>

                {activeTab === 'overview' && metrics && (
                    <div className="overview-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Tarjetas de métricas */}
                        <div className="metric-card bg-secondary-background p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">Total Tickets</h3>
                            <p className="text-3xl font-bold text-primary-color">{metrics.totalTickets}</p>
                        </div>
                        <div className="metric-card bg-secondary-background p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">Tickets Abiertos</h3>
                            <p className="text-3xl font-bold text-green-500">{metrics.openTickets}</p>
                        </div>
                        <div className="metric-card bg-secondary-background p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">Tickets Cerrados</h3>
                            <p className="text-3xl font-bold text-blue-500">{metrics.closedTickets}</p>
                        </div>
                        <div className="metric-card bg-secondary-background p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">Total Usuarios</h3>
                            <p className="text-3xl font-bold text-purple-500">{metrics.totalUsers}</p>
                        </div>
                        <div className="metric-card bg-secondary-background p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">Total Departamentos</h3>
                            <p className="text-3xl font-bold text-orange-500">{metrics.totalDepartments}</p>
                        </div>

                        {/* Actividad Reciente */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-secondary-background p-4 rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4">Actividad Reciente</h3>
                            {recentActivities.length > 0 ? (
                                <ul className="space-y-2">
                                    {recentActivities.map(activity => (
                                        <li key={activity.id} className="border-b border-border-color pb-2 last:border-b-0">
                                            <p className="text-text-light dark:text-text-dark">
                                                <span className="font-medium">{activity.user_username || 'Sistema'}</span>{' '}
                                                {activity.description}
                                                <span className="text-sm text-gray-500 ml-2">
                                                    {new Date(activity.created_at).toLocaleString()}
                                                </span>
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-text-light dark:text-text-dark">No hay actividad reciente.</p>
                            )}
                        </div>

                        {/* Tickets Recientes */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-secondary-background p-4 rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4">Tickets Recientes (Abiertos/En Progreso)</h3>
                            {recentTickets.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Asunto</th>
                                                <th>Estado</th>
                                                <th>Prioridad</th>
                                                <th>Creador</th>
                                                <th>Asignado a</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentTickets.map(ticket => (
                                                <tr key={ticket.id}>
                                                    <td>{ticket.id}</td>
                                                    <td><Link to={`/tickets/${ticket.id}`} className="text-primary-color hover:underline">{ticket.title}</Link></td> 
                                                    <td><span className={`status-badge status-${ticket.status}`}>{ticketStatusTranslations[ticket.status]}</span></td>
                                                    <td><span className={`priority-badge priority-${ticket.priority}`}>{ticketPriorityTranslations[ticket.priority]}</span></td>
                                                    <td>{ticket.user_username}</td>
                                                    <td>{ticket.agent_username || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-text-light dark:text-text-dark">No hay tickets recientes.</p>
                            )}
                        </div>

                        {/* Gráficos de Recharts */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            {/* Tickets por Estado (Pie Chart) */}
                            <div className="bg-secondary-background p-4 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4 text-center">Tickets por Estado</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={ticketsByStatusData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                        >
                                            {ticketsByStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number, name: string) => [`${value} tickets`, name]} />
                                        <Legend layout="vertical" align="right" verticalAlign="middle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Tickets por Prioridad (Pie Chart) */}
                            <div className="bg-secondary-background p-4 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4 text-center">Tickets por Prioridad</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={ticketsByPriorityData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#82ca9d"
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                        >
                                            {ticketsByPriorityData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number, name: string) => [`${value} tickets`, name]} />
                                        <Legend layout="vertical" align="right" verticalAlign="middle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Tickets por Estado a lo largo del tiempo (Line Chart) */}
                            <div className="col-span-full bg-secondary-background p-4 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4 text-center">Tickets por Estado (Tendencia)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={ticketsByStatusOverTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="open" stroke="#8884d8" name="Abiertos" />
                                        <Line type="monotone" dataKey="inProgress" stroke="#82ca9d" name="En Progreso" />
                                        <Line type="monotone" dataKey="closed" stroke="#ffc658" name="Cerrados" /> 
                                        <Line type="monotone" dataKey="reopened" stroke="#ff7300" name="Reabiertos" /> 
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Tickets por Prioridad a lo largo del tiempo (Line Chart) */}
                            <div className="col-span-full bg-secondary-background p-4 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4 text-center">Tickets por Prioridad (Tendencia)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={ticketsByPriorityOverTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="low" stroke="#4CAF50" name="Baja" />
                                        <Line type="monotone" dataKey="medium" stroke="#FFC107" name="Media" />
                                        <Line type="monotone" dataKey="high" stroke="#F44336" name="Alta" />
                                        <Line type="monotone" dataKey="urgent" stroke="#9C27B0" name="Urgente" /> 
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Rendimiento de Agentes (Bar Chart) */}
                            <div className="col-span-full bg-secondary-background p-4 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4 text-center">Rendimiento de Agentes</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={agentPerformanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                                        <XAxis dataKey="agentName" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="resolvedTickets" fill="#8884d8" name="Tickets Resueltos" />
                                        <Bar dataKey="avgResolutionTimeHours" fill="#82ca9d" name="Tiempo Resolución (Horas)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Rendimiento de Departamentos (Bar Chart) */}
                            <div className="col-span-full bg-secondary-background p-4 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold text-text-light dark:text-text-dark mb-4 text-center">Rendimiento de Departamentos</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={departmentPerformanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                                        <XAxis dataKey="departmentName" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="totalTickets" fill="#FFC107" name="Total Tickets" />
                                        <Bar dataKey="avgResolutionTimeHours" fill="#F44336" name="Tiempo Resolución (Horas)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <>
                        <Users onEditUser={handleEditUser} /> 
                        {isUserEditModalOpen && (
                            <UserEditModal
                                isOpen={isUserEditModalOpen}
                                onClose={handleCloseUserEditModal}
                                user={selectedUser}
                                onUserUpdated={handleUserUpdated}
                                token={token} 
                                departments={allDepartments} 
                            />
                        )}
                    </>
                )}
                {activeTab === 'tickets' && (
                    <>
                        <h2 className="text-xl font-bold text-primary-color mb-4">Lista de Tickets</h2>
                        <p className="info-text mb-4">Aquí se mostraría una lista completa de tickets. Actualmente, los tickets recientes se muestran en la pestaña "Resumen".</p>
                        {/* Aquí iría el componente TicketsList si tuvieras uno dedicado. */}
                        {/* <TicketsList onEditTicket={handleViewTicket} /> */} 

                        {isTicketDetailModalOpen && selectedTicket && (
                            <TicketDetailModal
                                isOpen={isTicketDetailModalOpen}
                                onClose={handleCloseTicketDetailModal}
                                ticket={selectedTicket}
                                token={token} 
                                departments={allDepartments} 
                                users={allUsers} 
                                onTicketUpdated={() => {
                                    handleTabChange('tickets');
                                }}
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
                        <div className="flex justify-end mt-4">
                            <button onClick={handleCreateTicket} className="button primary-button">
                                Crear Nuevo Ticket
                            </button>
                        </div>
                    </>
                )}
                {activeTab === 'departments' && (
                    <>
                        <Departments onEditDepartment={handleEditDepartment} /> 

                        {isDepartmentEditModalOpen && (
                            <DepartmentEditModal
                                isOpen={isDepartmentEditModalOpen}
                                onClose={handleCloseDepartmentEditModal}
                                department={selectedDepartment}
                                onDepartmentUpdated={handleDepartmentUpdated}
                                token={token} 
                            />
                        )}
                    </>
                )}
                {activeTab === 'activityLogs' && <ActivityLogs />}
                {activeTab === 'reports' && <Reports />}
                
                {activeTab === 'notifications' && (
                    <div className="notifications-list">
                        <h2 className="text-2xl font-bold text-primary-color mb-4 text-center">Gestión de Notificaciones</h2>
                        <p className="info-text text-center mb-6">Visualiza y gestiona las notificaciones del sistema.</p>

                        {loading ? (
                            <div className="loading-message">🔄 Cargando notificaciones...</div>
                        ) : notifications.length > 0 ? (
                            <div className="space-y-4">
                                {notifications.map((notification) => (
                                    <div key={notification.id} className="bg-secondary-background p-4 rounded-lg shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-text-light dark:text-text-dark">{notification.message}</p>
                                            <p className="text-sm text-gray-500">
                                                {new Date(notification.created_at).toLocaleString()}
                                                {notification.is_read ? ' (Leída)' : ' (No Leída)'}
                                            </p>
                                        </div>
                                        <div>
                                            {!notification.is_read && (
                                                <button
                                                    onClick={() => handleMarkNotificationAsRead(notification.id)}
                                                    className="button small-button primary-button mr-2"
                                                    title="Marcar como leída"
                                                >
                                                    Marcar Leída
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteNotification(notification.id)}
                                                className="ml-4 p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900 transition-colors duration-200"
                                                title="Eliminar notificación"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.5a.5.5 0 0 0 0 1h.5V14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3.5h.5a.5.5 0 0 0 0-1h-2.5ZM4 1.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v1H4v-1ZM13 3.5v10a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V3.5h10Z"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="info-text">No hay notificaciones disponibles.</p>
                        )}
                    </div>
                )}

                {activeTab === 'bacarKeys' && (
                    <BacarKeys />
                )}
=======
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../config/axiosConfig';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import '../index.css'; // Estilos globales
import './AdminDashboard.css'; // Estilos específicos para el dashboard

// Interfaces para los datos que vamos a mostrar
interface Ticket {
    id: number;
    subject: string;
    description: string;
    status: 'open' | 'in-progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    created_at: string;
    updated_at: string;
    user_username: string;
    department_name: string;
    agent_username: string | null;
    user_id: number;
    agent_id: number | null;
    department_id: number;
}

interface User {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'agent' | 'user';
    created_at: string;
    updated_at: string;
}

interface Department {
    id: number;
    name: string;
    description: string;
}

const AdminDashboard: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets' | 'users' | 'departments'>('dashboard');
    const [dashboardData, setDashboardData] = useState<any>(null); // Datos para el dashboard principal
    const [tickets, setTickets] = useState<Ticket[]>([]); // Lista de tickets
    const [users, setUsers] = useState<User[]>([]); // Lista de usuarios
    const [departments, setDepartments] = useState<Department[]>([]); // Lista de departamentos
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Efecto para cargar los datos cuando cambia la pestaña activa
    useEffect(() => {
        const fetchData = async () => {
            setDataLoading(true);
            setError(null);
            try {
                if (activeTab === 'dashboard') {
                    // Aquí podrías hacer una llamada a una nueva API para datos de dashboard
                    // Por ahora, solo simular datos o usar datos existentes
                    // Por ejemplo, podrías contar tickets por estado, usuarios por rol, etc.
                    // Para empezar, solo cargaremos la lista de tickets para el dashboard
                    const ticketsRes = await api.get('/api/tickets');
                    setDashboardData({
                        ticketsCount: ticketsRes.data.count,
                        // Aquí se podrían añadir más estadísticas
                    });
                } else if (activeTab === 'tickets') {
                    const res = await api.get('/api/tickets');
                    setTickets(res.data.tickets);
                } else if (activeTab === 'users') {
                    const res = await api.get('/api/users'); // Asume que /api/users devuelve la lista
                    setUsers(res.data.users);
                } else if (activeTab === 'departments') {
                    const res = await api.get('/api/departments');
                    setDepartments(res.data.departments);
                }
            } catch (err: unknown) {
                if (isAxiosErrorTypeGuard(err)) {
                    setError(err.response?.data?.message || 'Error al cargar los datos.');
                } else {
                    setError('Ocurrió un error inesperado.');
                }
            } finally {
                setDataLoading(false);
            }
        };

        if (!authLoading && user && user.role === 'admin') {
            fetchData();
        }
    }, [activeTab, authLoading, user]); // Dependencias: la pestaña activa, el estado de carga de auth y el usuario.

    if (authLoading) {
        return <div className="loading-message">Cargando autenticación...</div>;
    }

    if (!user || user.role !== 'admin') {
        return <div className="error-message">Acceso denegado. No eres un administrador.</div>;
    }

    // Renderizar contenido de la pestaña activa
    const renderTabContent = () => {
        if (dataLoading) {
            return <div className="loading-message">Cargando datos de {activeTab}...</div>;
        }
        if (error) {
            return <div className="error-message">{error}</div>;
        }

        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="dashboard-overview-grid">
                        <h3>Dashboard Principal</h3>
                        {/* 1C. Información gráfica (placeholders por ahora) */}
                        <div className="dashboard-card">
                            <h4>Tickets Totales</h4>
                            <p className="big-number">{dashboardData?.ticketsCount || 0}</p>
                            {/* Aquí iría un gráfico de barras o circular */}
                            <div className="chart-placeholder">Gráfico de estados de tickets aquí</div>
                        </div>
                        <div className="dashboard-card">
                            <h4>Tickets Abiertos</h4>
                            <p className="big-number">?</p>
                            <div className="chart-placeholder">Gráfico de prioridad aquí</div>
                        </div>
                        <div className="dashboard-card">
                            <h4>Agentes Activos</h4>
                            <p className="big-number">?</p>
                            <div className="chart-placeholder">Gráfico de carga de agentes aquí</div>
                        </div>
                        <div className="dashboard-card">
                            <h4>Departamentos</h4>
                            <p className="big-number">{departments.length}</p> {/* Reutilizamos la info de departments */}
                            <div className="chart-placeholder">Gráfico de tickets por departamento aquí</div>
                        </div>
                        <p className="info-text">Más estadísticas y gráficos se mostrarán aquí.</p>
                    </div>
                );
            case 'tickets':
                return (
                    <div className="admin-tickets-section">
                        <h3>Gestión de Tickets</h3>
                        <p className="info-text">Aquí podrás ver y gestionar todos los tickets. (La misma información que antes)</p>
                        {/* La tabla de tickets detallada iría aquí */}
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Asunto</th>
                                    <th>Descripción</th>
                                    <th>Estado</th>
                                    <th>Prioridad</th>
                                    <th>Usuario</th>
                                    <th>Departamento</th>
                                    <th>Agente Asignado</th>
                                    <th>Fecha Creación</th>
                                    <th>Acciones</th> {/* Para asignar, cambiar estado, etc. */}
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.length > 0 ? (
                                    tickets.map((ticket) => (
                                        <tr key={ticket.id}>
                                            <td>{ticket.id}</td>
                                            <td>{ticket.subject}</td>
                                            <td>{ticket.description.substring(0, 50)}...</td>
                                            <td>{ticket.status}</td>
                                            <td>{ticket.priority}</td>
                                            <td>{ticket.user_username}</td>
                                            <td>{ticket.department_name}</td>
                                            <td>{ticket.agent_username || 'Sin Asignar'}</td>
                                            <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                                            <td>
                                                {/* Botones de acción (ej. Asignar, Ver Detalle) */}
                                                <button className="button primary-button small-button">Asignar</button>
                                                <button className="button secondary-button small-button">Ver</button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={10}>No hay tickets para mostrar.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                );
            case 'users':
                return (
                    <div className="admin-users-section">
                        <h3>Gestión de Usuarios</h3>
                        <p className="info-text">Aquí podrás ver y gestionar todos los usuarios del sistema.</p>
                        {/* Tabla de usuarios */}
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre de Usuario</th>
                                    <th>Email</th>
                                    <th>Rol</th>
                                    <th>Fecha Creación</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length > 0 ? (
                                    users.map((userItem) => ( // Renombrado a userItem para evitar conflicto con 'user' del contexto
                                        <tr key={userItem.id}>
                                            <td>{userItem.id}</td>
                                            <td>{userItem.username}</td>
                                            <td>{userItem.email}</td>
                                            <td>{userItem.role}</td>
                                            <td>{new Date(userItem.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <button className="button primary-button small-button">Editar</button>
                                                <button className="button danger-button small-button">Eliminar</button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6}>No hay usuarios para mostrar.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                );
            case 'departments':
                return (
                    <div className="admin-departments-section">
                        <h3>Gestión de Departamentos</h3>
                        <p className="info-text">Aquí podrás ver y gestionar los departamentos de tickets.</p>
                        {/* Tabla de departamentos */}
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Descripción</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departments.length > 0 ? (
                                    departments.map((dept) => (
                                        <tr key={dept.id}>
                                            <td>{dept.id}</td>
                                            <td>{dept.name}</td>
                                            <td>{dept.description}</td>
                                            <td>
                                                <button className="button primary-button small-button">Editar</button>
                                                <button className="button danger-button small-button">Eliminar</button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4}>No hay departamentos para mostrar.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="admin-dashboard-container">
            <h1 className="dashboard-title">Panel de Administrador</h1>
            <p className="welcome-message">Bienvenido, {user?.username} ({user?.role})</p>

            {/* Barra de Navegación de Pestañas */}
            <div className="tab-navigation">
                <button 
                    className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    Dashboard
                </button>
                <button 
                    className={`tab-button ${activeTab === 'tickets' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tickets')}
                >
                    Gestión de Tickets
                </button>
                <button 
                    className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    Usuarios
                </button>
                <button 
                    className={`tab-button ${activeTab === 'departments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('departments')}
                >
                    Departamentos
                </button>
            </div>

            {/* Contenido de la Pestaña Activa */}
            <div className="tab-content">
                {renderTabContent()}
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
            </div>
        </div>
    );
};

<<<<<<< HEAD
export default AdminDashboard;
=======
export default AdminDashboard;
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
