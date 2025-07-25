import React, { useState, useEffect } from 'react';
import userService, { NewUser, UpdateUser } from '../../services/userService'; 
import { User, UserRole, Department } from '../../types'; 
import { useAuth } from '../../context/AuthContext'; 
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

interface UserFormProps {
    userToEdit?: User | null;
    onSave: () => void;
    onCancel: () => void;
    token: string | null; 
    departments: Department[]; 
}

const UserForm: React.FC<UserFormProps> = ({ userToEdit, onSave, onCancel, token, departments }) => {
    const { addNotification } = useNotification(); // <-- MODIFICADO: Obtener addNotification del contexto de notificaciones
    const [formData, setFormData] = useState<NewUser>({
        username: userToEdit?.username || '',
        email: userToEdit?.email || '',
        password: '', 
        role: userToEdit?.role || 'client',
        department_id: userToEdit?.department_id || null,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userToEdit) {
            setFormData({
                username: userToEdit.username,
                email: userToEdit.email,
                password: '', 
                role: userToEdit.role,
                department_id: userToEdit.department_id,
            });
        } else {
            setFormData({ username: '', email: '', password: '', role: 'client', department_id: null });
        }
    }, [userToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'department_id') {
            setFormData((prev) => ({ ...prev, [name]: value === '' ? null : parseInt(value) }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!token) {
            addNotification('No autorizado. Por favor, inicia sesión de nuevo.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (userToEdit) {
                const dataToUpdate: UpdateUser = {
                    username: formData.username,
                    email: formData.email,
                    role: formData.role,
                    department_id: formData.department_id,
                };
                if (formData.password) {
                    dataToUpdate.password = formData.password;
                }
                await userService.updateUser(token, userToEdit.id, dataToUpdate);
                addNotification('Usuario actualizado exitosamente!', 'success');
            } else {
                if (!formData.password) {
                    throw new Error('La contraseña es obligatoria para crear un nuevo usuario.');
                }
                await userService.createUser(token, formData);
                addNotification('Usuario creado exitosamente!', 'success');
                setFormData({ username: '', email: '', password: '', role: 'client', department_id: null }); 
            }
            onSave(); 
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al guardar el usuario.');
                addNotification(`Error al guardar usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else if (err instanceof Error) {
                setError(err.message || 'Ocurrió un error inesperado al guardar el usuario.');
            } else {
                setError('Ocurrió un error inesperado al guardar el usuario.');
            }
            console.error('Error saving user:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {userToEdit ? 'Editar Usuario' : 'Crear Usuario'}
            </h2>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            <div className="mb-4">
                <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">
                    Nombre de Usuario:
                </label>
                <input
                    type="text"
                    id="username"
                    name="username"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={loading}
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
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                />
            </div>
            <div className="mb-4">
                <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
                    Contraseña: {userToEdit ? '(dejar vacío para no cambiar)' : ''}
                </label>
                <input
                    type="password"
                    id="password"
                    name="password"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.password}
                    onChange={handleChange}
                    required={!userToEdit} 
                    disabled={loading}
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
                    value={formData.role}
                    onChange={handleChange}
                    required
                    disabled={loading}
                >
                    <option value="client">Cliente</option>
                    <option value="agent">Agente</option>
                    <option value="admin">Administrador</option>
                </select>
            </div>
            {formData.role === 'agent' && ( 
                <div className="mb-4">
                    <label htmlFor="department_id" className="block text-gray-700 text-sm font-bold mb-2">
                        Departamento:
                    </label>
                    <select
                        id="department_id"
                        name="department_id" 
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        value={formData.department_id || ''} 
                        onChange={handleChange}
                        disabled={loading}
                    >
                        <option value="">Seleccionar Departamento (opcional)</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onCancel}
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
                    {loading ? 'Guardando...' : (userToEdit ? 'Actualizar' : 'Crear')}
                </button>
            </div>
        </form>
    );
};

export default UserForm;
