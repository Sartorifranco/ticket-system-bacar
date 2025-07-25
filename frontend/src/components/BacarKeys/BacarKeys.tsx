// frontend/src/components/BacarKeys/BacarKeys.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { BacarKey } from '../../types'; 
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import BacarKeyEditModal from './BacarKeyEditModal'; 

const BacarKeys: React.FC = () => {
    const { token, signOut } = useAuth(); // <-- MODIFICADO: Solo token y signOut de useAuth
    const { addNotification } = useNotification(); // <-- AÑADIDO: addNotification de useNotification
    const [bacarKeys, setBacarKeys] = useState<BacarKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedKey, setSelectedKey] = useState<BacarKey | null>(null);
    const [passwordVisibility, setPasswordVisibility] = useState<Map<number, boolean>>(new Map());

    const fetchBacarKeys = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            const response = await api.get('/api/bacar-keys', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setBacarKeys(response.data || []);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar las claves Bacar.');
                addNotification(`Error al cargar claves: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar las claves Bacar.');
            }
            console.error('Error fetching Bacar Keys:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut]);

    useEffect(() => {
        fetchBacarKeys();
    }, [fetchBacarKeys]);

    const handleCreateKey = () => {
        setSelectedKey(null);
        setIsEditModalOpen(true);
    };

    const handleEditKey = (key: BacarKey) => {
        setSelectedKey(key);
        setIsEditModalOpen(true);
    };

    const handleKeyUpdatedOrCreated = () => {
        setIsEditModalOpen(false);
        fetchBacarKeys();
    };

    const handleDeleteKey = async (keyId: number) => {
        const confirmed = window.confirm('¿Estás seguro de que quieres eliminar esta clave Bacar?');
        if (!confirmed) return;

        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            await api.delete(`/api/bacar-keys/${keyId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Clave Bacar eliminada exitosamente.', 'success');
            fetchBacarKeys();
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al eliminar clave Bacar.');
                addNotification(`Error al eliminar clave: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al eliminar la clave Bacar.');
            }
            console.error('Error deleting Bacar Key:', err);
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = (keyId: number) => {
        setPasswordVisibility(prev => {
            const newMap = new Map(prev);
            newMap.set(keyId, !newMap.get(keyId));
            return newMap;
        });
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    if (loading) {
        return (
            <div className="loading-message">🔄 Cargando claves Bacar...</div>
        );
    }

    if (error) {
        return (
            <div className="error-message text-center p-4">
                <p>{error}</p>
                <button onClick={fetchBacarKeys} className="button primary-button mt-2">Reintentar</button>
            </div>
        );
    }

    return (
        <div className="bacar-keys-management">
            <h2 className="text-2xl font-bold text-primary-color mb-4 text-center">Gestión de Claves Bacar</h2>
            <p className="info-text text-center mb-6">Administra las claves de acceso a dispositivos Bacar.</p>

            <div className="flex justify-end mb-4">
                <button onClick={handleCreateKey} className="button primary-button">
                    Crear Nueva Clave
                </button>
            </div>

            {bacarKeys.length > 0 ? (
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Usuario Dispositivo</th>
                                <th>Usuario Login</th>
                                <th>Contraseña</th>
                                <th>Notas</th>
                                <th>Creado por</th>
                                <th>Fecha Creación</th>
                                <th>Última Actualización</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bacarKeys.map((key) => (
                                <tr key={key.id}>
                                    <td>{key.id}</td>
                                    <td className="font-mono text-sm">{key.device_user}</td>
                                    <td className="font-mono text-sm">{key.username}</td>
                                    <td>
                                        <div className="flex items-center">
                                            <span className="font-mono text-sm mr-2">
                                                {passwordVisibility.get(key.id) ? key.password : '********'}
                                            </span>
                                            <button
                                                onClick={() => togglePasswordVisibility(key.id)}
                                                className="text-gray-500 hover:text-primary-color transition-colors duration-200"
                                                title={passwordVisibility.get(key.id) ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                    {passwordVisibility.get(key.id) ? (
                                                        <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                                                    ) : (
                                                        <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                                                    )}
                                                    <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                    <td>{key.notes || 'N/A'}</td>
                                    <td>{key.created_by_username || 'Sistema'}</td>
                                    <td>{formatTimestamp(key.created_at)}</td>
                                    <td>{formatTimestamp(key.updated_at)}</td>
                                    <td className="actions-column">
                                        <button
                                            onClick={() => handleEditKey(key)}
                                            className="button small-button secondary-button mr-2"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteKey(key.id)}
                                            className="button small-button delete-button"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="info-text">No hay claves Bacar registradas.</p>
            )}

            {isEditModalOpen && (
                <BacarKeyEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    keyToEdit={selectedKey}
                    onKeyUpdated={handleKeyUpdatedOrCreated}
                    token={token}
                />
            )}
        </div>
    );
};

export default BacarKeys;
