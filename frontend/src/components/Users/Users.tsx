// frontend/src/components/Users/Users.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext'; 
import { User, Department } from '../../types'; // Asegúrate de que User tenga department_id
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import UserEditModal from './UserEditModal'; 
import { userRoleTranslations } from '../../utils/traslations'; 

interface UsersProps {
    onEditUser: (user: User | null) => void;
}

const Users: React.FC<UsersProps> = ({ onEditUser }) => { 
    const { token, addNotification, signOut } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null); 

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            const [usersResponse, departmentsResponse] = await Promise.all([
                api.get('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            
            // CORRECCIÓN CLAVE AQUÍ: Acceder directamente a response.data
            setUsers(usersResponse.data || []); 
            setDepartments(departmentsResponse.data.departments || []);
            
            // Opcional: Añadir un console.log para ver los datos recibidos en el frontend
            console.log('[Users.tsx] Usuarios recibidos:', usersResponse.data);

        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar usuarios o departamentos.');
                addNotification(`Error al cargar datos: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar los datos.');
            }
            console.error('Error fetching users or departments:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleCreateUser = () => {
        setSelectedUser(null); 
        setIsCreateUserModalOpen(true);
    };

    const handleEditUserClick = (user: User) => {
        onEditUser(user); 
    };

    const handleUserUpdatedOrCreated = () => {
        setIsCreateUserModalOpen(false); 
        fetchUsers(); 
    };

    const handleDeleteUser = async (userId: number) => {
        const confirmed = window.confirm('¿Estás seguro de que quieres eliminar este usuario?');
        if (!confirmed) return;

        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            await api.delete(`/api/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Usuario eliminado exitosamente.', 'success');
            fetchUsers(); 
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al eliminar usuario.');
                addNotification(`Error al eliminar usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al eliminar el usuario.');
            }
            console.error('Error deleting user:', err);
        } finally {
            setLoading(false);
        }
    };

    const getDepartmentName = (departmentId: number | null) => {
        if (!departmentId) return 'N/A';
        const department = departments.find(dep => dep.id === departmentId);
        return department ? department.name : 'Desconocido';
    };

    if (loading) {
        return (
            <div className="loading-message">🔄 Cargando usuarios...</div>
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
        <div className="users-management">
            <h2 className="text-2xl font-bold text-primary-color mb-4 text-center">Gestión de Usuarios</h2>
            <p className="info-text text-center mb-6">Administra los usuarios del sistema, sus roles y departamentos.</p>

            <div className="flex justify-end mb-4">
                <button onClick={handleCreateUser} className="button primary-button">
                    Crear Nuevo Usuario
                </button>
            </div>

            {users.length > 0 ? (
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre de Usuario</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Departamento</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.id}</td>
                                    <td>{user.username}</td>
                                    <td>{user.email}</td>
                                    <td><span className={`status-badge status-${user.role}`}>{userRoleTranslations[user.role]}</span></td>
                                    {/* CORREGIDO: Acceso a department_id después de la actualización de types.ts */}
                                    <td>{getDepartmentName(user.department_id || null)}</td>
                                    <td>
                                        <button
                                            onClick={() => handleEditUserClick(user)}
                                            className="button small-button secondary-button mr-2"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id)}
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
                <p className="info-text">No hay usuarios registrados.</p>
            )}

            {/* Modal de Creación/Edición de Usuario (si lo manejas aquí) */}
            {isCreateUserModalOpen && (
                <UserEditModal
                    isOpen={isCreateUserModalOpen}
                    onClose={() => setIsCreateUserModalOpen(false)}
                    user={null} 
                    onUserUpdated={handleUserUpdatedOrCreated}
                    token={token} 
                    departments={departments} 
                />
            )}
        </div>
    );
};

export default Users;
