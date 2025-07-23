// frontend/src/components/Users/UserEditModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Common/Modal';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { User, Department } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null; // El usuario a editar (o null para crear)
  onUserUpdated: () => void; // Callback para notificar al padre que un usuario fue actualizado/creado
  token: string | null; // Token de autenticación
  departments: Department[]; // Lista de departamentos para el selector
}

const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  token,
  departments,
}) => {
  const { addNotification } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  // CORREGIDO: Usar el tipo de rol de la interfaz User para el estado
  const [role, setRole] = useState<User['role']>('client'); 
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setRole(user.role);
      // CORREGIDO: Acceso a department_id después de la actualización de types.ts
      setDepartmentId(user.department_id || null);
      setPassword(''); // No precargar contraseñas por seguridad
    } else {
      // Valores por defecto para crear un nuevo usuario
      setUsername('');
      setEmail('');
      setRole('client'); // Rol por defecto
      setDepartmentId(null);
      setPassword('');
    }
    setError(null); // Limpiar errores al abrir/cambiar usuario
  }, [user]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validaciones básicas
    if (!username.trim() || !email.trim() || !role) {
      setError('Todos los campos obligatorios deben ser completados.');
      addNotification('Todos los campos obligatorios deben ser completados.', 'error');
      setLoading(false);
      return;
    }

    if (!user && !password.trim()) { // Contraseña obligatoria solo para nuevos usuarios
      setError('La contraseña es obligatoria para nuevos usuarios.');
      addNotification('La contraseña es obligatoria para nuevos usuarios.', 'error');
      setLoading(false);
      return;
    }

    if (role !== 'client' && !departmentId) {
      setError('Los agentes y administradores deben tener un departamento asignado.');
      addNotification('Los agentes y administradores deben tener un departamento asignado.', 'error');
      setLoading(false);
      return;
    }

    try {
      if (!token) {
        throw new Error('No autorizado. Token no disponible.');
      }

      const userData: any = {
        username,
        email,
        role,
        department_id: departmentId,
      };

      if (password.trim()) {
        userData.password = password;
      }

      if (user) {
        // Actualizar usuario existente
        await api.put(`/api/users/${user.id}`, userData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        addNotification('Usuario actualizado exitosamente.', 'success');
      } else {
        // Crear nuevo usuario
        await api.post('/api/users', userData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        addNotification('Usuario creado exitosamente.', 'success');
      }
      onUserUpdated(); // Notificar al padre para recargar la lista de usuarios
      onClose(); // Cerrar el modal
    } catch (err: unknown) {
      if (isAxiosErrorTypeGuard(err)) {
        const apiError = err.response?.data as ApiResponseError;
        setError(apiError?.message || 'Error al guardar usuario.');
        addNotification(`Error al guardar usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
      } else {
        setError('Ocurrió un error inesperado al guardar el usuario.');
      }
      console.error('Error saving user:', err);
    } finally {
      setLoading(false);
    }
  }, [username, email, role, departmentId, password, user, token, addNotification, onUserUpdated, onClose]);

  const modalTitle = user ? `Editar Usuario: ${user.username}` : 'Crear Nuevo Usuario';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} className="p-4">
        {error && <div className="error-message text-center p-3 mb-4">{error}</div>}

        <div className="form-group mb-4">
          <label htmlFor="username" className="form-label">Nombre de Usuario:</label>
          <input
            type="text"
            id="username"
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group mb-4">
          <label htmlFor="email" className="form-label">Email:</label>
          <input
            type="email"
            id="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group mb-4">
          <label htmlFor="role" className="form-label">Rol:</label>
          <select
            id="role"
            className="form-select"
            value={role}
            onChange={(e) => setRole(e.target.value as User['role'])} // Asegurar el tipo
            disabled={loading}
            required
          >
            <option value="client">Cliente</option>
            <option value="agent">Agente</option>
            <option value="admin">Administrador</option>
          </select>
        </div>

        <div className="form-group mb-4">
          <label htmlFor="department" className="form-label">Departamento:</label>
          <select
            id="department"
            className="form-select"
            value={departmentId || ''}
            onChange={(e) => setDepartmentId(e.target.value ? parseInt(e.target.value) : null)}
            disabled={loading || role === 'client'} // Deshabilitar si es cliente
          >
            <option value="">Seleccionar Departamento</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          {role === 'client' && (
            <p className="text-sm text-gray-500 mt-1">Los clientes no necesitan un departamento asignado.</p>
          )}
        </div>

        <div className="form-group mb-4">
          <label htmlFor="password" className="form-label">Contraseña {user ? '(dejar vacío para no cambiar)' : '*'}:</label>
          <input
            type="password"
            id="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            required={!user} // Requerido solo para nuevos usuarios
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="submit"
            className="button primary-button"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="button secondary-button"
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserEditModal;
