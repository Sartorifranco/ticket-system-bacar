// src/pages/ClientProfilePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../config/axiosConfig';
import { User, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';

const ClientProfilePage: React.FC = () => {
    const { user, loading, token, updateUserContext } = useAuth(); // CAMBIADO: authLoading a loading
    const { addNotification } = useNotification();

    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setEmail(user.email);
        }
    }, [user]);

    const handleUpdateProfile = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !token) {
            addNotification('No autenticado.', 'error');
            return;
        }

        try {
            const updateData: Partial<User> = {};
            if (username !== user.username) {
                updateData.username = username;
            }
            if (email !== user.email) {
                updateData.email = email;
            }

            if (Object.keys(updateData).length > 0) {
                await api.put(`/api/users/${user.id}`, updateData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                updateUserContext(updateData); // Actualizar el contexto de autenticación
                addNotification('Perfil actualizado exitosamente.', 'success');
            } else {
                addNotification('No hay cambios para actualizar en el perfil.', 'info');
            }
            setIsEditing(false);
        } catch (err: unknown) {
            console.error('Error updating profile:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al actualizar perfil: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al actualizar el perfil.', 'error');
            }
        }
    }, [user, token, username, email, addNotification, updateUserContext]);

    const handleChangePassword = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !token) {
            addNotification('No autenticado.', 'error');
            return;
        }

        if (!oldPassword || !newPassword || !confirmNewPassword) {
            addNotification('Por favor, completa todos los campos de contraseña.', 'warning');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            addNotification('Las nuevas contraseñas no coinciden.', 'error');
            return;
        }

        if (newPassword.length < 6) { // Ejemplo de validación de longitud mínima
            addNotification('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }

        try {
            await api.put(`/api/users/${user.id}/change-password`, { oldPassword, newPassword }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Contraseña actualizada exitosamente.', 'success');
            setOldPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err: unknown) {
            console.error('Error changing password:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al cambiar contraseña: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al cambiar la contraseña.', 'error');
            }
        }
    }, [user, token, oldPassword, newPassword, confirmNewPassword, addNotification]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!user) {
        return <div className="text-red-500 text-center p-4">No se pudo cargar el perfil del usuario.</div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-300 pb-2">Mi Perfil</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Información Personal</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Nombre de Usuario:</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                        ) : (
                            <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded">{user.username}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
                        {isEditing ? (
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                        ) : (
                            <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded">{user.email}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Rol:</label>
                        <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded capitalize">{user.role}</p>
                    </div>
                    {user.department_id && (
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">Departamento:</label>
                            <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded">{user.department_id}</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Miembro Desde:</label>
                        <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded">{new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    {isEditing ? (
                        <>
                            <button
                                onClick={() => { setIsEditing(false); setUsername(user.username); setEmail(user.email); }}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md mr-3 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdateProfile}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                            >
                                Guardar Cambios
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                        >
                            Editar Perfil
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Cambiar Contraseña</h2>
                <form onSubmit={handleChangePassword}>
                    <div className="mb-4">
                        <label htmlFor="oldPassword" className="block text-gray-700 text-sm font-bold mb-2">Contraseña Actual:</label>
                        <input
                            type="password"
                            id="oldPassword"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="newPassword" className="block text-gray-700 text-sm font-bold mb-2">Nueva Contraseña:</label>
                        <input
                            type="password"
                            id="newPassword"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="confirmNewPassword" className="block text-gray-700 text-sm font-bold mb-2">Confirmar Nueva Contraseña:</label>
                        <input
                            type="password"
                            id="confirmNewPassword"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                        >
                            Cambiar Contraseña
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientProfilePage;
