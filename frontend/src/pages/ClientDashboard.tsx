// frontend/src/pages/ClientDashboard.tsx
<<<<<<< HEAD
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { TicketData, Notification, Department, User } from '../types'; 
import { isAxiosErrorTypeGuard, ApiResponseError } from '../utils/typeGuards';
import CreateTicketModal from '../components/Tickets/CreateTicketModal';
import TicketDetailModal from '../components/Tickets/TicketDetailModal';
import { ticketStatusTranslations, ticketPriorityTranslations } from '../utils/traslations';

const ClientDashboard: React.FC = () => {
    const { user, token, addNotification, signOut } = useAuth();
    const navigate = useNavigate();

    const [tickets, setTickets] = useState<TicketData[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
    const [isTicketDetailModalOpen, setIsTicketDetailModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);

    // Para pasar a los modales de ticket
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    const fetchClientData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token || !user) {
                throw new Error('No autorizado. Token o usuario no disponible.');
            }

            // Fetch tickets for the current user
            const ticketsResponse = await api.get('/api/tickets', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setTickets(ticketsResponse.data.tickets || []);

            // Fetch notifications for the current user
            const notificationsResponse = await api.get('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications(notificationsResponse.data.notifications || []);

            // Fetch departments and users for modals
            const [departmentsRes, usersRes] = await Promise.all([
                api.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setAllDepartments(departmentsRes.data.departments || []);
            setAllUsers(usersRes.data || []); 

        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar datos del dashboard.');
                addNotification(`Error al cargar datos: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar los datos.');
            }
            console.error('Error fetching client dashboard data:', err);
        } finally {
            setLoading(false);
        }
    }, [token, user, addNotification, signOut]);

    useEffect(() => {
        if (user && user.role === 'client') {
            fetchClientData();
        } else if (user && user.role !== 'client') {
            // Redirigir si no es cliente y está en el dashboard de cliente
            addNotification('Acceso denegado. Solo clientes pueden acceder a este panel.', 'error');
            navigate('/admin-dashboard'); 
        }
    }, [user, fetchClientData, navigate, addNotification]);

    const handleCreateTicket = useCallback(() => {
        setIsCreateTicketModalOpen(true);
    }, []);

    const handleTicketCreatedOrUpdated = useCallback(() => {
        setIsCreateTicketModalOpen(false);
        setIsTicketDetailModalOpen(false); 
        fetchClientData(); 
    }, [fetchClientData]);

    const handleViewTicket = useCallback((ticket: TicketData) => {
        setSelectedTicket(ticket);
        setIsTicketDetailModalOpen(true);
    }, []);

    const handleCloseTicketDetailModal = useCallback(() => {
        setIsTicketDetailModalOpen(false);
        setSelectedTicket(null);
    }, []);

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
            fetchClientData(); 
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al marcar notificación: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al marcar la notificación.', 'error');
            }
            console.error('Error marking notification as read:', err);
        }
    }, [token, addNotification, fetchClientData]);

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
            fetchClientData(); 
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al eliminar notificación: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al eliminar la notificación.', 'error');
            }
            console.error('Error deleting notification:', err);
        }
    }, [token, addNotification, fetchClientData]);


    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-background-color">
                <p className="text-primary-color text-lg">Cargando dashboard de cliente...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8 text-red-500 bg-card-background rounded-lg shadow-lg m-4">
                <h2 className="text-2xl font-bold mb-4">Error al cargar el Dashboard del Cliente</h2>
                <p>{error}</p>
                <button onClick={fetchClientData} className="button primary-button mt-4">Reintentar</button>
            </div>
        );
    }

    if (user?.role !== 'client') {
        return null; 
    }

    return (
        <div className="client-dashboard p-4 md:p-8 bg-background-color min-h-screen">
            <h1 className="text-3xl font-bold text-primary-color mb-8 text-center">Bienvenido, {user?.username}!</h1>

            {/* Resumen de Tickets */}
            <div className="summary-section bg-card-background p-6 rounded-lg shadow-lg mb-8">
                <h2 className="text-2xl font-bold text-primary-color mb-4">Mis Tickets</h2>
                <div className="flex justify-end mb-4">
                    <button onClick={handleCreateTicket} className="button primary-button">
                        Crear Nuevo Ticket
                    </button>
                </div>
                {tickets.length > 0 ? (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Asunto</th>
                                    <th>Estado</th>
                                    <th>Prioridad</th>
                                    <th>Asignado a</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((ticket) => (
                                    <tr key={ticket.id}>
                                        <td>{ticket.id}</td>
                                        <td>{ticket.title}</td> 
                                        <td><span className={`status-badge status-${ticket.status}`}>{ticketStatusTranslations[ticket.status]}</span></td>
                                        <td><span className={`priority-badge priority-${ticket.priority}`}>{ticketPriorityTranslations[ticket.priority]}</span></td>
                                        <td>{ticket.agent_username || 'N/A'}</td> 
                                        <td>
                                            <button
                                                onClick={() => handleViewTicket(ticket)}
                                                className="button small-button secondary-button"
                                            >
                                                Ver Detalles
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="info-text">No tienes tickets registrados. ¡Crea uno nuevo!</p>
                )}
            </div>

            {/* Notificaciones */}
            <div className="notifications-section bg-card-background p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-primary-color mb-4">Mis Notificaciones</h2>
                {notifications.length > 0 ? (
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

            {/* Modales */}
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

            {isTicketDetailModalOpen && selectedTicket && (
                <TicketDetailModal
                    isOpen={isTicketDetailModalOpen}
                    onClose={handleCloseTicketDetailModal}
                    ticket={selectedTicket}
                    onTicketUpdated={handleTicketCreatedOrUpdated}
                    token={token}
                    departments={allDepartments}
                    users={allUsers}
                />
            )}
        </div>
    );
};

export default ClientDashboard;
=======
import React, { useState, useCallback } from 'react';
import CreateTicketForm from '../components/Tickets/CreateTicketForm';
import MyTicketsList from '../components/Tickets/MyTicketsList';
import Layout from '../components/Layout/Layout'; 
import '../index.css'; 

const ClientDashboard: React.FC = () => {
  const [reloadTickets, setReloadTickets] = useState(false);

  const handleTicketCreated = useCallback(() => {
    setReloadTickets(true);
  }, []);

  const handleTicketsReloaded = useCallback(() => {
    setReloadTickets(false);
  }, []);

  return (
    <Layout>
      <div className="container"> 
        <h1 style={{ color: 'var(--text-color)', marginBottom: '30px', textAlign: 'center' }}>Panel del Cliente</h1>
        
        <div className="login-card" style={{ marginBottom: '40px' }}> 
          <h2 style={{ marginBottom: '20px', color: 'var(--text-color)' }}>Crear Nuevo Ticket</h2>
          <CreateTicketForm onTicketCreated={handleTicketCreated} />
        </div>

        <div className="login-card"> 
          <h2 style={{ marginBottom: '20px', color: 'var(--text-color)' }}>Mis Tickets</h2>
          <MyTicketsList reload={reloadTickets} onReloaded={handleTicketsReloaded} />
        </div>
      </div>
    </Layout>
  );
};

export default ClientDashboard;
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
