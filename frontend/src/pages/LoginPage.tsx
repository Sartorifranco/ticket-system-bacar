import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../utils/typeGuards';
import { User } from '../types'; // Importar el tipo User

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { signIn, isAuthenticated, authLoading, user } = useAuth();
    const { addNotification } = useNotification();

    // Redirigir si ya está autenticado
    useEffect(() => {
        console.log('--- LoginPage useEffect ---');
        console.log('authLoading:', authLoading);
        console.log('isAuthenticated:', isAuthenticated);
        console.log('user:', user);

        // Si la autenticación ha terminado de cargar y el usuario está autenticado y el objeto user está disponible
        if (!authLoading && isAuthenticated && user) {
            console.log('Redirection condition met: isAuthenticated is true, authLoading is false, and user is available.');
            console.log('User role for redirection:', user.role);

            const redirectTimer = setTimeout(() => {
                if (user.role === 'admin') {
                    navigate('/admin-dashboard', { replace: true });
                } else if (user.role === 'agent') {
                    navigate('/agent-dashboard', { replace: true });
                } else if (user.role === 'client') {
                    navigate('/client-dashboard', { replace: true });
                } else {
                    console.warn('User role not recognized for redirection, navigating to /login as fallback.');
                    navigate('/login', { replace: true }); 
                }
            }, 50);

            return () => clearTimeout(redirectTimer); 
        } else if (!authLoading && !isAuthenticated) {
            console.log('Redirection condition NOT met. User not authenticated or still loading.');
        }
    }, [isAuthenticated, authLoading, navigate, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!email || !password) {
            setError('Por favor, introduce tu email y contraseña.');
            addNotification('Por favor, introduce tu email y contraseña.', 'error');
            setLoading(false);
            return;
        }

        try {
            const response = await api.post('/api/auth/login', { email, password });
            
            // MODIFICADO: Extraer el token y luego crear el objeto user a partir del resto de response.data
            const { token, ...userData } = response.data;
            const loggedInUser: User = userData as User; // Castear a User para asegurar el tipo

            await signIn(token, loggedInUser);
            addNotification('Inicio de sesión exitoso.', 'success');

        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error de inicio de sesión. Por favor, verifica tus credenciales.');
                addNotification(`Error de inicio de sesión: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado durante el inicio de sesión.');
                addNotification('Ocurrió un error inesperado durante el inicio de sesión.', 'error');
            }
            console.error('Error de inicio de sesión:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Iniciar Sesión</h2>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <strong className="font-bold">Error:</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
                        <input
                            type="email"
                            id="email"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">Contraseña:</label>
                        <input
                            type="password"
                            id="password"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md w-full transition-colors duration-200"
                        disabled={loading}
                    >
                        {loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <p className="text-center text-gray-600 mt-6">
                    ¿No tienes una cuenta? <Link to="/register" className="text-blue-600 hover:underline">Regístrate aquí</Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
