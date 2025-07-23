// frontend/src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
<<<<<<< HEAD
import { useNavigate, Link } from 'react-router-dom';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../utils/typeGuards';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, isAuthenticated, authLoading, user, addNotification } = useAuth(); 

  // Redirigir si ya está autenticado
  useEffect(() => {
    console.log('--- LoginPage useEffect ---');
    console.log('authLoading:', authLoading);
    console.log('isAuthenticated:', isAuthenticated);
    console.log('user:', user); // Ver el objeto user completo

    if (!authLoading && isAuthenticated) {
      console.log('Redirection condition met: isAuthenticated is true and authLoading is false.');
      console.log('User role for redirection:', user?.role);

      const redirectTimer = setTimeout(() => {
        if (user?.role === 'admin') {
          navigate('/admin-dashboard');
        } else if (user?.role === 'agent') {
          navigate('/agent-dashboard');
        } else if (user?.role === 'user') {
          navigate('/client-dashboard');
        } else {
          console.warn('User role not recognized for redirection, navigating to /dashboard as fallback.');
          navigate('/dashboard'); 
        }
      }, 100); 

      return () => clearTimeout(redirectTimer); 
    } else {
      console.log('Redirection condition NOT met.');
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
      const { token, user: loggedInUser } = response.data; 

      await signIn(token, loggedInUser);

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
    <div className="min-h-screen flex items-center justify-center bg-background-color p-4">
      <div className="bg-card-background p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-primary-color mb-6 text-center">Iniciar Sesión</h2>

        {error && (
          <div className="error-message p-3 mb-4 rounded-md text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group mb-4">
            <label htmlFor="email" className="form-label">Email:</label>
            <input
              type="email"
              id="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="form-group mb-6">
            <label htmlFor="password" className="form-label">Contraseña:</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button
            type="submit"
            className="button primary-button w-full py-3 text-lg"
            disabled={loading}
          >
            {loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="text-center text-text-light dark:text-text-dark mt-6">
          ¿No tienes una cuenta? <Link to="/register" className="text-primary-color hover:underline">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
=======
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Importamos el hook useAuth
import '../index.css'; // Asegúrate de importar tus estilos globales
import './LoginPage.css'; // Estilos específicos para la página de login

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    // Usamos useAuth para acceder al user y a la función login
    const { login, user, isAuthenticated } = useAuth(); // Obtén el usuario y el estado de autenticación
    const navigate = useNavigate();

    // Redirigir si el usuario YA ESTÁ logueado.
    // Este useEffect se ejecuta cada vez que 'isAuthenticated' o 'user.role' cambian.
    // Si 'user' se setea después de un login exitoso, este efecto se activará y redirigirá.
    useEffect(() => {
        if (isAuthenticated && user) { // Solo redirigir si el usuario está autenticado y tenemos sus datos
            if (user.role === 'admin') {
                navigate('/admin');
            } else if (user.role === 'agent') {
                navigate('/agent');
            } else if (user.role === 'user') {
                navigate('/client');
            } else {
                console.warn('LoginPage: Rol de usuario no reconocido en useEffect para redirección:', user.role);
                navigate('/'); // Fallback para roles no esperados
            }
        }
    }, [isAuthenticated, user, navigate]); // Dependencias: isAuthenticated, user y navigate

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Previene el comportamiento por defecto del formulario (recargar la página)
        
        // Si ya hay una solicitud en curso, o el usuario ya está logueado, no hacer nada.
        // Esto previene múltiples submisiones.
        if (loading || isAuthenticated) { // Si ya está cargando o ya autenticado, salimos
            return;
        }

        setLoading(true); // Activa el estado de carga local
        setMessage(''); // Limpia mensajes anteriores
        setIsError(false);

        try {
            // Llama a la función login del AuthContext.
            // Esta función ya maneja la lógica de API, almacenamiento, obtención de perfil y redirección.
            await login(email, password);
            // Si la promesa de login se resuelve, la redirección ya ocurrió en AuthContext.
            // No necesitamos más lógica de redirección aquí.

        } catch (err: any) { // Capturamos el error que AuthContext.login puede lanzar
            // Mostramos el mensaje de error en la UI del formulario de login.
            if (err instanceof Error) {
                setMessage(err.message);
            } else {
                setMessage('Error desconocido al iniciar sesión.');
            }
            setIsError(true);
        } finally {
            setLoading(false); // Desactiva el estado de carga local
            // No es necesario limpiar los campos de email/password aquí si la redirección es exitosa.
            // Si falla, se quedan para que el usuario pueda corregirlos.
        }
    };

    return (
        <div className="login-page-container">
            <div className="login-card">
                <h2>Iniciar Sesión</h2>
                {/* Muestra mensajes de error o éxito */}
                {message && <p className={isError ? 'error-message' : 'success-message'}>{message}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Correo Electrónico:</label>
                        <input
                            type="email"
                            id="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading} // Deshabilita el input mientras carga
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Contraseña:</label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading} // Deshabilita el input mientras carga
                        />
                    </div>
                    <button type="submit" className="button primary-button" disabled={loading}>
                        {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                    </button>
                </form>
                <p className="register-link-text">
                    ¿No tienes una cuenta? <Link to="/register" className="register-link">Regístrate aquí</Link>
                </p>
            </div>
        </div>
    );
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
};

export default LoginPage;
