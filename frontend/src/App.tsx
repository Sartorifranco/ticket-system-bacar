import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import ClientDashboard from './pages/ClientDashboard';
import PrivateRoute from './components/Common/PrivateRoute'; 
import AdminTicketPage from './pages/AdminTicketPage'; 
import Layout from './components/Layout/Layout'; // Importar Layout
import ClientProfilePage from './pages/ClientProfilePage'; 
import NotFoundPage from './pages/NotFoundPage'; 
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext'; 
import DashboardRedirect from './components/Common/DashboardRedirect'; // Importar DashboardRedirect

const App: React.FC = () => {
    return (
        <Router>
            <AuthProvider> 
                <NotificationProvider> 
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        
                        {/* Rutas Protegidas envueltas en Layout */}
                        {/* Cada PrivateRoute ahora envuelve su contenido con Layout */}
                        <Route path="/admin-dashboard" element={<PrivateRoute requiredRoles={['admin']}><Layout><AdminDashboard /></Layout></PrivateRoute>} />
                        <Route path="/agent-dashboard" element={<PrivateRoute requiredRoles={['agent']}><Layout><AgentDashboard /></Layout></PrivateRoute>} />
                        <Route path="/client-dashboard" element={<PrivateRoute requiredRoles={['client']}><Layout><ClientDashboard /></Layout></PrivateRoute>} />
                        <Route path="/profile" element={<PrivateRoute requiredRoles={['admin', 'agent', 'client']}><Layout><ClientProfilePage /></Layout></PrivateRoute>} />

                        {/* Ruta para la página de detalle del ticket (para admin/agente) */}
                        <Route path="/admin/tickets/:id" element={<PrivateRoute requiredRoles={['admin', 'agent']}><Layout><AdminTicketPage /></Layout></PrivateRoute>} />

                        {/* Ruta de inicio ahora usa DashboardRedirect, que también debería usar Layout si es un dashboard */}
                        {/* Si DashboardRedirect ya maneja su propio Layout, entonces no es necesario aquí.
                           Pero si solo redirige, y la página de destino necesita Layout, entonces la página de destino debe tenerlo.
                           Para consistencia, asumimos que todas las páginas principales usan Layout. */}
                        <Route path="/" element={<DashboardRedirect />} /> 
                        
                        {/* Ruta de 404 Not Found (ya estaba envuelta) */}
                        <Route path="*" element={<Layout><NotFoundPage /></Layout>} />
                    </Routes>
                </NotificationProvider>
            </AuthProvider>
        </Router>
    );
};

export default App;
