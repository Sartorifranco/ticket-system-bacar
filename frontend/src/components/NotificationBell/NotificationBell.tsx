// frontend/src/components/NotificationBell/NotificationBell.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext'; // Importar useNotification
import { Notification } from '../../types'; // Importar Notification del archivo types

const NotificationBell: React.FC = () => {
    // Obtener cosas de useAuth
    const { unreadNotificationsCount, fetchUnreadNotificationsCount, token } = useAuth();
    // Obtener addNotification y markNotificationAsRead de useNotification
    const { addNotification, markNotificationAsRead } = useNotification(); 
    
    const navigate = useNavigate();
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [popupNotifications, setPopupNotifications] = useState<Notification[]>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [notificationsError, setNotificationsError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!token) {
            setNotificationsError('No autenticado para ver notificaciones.');
            return;
        }
        setLoadingNotifications(true);
        setNotificationsError(null);
        try {
            const response = await api.get('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPopupNotifications(response.data.notifications);
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setNotificationsError('Error al cargar notificaciones.');
            addNotification('Error al cargar notificaciones.', 'error');
        } finally {
            setLoadingNotifications(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        if (isPopupOpen) {
            fetchNotifications();
        }
    }, [isPopupOpen, fetchNotifications]);

    const handleBellClick = () => {
        setIsPopupOpen(prev => !prev);
        if (!isPopupOpen) { // Si se está abriendo el popup, refrescar el conteo
            fetchUnreadNotificationsCount(); 
        }
    };

    const handleMarkAsRead = async (notificationId: number) => {
        // MODIFICADO: Llamar a markNotificationAsRead sin token ni fetchUnreadNotificationsCount
        await markNotificationAsRead(notificationId); 
        // Actualizar la lista de notificaciones en el popup para reflejar el cambio
        setPopupNotifications(prev => prev.map(notif => 
            notif.id === notificationId ? { ...notif, is_read: true } : notif
        ));
    };

    const handleViewNotification = (notification: Notification) => {
        if (!notification.is_read) {
            handleMarkAsRead(notification.id);
        }
        // Redirigir a la página del ticket si la notificación está relacionada con uno
        if (notification.related_type === 'ticket' && notification.related_id) {
            navigate(`/admin/tickets/${notification.related_id}`);
        }
        setIsPopupOpen(false); // Cerrar el popup después de ver la notificación
    };

    return (
        <div className="relative">
            <button onClick={handleBellClick} className="relative p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                </svg>
                {unreadNotificationsCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                        {unreadNotificationsCount}
                    </span>
                )}
            </button>

            {isPopupOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50 max-h-96 overflow-y-auto">
                    <div className="px-4 py-2 text-sm font-semibold text-gray-700 border-b">Notificaciones</div>
                    {loadingNotifications ? (
                        <div className="p-4 text-center text-gray-500">Cargando notificaciones...</div>
                    ) : notificationsError ? (
                        <div className="p-4 text-center text-red-500">{notificationsError}</div>
                    ) : popupNotifications.length > 0 ? (
                        popupNotifications.map((notification) => (
                            <div 
                                key={notification.id} 
                                className={`flex items-center justify-between px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-100 ${!notification.is_read ? 'bg-blue-50' : ''}`}
                                onClick={() => handleViewNotification(notification)}
                            >
                                <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                    {notification.message}
                                </p>
                                {!notification.is_read && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                                        className="ml-2 text-blue-500 hover:text-blue-700 text-xs"
                                        title="Marcar como leída"
                                    >
                                        Marcar como leída
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-500">No hay notificaciones.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
