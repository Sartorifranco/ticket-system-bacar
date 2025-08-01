// frontend/src/components/Common/NotificationBell.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Notification, ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import io from 'socket.io-client';

const NotificationBell: React.FC = () => {
    const { user, token } = useAuth();
    const { addNotification: addToastNotification } = useNotification(); // Renombrado para evitar conflicto
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const socket = useRef<any>(null);

    // Función para obtener las notificaciones del backend
    const fetchNotifications = useCallback(async () => {
        if (!token || !user?.id) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
        try {
            const response = await api.get<{ success: boolean; data: Notification[]; count: number }>(
                `/api/notifications?user_id=${user.id}&limit=10`, // Obtener las últimas 10 notificaciones
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const fetchedNotifications = Array.isArray(response.data.data) ? response.data.data : [];
            setNotifications(fetchedNotifications);
            setUnreadCount(fetchedNotifications.filter(n => !n.is_read).length);
        } catch (err: unknown) {
            console.error('Error fetching notifications:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addToastNotification(`Error al cargar notificaciones: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addToastNotification('Ocurrió un error inesperado al cargar las notificaciones.', 'error');
            }
        }
    }, [token, user?.id, addToastNotification]);

    // Función para marcar notificaciones como leídas
    const markAsRead = useCallback(async (notificationId: number) => {
        if (!token) return;
        try {
            await api.put(`/api/notifications/${notificationId}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Actualizar el estado local para reflejar que la notificación fue leída
            setNotifications(prev =>
                prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err: unknown) {
            console.error('Error marking notification as read:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addToastNotification(`Error al marcar como leída: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addToastNotification('Ocurrió un error inesperado al marcar la notificación como leída.', 'error');
            }
        }
    }, [token, addToastNotification]);

    // Efecto para cargar notificaciones al montar el componente o cuando el usuario/token cambie
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Manejar clics fuera del desplegable para cerrarlo
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

    // Conexión Socket.IO para notificaciones en tiempo real
    useEffect(() => {
        if (user && token && !socket.current) {
            socket.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
                auth: { token: token }
            });

            socket.current.on('connect', () => {
                console.log('Conectado a Socket.IO (Notification Bell)');
                socket.current.emit('joinRoom', { roomName: `user-${user.id}`, userId: user.id });
                // También unirse a la sala general de su rol si es necesario para notificaciones globales
                socket.current.emit('joinRoom', { roomName: user.role, userId: user.id });
            });

            socket.current.on('newNotification', (data: Notification) => {
                console.log('Nueva notificación recibida:', data);
                // Añadir la nueva notificación al principio y actualizar el contador
                setNotifications(prev => [data, ...prev].slice(0, 10)); // Mantener solo las últimas 10
                if (!data.is_read) {
                    setUnreadCount(prev => prev + 1);
                }
                addToastNotification(data.message, 'info'); // Mostrar como toast también
            });

            socket.current.on('disconnect', () => {
                console.log('Desconectado de Socket.IO (Notification Bell)');
            });

            socket.current.on('connect_error', (err: any) => {
                console.error('Socket.IO connection error (Notification Bell):', err.message);
                addToastNotification(`Error de conexión con notificaciones: ${err.message}`, 'error');
            });

            return () => {
                if (socket.current) {
                    socket.current.disconnect();
                    socket.current = null;
                }
            };
        }
    }, [user, token, addToastNotification]);

    const handleBellClick = () => {
        setIsDropdownOpen(prev => !prev);
        // Si se abre el desplegable, intenta marcar todas las notificaciones como leídas (opcional)
        // O solo las que se visualizan en el dropdown. Por simplicidad, las marcamos al abrirlas.
        if (!isDropdownOpen && unreadCount > 0) {
            // Podrías enviar una petición para marcar todas las visibles como leídas
            // For now, just reset the count visually and let individual clicks mark them.
            // Or, you can add a 'mark all as read' button in the dropdown.
        }
    };

    if (!user) { // No mostrar la campana si no hay usuario logueado
        return null;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleBellClick}
                className="relative p-2 text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full transition duration-150 ease-in-out"
                aria-label="Notificaciones"
            >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.001 2.001 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 max-h-96 overflow-y-auto">
                    <div className="block px-4 py-2 text-xs text-gray-400 border-b border-gray-200">
                        Notificaciones ({unreadCount} no leídas)
                    </div>
                    {notifications.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-600">No hay notificaciones.</div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`block px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 cursor-pointer
                                    ${notification.is_read ? 'text-gray-500 bg-gray-50' : 'text-gray-800 bg-white font-medium hover:bg-gray-100'}`}
                                onClick={() => markAsRead(notification.id)}
                            >
                                <p>{notification.message}</p>
                                <span className="text-xs text-gray-400 block mt-1">
                                    {new Date(notification.created_at).toLocaleString()}
                                </span>
                            </div>
                        ))
                    )}
                    {/* Opcional: Botón para ver todas las notificaciones o marcar todas como leídas */}
                    {unreadCount > 0 && (
                         <div className="px-4 py-2 text-center border-t border-gray-200">
                            <button
                                onClick={() => {
                                    // Implementar lógica para marcar todas como leídas o navegar a una página de notificaciones
                                    // Por ahora, solo cerramos el dropdown y recargamos para actualizar el contador
                                    setIsDropdownOpen(false);
                                    fetchNotifications(); // Para actualizar el contador visual
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                                Marcar todas como leídas
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
