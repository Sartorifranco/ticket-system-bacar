import React, { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext'; // Importar useNotification
import NotificationBell from '../NotificationBell/NotificationBell'; // Asegúrate de que esta ruta sea correcta

interface LayoutProps {
    children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, signOut } = useAuth();
    const { addNotification } = useNotification(); // Obtener addNotification

    const navigate = useNavigate();

    const handleSignOut = () => {
        signOut();
        addNotification('Sesión cerrada exitosamente.', 'info'); // Notificación aquí
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="bg-red-700 text-white p-4 shadow-md">
                <div className="container mx-auto flex justify-between items-center">
                    <Link to={user?.role === 'admin' ? '/admin-dashboard' : user?.role === 'agent' ? '/agent-dashboard' : '/client-dashboard'} className="text-2xl font-bold">
                        Sistema de Tickets
                    </Link>
                    <nav className="flex items-center space-x-4">
                        {user && (
                            <>
                                <NotificationBell /> {/* Campana de notificaciones */}
                                <span className="text-lg hidden md:block">Hola, {user.username}!</span>
                                <Link to="/profile" className="hover:underline">Perfil</Link>
                                <button
                                    onClick={handleSignOut}
                                    className="bg-red-800 hover:bg-red-900 text-white font-semibold py-1 px-3 rounded-md transition-colors duration-200"
                                >
                                    Cerrar Sesión
                                </button>
                            </>
                        )}
                        {!user && (
                            <>
                                <Link to="/login" className="hover:underline">Iniciar Sesión</Link>
                                <Link to="/register" className="hover:underline">Registrarse</Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>
            <main className="flex-grow">
                {children}
            </main>
            <footer className="bg-gray-800 text-white p-4 text-center mt-auto">
                <div className="container mx-auto">
                    <p>&copy; {new Date().getFullYear()} Sistema de Tickets. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
