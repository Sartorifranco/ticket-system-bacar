// src/components/Users/UserFormModal.tsx
import React, { useState, useEffect } from 'react';
import { User, Department, NewUser, UpdateUser } from '../../types';

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (userData: NewUser | UpdateUser) => Promise<void>; // Asegura que onSave es una promesa
    initialData: User | null;
    departments: Department[];
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSave, initialData, departments }) => {
    const [formData, setFormData] = useState({
        username: initialData?.username || '',
        email: initialData?.email || '',
        password: '',
        confirmPassword: '',
        role: initialData?.role || 'client' as 'admin' | 'agent' | 'client',
        department_id: initialData?.department_id || null as number | null,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                username: initialData.username,
                email: initialData.email,
                password: '',
                confirmPassword: '',
                role: initialData.role,
                department_id: initialData.department_id || null,
            });
        } else {
            setFormData({
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'client',
                department_id: null,
            });
        }
    }, [initialData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'department_id' && value ? parseInt(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.username.trim() || !formData.email.trim()) {
            // No usamos addNotification aquí, la página padre lo hará
            setLoading(false);
            return;
        }

        if (!initialData && formData.password !== formData.confirmPassword) {
            // No usamos addNotification aquí
            setLoading(false);
            return;
        }

        if (!initialData && formData.password.length < 6) {
            // No usamos addNotification aquí
            setLoading(false);
            return;
        }

        try {
            const dataToSave: NewUser | UpdateUser = {
                username: formData.username,
                email: formData.email,
                role: formData.role,
                department_id: formData.department_id,
            };

            if (formData.password) {
                (dataToSave as NewUser).password = formData.password; // Cast para añadir password si es necesario
            }

            await onSave(dataToSave); // Llama al onSave pasado por prop
            onClose(); // Cerrar el modal aquí después de que onSave se complete
        } catch (error) {
            console.error('Error en UserFormModal al guardar:', error);
            // El error se maneja en UsersPage.tsx
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 overflow-y-auto p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md my-8">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
                    {initialData ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">Nombre de Usuario:</label>
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
                        <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
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
                            {initialData ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}:
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={formData.password}
                            onChange={handleChange}
                            required={!initialData}
                            disabled={loading}
                        />
                    </div>
                    {!initialData && (
                        <div className="mb-6">
                            <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-bold mb-2">
                                Confirmar Contraseña:
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required={!initialData}
                                disabled={loading}
                            />
                        </div>
                    )}
                    <div className="mb-4">
                        <label htmlFor="role" className="block text-gray-700 text-sm font-bold mb-2">Rol:</label>
                        <select
                            id="role"
                            name="role"
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                            <label htmlFor="department" className="block text-gray-700 text-sm font-bold mb-2">Departamento:</label>
                            <select
                                id="department"
                                name="department_id"
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                value={formData.department_id || ''}
                                onChange={handleChange}
                                disabled={loading}
                            >
                                <option value="">Seleccionar Departamento</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                            disabled={loading}
                        >
                            {initialData ? 'Actualizar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserFormModal;
