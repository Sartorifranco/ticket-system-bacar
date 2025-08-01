// frontend/src/components/Layout/Layout.tsx
import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell/NotificationBell'; // Asegúrate de que esta ruta sea correcta
import ToastContainer from '../Notifications/ToastContainer'; // Asegúrate de que esta ruta sea correcta

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 text-white transform ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } md:relative md:translate-x-0 transition-transform duration-200 ease-in-out`}
            >
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
                    <Link to={user?.role === 'admin' ? '/admin' : user?.role === 'client' ? '/client' : '/'} className="text-2xl font-bold">
                        Ticket System
                    </Link>
                    <button className="md:hidden text-gray-400 hover:text-white" onClick={toggleSidebar}>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <nav className="flex-1 px-2 py-4 space-y-2">
                    {user?.role === 'admin' && (
                        <>
                            <Link to="/admin" className="flex items-center px-4 py-2 text-gray-200 hover:bg-gray-700 rounded-lg">
                                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001 1h3v-3m-3 3h3v-3m-3 0a1 1 0 001 1h3v-3"></path></svg>
                                Dashboard Admin
                            </Link>
                            <Link to="/admin/tickets" className="flex items-center px-4 py-2 text-gray-200 hover:bg-gray-700 rounded-lg">
                                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M12 5a3 3 0 110 6 3 3 0 010-6zm0 6a3 3 0 110 6 3 3 0 010-6zm0 6a3 3 0 110 6 3 3 0 010-6z"></path></svg>
                                Tickets
                            </Link>
                            <Link to="/admin/users" className="flex items-center px-4 py-2 text-gray-200 hover:bg-gray-700 rounded-lg">
                                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h2a2 2 0 002-2V4a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2m0 0l3-3m-3 3v-3m0 3h3m-3 0h3"></path></svg>
                                Usuarios
                            </Link>
                            <Link to="/admin/departments" className="flex items-center px-4 py-2 text-gray-200 hover:bg-gray-700 rounded-lg">
                                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                                Departamentos
                            </Link>
                            <Link to="/admin/activity-logs" className="flex items-center px-4 py-2 text-gray-200 hover:bg-gray-700 rounded-lg">
                                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                                Registro de Actividad
                            </Link>
                            <Link to="/admin/bacar-keys" className="flex items-center px-4 py-2 text-gray-200 hover:bg-gray-700 rounded-lg">
                                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2v5a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2h6zM7 11h10"></path></svg>
                                Claves Bacar
                            </Link>
                        </>
                    )}

                    {user?.role === 'client' && (
                        <>
                            <Link to="/client" className="flex items-center px-4 py-2 text-gray-200 hover:bg-gray-700 rounded-lg">
                                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001 1h3v-3m-3 3h3v-3m-3 0a1 1 0 001 1h3v-3"></path></svg>
                                Dashboard Cliente
                            </Link>
                            <Link to="/client/tickets" className="flex items-center px-4 py-2 text-gray-200 hover:bg-gray-700 rounded-lg">
                                <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M12 5a3 3 0 110 6 3 3 0 010-6zm0 6a3 3 0 110 6 3 3 0 010-6zm0 6a3 3 0 110 6 3 3 0 010-6z"></path></svg>
                                Mis Tickets
                            </Link>
                        </>
                    )}

                    {user && (
                        <button
                            onClick={logout}
                            className="flex items-center px-4 py-2 text-gray-200 hover:bg-gray-700 rounded-lg w-full text-left"
                        >
                            <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                            Cerrar Sesión
                        </button>
                    )}
                </nav>
            </aside>

            {/* Overlay para móvil */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black opacity-50 z-40 md:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="flex items-center justify-between h-16 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 shadow-sm">
                    <button className="md:hidden text-gray-500 hover:text-gray-600" onClick={toggleSidebar}>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="flex-1"></div> {/* Espacio para centrar o alinear */}
                    <div className="flex items-center space-x-4">
                        {user && (
                            <span className="text-gray-700 text-sm font-medium hidden sm:block">
                                Hola, {user.username}! ({user.role})
                            </span>
                        )}
                        <NotificationBell /> {/* <-- Eliminado el prop 'count' */}
                        {/* Aquí podrías añadir un menú de usuario o avatar */}
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
                    {children}
                </main>
            </div>
            {/* El ToastContainer ahora usa el contexto de notificaciones, no necesita props manuales */}
            <ToastContainer toasts={[]} onRemoveToast={function (id: number | string): void {
                throw new Error('Function not implemented.');
            } } /> 
        </div>
    );
};

export default Layout;
