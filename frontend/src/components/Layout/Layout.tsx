// frontend/src/components/Layout/Layout.tsx
<<<<<<< HEAD
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationDropdown from '../NotificationBell/NotificationDropDown'; // Importar el nuevo dropdown

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut, isAuthenticated, authLoading, unreadNotificationsCount } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false); // Nuevo estado para el dropdown

  const handleSignOut = useCallback(() => {
    signOut();
    navigate('/login');
  }, [signOut, navigate]);

  const toggleNotificationsDropdown = useCallback(() => {
    setIsNotificationsDropdownOpen(prev => !prev);
    // Asegurarse de cerrar el menú móvil si se abre el dropdown de notificaciones
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobileMenuOpen]);

  // Renderizar null o un spinner mientras se carga la autenticación para evitar flashes de contenido
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-color">
        <p className="text-primary-color text-lg">Cargando aplicación...</p>
      </div>
    );
  }

  return (
    <div className="app-layout min-h-screen flex flex-col">
      {/* Header/Navbar con fondo oscuro y texto blanco */}
      <header className="navbar bg-gray-800 text-white p-4 shadow-md flex justify-between items-center">
        <div className="navbar-brand text-xl font-bold">
          <Link to={isAuthenticated ? (user?.role === 'admin' ? '/admin-dashboard' : '/client-dashboard') : '/login'} className="text-white">
            Sistema de Tickets
          </Link>
        </div>

        {/* Botón para menú móvil */}
        <button className="md:hidden text-2xl text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          ☰
        </button>

        {/* Menú de navegación */}
        <nav className={`navbar-nav flex-col md:flex-row md:flex ${isMobileMenuOpen ? 'flex' : 'hidden'} absolute md:relative top-full left-0 w-full md:w-auto bg-gray-800 md:bg-transparent p-4 md:p-0 shadow-lg md:shadow-none items-center space-y-4 md:space-y-0 md:space-x-6 z-50`}>
          {isAuthenticated ? (
            <>
              {user?.role === 'admin' && (
                <Link to="/admin-dashboard" className="nav-link text-white hover:text-gray-300 transition-colors duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                  Admin Dashboard
                </Link>
              )}
              {user?.role === 'client' && (
                <Link to="/client-dashboard" className="nav-link text-white hover:text-gray-300 transition-colors duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                  Mi Dashboard
                </Link>
              )}
              {user?.role === 'agent' && (
                <Link to="/agent-dashboard" className="nav-link text-white hover:text-gray-300 transition-colors duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                  Dashboard Agente
                </Link>
              )}
              
              {/* Contenedor relativo para el dropdown de notificaciones */}
              {user?.role === 'admin' && (
                <div className="relative"> {/* Este div es crucial para posicionar el dropdown */}
                  <div className="relative cursor-pointer" onClick={toggleNotificationsDropdown} title="Notificaciones">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-bell text-white hover:text-gray-300 transition-colors duration-200"
                    >
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    {/* Contador de notificaciones no leídas */}
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </div>
                  {/* Renderizar el dropdown de notificaciones */}
                  <NotificationDropdown
                    isOpen={isNotificationsDropdownOpen}
                    onClose={() => setIsNotificationsDropdownOpen(false)}
                  />
                </div>
              )}

              <span className="nav-text text-white">Hola, {user?.username}</span>
              <button onClick={handleSignOut} className="button secondary-button-nav">
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link text-white hover:text-gray-300 transition-colors duration-200" onClick={() => setIsMobileMenuOpen(false)}>
                Iniciar Sesión
              </Link>
              <Link to="/register" className="button primary-button-nav" onClick={() => setIsMobileMenuOpen(false)}>
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="content flex-grow p-4 bg-background-color">{children}</main>
=======
import React, { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import './Layout.css'; 

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout"> 
      <header className="app-header"> 
        <div className="header-container"> 
          <Link
            to={user ? (user.role === 'admin' ? '/admin' : user.role === 'agent' ? '/agent' : '/client') : '/'}
            className="header-brand" 
          >
            Sistema de Tickets
          </Link>
          <nav>
            {user ? (
              <ul className="header-nav"> 
                <li className="nav-item">
                  <span className="nav-user">Bienvenido, {user.username} ({user.role})</span> 
                </li>
                {user.role === 'admin' && ( 
                    <>
                        <li className="nav-item">
                            <Link to="/admin/users" className="nav-link">Usuarios</Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/admin/departments" className="nav-link">Departamentos</Link>
                        </li>
                    </>
                )}
                {user.role === 'agent' && ( 
                    <>
                        <li className="nav-item">
                            <Link to="/agent/tickets" className="nav-link">Tickets Asignados</Link>
                        </li>
                    </>
                )}
                {user.role === 'user' && ( 
                    <>
                        <li className="nav-item">
                            <Link to="/client" className="nav-link">Mi Panel</Link> 
                        </li>
                        <li className="nav-item">
                            <Link to="/client/profile" className="nav-link">Mi Perfil</Link> 
                        </li>
                        <li className="nav-item">
                            <Link to="/tickets" className="nav-link">Mis Tickets</Link> 
                        </li>
                    </>
                )}
                <li className="nav-item">
                  <button onClick={logout} className="logout-button"> 
                    Cerrar Sesión
                  </button>
                </li>
              </ul>
            ) : (
              <ul className="header-nav">
                <li className="nav-item">
                  <Link to="/login" className="nav-link">Iniciar Sesión</Link>
                </li>
                <li className="nav-item">
                  <Link to="/register" className="nav-link">Registrarse</Link> 
                </li>
              </ul>
            )}
          </nav>
        </div>
      </header>

      <main className="app-main-content"> 
        {children}
      </main>

      <footer className="app-footer"> 
        &copy; {new Date().getFullYear()} Sistema de Tickets. Todos los derechos reservados.
      </footer>
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
    </div>
  );
};

<<<<<<< HEAD
export default Layout;
=======
export default Layout;
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
