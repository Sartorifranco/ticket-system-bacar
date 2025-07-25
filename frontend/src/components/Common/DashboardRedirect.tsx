// frontend/src/components/Common/DashboardRedirect.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../Layout/Layout'; // Importar Layout para el estado de carga

const DashboardRedirect: React.FC = () => {
    const { user, authLoading, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Solo proceder si la autenticación ha terminado de cargar
        if (!authLoading) {
            if (isAuthenticated && user) {
                // Usuario autenticado, redirigir según su rol
                if (user.role === 'admin') {
                    navigate('/admin-dashboard', { replace: true });
                } else if (user.role === 'agent') {
                    navigate('/agent-dashboard', { replace: true });
                } else if (user.role === 'client') {
                    navigate('/client-dashboard', { replace: true });
                } else {
                    // Rol no reconocido, redirigir al login (o a una página de error genérica)
                    console.warn('Rol de usuario no reconocido, redirigiendo al login.');
                    navigate('/login', { replace: true });
                }
            } else {
                // No autenticado, redirigir al login
                navigate('/login', { replace: true });
            }
        }
    }, [authLoading, isAuthenticated, user, navigate]); // Dependencias del efecto

    // Mostrar un estado de carga mientras se verifica la autenticación
    if (authLoading) {
        return (
            <Layout>
                <div className="flex justify-center items-center min-h-screen bg-gray-100 text-gray-700">
                    <p>Cargando sesión de usuario...</p>
                </div>
            </Layout>
        );
    }

    // Si por alguna razón llega aquí sin redirigir (lo cual no debería pasar con la lógica anterior),
    // no renderizar nada o un mensaje de fallback.
    return null;
};

export default DashboardRedirect;
