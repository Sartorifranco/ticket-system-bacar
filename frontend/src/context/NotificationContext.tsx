// frontend/src/context/NotificationContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from './AuthContext'; // Import useAuth to get the token
import { isAxiosErrorTypeGuard, ApiResponseError } from '../utils/typeGuards';
import { Notification } from '../types'; // Assuming Notification type is defined here or imported

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    markNotificationAsRead: (notificationId: number) => Promise<void>;
    markAllNotificationsAsRead: () => Promise<void>;
    fetchNotifications: () => Promise<void>; // Add fetchNotifications to the context type
    fetchUnreadCount: () => Promise<void>; // Add fetchUnreadCount to the context type
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token, user } = useAuth(); // Get token and user from AuthContext
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [notificationQueue, setNotificationQueue] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; id: number }[]>([]);
    const [nextNotificationId, setNextNotificationId] = useState(0);

    // Function to add a notification to the queue (for toast-like messages)
    const addNotification = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
        setNotificationQueue(prev => [...prev, { message, type, id: nextNotificationId }]);
        setNextNotificationId(prev => prev + 1);
    }, [nextNotificationId]);

    // Function to remove a notification from the queue after it's displayed
    const removeNotification = useCallback((id: number) => {
        setNotificationQueue(prev => prev.filter(notif => notif.id !== id));
    }, []);

    // Function to fetch only the unread count (for the bell icon)
    // MODIFICADO: addNotification añadido a las dependencias
    const fetchUnreadCount = useCallback(async () => {
        if (!token) {
            setUnreadCount(0);
            return;
        }
        try {
            const response = await api.get('/api/notifications/unread-count', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUnreadCount(response.data.count);
        } catch (err) {
            console.error('Error fetching unread notifications count:', err);
            addNotification('Error al cargar el contador de notificaciones no leídas.', 'error'); // Usa addNotification aquí
            setUnreadCount(0);
        }
    }, [token, addNotification]); // <-- AÑADIDO: addNotification como dependencia

    // Function to fetch all notifications for the current user
    // MODIFICADO: addNotification añadido a las dependencias
    const fetchNotifications = useCallback(async () => {
        if (!token) {
            setNotifications([]);
            setUnreadCount(0); // Reset unread count if no token
            return;
        }
        try {
            const response = await api.get('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const fetchedNotifications = Array.isArray(response.data)
                ? response.data.sort((a: Notification, b: Notification) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                : [];
            setNotifications(fetchedNotifications);
            // Update unread count based on fetched notifications
            setUnreadCount(fetchedNotifications.filter(n => !n.is_read).length);
        } catch (err) {
            console.error('Error fetching notifications in context:', err);
            addNotification('Error al cargar notificaciones.', 'error'); // Usa addNotification aquí
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [token, addNotification]); // <-- AÑADIDO: addNotification como dependencia

    // Function to mark a single notification as read
    const markNotificationAsRead = useCallback(async (notificationId: number) => {
        try {
            if (!token) return;
            await api.put(`/api/notifications/${notificationId}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Optimistically update local state
            setNotifications(prev =>
                prev.map(notif =>
                    notif.id === notificationId ? { ...notif, is_read: true } : notif
                )
            );
            fetchUnreadCount(); // Update the global unread count
        } catch (err) {
            console.error('Error marking notification as read:', err);
            addNotification('Error al marcar notificación como leída.', 'error');
        }
    }, [token, addNotification, fetchUnreadCount]); // Línea 81: Dependencias correctas

    // Function to mark all notifications as read
    const markAllNotificationsAsRead = useCallback(async () => {
        try {
            if (!token) return;
            await api.put('/api/notifications/mark-all-read', {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Optimistically update local state
            setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
            fetchUnreadCount(); // Update the global unread count
            addNotification('Todas las notificaciones marcadas como leídas.', 'success');
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
            addNotification('Error al marcar todas las notificaciones como leídas.', 'error');
        }
    }, [token, addNotification, fetchUnreadCount]); // Línea 98: Dependencias correctas


    // Effect to fetch notifications and unread count on component mount or token/user change
    useEffect(() => {
        // Only fetch if token is available and user is authenticated (or authLoading is false)
        if (token && user) { // Ensure user is also available
            fetchNotifications();
            fetchUnreadCount();
        } else if (!token) {
            // If token is null, clear notifications and count
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [token, user, fetchNotifications, fetchUnreadCount]); // Add user to dependencies

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        notifications,
        unreadCount,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        fetchNotifications,
        fetchUnreadCount,
    }), [notifications, unreadCount, addNotification, markNotificationAsRead, markAllNotificationsAsRead, fetchNotifications, fetchUnreadCount]);

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
            {/* Render a NotificationDisplay component here to show queued notifications */}
            {notificationQueue.map(notif => (
                <div
                    key={notif.id}
                    className={`fixed bottom-4 right-4 p-3 rounded-md shadow-lg text-white z-[9999]
                        ${notif.type === 'success' ? 'bg-green-500' : ''}
                        ${notif.type === 'error' ? 'bg-red-500' : ''}
                        ${notif.type === 'warning' ? 'bg-yellow-500' : ''}
                        ${notif.type === 'info' ? 'bg-blue-500' : ''}
                    `}
                    style={{ animation: 'fade-in-out 3s forwards' }}
                    onAnimationEnd={() => removeNotification(notif.id)}
                >
                    {notif.message}
                </div>
            ))}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
