// frontend/src/pages/AdminDashboard.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import Tickets from '../components/Tickets/Tickets'; // Importar el nuevo componente Tickets

import ActivityLogs from '../components/System/ActivityLogDashboard'; 
import Reports from '../components/Dashboard/ReportsDashboard'; 

import { ticketStatusTranslations, ticketPriorityTranslations, userRoleTranslations, targetTypeTranslations, translateTerm } from '../utils/traslations';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const AdminDashboard: React.FC = () => { 
    const { user, token, signOut } = useAuth();
    const { addNotification } = useNotification();
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

    // Estados para modales (estos modales ahora serán controlados por los componentes Tickets y Users/Departments)
    // Se mantienen aquí solo si AdminDashboard necesita abrirlos desde el overview o pasarlos a otros componentes.
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

    const activeTabRef = useRef(activeTab);

    useEffect(() => {
        activeTabRef.current = activeTab;
    }, [activeTab]);

    useEffect(() => {
        const tab = queryParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [location.search, queryParams]); 

    const handleTabChange = useCallback((tabName: string) => {
        setActiveTab(tabName);
        navigate(`?tab=${tabName}`);
    }, [navigate]);

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
                // Corrección: Usar apiError.status en lugar de err.response?.status
                if (err.response?.status === 401) signOut(); 
            } else {
                setError('Ocurrió un error inesperado al cargar las métricas.');
            }
            console.error('Error fetching dashboard metrics:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut]);

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
                // Corrección: Usar apiError.status en lugar de err.response?.status
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar las actividades.');
            }
            console.error('Error fetching recent activities:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut]);

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
                // Corrección: Usar apiError.status en lugar de err.response?.status
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
                // Corrección: Usar apiError.status en lugar de err.response?.status
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
                // Data for 'users' tab is fetched by the Users component itself
                break;
            case 'tickets':
                // Data for 'tickets' tab will now be fetched by the Tickets component itself
                break;
            case 'departments':
                // Data for 'departments' tab is fetched by the Departments component itself
                break;
            case 'activityLogs':
                // Data for 'activityLogs' tab is fetched by the ActivityLogs component itself
                break;
            case 'reports':
                // Data for 'reports' tab is fetched by the Reports component itself
                break;
            case 'notifications':
                fetchNotifications(); 
                break;
            case 'bacarKeys':
                // Data for 'bacarKeys' tab is fetched by the BacarKeys component itself
                break;
            default:
                break;
        }
    }, [activeTab, user, navigate, addNotification, fetchDashboardMetrics, fetchRecentActivities, fetchRecentTickets, fetchNotifications, fetchUsersAndDepartments]);


    // Funciones para modales de Tickets (estos ahora son manejados por el componente Tickets.tsx)
    // Se mantienen aquí si el overview necesita abrirlos, pero el componente Tickets.tsx manejará su propia creación/edición
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
        const tabBeforeChange = activeTabRef.current; 
        handleTabChange('tickets'); 
        
        if (tabBeforeChange === 'overview') {
            fetchRecentTickets();
        }
    }, [handleTabChange, fetchRecentTickets]);


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
        // El componente Users se re-renderizará y re-fetch al cambiar de pestaña
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
        // El componente Departments se re-renderizará y re-fetch al cambiar de pestaña
    }, [handleCloseDepartmentEditModal]);


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
        return metrics?.agentPerformance?.map(agent => ({
            agentName: agent.agentName,
            resolvedTickets: agent.resolvedTickets,
            avgResolutionTimeHours: agent.avgResolutionTimeHours
        })) || [];
    }, [metrics]);

    const departmentPerformanceData = useMemo(() => {
        return metrics?.departmentPerformance?.map(dept => ({
            departmentName: dept.departmentName,
            totalTickets: dept.totalTickets,
            avgResolutionTimeHours: dept.avgResolutionTimeHours
        })) || [];
    }, [metrics]);


    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B'];


    if (loading && activeTab === 'overview') {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100 text-gray-700">
                <p className="text-lg">Cargando dashboard...</p>
            </div>
        );
    }

    if (error && activeTab === 'overview') {
        return (
            <div className="text-center p-8 text-red-500 bg-white rounded-lg shadow-lg m-4">
                <h2 className="text-2xl font-bold mb-4">Error al cargar el Dashboard</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4">Recargar</button>
            </div>
        );
    }

    if (!user || user.role !== 'admin') {
        return null; 
    }

    return (
        <div className="admin-dashboard p-4 md:p-8 bg-gray-100 min-h-screen flex flex-col md:flex-row gap-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center md:hidden">Panel de Administración</h1>

            <div className="tabs-sidebar bg-white p-4 rounded-lg shadow-lg md:w-64 w-full flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-hidden">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 hidden md:block">Navegación</h2> 
                
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'overview' 
                      ? 'bg-red-700 text-white shadow-md' 
                      : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:text-gray-900'}
                  `} onClick={() => handleTabChange('overview')}>
                    Resumen
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'users' 
                      ? 'bg-red-700 text-white shadow-md' 
                      : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:text-gray-900'}
                  `} onClick={() => handleTabChange('users')}>
                    Usuarios
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'tickets' 
                      ? 'bg-red-700 text-white shadow-md' 
                      : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:text-gray-900'}
                  `} onClick={() => handleTabChange('tickets')}>
                    Tickets
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'departments' 
                      ? 'bg-red-700 text-white shadow-md' 
                      : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:text-gray-900'}
                  `} onClick={() => handleTabChange('departments')}>
                    Departamentos
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'activityLogs' 
                      ? 'bg-red-700 text-white shadow-md' 
                      : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:text-gray-900'}
                  `} onClick={() => handleTabChange('activityLogs')}>
                    Registro de Actividad
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'reports' 
                      ? 'bg-red-700 text-white shadow-md' 
                      : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:text-gray-900'}
                  `} onClick={() => handleTabChange('reports')}>
                    Informes
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'notifications' 
                      ? 'bg-red-700 text-white shadow-md' 
                      : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:text-gray-900'}
                  `} onClick={() => handleTabChange('notifications')}>
                    Notificaciones
                </button>
                <button className={`
                    px-4 py-2 rounded-lg font-semibold transition-colors duration-200 text-left w-full
                    ${activeTab === 'bacarKeys' 
                      ? 'bg-red-700 text-white shadow-md' 
                      : 'bg-transparent text-gray-700 hover:bg-gray-200 hover:text-gray-900'}
                  `} onClick={() => handleTabChange('bacarKeys')}>
                    Claves Bacar
                </button>
            </div>

            <div className="tab-content bg-white p-6 rounded-lg shadow-lg flex-1 w-full">
                <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center hidden md:block">Panel de Administración</h1>

                {activeTab === 'overview' && metrics && (
                    <div className="overview-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Tarjetas de métricas */}
                        <div className="metric-card bg-gray-50 p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-700">Total Tickets</h3>
                            <p className="text-3xl font-bold text-blue-600">{metrics.totalTickets}</p>
                        </div>
                        <div className="metric-card bg-gray-50 p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-700">Tickets Abiertos</h3>
                            <p className="text-3xl font-bold text-green-600">{metrics.openTickets}</p>
                        </div>
                        <div className="metric-card bg-gray-50 p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-700">Tickets Cerrados</h3>
                            <p className="text-3xl font-bold text-gray-600">{metrics.closedTickets}</p>
                        </div>
                        <div className="metric-card bg-gray-50 p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-700">Total Usuarios</h3>
                            <p className="text-3xl font-bold text-purple-600">{metrics.totalUsers}</p>
                        </div>
                        <div className="metric-card bg-gray-50 p-4 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-700">Total Departamentos</h3>
                            <p className="text-3xl font-bold text-orange-600">{metrics.totalDepartments}</p>
                        </div>

                        {/* Actividad Reciente */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gray-50 p-4 rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Actividad Reciente</h3>
                            {recentActivities.length > 0 ? (
                                <ul className="space-y-2">
                                    {recentActivities.map(activity => (
                                        <li key={activity.id} className="border-b border-gray-200 pb-2 last:border-b-0">
                                            <p className="text-gray-700">
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
                                <p className="text-gray-700">No hay actividad reciente.</p>
                            )}
                        </div>

                        {/* Tickets Recientes */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-gray-50 p-4 rounded-lg shadow-sm">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Tickets Recientes (Abiertos/En Progreso)</h3>
                            {recentTickets.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asunto</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creador</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado a</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {recentTickets.map(ticket => (
                                                <tr key={ticket.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.id}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {/* MODIFICADO: Cambiado a onClick para abrir el modal */}
                                                        <button onClick={() => handleViewTicket(ticket)} className="text-indigo-600 hover:text-indigo-900">
                                                            {ticket.title}
                                                        </button>
                                                    </td> 
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
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.user_username}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.agent_username || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-700">No hay tickets recientes.</p>
                            )}
                        </div>

                        {/* Gráficos de Recharts */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            {/* Tickets por Estado (Pie Chart) */}
                            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Tickets por Estado</h3>
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
                            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Tickets por Prioridad</h3>
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
                            <div className="col-span-full bg-gray-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Tickets por Estado (Tendencia)</h3>
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
                            <div className="col-span-full bg-gray-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Tickets por Prioridad (Tendencia)</h3>
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
                            <div className="col-span-full bg-gray-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Rendimiento de Agentes</h3>
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
                            <div className="col-span-full bg-gray-50 p-4 rounded-lg shadow-sm">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Rendimiento de Departamentos</h3>
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
                        {/* MODIFICADO: Ahora renderiza el componente Tickets */}
                        <Tickets /> 
                        {/* Los modales de ticket ahora son controlados por el componente Tickets.tsx */}
                        {/* Se pueden eliminar de aquí si ya no se abren directamente desde AdminDashboard */}
                        {isTicketDetailModalOpen && selectedTicket && (
                            <TicketDetailModal
                                isOpen={isTicketDetailModalOpen}
                                onClose={handleCloseTicketDetailModal}
                                ticket={selectedTicket}
                                token={token} 
                                departments={allDepartments} 
                                users={allUsers} 
                                onTicketUpdated={() => {
                                    handleCloseTicketDetailModal(); 
                                    const tabBeforeChange = activeTabRef.current; 
                                    if (tabBeforeChange === 'overview') {
                                        fetchRecentTickets(); 
                                    }
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
                        {/* El botón de crear ticket también se moverá dentro de Tickets.tsx */}
                        {/* <div className="flex justify-end mt-4">
                            <button onClick={handleCreateTicket} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200">
                                Crear Nuevo Ticket
                            </button>
                        </div> */}
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
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Gestión de Notificaciones</h2>
                        <p className="text-gray-700 text-center mb-6">Visualiza y gestiona las notificaciones del sistema.</p>

                        {loading ? (
                            <div className="text-center py-4 text-gray-600">🔄 Cargando notificaciones...</div>
                        ) : notifications.length > 0 ? (
                            <div className="space-y-4">
                                {notifications.map((notification) => (
                                    <div key={notification.id} className="bg-gray-50 p-4 rounded-lg shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-gray-700">{notification.message}</p>
                                            <p className="text-sm text-gray-500">
                                                {new Date(notification.created_at).toLocaleString()}
                                                {notification.is_read ? ' (Leída)' : ' (No Leída)'}
                                            </p>
                                        </div>
                                        <div>
                                            {!notification.is_read && (
                                                <button
                                                    onClick={() => handleMarkNotificationAsRead(notification.id)}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-sm mr-2 transition-colors duration-200"
                                                    title="Marcar como leída"
                                                >
                                                    Marcar Leída
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteNotification(notification.id)}
                                                className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors duration-200"
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
                            <p className="text-gray-700 text-center">No hay notificaciones disponibles.</p>
                        )}
                    </div>
                )}

                {activeTab === 'bacarKeys' && (
                    <BacarKeys />
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
