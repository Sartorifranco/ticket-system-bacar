import React, { useState, useEffect, useCallback } from 'react';
import userService, { NewUser, UpdateUser } from '../../services/userService'; 
// Eliminadas las importaciones de react-icons/fa
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { Department, User } from '../../types'; 

const UserList: React.FC = () => {
    const { token } = useAuth(); // <-- MODIFICADO: Solo token de useAuth
    const { addNotification } = useNotification(); // <-- AÑADIDO: addNotification de useNotification
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [newUsername, setNewUsername] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'agent' | 'client'>('client'); 
    const [newDepartmentId, setNewDepartmentId] = useState<number | null>(null);

    const fetchUsersAndDepartments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('No autorizado para ver usuarios.', 'error');
                setLoading(false);
                return;
            }
            const [usersData, departmentsData] = await Promise.all([
                userService.getAllUsers(token), 
                axios.get('/api/departments', { headers: { Authorization: `Bearer ${token}` } }).then(res => res.data.departments)
            ]);
            setUsers(usersData);
            setDepartments(departmentsData);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar usuarios o departamentos.');
                addNotification(`Error al cargar: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar los datos.');
            }
            console.error('Error fetching users or departments:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        fetchUsersAndDepartments();
    }, [fetchUsersAndDepartments]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUsername.trim() || !newEmail.trim() || (!currentUser && !newPassword.trim())) { // Added !currentUser check for password
            addNotification('Todos los campos son obligatorios para crear un usuario, incluida la contraseña.', 'warning');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('No autorizado para crear usuario.', 'error');
                return;
            }
            const newUser: NewUser = { 
                username: newUsername,
                email: newEmail,
                password: newPassword,
                role: newRole,
                department_id: newDepartmentId,
            };
            await userService.createUser(token, newUser); 
            addNotification('Usuario creado exitosamente.', 'success');
            setIsModalOpen(false);
            setNewUsername('');
            setNewEmail('');
            setNewPassword('');
            setNewRole('client');
            setNewDepartmentId(null);
            fetchUsersAndDepartments();
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al crear usuario.');
                addNotification(`Error al crear usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al crear el usuario.');
            }
            console.error('Error creating user:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (user: User) => {
        setCurrentUser(user);
        setNewUsername(user.username);
        setNewEmail(user.email);
        setNewRole(user.role);
        setNewDepartmentId(user.department_id); 
        setNewPassword(''); 
        setIsModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !newUsername.trim() || !newEmail.trim()) {
            addNotification('El nombre de usuario y el email no pueden estar vacíos.', 'warning');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('No autorizado para actualizar usuario.', 'error');
                return;
            }
            const updatedUser: UpdateUser = { 
                username: newUsername,
                email: newEmail,
                role: newRole,
                department_id: newDepartmentId,
            };
            if (newPassword) { 
                updatedUser.password = newPassword;
            }
            await userService.updateUser(token, currentUser.id, updatedUser); 
            addNotification('Usuario actualizado exitosamente.', 'success');
            setIsModalOpen(false);
            setCurrentUser(null);
            setNewUsername('');
            setNewEmail('');
            setNewPassword('');
            setNewRole('client');
            setNewDepartmentId(null);
            fetchUsersAndDepartments();
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al actualizar usuario.');
                addNotification(`Error al actualizar usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al actualizar el usuario.');
            }
            console.error('Error updating user:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id: number, username: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario ${username}? Esta acción es irreversible.`)) {
            setLoading(true);
            setError(null);
            try {
                if (!token) {
                    addNotification('No autorizado para eliminar usuario.', 'error');
                    return;
                }
                await userService.deleteUser(token, id);
                addNotification(`Usuario ${username} eliminado exitosamente.`, 'success');
                fetchUsersAndDepartments();
            } catch (err: unknown) {
                if (isAxiosErrorTypeGuard(err)) {
                    const apiError = err.response?.data as ApiResponseError;
                    setError(apiError?.message || 'Error al eliminar usuario.');
                    addNotification(`Error al eliminar usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
                } else {
                    setError('Ocurrió un error inesperado al eliminar el usuario.');
                }
                console.error('Error deleting user:', err);
            } finally {
                setLoading(false);
            }
        }
    };

    const getDepartmentName = (id: number | null) => {
        const dept = departments.find(d => d.id === id);
        return dept ? dept.name : 'N/A';
    };

    if (loading) {
        return <p className="text-center text-gray-600">Cargando usuarios...</p>;
    }

    if (error) {
        return <p className="text-center text-red-500">Error: {error}</p>;
    }

    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Usuarios</h2>
            <button
                onClick={() => {
                    setCurrentUser(null);
                    setNewUsername('');
                    setNewEmail('');
                    setNewPassword('');
                    setNewRole('client');
                    setNewDepartmentId(null);
                    setIsModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md mb-4 transition-colors duration-200"
            >
                Crear Nuevo Usuario
            </button>

            {users.length === 0 ? (
                <p className="text-gray-600">No hay usuarios registrados.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
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
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : ''}
                                            ${user.role === 'agent' ? 'bg-red-100 text-red-800' : ''}
                                            ${user.role === 'client' ? 'bg-blue-100 text-blue-800' : ''}
                                        `}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getDepartmentName(user.department_id)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEditUser(user)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                            title="Editar Usuario"
                                        >
                                            {/* SVG para Editar */}
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg> Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user.id, user.username)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Eliminar Usuario"
                                        >
                                            {/* SVG para Eliminar */}
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg> Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">
                            {currentUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                        </h3>
                        <form onSubmit={currentUser ? handleUpdateUser : handleCreateUser}>
                            <div className="mb-4">
                                <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">
                                    Nombre de Usuario:
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
                                    Email:
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
                                    Contraseña:
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required={!currentUser}
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="role" className="block text-gray-700 text-sm font-bold mb-2">
                                    Rol:
                                </label>
                                <select
                                    id="role"
                                    name="role"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value as 'admin' | 'agent' | 'client')}
                                    required
                                >
                                    <option value="client">Cliente</option>
                                    <option value="agent">Agente</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="department" className="block text-gray-700 text-sm font-bold mb-2">
                                    Departamento (solo para Agentes):
                                </label>
                                <select
                                    id="department"
                                    name="department_id" 
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={newDepartmentId || ''}
                                    onChange={(e) => setNewDepartmentId(parseInt(e.target.value) || null)}
                                    disabled={newRole !== 'agent'}
                                >
                                    <option value="">Seleccionar Departamento</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors duration-200"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                                    disabled={loading}
                                >
                                    {loading ? 'Guardando...' : (currentUser ? 'Actualizar' : 'Crear')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserList;
