// frontend/src/pages/AdminUsersPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { User, Department, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';
import Layout from '../components/Layout/Layout';
import UserFormModal from '../components/Users/UserFormModal';

const AdminUsersPage: React.FC = () => {
    const { user, token } = useAuth();
    const { addNotification } = useNotification();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]); // Para el modal de usuario

    const fetchUsers = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const response = await api.get<{ success: boolean; count: number; data: User[] }>('/api/users', {
                headers: { Authorization: `Bearer ${token}` },
            });
            // CORREGIDO: Acceder a response.data.data
            setUsers(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (err: unknown) {
            console.error('Error fetching users:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar los usuarios.');
                addNotification(`Error al cargar usuarios: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar los usuarios.');
                addNotification('Ocurrió un error inesperado al cargar los usuarios.', 'error');
            }
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    const fetchAllDepartments = useCallback(async () => {
        if (!token) return;
        try {
            // Asumiendo que el endpoint de departamentos devuelve un array directo o un objeto con 'departments'
            const response = await api.get<{ departments: Department[] }>('/api/departments', {
                headers: { Authorization: `Bearer ${token}` },
            });
            // Si tu backend devuelve un array directamente, usa response.data. Si es { departments: [...] }, usa response.data.departments
            setAllDepartments(Array.isArray(response.data) ? response.data : (response.data.departments || []));
        } catch (err: unknown) {
            console.error('Error fetching departments for user modal:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al cargar departamentos: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al cargar los departamentos.', 'error');
            }
            setAllDepartments([]);
        }
    }, [token, addNotification]);

    useEffect(() => {
        if (user && token && user.role === 'admin') {
            fetchUsers();
            fetchAllDepartments();
        }
    }, [user, token, fetchUsers, fetchAllDepartments]);

    const handleCreateUser = () => {
        setCurrentUser(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (userToEdit: User) => {
        setCurrentUser(userToEdit);
        setIsModalOpen(true);
    };

    const handleDeleteUser = async (userId: number) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
            return;
        }
        try {
            await api.delete(`/api/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Usuario eliminado exitosamente.', 'success');
            fetchUsers();
        } catch (err: unknown) {
            console.error('Error deleting user:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al eliminar usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al eliminar el usuario.', 'error');
            }
        }
    };

    const handleSaveUser = async (userData: any) => {
        try {
            if (currentUser) {
                await api.put(`/api/users/${currentUser.id}`, userData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Usuario actualizado exitosamente.', 'success');
            } else {
                await api.post('/api/users', userData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Usuario creado exitosamente.', 'success');
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (err: unknown) {
            console.error('Error saving user:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al guardar usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al guardar el usuario.', 'error');
            }
        }
    };

    if (!user || user.role !== 'admin') {
        return <Layout><div className="text-center p-4 text-red-500">Acceso denegado. Solo administradores pueden ver esta página.</div></Layout>;
    }

    if (loading) {
        return <Layout><div className="flex justify-center items-center h-full"><span className="text-lg">Cargando usuarios...</span></div></Layout>;
    }

    if (error) {
        return <Layout><div className="text-red-500 text-center p-4">Error: {error}</div></Layout>;
    }

    return (
        <Layout>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Gestión de Usuarios</h1>
                    <button
                        onClick={handleCreateUser}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                    >
                        Crear Nuevo Usuario
                    </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                    {users.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">No hay usuarios registrados.</p>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Creación</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((userItem) => (
                                    <tr key={userItem.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{userItem.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{userItem.username}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{userItem.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{userItem.role}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{userItem.department_id ? allDepartments.find(d => d.id === userItem.department_id)?.name || 'N/A' : 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(userItem.created_at).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleEditUser(userItem)}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                                title="Editar Usuario"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(userItem.id)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Eliminar Usuario"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <UserFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveUser}
                    initialData={currentUser}
                    departments={allDepartments}
                />
            )}
        </Layout>
    );
};

export default AdminUsersPage;
