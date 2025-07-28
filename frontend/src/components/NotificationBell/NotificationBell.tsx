// frontend/src/components/Layout/NotificationBell.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import api from '../../config/axiosConfig';
import { Notification } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { Link } from 'react-router-dom';

const NotificationBell: React.FC = () => {
    const { token, signOut } = useAuth();
    const { addNotification } = useNotification();
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]); // Inicializar como array vacío
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            if (!token) return; // No intentar si no hay token
            const response = await api.get('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Asegurarse de que response.data exista y sea un array o tenga una propiedad 'notifications'
            const fetchedNotifications = Array.isArray(response.data) ? response.data : response.data?.notifications || [];
            setNotifications(fetchedNotifications);
            setUnreadCount(fetchedNotifications.filter((n: { is_read: any; }) => !n.is_read).length);
        } catch (err: unknown) {
            console.error('Error fetching notifications:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al cargar notificaciones: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                addNotification('Ocurrió un error inesperado al cargar las notificaciones.', 'error');
            }
            setNotifications([]); // Asegurar que el estado sea un array vacío en caso de error
            setUnreadCount(0);
        }
    }, [token, addNotification, signOut]);

    const handleMarkAsRead = useCallback(async (notificationId: number) => {
        try {
            if (!token) return;
            await api.put(`/api/notifications/${notificationId}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Notificación marcada como leída.', 'success');
            fetchNotifications(); // Refrescar la lista
        } catch (err: unknown) {
            console.error('Error marking notification as read:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al marcar notificación: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al marcar la notificación.', 'error');
            }
        }
    }, [token, addNotification, fetchNotifications]);

    const handleBellClick = useCallback(() => {
        setIsDropdownOpen(prev => !prev);
    }, []);

    // Cerrar el dropdown si se hace clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch notifications on component mount and when token changes
    useEffect(() => {
        if (token) { // Solo intentar cargar si hay un token
            fetchNotifications();
        } else {
            setNotifications([]); // Limpiar notificaciones si no hay token
            setUnreadCount(0);
        }
    }, [token, fetchNotifications]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={handleBellClick} className="relative p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.001 2.001 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                    <div className="px-4 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200">
                        Notificaciones ({unreadCount} no leídas)
                    </div>
                    {notifications.length > 0 ? (
                        notifications.map(notification => (
                            <div key={notification.id} className={`flex items-center justify-between px-4 py-3 border-b last:border-b-0 ${notification.is_read ? 'bg-gray-50 text-gray-600' : 'bg-white text-gray-800 font-medium'}`}>
                                <Link to={`/admin-dashboard?tab=notifications`} onClick={() => setIsDropdownOpen(false)} className="flex-1 mr-2 hover:text-blue-600 transition-colors duration-200">
                                    <p className="text-sm">{notification.message}</p>
                                    <p className="text-xs text-gray-500">{new Date(notification.created_at).toLocaleString()}</p>
                                </Link>
                                {!notification.is_read && (
                                    <button
                                        onClick={() => handleMarkAsRead(notification.id)}
                                        className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded-md border border-blue-300 hover:border-blue-500 transition-colors duration-200"
                                    >
                                        Marcar Leída
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-sm text-gray-500">No hay notificaciones.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
