// frontend/src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ApiResponseError, User } from '../types'; // Importar User type
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth(); // Ahora 'login' espera un objeto LoginData
    const { addNotification } = useNotification();
    const navigate = useNavigate();

    // Redirigir si el usuario ya está autenticado
    useEffect(() => {
        if (user) {
            if (user.role === 'admin') {
                navigate('/admin', { replace: true });
            } else if (user.role === 'client') {
                navigate('/client', { replace: true });
            } else if (user.role === 'agent') {
                navigate('/agent', { replace: true }); // Asumiendo que tendrás un dashboard para agentes
            }
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Aquí es donde se llama a 'login' con el formato correcto: un objeto 'credentials'
            const success = await login({ email, password }); 
            
            if (success) {
                addNotification('Inicio de sesión exitoso.', 'success');
                // La redirección se maneja en el useEffect del AuthContext y de esta misma página
            } else {
                // El error ya fue manejado y notificado por la función login en AuthContext
                // No necesitamos addNotification aquí de nuevo para errores de credenciales
            }
        } catch (err: unknown) {
            // Este catch solo atrapará errores que no sean manejados por la función 'login' en AuthContext
            console.error('Error inesperado en LoginPage.tsx handleSubmit:', err);
            if (err instanceof Error) {
                addNotification(`Ocurrió un error inesperado: ${err.message}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado durante el inicio de sesión.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Iniciar Sesión
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Dirección de Correo</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Dirección de Correo"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Contraseña</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            disabled={loading}
                        >
                            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                        </button>
                    </div>
                </form>
                <div className="text-sm text-center">
                    ¿No tienes una cuenta?{' '}
                    <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                        Regístrate aquí
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
