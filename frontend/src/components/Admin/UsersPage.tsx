// src/components/Users/Users.tsx
import React from 'react';
import { User, Department } from '../../types';

interface UsersProps {
    users: User[];
    departments: Department[];
    loading: boolean;
    error: string | null;
    onEditUser: (user: User) => void;
    onDeleteUser: (id: number, username: string) => void;
}

const Users: React.FC<UsersProps> = ({ users, departments, loading, error, onEditUser, onDeleteUser }) => {

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
            {/* Título "Usuarios" eliminado de aquí, ahora lo gestiona UsersPage.tsx */}
            {/* Botón "Crear Nuevo Usuario" eliminado de aquí, ahora lo gestiona UsersPage.tsx */}

            {users.length === 0 ? (
                <p className="text-gray-600">No hay usuarios registrados.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre de Usuario</th>
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
                                            onClick={() => onEditUser(user)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                            title="Editar Usuario"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg> Editar
                                        </button>
                                        <button
                                            onClick={() => onDeleteUser(user.id, user.username)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Eliminar Usuario"
                                        >
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
        </div>
    );
};

export default Users;
