// frontend/src/pages/Auth/Register.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../config/axiosConfig';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { useAuth } from '../../context/AuthContext'; // Importar useAuth
import '../../index.css'; // MODIFICACIÓN CLAVE: Ruta corregida para index.css
import './Auth.css'; // Importa los estilos específicos para Auth

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { addNotification } = useAuth(); // Obtener addNotification del contexto

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      addNotification('Las contraseñas no coinciden.', 'error');
      return;
    }

    try {
      // RUTA CORREGIDA: No debe empezar con '/api'
      const response = await api.post('api/auth/register', {
        username,
        email,
        password,
      });
      addNotification('Registro exitoso. Por favor, inicia sesión.', 'success');
      navigate('/login');
    } catch (err: unknown) {
      if (isAxiosErrorTypeGuard(err)) {
        const apiError = err.response?.data as ApiResponseError;
        setError(apiError?.message || 'Error en el registro.');
        addNotification(`Error en el registro: ${apiError?.message || 'Error desconocido'}`, 'error');
      } else {
        setError('Ocurrió un error inesperado durante el registro.');
        addNotification('Ocurrió un error inesperado durante el registro.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Registrarse</h2>
        <form onSubmit={handleRegister} className="auth-form">
          {error && <p className="error-message">{error}</p>}
          <div className="form-group">
            <label htmlFor="username">Nombre de Usuario:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña:</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <button type="submit" className="button primary-button" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
        <p className="mt-4 text-text-light dark:text-text-dark">
          ¿Ya tienes una cuenta? <Link to="/login">Inicia Sesión</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

