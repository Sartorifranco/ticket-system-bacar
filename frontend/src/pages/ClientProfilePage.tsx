// frontend/src/pages/ClientProfilePage.tsx
<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../utils/typeGuards';

const ClientProfilePage: React.FC = () => {
  const { user, authLoading, token, addNotification } = useAuth();

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
      if (editedUsername !== user.username || editedEmail !== user.email) {
        // RUTA CORREGIDA: No debe empezar con '/api'
        await api.put(`api/users/${user.id}`, {
          username: editedUsername,
          email: editedEmail,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        addNotification('Perfil actualizado exitosamente.', 'success');
      }

      if (newPassword) {
        if (newPassword !== confirmNewPassword) {
          setUpdateError('Las nuevas contraseñas no coinciden.');
          addNotification('Las nuevas contraseñas no coinciden.', 'error');
          setUpdateLoading(false);
          return;
        }

        // RUTA CORREGIDA: No debe empezar con '/api'
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
      <div className="flex justify-center items-center min-h-screen bg-background-color text-text-color">
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background-color text-text-color">
        <p className="error-message">No se pudo cargar la información del usuario. Por favor, inicia sesión.</p>
      </div>
=======
import React from 'react';
import { useAuth } from '../context/AuthContext'; // Para acceder a los datos del usuario
import Layout from '../components/Layout/Layout'; // Para mantener la estructura de la aplicación
import '../index.css'; // Asegúrate de que los estilos globales estén disponibles

const ClientProfilePage: React.FC = () => {
  const { user, loading } = useAuth(); // Obtenemos el usuario y el estado de carga del contexto

  if (loading) {
    return (
      <Layout>
        <div className="container" style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Cargando perfil...</h2>
        </div>
      </Layout>
    );
  }

  // Si no hay usuario o el rol no es 'user', redirigimos o mostramos un mensaje de error
  if (!user || user.role !== 'user') { // Asumiendo que 'user' es el rol para clientes
    // Podrías redirigir a la página de inicio o login aquí si prefieres
    // navigate('/login');
    return (
      <Layout>
        <div className="container error-message" style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Acceso denegado o usuario no autenticado.</h2>
          <p>Solo los usuarios cliente pueden ver esta página.</p>
        </div>
      </Layout>
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
    );
  }

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-background-color flex items-center justify-center p-4">
      <div className="bg-card-background p-8 rounded-lg shadow-lg w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-center text-primary-color mb-6">Mi Perfil</h2>

        {updateError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline ml-2">{updateError}</span>
          </div>
        )}

        {!isEditing ? (
          <div>
            <div className="mb-4">
              <p className="text-text-light dark:text-text-dark text-lg">
                <strong>Nombre de Usuario:</strong> {user.username}
              </p>
            </div>
            <div className="mb-4">
              <p className="text-text-light dark:text-text-dark text-lg">
                <strong>Email:</strong> {user.email}
              </p>
            </div>
            <div className="mb-6">
              <p className="text-text-light dark:text-text-dark text-lg">
                <strong>Rol:</strong> {user.role}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setIsEditing(true)}
                className="button primary-button"
              >
                Editar Perfil
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdateProfile}>
            <div className="mb-4">
              <label htmlFor="username" className="block text-text-light dark:text-text-dark text-sm font-bold mb-2">
                Nombre de Usuario:
              </label>
              <input
                type="text"
                id="username"
                value={editedUsername}
                onChange={(e) => setEditedUsername(e.target.value)}
                className="form-input"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="email" className="block text-text-light dark:text-text-dark text-sm font-bold mb-2">
                Email:
              </label>
              <input
                type="email"
                id="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <h3 className="text-xl font-bold text-primary-color mb-4 mt-6 border-t pt-4">Cambiar Contraseña</h3>
            <div className="mb-4">
              <label htmlFor="currentPassword" className="block text-text-light dark:text-text-dark text-sm font-bold mb-2">
                Contraseña Actual:
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-text-light dark:text-text-dark text-sm font-bold mb-2">
                Nueva Contraseña:
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="confirmNewPassword" className="block text-text-light dark:text-text-dark text-sm font-bold mb-2">
                Confirmar Nueva Contraseña:
              </label>
              <input
                type="password"
                id="confirmNewPassword"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="button secondary-button"
                disabled={updateLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="button primary-button"
                disabled={updateLoading}
              >
                {updateLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ClientProfilePage;

=======
    <Layout>
      <div className="container">
        <div className="login-card" style={{ maxWidth: '600px', margin: '40px auto' }}> {/* Reutilizamos la clase para la tarjeta */}
          <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Mi Perfil de Cliente</h2>
          
          <div className="profile-info">
            <p><strong>Nombre de Usuario:</strong> {user.username}</p>
            <p><strong>Correo Electrónico:</strong> {user.email}</p>
            <p><strong>Rol:</strong> {user.role === 'user' ? 'Cliente' : user.role}</p>
            {/* Puedes añadir más campos aquí si los tienes en tu objeto de usuario */}
          </div>

          <p style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.9em', color: 'var(--light-text-color)' }}>
            Aquí podrás ver y gestionar tu información personal.
            En el futuro, podrías añadir opciones para editar perfil o ver tickets.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default ClientProfilePage;
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
