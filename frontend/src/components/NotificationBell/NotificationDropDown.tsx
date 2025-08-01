import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext'; // Importar useNotification
import { Notification } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { format } from 'date-fns';

interface NotificationDropdownProps {
    isOpen: boolean;
    onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
    // MODIFICADO: fetchUnreadNotificationsCount ahora viene de useNotification
    const { token } = useAuth();
    const { addNotification, markNotificationAsRead, fetchNotifications: fetchUnreadNotificationsCount } = useNotification(); // Obtener fetchUnreadNotificationsCount del contexto de notificaciones
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    // Eliminado el estado 'error' local, ya que useNotification lo maneja
    // const [error, setError] = useState<string | null>(null);

    const fetchNotificationsData = useCallback(async () => {
        if (!token) {
            // addNotification('No autorizado para cargar notificaciones.', 'error'); // Esto podría causar un bucle si se llama constantemente
            setNotifications([]);
            return;
        }
        setLoading(true);
        // setError(null); // Eliminado
        try {
            const response = await api.get('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications(Array.isArray(response.data) ? response.data : response.data.notifications || []);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                // setError(apiError?.message || 'Error al cargar notificaciones.'); // Eliminado
                addNotification(`Error al cargar notificaciones: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                // setError('Ocurrió un error inesperado al cargar las notificaciones.'); // Eliminado
                addNotification('Ocurrió un error inesperado al cargar las notificaciones.', 'error');
            }
            console.error('Error fetching notifications:', err);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        if (isOpen) {
            fetchNotificationsData();
        }
    }, [isOpen, fetchNotificationsData]);

    const handleMarkAsRead = useCallback(async (notificationId: number) => {
        await markNotificationAsRead(notificationId); // Llama a la función del contexto
        fetchNotificationsData(); // Refresca la lista de notificaciones en el dropdown
        fetchUnreadNotificationsCount(); // Actualiza el contador de notificaciones no leídas
    }, [markNotificationAsRead, fetchNotificationsData, fetchUnreadNotificationsCount]);


    if (!isOpen) return null;

    return (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="px-4 py-2 text-lg font-semibold text-gray-800 border-b border-gray-200 dark:text-gray-200 dark:border-gray-700">
                Notificaciones
            </div>
            {loading ? (
                <div className="text-center py-4 text-gray-600 dark:text-gray-400">Cargando notificaciones...</div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-4 text-gray-600 dark:text-gray-400">No hay notificaciones.</div>
            ) : (
                <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0
                                ${notification.is_read ? 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-400' : 'bg-white text-gray-800 font-medium dark:bg-gray-800 dark:text-gray-200'}
                                hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150
                            `}
                        >
                            <div className="flex-1 pr-2">
                                <p className="text-sm leading-snug">{notification.message}</p>
                                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                                    {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm')}
                                </p>
                            </div>
                            {!notification.is_read && (
                                <button
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className="ml-2 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded-full transition-colors duration-200"
                                    title="Marcar como leída"
                                >
                                    Leída
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={onClose}
                    className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-md transition-colors duration-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
};

export default NotificationDropdown;
