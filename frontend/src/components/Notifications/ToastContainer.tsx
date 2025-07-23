// frontend/src/components/Notifications/ToastContainer.tsx
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Notification } from '../../types';

interface ToastContainerProps {
  toasts: Notification[];
  onRemoveToast: (id: number | string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  const portalElement = document.getElementById('toast-root');

  useEffect(() => {
    toasts.forEach((toast) => {
      const timer = setTimeout(() => {
        onRemoveToast(toast.id);
      }, 5000); // Toast disappears after 5 seconds
      return () => clearTimeout(timer);
    });
  }, [toasts, onRemoveToast]);

  return ReactDOM.createPortal(
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item toast-${toast.type}`}>
          <p>{toast.message}</p>
          <button onClick={() => onRemoveToast(toast.id)} className="toast-close-button">
            &times;
          </button>
        </div>
      ))}
    </div>,
    portalElement || document.body
  );
};

export default ToastContainer;



