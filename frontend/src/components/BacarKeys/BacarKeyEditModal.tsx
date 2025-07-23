// frontend/src/components/BacarKeys/BacarKeyEditModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { BacarKey } from '../../types'; // Importar la interfaz BacarKey
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

interface BacarKeyEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    keyToEdit: BacarKey | null;
    onKeyUpdated: () => void;
    token: string | null;
}

const BacarKeyEditModal: React.FC<BacarKeyEditModalProps> = ({
    isOpen,
    onClose,
    keyToEdit,
    onKeyUpdated,
    token,
}) => {
    const { addNotification } = useAuth();
    const [deviceUser, setDeviceUser] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (keyToEdit) {
            setDeviceUser(keyToEdit.device_user);
            setUsername(keyToEdit.username);
            setPassword(keyToEdit.password); 
            setNotes(keyToEdit.notes || '');
            setError(null);
        } else {
            setDeviceUser('');
            setUsername('');
            setPassword('');
            setNotes('');
            setError(null);
        }
    }, [keyToEdit]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!deviceUser.trim() || !username.trim() || !password.trim()) {
            setError('Por favor, ingresa el usuario del dispositivo, el nombre de usuario y la contraseña.');
            addNotification('Por favor, completa todos los campos obligatorios.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }

            const keyData = {
                device_user: deviceUser,
                username,
                password,
                notes: notes || null,
            };

            if (keyToEdit) {
                await api.put(`/api/bacar-keys/${keyToEdit.id}`, keyData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Clave Bacar actualizada exitosamente.', 'success');
            } else {
                await api.post('/api/bacar-keys', keyData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Clave Bacar creada exitosamente.', 'success');
            }
            onKeyUpdated();
            onClose();
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al guardar la clave Bacar.');
                addNotification(`Error al guardar clave: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al guardar la clave Bacar.');
            }
            console.error('Error saving Bacar Key:', err);
        } finally {
            setLoading(false);
        }
    }, [token, keyToEdit, deviceUser, username, password, notes, addNotification, onKeyUpdated, onClose]);

    if (!isOpen) return null;

    const portalElement = document.getElementById('modal-root');
    if (!portalElement) {
        console.error("Error: 'modal-root' no encontrado para BacarKeyEditModal. El portal no se puede crear.");
        return null;
    }

    return ReactDOM.createPortal(
        <div className="modal-overlay">
            <div className="modal-content admin-modal-size">
                <h2 className="modal-title">{keyToEdit ? 'Editar Clave Bacar' : 'Crear Nueva Clave Bacar'}</h2>
                <button className="modal-close-button" onClick={onClose}>&times;</button>

                {error && <p className="error-message-modal">{error}</p>}

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label htmlFor="deviceUser">Usuario del Dispositivo:</label>
                        <input
                            type="text"
                            id="deviceUser"
                            value={deviceUser}
                            onChange={(e) => setDeviceUser(e.target.value)}
                            className="form-input"
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="username">Nombre de Usuario (Login):</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="form-input"
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Contraseña:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="form-input"
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="notes">Notas (Opcional):</label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="form-input"
                            rows={3}
                            disabled={loading}
                        ></textarea>
                    </div>
                    <div className="modal-actions">
                        <button type="submit" className="button primary-button" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Clave'}
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

export default BacarKeyEditModal;
