// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/Common/PrivateRoute';

// Páginas comunes
import HomePage from './pages/Home';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

// Páginas de Administrador
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersPage from './pages/AdminUserPage'; // Asegúrate que esta ruta y nombre de archivo sean correctos
import AdminTicketsListPage from './pages/AdminTicketsListPage';
import AdminTicketDetailPage from './pages/AdminTicketDetailPage';
import AdminDepartmentsPage from './pages/AdminDepartmentsPage';
import AdminActivityLogsPage from './pages/AdminActivityLogsPage';
import AdminBacarKeysPage from './pages/AdminBacarKeysPage';

// Páginas de Cliente
import ClientDashboard from './pages/ClientDashboard';
import ClientMyTicketsPage from './pages/ClientMyTicketsPage';
import ClientTicketDetailPage from './pages/ClientTicketDetailPage';

const App: React.FC = () => {
    return (
        <Router>
            <AuthProvider>
                <NotificationProvider>
                    <Routes>
                        {/* Redirigir la ruta raíz '/' directamente a '/login' */}
                        <Route path="/" element={<Navigate to="/login" replace />} />

                        {/* Rutas Públicas */}
                        <Route path="/home" element={<HomePage />} /> {/* Mantener HomePage si se usa explícitamente */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        {/* Rutas Privadas para Administrador */}
                        <Route path="/admin" element={<PrivateRoute roles={['admin']} />}>
                            <Route index element={<AdminDashboard />} /> {/* El dashboard de admin es /admin */}
                            <Route path="users" element={<AdminUsersPage />} />
                            <Route path="tickets" element={<AdminTicketsListPage />} />
                            <Route path="tickets/:id" element={<AdminTicketDetailPage />} />
                            <Route path="departments" element={<AdminDepartmentsPage />} />
                            <Route path="activity-logs" element={<AdminActivityLogsPage />} />
                            <Route path="bacar-keys" element={<AdminBacarKeysPage />} />
                        </Route>

                        {/* Rutas Privadas para Cliente */}
                        <Route path="/client" element={<PrivateRoute roles={['client']} />}>
                            <Route index element={<ClientDashboard />} />
                            <Route path="tickets" element={<ClientMyTicketsPage />} />
                            <Route path="tickets/:id" element={<ClientTicketDetailPage />} />
                        </Route>

                        {/* Ruta de Fallback */}
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </NotificationProvider>
            </AuthProvider>
        </Router>
    );
};

export default App;
