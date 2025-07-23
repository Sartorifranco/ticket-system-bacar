// frontend/src/components/Users/CreateUserModal.tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import api from '../../config/axiosConfig';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onUserCreated: (message: string, type: 'success' | 'error' | 'info') => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, token, onUserCreated }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'agent' | 'user'>('user'); // Rol por defecto
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      onUserCreated('No autorizado. Por favor, inicia sesión.', 'error');
      return;
    }

    if (!username || !email || !password || !role) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ¡CAMBIO CLAVE AQUÍ! La URL ahora es '/api/users'
      await api.post('/api/users', { // <-- CAMBIO DE '/api/users/register' A '/api/users'
        username,
        email,
        password,
        role,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      onUserCreated('Usuario creado exitosamente!', 'success');
      onClose(); // Cerrar el modal al crear el usuario
      // Reiniciar el formulario
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('user');

    } catch (err: unknown) {
      if (isAxiosErrorTypeGuard(err)) {
        const apiError = err.response?.data as ApiResponseError;
        setError(apiError?.message || 'Error al crear el usuario.');
        onUserCreated(`Error al crear el usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
      } else {
        setError('Ocurrió un error inesperado al crear el usuario.');
        onUserCreated('Ocurrió un error inesperado al crear el usuario.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const portalElement = document.getElementById('modal-root');
  if (!portalElement) {
    console.error("Error: 'modal-root' no encontrado para CreateUserModal. El portal no se puede crear.");
    return null;
  }

  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-content admin-modal-size">
        <h2 className="modal-title">Crear Nuevo Usuario</h2>
        <button className="modal-close-button" onClick={onClose}>&times;</button>

        {error && <p className="error-message-modal">{error}</p>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="new-username">Nombre de Usuario:</label>
            <input
              type="text"
              id="new-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="new-email">Email:</label>
            <input
              type="email"
              id="new-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="new-password">Contraseña:</label>
            <input
              type="password"
              id="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="new-role">Rol:</label>
            <select
              id="new-role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'agent' | 'user')}
              className="form-select"
              required
            >
              <option value="user">Usuario (Cliente)</option>
              <option value="agent">Agente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="submit" className="button primary-button" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
            <button type="button" className="button secondary-button" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>,
    portalElement
  );
};

export default CreateUserModal;
