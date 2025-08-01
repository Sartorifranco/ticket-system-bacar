    // frontend/src/pages/AdminBacarKeysPage.tsx
    import React, { useState, useEffect, useCallback } from 'react';
    import api from '../config/axiosConfig';
    import { useAuth } from '../context/AuthContext';
    import { useNotification } from '../context/NotificationContext';
    import { BacarKey, ApiResponseError } from '../types';
    import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
    import Layout from '../components/Layout/Layout';
    import BacarKeyEditModal from '../components/BacarKeys/BacarKeyEditModal';

    const AdminBacarKeysPage: React.FC = () => {
        const { user, token } = useAuth();
        const { addNotification } = useNotification();

        const [bacarKeys, setBacarKeys] = useState<BacarKey[]>([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState<string | null>(null);
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [currentBacarKey, setCurrentBacarKey] = useState<BacarKey | null>(null);

        const fetchBacarKeys = useCallback(async () => {
            if (!token) return;
            setLoading(true);
            setError(null);
            try {
                const response = await api.get<BacarKey[]>('/api/bacar-keys', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setBacarKeys(Array.isArray(response.data) ? response.data : []);
            } catch (err: unknown) {
                console.error('Error fetching Bacar keys:', err);
                if (isAxiosErrorTypeGuard(err)) {
                    const apiError = err.response?.data as ApiResponseError;
                    setError(apiError?.message || 'Error al cargar las claves Bacar.');
                    addNotification(`Error al cargar claves Bacar: ${apiError?.message || 'Error desconocido'}`, 'error');
                } else {
                    // CORRECCIÓN AQUÍ: setError solo toma un argumento
                    setError('Ocurrió un error inesperado al cargar las claves Bacar.'); 
                    addNotification('Ocurrió un error inesperado al cargar las claves Bacar.', 'error');
                }
            } finally {
                setLoading(false);
            }
        }, [token, addNotification]);

        useEffect(() => {
            if (user && token && user.role === 'admin') {
                fetchBacarKeys();
            }
        }, [user, token, fetchBacarKeys]);

        const handleCreateBacarKey = () => {
            setCurrentBacarKey(null);
            setIsModalOpen(true);
        };

        const handleEditBacarKey = (key: BacarKey) => {
            setCurrentBacarKey(key);
            setIsModalOpen(true);
        };

        const handleDeleteBacarKey = async (keyId: number) => {
            if (!window.confirm('¿Estás seguro de que quieres eliminar esta clave Bacar?')) {
                return;
            }
            try {
                await api.delete(`/api/bacar-keys/${keyId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Clave Bacar eliminada exitosamente.', 'success');
                fetchBacarKeys();
            } catch (err: unknown) {
                console.error('Error deleting Bacar key:', err);
                if (isAxiosErrorTypeGuard(err)) {
                    const apiError = err.response?.data as ApiResponseError;
                    addNotification(`Error al eliminar clave Bacar: ${apiError?.message || 'Error desconocido'}`, 'error');
                } else {
                    // CORRECCIÓN AQUÍ: setError solo toma un argumento
                    setError('Ocurrió un error inesperado al eliminar la clave Bacar.'); 
                    addNotification('Ocurrió un error inesperado al eliminar la clave Bacar.', 'error');
                }
            }
        };

        const handleSaveSuccess = () => {
            fetchBacarKeys();
        };

        if (!user || user.role !== 'admin') {
            return <Layout><div className="text-center p-4 text-red-500">Acceso denegado. Solo administradores pueden ver esta página.</div></Layout>;
        }

        if (loading) {
            return <Layout><div className="flex justify-center items-center h-full"><span className="text-lg">Cargando claves Bacar...</span></div></Layout>;
        }

        if (error) {
            return <Layout><div className="text-red-500 text-center p-4">Error: {error}</div></Layout>;
        }

        return (
            <Layout>
                <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-800">Gestión de Claves Bacar</h1>
                        <button
                            onClick={handleCreateBacarKey}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                        >
                            Añadir Nueva Clave
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                        {bacarKeys.length === 0 ? (
                            <p className="text-gray-600 text-center py-8">No hay claves Bacar registradas.</p>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario Dispositivo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contraseña</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado En</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {bacarKeys.map(key => (
                                        <tr key={key.id}><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{key.id}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{key.device_user}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{key.username}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{key.password}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{key.notes || 'N/A'}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(key.created_at).toLocaleString()}</td><td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleEditBacarKey(key)} className="text-blue-600 hover:text-blue-900 mr-3" title="Editar Clave">Editar</button><button onClick={() => handleDeleteBacarKey(key.id)} className="text-red-600 hover:text-red-900" title="Eliminar Clave">Eliminar</button></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {isModalOpen && (
                    <BacarKeyEditModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        initialData={currentBacarKey}
                        onSaveSuccess={handleSaveSuccess}
                    />
                )}
            </Layout>
        );
    };

    export default AdminBacarKeysPage;
    