import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { Notification } from '../../types';
import { format } from 'date-fns';

interface NotificationCenterProps {
    // Puedes añadir props si es necesario, por ejemplo, para filtrar o paginar
}

const NotificationCenter: React.FC<NotificationCenterProps> = () => {
    const {
        notifications: contextNotifications, // Notificaciones del contexto (incluye toasts locales)
        markNotificationAsRead,
        markAllNotificationsAsRead, // Ahora existe en el contexto
        deleteNotification,
        // clearAllNotifications, // Eliminado, ya que deleteNotification es más granular
        addNotification, // Para errores de carga
        fetchNotifications: fetchContextNotifications // Para recargar las notificaciones de la DB
    } = useNotification();

    const [loading, setLoading] = useState(false); // Para la carga de notificaciones persistentes
    const [filter, setFilter] = useState<'all' | 'unread'>('unread');

    // Filtrar notificaciones basadas en el estado de lectura
    const filteredNotifications = useMemo(() => {
        if (filter === 'unread') {
            return contextNotifications.filter(n => !n.is_read);
        }
        return contextNotifications;
    }, [contextNotifications, filter]);

    // Función para manejar la eliminación de una notificación individual
    const handleDeleteNotification = useCallback(async (notificationId: number) => {
        const confirmed = window.confirm('¿Estás seguro de que quieres eliminar esta notificación?');
        if (!confirmed) return;
        await deleteNotification(notificationId);
    }, [deleteNotification]);

    // Función para manejar el marcado de todas las notificaciones como leídas
    const handleMarkAllAsRead = useCallback(async () => {
        const confirmed = window.confirm('¿Estás seguro de que quieres marcar todas las notificaciones como leídas?');
        if (!confirmed) return;
        await markAllNotificationsAsRead();
    }, [markAllNotificationsAsRead]);

    // No necesitamos un fetchData local aquí, ya que useNotification lo maneja
    // y NotificationCenter solo consume las notificaciones del contexto.
    // El loading state aquí podría usarse si NotificationCenter tuviera su propia lógica de fetching,
    // pero por ahora, el loading del contexto es suficiente.

    return (
        <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Centro de Notificaciones</h2>

                <div className="flex justify-between items-center mb-6">
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-4 py-2 rounded-md font-semibold transition-colors duration-200
                                ${filter === 'unread' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                            `}
                        >
                            No Leídas
                        </button>
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-md font-semibold transition-colors duration-200
                                ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                            `}
                        >
                            Todas
                        </button>
                    </div>
                    <button
                        onClick={handleMarkAllAsRead}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50"
                        disabled={filteredNotifications.filter(n => !n.is_read).length === 0 || loading}
                    >
                        Marcar todas como leídas
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-8 text-gray-600">Cargando notificaciones...</div>
                ) : filteredNotifications.length === 0 ? (
                    <p className="text-center py-8 text-gray-600">No hay notificaciones {filter === 'unread' ? 'no leídas' : ''} disponibles.</p>
                ) : (
                    <div className="space-y-4">
                        {filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`flex items-center justify-between p-4 rounded-lg shadow-sm border
                                    ${notification.is_read ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-blue-50 border-blue-200 text-gray-800 font-semibold'}
                                `}
                            >
                                <div className="flex-1">
                                    <p className="text-sm md:text-base">{notification.message}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm:ss')}
                                        {!notification.is_read && <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">Nueva</span>}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                    {!notification.is_read && (
                                        <button
                                            onClick={() => markNotificationAsRead(notification.id)}
                                            className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200"
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
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16">
                                            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.5a.5.5 0 0 0 0 1h.5V14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3.5h.5a.5.5 0 0 0 0 1h-2.5ZM4 1.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v1H4v-1ZM13 3.5v10a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V3.5h10Z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationCenter;
