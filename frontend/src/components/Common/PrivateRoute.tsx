// frontend/src/components/Common/PrivateRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
<<<<<<< HEAD
import { useAuth } from '../../context/AuthContext';

interface PrivateRouteProps {
  // Define los roles permitidos para esta ruta. Si no se especifica, solo requiere autenticación.
  allowedRoles?: ('user' | 'agent' | 'admin')[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, authLoading, user } = useAuth();

  // Muestra un mensaje de carga mientras se verifica el estado de autenticación
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-color">
        <p className="text-primary-color text-lg">Cargando autenticación...</p>
      </div>
    );
  }

  // Si no está autenticado, redirige a la página de login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si se especifican roles permitidos y el usuario no tiene uno de esos roles,
  // redirige al dashboard general o a una página de acceso denegado.
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirige al dashboard por defecto si el rol no está permitido
    // O podrías redirigir a una página de "Acceso Denegado"
    return <Navigate to="/dashboard" replace />;
  }

  // Si está autenticado y el rol es permitido (o no se especificó un rol),
  // renderiza el contenido de la ruta anidada.
  return <Outlet />;
};

export default PrivateRoute;
=======
import { useAuth } from '../../context/AuthContext'; // Importamos el hook useAuth

interface PrivateRouteProps {
  allowedRoles: ('admin' | 'agent' | 'user')[]; // Roles permitidos para acceder a esta ruta
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles }) => {
  // Usamos el hook useAuth para obtener el estado de autenticación (incluyendo isAuthenticated)
  const { user, loading, isAuthenticated } = useAuth(); // <-- Obtenemos isAuthenticated aquí

  if (loading) {
    // Muestra un mensaje de carga con estilos para una mejor UX
    return <div style={{textAlign: 'center', padding: '50px', color: 'var(--text-color)'}}>Cargando autenticación...</div>;
  }

  // Si el usuario NO está autenticado, redirige directamente al login
  if (!isAuthenticated) { // <-- Usamos isAuthenticated para la verificación principal
    return <Navigate to="/login" replace />;
  }

  // Si el usuario está autenticado, pero su rol NO está permitido para esta ruta específica.
  // user no debería ser null en este punto si isAuthenticated es true.
  if (!user || !allowedRoles.includes(user.role)) {
    // Redirige al dashboard apropiado según el rol actual del usuario logueado.
    // Esto es para usuarios que están logueados pero intentan acceder a una ruta para la que no tienen permiso.
    if (user && user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user && user.role === 'agent') return <Navigate to="/agent" replace />;
    if (user && user.role === 'user') return <Navigate to="/client" replace />;
    
    // Si el rol es desconocido o no se puede determinar una redirección específica,
    // se le envía a la raíz que luego lo redirigirá a su dashboard por defecto o login.
    return <Navigate to="/" replace />; 
  }

  // Si el usuario está autenticado y tiene el rol permitido, renderiza las rutas hijas
  return <Outlet />;
};

export default PrivateRoute;
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
