import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification
import { isAxiosErrorTypeGuard, ApiResponseError } from '../utils/typeGuards';
import Layout from '../components/Layout/Layout'; // Importar el componente Layout

const ClientProfilePage: React.FC = () => {
  const { user, authLoading, token } = useAuth(); // <-- MODIFICADO: addNotification eliminado de useAuth
  const { addNotification } = useNotification(); // <-- AÑADIDO: Obtener addNotification del contexto de notificaciones

  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState(user?.username || '');
  const [editedEmail, setEditedEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEditedUsername(user.username);
      setEditedEmail(user.email);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    setUpdateError(null);

    if (!token || !user) {
      setUpdateError('No autorizado. Por favor, inicia sesión.');
      addNotification('No autorizado para actualizar perfil.', 'error');
      setUpdateLoading(false);
      return;
    }

    try {
      // Update username and email if they have changed
      if (editedUsername !== user.username || editedEmail !== user.email) {
        await api.put(`api/users/${user.id}`, {
          username: editedUsername,
          email: editedEmail,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        addNotification('Perfil actualizado exitosamente.', 'success');
        // Optionally, update the user object in AuthContext if needed
        // This would require a function in AuthContext to update the user state
      }

      // Change password if newPassword is provided
      if (newPassword) {
        if (newPassword !== confirmNewPassword) {
          setUpdateError('Las nuevas contraseñas no coinciden.');
          addNotification('Las nuevas contraseñas no coinciden.', 'error');
          setUpdateLoading(false);
          return;
        }

        await api.put(`api/users/${user.id}/change-password`, {
          current_password: currentPassword,
          new_password: newPassword,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        addNotification('Contraseña actualizada exitosamente.', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }

      setIsEditing(false);
    } catch (err: unknown) {
      if (isAxiosErrorTypeGuard(err)) {
        const apiError = err.response?.data as ApiResponseError;
        setUpdateError(apiError?.message || 'Error al actualizar el perfil.');
        addNotification(`Error al actualizar perfil: ${apiError?.message || 'Error desconocido'}`, 'error');
      } else {
        setUpdateError('Ocurrió un error inesperado al actualizar el perfil.');
        addNotification('Ocurrió un error inesperado al actualizar el perfil.', 'error');
      }
    } finally {
      setUpdateLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen bg-gray-100 text-gray-700">
          <p>Cargando perfil...</p>
        </div>
      </Layout>
    );
  }

  if (!user || user.role !== 'client') {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen bg-gray-100 text-gray-700">
          <p className="text-red-500">Acceso denegado o no se pudo cargar la información del usuario. Por favor, inicia sesión como cliente.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Mi Perfil</h2>

          {updateError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline ml-2">{updateError}</span>
            </div>
          )}

          {!isEditing ? (
            <div>
              <div className="mb-4">
                <p className="text-gray-700 text-lg">
                  <strong>Nombre de Usuario:</strong> {user.username}
                </p>
              </div>
              <div className="mb-4">
                <p className="text-gray-700 text-lg">
                  <strong>Email:</strong> {user.email}
                </p>
              </div>
              <div className="mb-6">
                <p className="text-gray-700 text-lg">
                  <strong>Rol:</strong> {user.role}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                >
                  Editar Perfil
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile}>
              <div className="mb-4">
                <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">
                  Nombre de Usuario:
                </label>
                <input
                  type="text"
                  id="username"
                  value={editedUsername}
                  onChange={(e) => setEditedUsername(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
                  Email:
                </label>
                <input
                  type="email"
                  id="email"
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                  required
                />
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-4 mt-6 border-t pt-4">Cambiar Contraseña</h3>
              <div className="mb-4">
                <label htmlFor="currentPassword" className="block text-gray-700 text-sm font-bold mb-2">
                  Contraseña Actual:
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="newPassword" className="block text-gray-700 text-sm font-bold mb-2">
                  Nueva Contraseña:
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                />
              </div>
              <div className="mb-6">
                <label htmlFor="confirmNewPassword" className="block text-gray-700 text-sm font-bold mb-2">
                  Confirmar Nueva Contraseña:
                </label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors duration-200"
                  disabled={updateLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                  disabled={updateLoading}
                >
                  {updateLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ClientProfilePage;
