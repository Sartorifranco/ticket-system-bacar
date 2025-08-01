// src/components/BacarKeys/BacarKeyEditModal.tsx
import React, { useState, useEffect } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { BacarKey, BacarKeyFormData, ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';

interface BacarKeyEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: BacarKey | null; // Para edición
    onSaveSuccess: () => void; // Callback para notificar a la lista que recargue
}

const BacarKeyEditModal: React.FC<BacarKeyEditModalProps> = ({ isOpen, onClose, initialData, onSaveSuccess }) => {
    const { token } = useAuth();
    const { addNotification } = useNotification();
    const [deviceUser, setDeviceUser] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setDeviceUser(initialData.device_user);
            setUsername(initialData.username);
            setPassword(initialData.password); // Asumiendo que la contraseña se devuelve para edición (cuidado con seguridad)
            setNotes(initialData.notes || '');
        } else {
            setDeviceUser('');
            setUsername('');
            setPassword('');
            setNotes('');
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!deviceUser.trim() || !username.trim() || !password.trim()) {
            addNotification('Usuario de dispositivo, usuario y contraseña son obligatorios.', 'warning');
            setLoading(false);
            return;
        }

        try {
            const dataToSave: BacarKeyFormData = {
                device_user: deviceUser,
                username: username,
                password: password,
                notes: notes || null, // Asegura que notes sea null si está vacío
            };

            if (initialData) {
                // Actualizar clave existente
                await api.put(`/api/bacar-keys/${initialData.id}`, dataToSave, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Clave Bacar actualizada exitosamente.', 'success');
            } else {
                // Crear nueva clave
                await api.post('/api/bacar-keys', dataToSave, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Clave Bacar creada exitosamente.', 'success');
            }
            onSaveSuccess();
            onClose();
        } catch (err: unknown) {
            console.error('Error saving Bacar Key:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al guardar clave Bacar: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al guardar la clave Bacar.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 overflow-y-auto p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md my-8">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
                    {initialData ? 'Editar Clave Bacar' : 'Añadir Nueva Clave Bacar'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="deviceUser" className="block text-gray-700 text-sm font-bold mb-2">Usuario Dispositivo:</label>
                        <input
                            type="text"
                            id="deviceUser"
                            name="deviceUser"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={deviceUser}
                            onChange={(e) => setDeviceUser(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">Usuario:</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Contraseña:</label>
                        <input
                            type="text" // Puedes cambiar a "password" si no quieres que se vea el valor actual
                            id="password"
                            name="password"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2">Notas (Opcional):</label>
                        <textarea
                            id="notes"
                            name="notes"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            disabled={loading}
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                            disabled={loading}
                        >
                            {initialData ? 'Actualizar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BacarKeyEditModal;
