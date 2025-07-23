// frontend/src/App.tsx
import React from 'react';
<<<<<<< HEAD
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // Importar Navigate
import { AuthProvider, useAuth } from './context/AuthContext'; 
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import AgentDashboard from './pages/AgentDashboard';
import PrivateRoute from './components/Common/PrivateRoute'; 
import TicketDetail from './pages/TicketDetail'; 
import Layout from './components/Layout/Layout'; // Importar el componente Layout

// Componente para mostrar notificaciones temporales (toast)
const GlobalNotifications: React.FC = () => {
  const { notifications } = useAuth(); 

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id} 
          className={`p-4 rounded-lg shadow-lg flex items-center justify-between text-white
            ${notification.type === 'success' ? 'bg-green-500' : ''}
            ${notification.type === 'error' ? 'bg-red-500' : ''}
            ${notification.type === 'info' ? 'bg-blue-500' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-500' : ''}
          `}
          role="alert"
        >
          <span>{notification.message}</span>
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <GlobalNotifications /> {/* Notificaciones temporales (toast) */}
        {/* Ahora, todas las rutas están envueltas por el Layout */}
        <Layout>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* Si tienes una página de registro, asegúrate de que exista */}
            {/* <Route path="/register" element={<RegisterPage />} /> */}

            {/* Redirigir la ruta raíz a login si no hay nada más específico */}
            <Route path="/" element={<Navigate to="/login" />} /> {/* Usar Navigate */}

            {/* Rutas Protegidas */}
            <Route element={<PrivateRoute />}>
              <Route path="/client-dashboard" element={<ClientDashboard />} />
              <Route path="/agent-dashboard" element={<AgentDashboard />} />
              <Route path="/tickets/:id" element={<TicketDetail />} /> 
            </Route>

            {/* Rutas Protegidas para Administradores */}
            <Route element={<PrivateRoute allowedRoles={['admin']} />}>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
            </Route>

            {/* Ruta para capturar cualquier otra URL y redirigir (opcional) */}
            <Route path="*" element={<Navigate to="/login" />} /> {/* Usar Navigate */}
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
};

export default App;
=======
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
// Importa AuthProvider y useAuth como named exports.
import { AuthProvider, useAuth } from './context/AuthContext'; 

// <--- ¡LA LÍNEA QUE FALTABA O ESTABA MAL EN APP.TSX!
import PrivateRoute from './components/Common/PrivateRoute'; // <-- ¡ASEGÚRATE QUE ESTA LÍNEA ESTÉ ASÍ!

// Páginas
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import ClientDashboard from './pages/ClientDashboard';
import ClientProfilePage from './pages/ClientProfilePage'; 
import TicketDetail from './pages/TicketDetail';
import NotFoundPage from './pages/NotFoundPage';

// Layout
import Layout from './components/Layout/Layout';

// Componente para manejar la redirección de la ruta raíz (/)
const RootRedirect: React.FC = () => {
    const { user, loading } = useAuth(); 

    if (loading) {
        return <div style={{textAlign: 'center', padding: '50px', color: 'var(--text-color)'}}>Cargando...</div>; 
    }

    if (user) {
        if (user.role === 'admin') return <Navigate to="/admin" replace />;
        if (user.role === 'agent') return <Navigate to="/agent" replace />;
        if (user.role === 'user') return <Navigate to="/client" replace />; 
    }
    return <Navigate to="/login" replace />;
};


function App() {
    return (
        <Router>
            <AuthProvider>
                <Layout>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/" element={<RootRedirect />} /> 

                        <Route element={<PrivateRoute allowedRoles={['admin']} />}>
                            <Route path="/admin" element={<AdminDashboard />} />
                        </Route>

                        <Route element={<PrivateRoute allowedRoles={['agent']} />}>
                            <Route path="/agent" element={<AgentDashboard />} />
                        </Route>
                        
                        <Route element={<PrivateRoute allowedRoles={['user']} />}>
                            <Route path="/client" element={<ClientDashboard />} />
                            <Route path="/client/profile" element={<ClientProfilePage />} /> 
                        </Route>

                        <Route element={<PrivateRoute allowedRoles={['user', 'agent', 'admin']} />}>
                            <Route path="/tickets" element={<ClientDashboard />} /> 
                            <Route path="/ticket/:id" element={<TicketDetail />} />
                        </Route>

                        <Route path="*" element={<NotFoundPage />} /> 

                    </Routes>
                </Layout>
            </AuthProvider>
        </Router>
    );
}

export default App;
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
