// frontend/src/pages/Auth/RegisterPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../config/axiosConfig';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { useNotification } from '../../context/NotificationContext';

// Eliminar la importación de Auth.css y index.css, ya que Tailwind CSS lo manejará
// import '../../index.css';
// import './Auth.css';

const RegisterPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    // Eliminamos el estado 'error' local, ya que las notificaciones lo manejarán
    // const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const navigate = useNavigate();
    const { addNotification } = useNotification();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        // setError(null); // Ya no es necesario
        setLoading(true);

        // Validación del lado del cliente
        if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
            addNotification('Todos los campos son obligatorios.', 'warning');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            // setError('Las contraseñas no coinciden.'); // Ya no es necesario
            addNotification('Las contraseñas no coinciden.', 'error');
            setLoading(false);
            return;
        }

        try {
            // Asegúrate de que los valores se recorten antes de enviarlos
            await api.post('api/auth/register', {
                username: username.trim(),
                email: email.trim(),
                password: password.trim(),
            });
            addNotification('Registro exitoso. Por favor, inicia sesión.', 'success');
            navigate('/login');
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                // setError(apiError?.message || 'Error en el registro.'); // Ya no es necesario
                addNotification(`Error en el registro: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                // setError('Ocurrió un error inesperado durante el registro.'); // Ya no es necesario
                addNotification('Ocurrió un error inesperado durante el registro.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        // Reemplazado .auth-container con clases de Tailwind
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4 sm:p-6">
            {/* Reemplazado .auth-card con clases de Tailwind */}
            <div className="bg-white p-8 sm:p-10 rounded-xl shadow-lg w-full max-w-md text-center border border-gray-200">
                {/* Reemplazado .auth-title con clases de Tailwind */}
                <h2 className="text-3xl sm:text-4xl font-extrabold text-indigo-600 mb-8">Registrarse</h2>
                <form onSubmit={handleRegister} className="space-y-6"> {/* Reemplazado .auth-form y añadido espacio vertical */}
                    {/* El mensaje de error ahora se maneja por useNotification */}
                    {/* {error && <p className="error-message">{error}</p>} */}

                    {/* Reemplazado .form-group con clases de Tailwind */}
                    <div>
                        {/* Reemplazado .auth-form label con clases de Tailwind */}
                        <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2 text-left">Nombre de Usuario:</label>
                        {/* Reemplazado .form-input con clases de Tailwind */}
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                            required
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2 text-left">Correo Electrónico:</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                            required
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2 text-left">Contraseña:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                            required
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2 text-left">Confirmar Contraseña:</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-800"
                            required
                            disabled={loading}
                        />
                    </div>
                    {/* Reemplazado .button .primary-button con clases de Tailwind */}
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        disabled={loading}
                    >
                        {loading ? 'Registrando...' : 'Registrarse'}
                    </button>
                </form>
                {/* Reemplazado .auth-form a con clases de Tailwind */}
                <p className="mt-6 text-gray-600 text-sm">
                    ¿Ya tienes una cuenta? <Link to="/login" className="text-indigo-600 hover:underline font-medium">Inicia Sesión</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
