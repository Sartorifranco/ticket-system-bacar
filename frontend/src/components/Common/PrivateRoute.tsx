// frontend/src/components/Common/PrivateRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Ajusta la ruta si es necesario
import { UserRole } from '../../types'; // Importa UserRole

// Define las props que PrivateRoute espera
interface PrivateRouteProps {
    roles: UserRole[]; // Añade esta línea
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ roles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        // Podrías mostrar un spinner de carga aquí
        return <div className="flex justify-center items-center h-screen text-lg">Cargando autenticación...</div>;
    }

    // Si no hay usuario o el rol no está permitido, redirigir al login
    if (!user || !roles.includes(user.role)) {
        return <Navigate to="/login" replace />;
    }

    // Si el usuario está autenticado y tiene el rol permitido, renderizar el contenido anidado
    return <Outlet />;
};

export default PrivateRoute;
