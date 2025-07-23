// frontend/src/components/NotificationBell/NotificationDropdown.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { Notification } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const { token, addNotification, fetchUnreadNotificationsCount } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        // Si no hay token, no hay notificaciones que cargar
        setNotifications([]);
        setLoading(false);
        return;
      }
      const response = await api.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Asegurarse de que las notificaciones vengan ordenadas por fecha de creación descendente
      const sortedNotifications = Array.isArray(response.data)
        ? response.data.sort((a: Notification, b: Notification) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        : [];
      setNotifications(sortedNotifications);
    } catch (err: unknown) {
      if (isAxiosErrorTypeGuard(err)) {
        const apiError = err.response?.data as ApiResponseError;
        setError(apiError?.message || 'Error al cargar notificaciones.');
        addNotification(`Error al cargar notificaciones: ${apiError?.message || 'Error desconocido'}`, 'error');
      } else {
        setError('Ocurrió un error inesperado al cargar las notificaciones.');
      }
      console.error('Error fetching notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [token, addNotification]);

  const markNotificationAsRead = useCallback(async (notificationId: number) => {
    try {
      if (!token) return;
      await api.put(`/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Actualizar el estado local para reflejar el cambio
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      fetchUnreadNotificationsCount(); // Actualizar el contador de la campana
    } catch (err) {
      console.error('Error marking notification as read:', err);
      addNotification('Error al marcar notificación como leída.', 'error');
    }
  }, [token, addNotification, fetchUnreadNotificationsCount]);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      if (!token) return;
      await api.put('/api/notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Actualizar el estado local
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
      fetchUnreadNotificationsCount(); // Actualizar el contador de la campana
      addNotification('Todas las notificaciones marcadas como leídas.', 'success');
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      addNotification('Error al marcar todas las notificaciones como leídas.', 'error');
    }
  }, [token, addNotification, fetchUnreadNotificationsCount]);

  // Efecto para cargar notificaciones cuando el dropdown se abre
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Manejar clics fuera del dropdown para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.is_read) {
      markNotificationAsRead(notification.id);
    }
    // Opcional: Navegar a la entidad relacionada si existe
    if (notification.related_type === 'ticket' && notification.related_id) {
      navigate(`/ticket/${notification.related_id}`); // Asume una ruta para ver tickets individuales
    }
    onClose(); // Cerrar el dropdown después de hacer clic en una notificación
  }, [markNotificationAsRead, navigate, onClose]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden z-50 border border-gray-200 dark:border-gray-600"
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notificaciones</h3>
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={markAllNotificationsAsRead}
            className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
            disabled={loading}
          >
            Marcar todas como leídas
          </button>
        )}
      </div>
      {loading ? (
        <div className="p-4 text-center text-gray-600 dark:text-gray-300">Cargando notificaciones...</div>
      ) : error ? (
        <div className="p-4 text-center text-red-500">{error}</div>
      ) : notifications.length === 0 ? (
        <div className="p-4 text-center text-gray-600 dark:text-gray-300">No hay notificaciones.</div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 border-b border-gray-100 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 ${
                !notif.is_read ? 'bg-blue-50 dark:bg-blue-900 font-medium' : 'bg-white dark:bg-gray-700'
              }`}
              onClick={() => handleNotificationClick(notif)}
            >
              <p className="text-gray-800 dark:text-gray-100 mb-1">{notif.message}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimestamp(notif.created_at)}</p>
            </div>
          ))}
        </div>
      )}
      <div className="p-2 text-center border-t border-gray-200 dark:border-gray-600">
        <button
          onClick={onClose}
          className="text-gray-600 dark:text-gray-300 text-sm hover:underline"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
