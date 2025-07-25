// frontend/src/components/BacarKeys/BacarKeyCreateModal.tsx
import React, { useState, useCallback } from 'react';
import Modal from '../Common/Modal'; // Asegúrate de que la ruta a tu componente Modal sea correcta
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

interface BacarKeyCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateSuccess: () => void; // Callback para cuando la clave se crea exitosamente
}

const BacarKeyCreateModal: React.FC<BacarKeyCreateModalProps> = ({
    isOpen,
    onClose,
    onCreateSuccess,
}) => {
    const { token } = useAuth(); // <-- MODIFICADO: Solo token de useAuth
    const { addNotification } = useNotification(); // <-- AÑADIDO: addNotification de useNotification
    const [newDeviceUser, setNewDeviceUser] = useState<string>('');
    const [newUsername, setNewUsername] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [newNotes, setNewNotes] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateKey = useCallback(async () => {
        setLoading(true);
        setError(null);

        if (!newDeviceUser.trim() || !newUsername.trim() || !newPassword.trim()) {
            setError('Los campos "Usuario Dispositivo", "Usuario" y "Contraseña" son obligatorios.');
            addNotification('Faltan campos obligatorios para crear la clave.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }

            const payload = {
                device_user: newDeviceUser,
                username: newUsername,
                password: newPassword,
                notes: newNotes.trim() === '' ? null : newNotes,
            };

            await api.post('/api/bacar-keys', payload, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Clave Bacar creada exitosamente.', 'success');
            // Limpiar campos y cerrar modal
            setNewDeviceUser('');
            setNewUsername('');
            setNewPassword('');
            setNewNotes('');
            onCreateSuccess(); // Notificar al componente padre para recargar las claves
            onClose(); // Cerrar el modal
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al crear clave Bacar.');
                addNotification(`Error al crear clave: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al crear la clave Bacar.');
            }
            console.error('Error creating Bacar key:', err);
        } finally {
            setLoading(false);
        }
    }, [token, newDeviceUser, newUsername, newPassword, newNotes, addNotification, onCreateSuccess, onClose]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Crear Nueva Clave Bacar">
            <div className="p-4">
                {error && <p className="error-message text-center p-3 mb-4">{error}</p>}
                <form onSubmit={(e) => { e.preventDefault(); handleCreateKey(); }}>
                    <div className="grid grid-cols-1 gap-4 mb-4">
                        <div className="form-group">
                            <label htmlFor="deviceUser" className="form-label">Usuario Dispositivo:</label>
                            <input
                                type="text"
                                id="deviceUser"
                                className="form-input"
                                value={newDeviceUser}
                                onChange={(e) => setNewDeviceUser(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="username" className="form-label">Usuario (Login):</label>
                            <input
                                type="text"
                                id="username"
                                className="form-input"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password" className="form-label">Contraseña:</label>
                            <input
                                type="password"
                                id="password"
                                className="form-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="notes" className="form-label">Notas (Opcional):</label>
                            <input
                                type="text"
                                id="notes"
                                className="form-input"
                                value={newNotes}
                                onChange={(e) => setNewNotes(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            type="submit"
                            className="button primary-button"
                            disabled={loading}
                        >
                            {loading ? 'Generando...' : 'Generar Clave'}
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
            </div>
        </Modal>
    );
};

export default BacarKeyCreateModal;
