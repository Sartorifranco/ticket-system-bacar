// frontend/src/context/NotificationContext.tsx
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect, useRef } from 'react';
// Importar Notification (para el estado de notificaciones del backend) y Toast (para el estado de toasts del frontend)
import { Notification, Toast, ToastNotificationType, BackendNotificationType } from '../types';
import api from '../config/axiosConfig';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../utils/typeGuards';
import { useAuth } from './AuthContext';

// Este tipo es para la función addNotification que crea toasts
type AddNotificationType = ToastNotificationType;

interface NotificationContextType {
    notifications: Notification[]; // Lista de notificaciones del backend
    toasts: Toast[]; // Lista de toasts del frontend
    addNotification: (message: string, type: AddNotificationType, relatedId?: number | null, relatedType?: string | null) => void;
    removeToast: (id: number | string) => void; // id puede ser number o string
    fetchNotifications: () => Promise<void>;
    markNotificationAsRead: (notificationId: number) => Promise<void>;
    deleteNotification: (notificationId: number) => Promise<void>;
    markAllNotificationsAsRead: () => Promise<void>;
    deleteAllNotifications: () => Promise<void>;
    unreadNotificationsCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

    const { token, isAuthenticated, user } = useAuth();
    const tokenRef = useRef(token);
    const userRef = useRef(user);

    useEffect(() => {
        tokenRef.current = token;
        userRef.current = user;
    }, [token, user]);

    // Función para eliminar un toast
    // MOVIDO: removeToast antes de addNotification para resolver el error de declaración
    const removeToast = useCallback((id: number | string) => {
        setToasts((prevToasts) => {
            const toastToRemove = prevToasts.find(toast => toast.id === id);
            if (toastToRemove?.timeoutId) {
                clearTimeout(toastToRemove.timeoutId);
            }
            return prevToasts.filter((toast) => toast.id !== id);
        });
    }, []);

    // Función para añadir un toast (mensaje temporal en el frontend)
    const addNotification = useCallback((message: string, type: AddNotificationType, relatedId: number | null = null, relatedType: string | null = null) => {
        const id = Date.now() + Math.random().toString(36).substring(2, 9);
        const userIdForToast = userRef.current?.id;

        const newToast: Toast = {
            id: id,
            message,
            type,
            user_id: userIdForToast,
            created_at: new Date().toISOString(),
            target_id: relatedId,
            related_id: relatedId,
            related_type: relatedType,
        };

        setToasts((prevToasts) => [...prevToasts, newToast]);

        const timeoutId = setTimeout(() => {
            removeToast(id); // removeToast ya está declarado
        }, 5000);
        newToast.timeoutId = timeoutId;
    }, [removeToast]); // removeToast es una dependencia aquí

    // Función para obtener notificaciones del backend
    const fetchNotifications = useCallback(async () => {
        // Solo intentar buscar notificaciones si el usuario está autenticado y tiene un token/ID
        if (!isAuthenticated || !tokenRef.current || !userRef.current?.id) {
            setNotifications([]);
            setUnreadNotificationsCount(0);
            return;
        }
        try {
            const response = await api.get('/api/notifications', {
                headers: { Authorization: `Bearer ${tokenRef.current}` },
            });
            // Asegúrate de que la respuesta del backend sea un array de Notification (con id: number)
            const fetchedNotifications: Notification[] = Array.isArray(response.data) ? response.data : response.data.notifications || [];
            setNotifications(fetchedNotifications);
            setUnreadNotificationsCount(fetchedNotifications.filter(n => !n.is_read).length);
        } catch (err: unknown) {
            console.error('Error fetching notifications:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                // Usamos addNotification para mostrar el error como un toast
                addNotification(`Error al cargar notificaciones: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al cargar las notificaciones.', 'error');
            }
            setNotifications([]);
            setUnreadNotificationsCount(0);
        }
    }, [isAuthenticated, addNotification]);

    // Efecto para cargar notificaciones cuando el estado de autenticación cambia
    useEffect(() => {
        if (isAuthenticated && user) {
            fetchNotifications();
        } else {
            setNotifications([]);
            setUnreadNotificationsCount(0);
        }
    }, [isAuthenticated, user, fetchNotifications]);

    // Función para marcar una notificación específica como leída en el backend
    const markNotificationAsRead = useCallback(async (notificationId: number) => {
        if (!tokenRef.current) {
            addNotification('No autorizado para marcar notificaciones.', 'error');
            return;
        }
        try {
            await api.put(`/api/notifications/${notificationId}/read`, {}, {
                headers: { Authorization: `Bearer ${tokenRef.current}` },
            });
            addNotification('Notificación marcada como leída.', 'success');
            fetchNotifications(); // Recargar para actualizar el estado
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al marcar notificación: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al marcar la notificación.', 'error');
            }
            console.error('Error marking notification as read:', err);
        }
    }, [addNotification, fetchNotifications]);

    // Función para eliminar una notificación específica del backend
    const deleteNotification = useCallback(async (notificationId: number) => {
        if (!tokenRef.current) {
            addNotification('No autorizado para eliminar notificaciones.', 'error');
            return;
        }
        try {
            await api.delete(`/api/notifications/${notificationId}`, {
                headers: { Authorization: `Bearer ${tokenRef.current}` },
            });
            addNotification('Notificación eliminada.', 'success');
            fetchNotifications(); // Recargar para actualizar el estado
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al eliminar notificación: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al eliminar la notificación.', 'error');
            }
            console.error('Error deleting notification:', err);
        }
    }, [addNotification, fetchNotifications]);

    // Función para marcar todas las notificaciones como leídas en el backend
    const markAllNotificationsAsRead = useCallback(async () => {
        if (!tokenRef.current || !userRef.current?.id) {
            addNotification('No autorizado para marcar notificaciones.', 'error');
            return;
        }
        try {
            await api.put(`/api/notifications/mark-all-read`, {}, {
                headers: { Authorization: `Bearer ${tokenRef.current}` },
            });
            addNotification('Todas las notificaciones marcadas como leídas.', 'success');
            fetchNotifications(); // Recargar para actualizar el estado
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al marcar todas las notificaciones: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al marcar todas las notificaciones.', 'error');
            }
            console.error('Error marking all notifications as read:', err);
        }
    }, [addNotification, fetchNotifications]);

    // Función para eliminar todas las notificaciones del backend
    const deleteAllNotifications = useCallback(async () => {
        if (!tokenRef.current || !userRef.current?.id) {
            addNotification('No autorizado para eliminar notificaciones.', 'error');
            return;
        }
        try {
            await api.delete(`/api/notifications/delete-all`, {
                headers: { Authorization: `Bearer ${tokenRef.current}` },
            });
            addNotification('Todas las notificaciones eliminadas.', 'success');
            fetchNotifications(); // Recargar para actualizar el estado
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al eliminar todas las notificaciones: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al eliminar todas las notificaciones.', 'error');
            }
            console.error('Error deleting all notifications:', err);
        }
    }, [addNotification, fetchNotifications]);

    const value = {
        notifications,
        toasts,
        addNotification,
        removeToast,
        fetchNotifications,
        markNotificationAsRead,
        deleteNotification,
        markAllNotificationsAsRead,
        deleteAllNotifications,
        unreadNotificationsCount,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <div className="fixed bottom-4 right-4 z-[10000] space-y-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`p-4 rounded-lg shadow-lg text-white max-w-xs w-full flex items-center justify-between animate-fade-in-up
                            ${toast.type === 'success' ? 'bg-green-500' : ''}
                            ${toast.type === 'error' ? 'bg-red-500' : ''}
                            ${toast.type === 'info' ? 'bg-blue-500' : ''}
                            ${toast.type === 'warning' ? 'bg-yellow-500' : ''}
                        `}
                        role="alert"
                    >
                        <span>{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} className="ml-4 text-white opacity-75 hover:opacity-100 focus:outline-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
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