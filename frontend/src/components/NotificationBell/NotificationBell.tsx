// frontend/src/components/NotificationBell/NotificationBell.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Asegúrate de importar Link
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { Notification } from '../../types'; // Importar el tipo Notification
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

const NotificationBell: React.FC = () => {
  // CORREGIDO: unreadNotificationCount a unreadNotificationsCount (plural)
  const { unreadNotificationsCount, fetchUnreadNotificationsCount, token, addNotification, markNotificationAsRead } = useAuth();
  const navigate = useNavigate();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupNotifications, setPopupNotifications] = useState<Notification[]>([]);
  const popupRef = useRef<HTMLDivElement>(null); // Ref para el popup

  // Fetch de las notificaciones para el popup
  const fetchPopupNotifications = useCallback(async () => {
    if (!token) {
      setPopupNotifications([]);
      return;
    }
    try {
      const response = await api.get('/api/notifications?is_read=false', { // Solo no leídas para el popup inicial
        headers: { Authorization: `Bearer ${token}` },
      });
      // Ordenar las notificaciones por fecha de creación descendente
      const sortedNotifications = response.data.notifications.sort((a: Notification, b: Notification) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setPopupNotifications(sortedNotifications);
    } catch (err: unknown) {
      console.error('Error fetching popup notifications:', err);
      if (isAxiosErrorTypeGuard(err)) {
        const apiError = err.response?.data as ApiResponseError;
        addNotification(`Error al cargar notificaciones: ${apiError?.message || 'Error desconocido'}`, 'error');
      } else {
        addNotification('Ocurrió un error inesperado al cargar las notificaciones.', 'error');
      }
    }
  }, [token, addNotification]);

  // Efecto para cargar el contador al montar y cada vez que el token cambie
  useEffect(() => {
    fetchUnreadNotificationsCount();
  }, [fetchUnreadNotificationsCount]);

  // Efecto para cerrar el popup al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsPopupOpen(false);
      }
    };

    if (isPopupOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopupOpen]);


  const handleBellClick = () => {
    setIsPopupOpen((prev) => !prev);
    if (!isPopupOpen) {
      fetchPopupNotifications(); // Cargar notificaciones cuando se abre el popup
    }
  };

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // Primero, marca la notificación como leída en el backend
    await markNotificationAsRead(notification.id);
    setIsPopupOpen(false); // Cerrar el popup

    // Luego, navega a la entidad relacionada
    let path = '';
    switch (notification.related_type) {
      case 'ticket':
        path = `/tickets/${notification.related_id}`;
        break;
      case 'user':
        // Si es un usuario y el usuario actual es admin, ir al dashboard de admin
        if (token && JSON.parse(atob(token.split('.')[1])).role === 'admin') {
          path = `/admin-dashboard?tab=users&userId=${notification.related_id}`;
        } else {
          // Si no es admin, o el usuario no es el mismo, no navegar o mostrar un mensaje
          addNotification('No tienes permiso para ver los detalles de este usuario.', 'info');
          return;
        }
        break;
      case 'department':
        // Si es un departamento y el usuario actual es admin, ir al dashboard de admin
        if (token && JSON.parse(atob(token.split('.')[1])).role === 'admin') {
          path = `/admin-dashboard?tab=departments&departmentId=${notification.related_id}`;
        } else {
          addNotification('No tienes permiso para ver los detalles de este departamento.', 'info');
          return;
        }
        break;
      default:
        // Si no hay tipo relacionado o es 'system', navegar al dashboard general
        path = '/dashboard'; // O a la ruta principal del usuario
        break;
    }
    navigate(path);
  }, [markNotificationAsRead, navigate, token, addNotification]);


  return (
    <div className="notification-bell-container" ref={popupRef}>
      <button onClick={handleBellClick} className="notification-bell-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-bell-fill" viewBox="0 0 16 16">
          <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2m.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
        </svg>
        {unreadNotificationsCount > 0 && (
          <span className="notification-badge">{unreadNotificationsCount}</span>
        )}
      </button>

      {isPopupOpen && (
        <div className="notification-popup">
          <h4 className="popup-title">Notificaciones</h4>
          {popupNotifications.length > 0 ? (
            <div className="popup-list">
              {popupNotifications.map((notification) => (
                <div key={notification.id} className="popup-item" onClick={() => handleNotificationClick(notification)}>
                  <p className="popup-message">{notification.message}</p>
                  <span className="popup-date">{new Date(notification.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="info-text">No hay notificaciones no leídas.</p>
          )}
          {/* Enlazar a la página de notificaciones del admin dashboard si el usuario es admin */}
          {token && JSON.parse(atob(token.split('.')[1])).role === 'admin' && (
            <Link to="/admin-dashboard?tab=notifications" className="view-all-link" onClick={() => setIsPopupOpen(false)}>
              Ver todas las notificaciones
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
