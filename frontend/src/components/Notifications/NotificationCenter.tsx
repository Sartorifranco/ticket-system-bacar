// frontend/src/components/Notifications/NotificationCenter.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import { Notification } from '../../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: number) => void; // Este ID siempre será numérico para notificaciones de DB
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const portalElement = document.getElementById('modal-root');
  if (!portalElement) {
    console.error("Error: 'modal-root' not found for NotificationCenter. The portal cannot be created.");
    return null;
  }

  // Filtramos las notificaciones para asegurarnos de que solo las de la DB (con id numérico)
  // se pasen a onMarkAsRead. Los toasts locales (con id string) no se marcan como leídos aquí.
  const unreadNotifications = notifications.filter(n => !n.is_read && typeof n.id === 'number') as Notification[];
  const readNotifications = notifications.filter(n => n.is_read) as Notification[];


  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-content notification-center-content">
        <button className="close-button" onClick={onClose}>
          &times;
        </button>
        <h2>Centro de Notificaciones</h2>

        <div className="notification-actions">
          <button onClick={onMarkAllAsRead} className="button primary-button small-button" disabled={unreadNotifications.length === 0}>
            Marcar todas como leídas
          </button>
          <button onClick={onClearAll} className="button danger-button small-button">
            Limpiar todas
          </button>
        </div>

        {unreadNotifications.length > 0 && (
          <div className="notifications-section">
            <h3>Nuevas Notificaciones ({unreadNotifications.length})</h3>
            <div className="notification-list">
              {unreadNotifications.map((notification) => (
                <div key={notification.id} className="notification-item unread">
                  <p className="notification-message">{notification.message}</p>
                  <span className="notification-timestamp">{new Date(notification.created_at).toLocaleString()}</span>
                  {/* Aquí, notification.id ya es de tipo number debido al filtro de arriba */}
                  <button onClick={() => onMarkAsRead(notification.id as number)} className="mark-as-read-button">
                    ✔️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {readNotifications.length > 0 && (
          <div className="notifications-section">
            <h3>Notificaciones Leídas ({readNotifications.length})</h3>
            <div className="notification-list">
              {readNotifications.map((notification) => (
                <div key={notification.id} className="notification-item read">
                  <p className="notification-message">{notification.message}</p>
                  <span className="notification-timestamp">{new Date(notification.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {notifications.length === 0 && (
          <p className="info-text">No hay notificaciones.</p>
        )}
      </div>
    </div>,
    portalElement
  );
};

export default NotificationCenter;


