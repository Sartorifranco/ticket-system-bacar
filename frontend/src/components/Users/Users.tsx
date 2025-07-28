// frontend/src/components/Users/Users.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { User, Department } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import UserEditModal from './UserEditModal'; // Asume que este modal existe
import { userRoleTranslations } from '../../utils/traslations';

interface UsersProps {
    onEditUser: (user: User | null) => void;
}

const Users: React.FC<UsersProps> = ({ onEditUser }) => {
    const { token, signOut } = useAuth();
    const { addNotification } = useNotification();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]); // Para mostrar nombres de departamento

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            const response = await api.get('/api/users', {
                headers: { Authorization: `Bearer ${token}` },
            });
            console.log('[Users.tsx] Usuarios recibidos:', response.data);
            // CORREGIDO: Asegurarse de que response.data.users sea un array y asignarlo al estado
            setUsers(response.data.users || []); 
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar usuarios.');
                addNotification(`Error al cargar usuarios: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar los usuarios.');
            }
            console.error('Error fetching users:', err);
            setUsers([]); // Asegura que el estado sea un array vacío en caso de error
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut]);

    const fetchDepartments = useCallback(async () => {
        try {
            if (!token) return;
            const response = await api.get('/api/departments', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setDepartments(response.data.departments || []);
        } catch (err: unknown) {
            console.error('Error fetching departments for user list:', err);
            if (isAxiosErrorTypeGuard(err) && err.response?.status === 401) {
                signOut();
            }
        }
    }, [token, signOut]);

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
    }, [fetchUsers, fetchDepartments]);

    const handleDeleteUser = useCallback(async (userId: number) => {
        const confirmed = window.confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción es irreversible.');
        if (!confirmed) return;

        setLoading(true);
        try {
            if (!token) {
                addNotification('No autorizado para eliminar usuarios.', 'error');
                return;
            }
            await api.delete(`/api/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Usuario eliminado exitosamente.', 'success');
            fetchUsers(); // Refrescar la lista de usuarios
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al eliminar usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al eliminar el usuario.', 'error');
            }
            console.error('Error deleting user:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, fetchUsers]);

    const getDepartmentName = (departmentId: number | null) => {
        if (!departmentId) return 'N/A';
        const dept = departments.find(d => d.id === departmentId);
        return dept ? dept.name : 'Desconocido';
    };

    if (loading) {
        return (
            <div className="loading-message text-center py-4">🔄 Cargando usuarios...</div>
        );
    }

    if (error) {
        return (
            <div className="error-message text-center p-4">
                <p>{error}</p>
                <button onClick={fetchUsers} className="button primary-button mt-2">Reintentar</button>
            </div>
        );
    }

    return (
        <div className="users-management p-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Gestión de Usuarios</h2>
            <p className="text-gray-700 mb-6 text-center">Administra los usuarios del sistema, sus roles y departamentos.</p>

            <div className="flex justify-end mb-4">
                <button onClick={() => onEditUser(null)} className="button primary-button">
                    Crear Nuevo Usuario
                </button>
            </div>

            {users.length > 0 ? (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id}> {/* Usar user.id como key */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${user.role === 'admin' ? 'bg-red-100 text-red-800' : ''}
                                            ${user.role === 'agent' ? 'bg-blue-100 text-blue-800' : ''}
                                            ${user.role === 'client' ? 'bg-green-100 text-green-800' : ''}
                                        `}>
                                            {userRoleTranslations[user.role] || user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getDepartmentName(user.department_id)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => onEditUser(user)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
                                            className="text-red-600 hover:text-red-900"
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
                <p className="info-text text-center">No hay usuarios registrados.</p>
            )}
        </div>
    );
};

export default Users;
