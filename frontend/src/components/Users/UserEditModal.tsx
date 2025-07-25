// frontend/src/components/Users/UserEditModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Common/Modal';
import api from '../../config/axiosConfig'; // Asegúrate de que esta importación exista y sea correcta
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification
import { User, Department } from '../../types'; // Importa User y Department desde types.ts
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null; // El usuario a editar (o null para crear)
    onUserUpdated: () => void; // Callback para notificar al padre que un usuario fue actualizado/creado
    token: string | null; // Token de autenticación (ya lo tenías como prop, ¡bien!)
    departments: Department[]; // Lista de departamentos para el selector (ya lo tenías como prop, ¡bien!)
}

const UserEditModal: React.FC<UserEditModalProps> = ({
    isOpen,
    onClose,
    user,
    onUserUpdated,
    token, // Recibiendo el token como prop
    departments, // Recibiendo los departamentos como prop
}) => {
    const { addNotification } = useNotification(); // <-- MODIFICADO: Obtener addNotification del contexto de notificaciones
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<User['role']>('client'); 
    const [departmentId, setDepartmentId] = useState<number | null>(null);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setEmail(user.email);
            setRole(user.role);
            setDepartmentId(user.department_id || null);
            setPassword(''); // No precargar contraseñas por seguridad
        } else {
            setUsername('');
            setEmail('');
            setRole('client'); 
            setDepartmentId(null);
            setPassword('');
        }
        setError(null); 
    }, [user]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!username.trim() || !email.trim() || !role) {
            setError('Todos los campos obligatorios deben ser completados.');
            addNotification('Todos los campos obligatorios deben ser completados.', 'error');
            setLoading(false);
            return;
        }

        if (!user && !password.trim()) { 
            setError('La contraseña es obligatoria para nuevos usuarios.');
            addNotification('La contraseña es obligatoria para nuevos usuarios.', 'error');
            setLoading(false);
            return;
        }

        // CORREGIDO: La validación de departamento solo aplica si el rol NO es 'client'
        if (role !== 'client' && departmentId === null) { 
            setError('Los agentes y administradores deben tener un departamento asignado.');
            addNotification('Los agentes y administradores deben tener un departamento asignado.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (!token) { // Usar el token recibido como prop
                throw new Error('No autorizado. Token no disponible.');
            }

            const userData: any = {
                username,
                email,
                role,
                department_id: departmentId,
            };

            if (password.trim()) {
                userData.password = password;
            }

            if (user) {
                await api.put(`/api/users/${user.id}`, userData, {
                    headers: { Authorization: `Bearer ${token}` }, // Usar el token
                });
                addNotification('Usuario actualizado exitosamente.', 'success');
            } else {
                await api.post('/api/users', userData, {
                    headers: { Authorization: `Bearer ${token}` }, // Usar el token
                });
                addNotification('Usuario creado exitosamente.', 'success');
            }
            onUserUpdated(); 
            onClose(); 
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al guardar usuario.');
                addNotification(`Error al guardar usuario: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al guardar el usuario.');
            }
            console.error('Error saving user:', err);
        } finally {
            setLoading(false);
        }
    }, [username, email, role, departmentId, password, user, token, addNotification, onUserUpdated, onClose]); // Añadir 'token' y 'onClose' a las dependencias

    const modalTitle = user ? `Editar Usuario: ${user.username}` : 'Crear Nuevo Usuario';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <form onSubmit={handleSubmit} className="p-4"> {/* Añadido clase p-4 para padding */}
                {error && <div className="error-message text-center p-3 mb-4">{error}</div>}

                <div className="form-group mb-4">
                    <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">Nombre de Usuario:</label> {/* Tailwind classes */}
                    <input
                        type="text"
                        id="username"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" /* Tailwind classes */
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                        required
                    />
                </div>

                <div className="form-group mb-4">
                    <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email:</label> {/* Tailwind classes */}
                    <input
                        type="email"
                        id="email"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" /* Tailwind classes */
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                    />
                </div>

                <div className="form-group mb-4">
                    <label htmlFor="role" className="block text-gray-700 text-sm font-bold mb-2">Rol:</label> {/* Tailwind classes */}
                    <select
                        id="role"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" /* Tailwind classes */
                        value={role}
                        onChange={(e) => setRole(e.target.value as User['role'])} 
                        disabled={loading}
                        required
                    >
                        <option value="client">Cliente</option>
                        <option value="agent">Agente</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>

                <div className="form-group mb-4">
                    <label htmlFor="department" className="block text-gray-700 text-sm font-bold mb-2">Departamento:</label> {/* Tailwind classes */}
                    <select
                        id="department"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" /* Tailwind classes */
                        value={departmentId || ''}
                        onChange={(e) => setDepartmentId(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={loading || role === 'client'} 
                    >
                        <option value="">Seleccionar Departamento</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                    </select>
                    {role === 'client' && (
                        <p className="text-sm text-gray-500 mt-1">Los clientes no necesitan un departamento asignado.</p>
                    )}
                </div>

                <div className="form-group mb-4">
                    <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Contraseña {user ? '(dejar vacío para no cambiar)' : '*'}:</label> {/* Tailwind classes */}
                    <input
                        type="password"
                        id="password"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" /* Tailwind classes */
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        autoComplete="new-password"
                        required={!user} 
                    />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors duration-200"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default UserEditModal;
