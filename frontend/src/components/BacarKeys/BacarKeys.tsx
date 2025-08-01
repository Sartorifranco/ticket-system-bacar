// src/components/BacarKeys/BacarKeys.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { BacarKey, ApiResponseError } from '../../types'; // Asegúrate de que BacarKey esté bien definido aquí
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';

// Importar el modal de edición/creación
import BacarKeyEditModal from './BacarKeyEditModal'; // Asegúrate de que la ruta y el nombre del componente son correctos

// Importar el modal de confirmación (asumo que tienes uno genérico)
interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
                <p className="mb-6 text-gray-700">{message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};


const BacarKeys: React.FC = () => {
    const { token } = useAuth();
    const { addNotification } = useNotification();
    const [bacarKeys, setBacarKeys] = useState<BacarKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentKey, setCurrentKey] = useState<BacarKey | null>(null);
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
    const [keyToDeleteId, setKeyToDeleteId] = useState<number | null>(null);

    const fetchBacarKeys = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/api/bacar-keys', {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Asumiendo que la respuesta es un array de BacarKey
            setBacarKeys(response.data);
        } catch (err: unknown) {
            console.error('Error fetching Bacar keys:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar las claves Bacar.');
                addNotification(`Error al cargar claves Bacar: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar las claves Bacar.'); // CORREGIDO: setError con 1 argumento
                addNotification('Ocurrió un error inesperado al cargar las claves Bacar.', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        fetchBacarKeys();
    }, [fetchBacarKeys]);

    const openCreateModal = () => {
        setCurrentKey(null);
        setIsModalOpen(true);
    };

    const openEditModal = (key: BacarKey) => {
        setCurrentKey(key);
        setIsModalOpen(true);
    };

    const openConfirmDeleteModal = (id: number) => {
        setKeyToDeleteId(id);
        setIsConfirmDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!keyToDeleteId || !token) return;
        setLoading(true);
        setError(null);
        try {
            await api.delete(`/api/bacar-keys/${keyToDeleteId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Clave Bacar eliminada exitosamente.', 'success');
            fetchBacarKeys(); // Recargar la lista después de eliminar
        } catch (err: unknown) {
            console.error('Error deleting Bacar key:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al eliminar la clave Bacar.');
                addNotification(`Error al eliminar clave Bacar: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al eliminar la clave Bacar.'); // CORREGIDO: setError con 1 argumento
                addNotification('Ocurrió un error inesperado al eliminar la clave Bacar.', 'error');
            }
        } finally {
            setLoading(false);
            setIsConfirmDeleteModalOpen(false);
            setKeyToDeleteId(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><span className="text-lg">Cargando claves Bacar...</span></div>;
    }

    if (error) {
        return <div className="text-red-500 text-center p-4">Error: {error}</div>;
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-300 pb-2">Gestión de Claves Bacar</h1>

            <button
                onClick={openCreateModal}
                className="mb-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
            >
                Añadir Nueva Clave Bacar
            </button>

            {bacarKeys.length === 0 ? (
                <p className="text-gray-600">No hay claves Bacar registradas.</p>
            ) : (
                <div className="overflow-x-auto bg-white shadow-lg rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Usuario Dispositivo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Contraseña</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Notas</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Creado Por</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Creado En</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actualizado En</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {bacarKeys.map((key) => (
                                <tr key={key.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{key.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{key.device_user}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{key.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{key.password}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{key.notes || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{key.created_by_username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(key.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(key.updated_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => openEditModal(key)}
                                            className="text-blue-600 hover:text-blue-900 mr-3 transition duration-150 ease-in-out"
                                            title="Editar"
                                        >
                                            <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-7-7l-4 4m4-4l4 4m-4-4l9.293 9.293a1 1 0 01-1.414 1.414L11 7.414V11a1 1 0 102 0V7.414l1.293 1.293a1 1 0 001.414-1.414L11 3.586z"></path></svg>
                                        </button>
                                        <button
                                            onClick={() => openConfirmDeleteModal(key.id)}
                                            className="text-red-600 hover:text-red-900 transition duration-150 ease-in-out"
                                            title="Eliminar"
                                        >
                                            <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <BacarKeyEditModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSaveSuccess={fetchBacarKeys} // Pasar la función de recarga
                    initialData={currentKey}
                />
            )}

            {isConfirmDeleteModalOpen && (
                <ConfirmModal
                    isOpen={isConfirmDeleteModalOpen}
                    onClose={() => setIsConfirmDeleteModalOpen(false)}
                    onConfirm={handleDelete}
                    title="Confirmar Eliminación"
                    message="¿Estás seguro de que quieres eliminar esta clave Bacar? Esta acción no se puede deshacer."
                />
            )}
        </div>
    );
};

export default BacarKeys;
