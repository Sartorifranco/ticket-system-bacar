// frontend/src/components/Admin/UserList.tsx
import React, { useState, useEffect } from 'react';
import userService, { User } from '../../services/userService';
// CAMBIO CLAVE AQUÍ: Importación directa de los iconos
import * as FaIcons from 'react-icons/fa'; // Importa todo el módulo como FaIcons
import axios from 'axios';
// import './UserList.css'; // <-- Si tienes un archivo CSS para esto, impórtalo aquí

interface UserListProps {
  onEditUser: (user: User) => void;
  onUserDeleted: () => void;
  refreshUsers?: boolean;
}

const UserList: React.FC<UserListProps> = ({ onEditUser, onUserDeleted, refreshUsers }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [onUserDeleted, refreshUsers]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers();
      setUsers(data);
      setError(null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        // Mejorar el mensaje de error para el usuario final
        setError(err.response?.data?.message || `Error ${err.response?.status}: ${err.message || 'Error al cargar usuarios.'}`);
      } else {
        setError('Ocurrió un error inesperado al cargar usuarios.');
      }
      console.error('Error al cargar usuarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar al usuario ${username}? Esta acción es irreversible.`)) {
      return;
    }
    try {
      await userService.deleteUser(id);
      alert('Usuario eliminado exitosamente!');
      fetchUsers();
      onUserDeleted();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || `Error ${err.response?.status}: ${err.message || 'Error al eliminar usuario.'}`);
      } else {
        setError('Ocurrió un error inesperado al eliminar usuario.');
      }
      console.error('Error al eliminar usuario:', err);
    }
  };

  if (loading) return <p>Cargando usuarios...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>; // Dejar este estilo para el mensaje de error

  return (
    <div>
      <h3>Usuarios Registrados</h3>
      {users.length === 0 ? (
        <p>No hay usuarios registrados.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <button
                    onClick={() => onEditUser(user)}
                    title="Editar Usuario"
                  >
                    <FaIcons.FaEdit  /> Editar {/* Usa el componente directamente */}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.username)}
                    title="Eliminar Usuario"
                  >
                    <FaIcons.FaTrash /> Eliminar {/* Usa el componente directamente */}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UserList;