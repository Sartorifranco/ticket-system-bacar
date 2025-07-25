// frontend/src/components/Common/PrivateRoute.tsx
import React, { ReactNode } from 'react'; // Importa ReactNode
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../Layout/Layout'; // Importa el Layout

interface PrivateRouteProps {
    children: ReactNode; // Define que el componente PrivateRoute acepta children de tipo ReactNode
    requiredRoles: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRoles }) => {
    const { user, authLoading } = useAuth(); // <-- MODIFICADO: 'loading' cambiado a 'authLoading'

    if (authLoading) { // <-- MODIFICADO: Usar 'authLoading'
        // Podrías mostrar un spinner de carga aquí
        return (
            <Layout>
                <div className="flex justify-center items-center min-h-screen bg-gray-100 text-gray-700">
                    <p>Cargando autenticación...</p>
                </div>
            </Layout>
        );
    }

    // Si no hay usuario logueado, redirigir a la página de login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Si el usuario no tiene ninguno de los roles requeridos, redirigir a un dashboard por defecto o a una página de acceso denegado
    if (!requiredRoles.includes(user.role)) {
        // Dependiendo de tu lógica, podrías redirigir a diferentes dashboards
        if (user.role === 'client') {
            return <Navigate to="/client-dashboard" replace />;
        } else if (user.role === 'agent') {
            return <Navigate to="/agent-dashboard" replace />;
        } else if (user.role === 'admin') {
            return <Navigate to="/admin-dashboard" replace />;
        }
        // Fallback si el rol no coincide con ninguna ruta conocida
        return <Navigate to="/login" replace />; 
    }

    // Si el usuario está logueado y tiene el rol requerido, renderizar los children
    return <>{children}</>;
};

export default PrivateRoute;
