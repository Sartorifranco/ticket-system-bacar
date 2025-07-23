// frontend/src/context/AuthContext.tsx
<<<<<<< HEAD
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import api from '../config/axiosConfig';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards'; 
import { Notification as NotificationType } from '../types'; 

// Nueva interfaz para las notificaciones temporales (toast)
interface ToastNotification {
  id: string; 
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

// Definir la forma del contexto de autenticación
interface AuthContextType {
  token: string | null;
  user: any | null; 
  isAuthenticated: boolean;
  authLoading: boolean;
  signIn: (token: string, user: any) => Promise<void>; 
  signOut: () => void; 
  addNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  notifications: ToastNotification[]; 
  unreadNotificationsCount: number; 
  fetchUnreadNotificationsCount: (currentToken?: string | null) => Promise<void>; 
  markNotificationAsRead: (notificationId: number) => Promise<void>;
}

// Crear el contexto con valores por defecto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Proveedor de autenticación
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicializar token y user desde localStorage de forma segura
  const getInitialState = useCallback(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    let parsedUser = null;

    console.log('[AuthContext - InitialState] Raw storedUser:', storedUser); // DEBUG: Raw value from localStorage

    if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
      try {
        parsedUser = JSON.parse(storedUser);
        console.log('[AuthContext - InitialState] Successfully parsed user:', parsedUser); // DEBUG: Parsed user object
      } catch (e) {
        console.error("Error parsing stored user data from localStorage during initial state setup:", e);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    } else {
      console.log('[AuthContext - InitialState] storedUser is null, undefined, or "null"/"undefined" string.');
    }
    
    return {
      token: storedToken,
      user: parsedUser,
      isAuthenticated: !!storedToken && !!parsedUser,
    };
  }, []);

  const initialState = getInitialState();

  const [token, setToken] = useState<string | null>(initialState.token);
  const [user, setUser] = useState<any | null>(initialState.user);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialState.isAuthenticated);
  const [authLoading, setAuthLoading] = useState<boolean>(true); 
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Función para añadir notificaciones a la UI (tipo toast)
  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    const id = crypto.randomUUID(); 
    const newNotification: ToastNotification = { 
      id: id, 
      message: message,
      type: type, 
    };
    setNotifications((prev) => [...prev, newNotification]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000); 
  }, []); 

  // Función para cerrar sesión
  const signOut = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false); 
    setUnreadNotificationsCount(0); 
    addNotification('Has cerrado sesión.', 'info');
  }, [addNotification]);

  // Fetch del contador de notificaciones no leídas
  const fetchUnreadNotificationsCount = useCallback(async (currentToken?: string | null) => {
    const tokenToUse = currentToken || token; 

    console.log('[AuthContext] fetchUnreadNotificationsCount - Token:', tokenToUse);

    if (!tokenToUse) { 
      setUnreadNotificationsCount(0);
      return;
    }
    try {
      const response = await api.get('/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${tokenToUse}` }, 
      });
      console.log('[AuthContext] Unread notifications count response:', response.data); // DEBUG: Response data
      setUnreadNotificationsCount(response.data.unreadCount); // Asegúrate que sea 'unreadCount'
    } catch (err: unknown) {
      console.error('Error fetching unread notifications count:', err);
      if (isAxiosErrorTypeGuard(err) && err.response?.status === 401) {
        signOut(); 
      }
    }
  }, [token, signOut]); 


  // Función para iniciar sesión
  const signIn = useCallback(async (newToken: string, newUser: any) => {
    console.log('[AuthContext - signIn] New token received:', newToken); // DEBUG: New token
    console.log('[AuthContext - signIn] New user received:', newUser); // DEBUG: New user object

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser)); // Asegurarse de que newUser sea un objeto JSON
    
    // Actualizar estados inmediatamente después de guardar en localStorage
    setToken(newToken); 
    setUser(newUser); 
    setIsAuthenticated(true); 

    addNotification('Has iniciado sesión correctamente.', 'success');
    await fetchUnreadNotificationsCount(newToken); 
  }, [addNotification, fetchUnreadNotificationsCount]); 


  // Marcar notificación como leída
  const markNotificationAsRead = useCallback(async (notificationId: number) => {
    if (!token) return;
    try {
      await api.put(`/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchUnreadNotificationsCount(); 
    } catch (err: unknown) {
      console.error('Error marking notification as read:', err);
    }
  }, [token, fetchUnreadNotificationsCount]);


  // EFECTO PRINCIPAL PARA MANEJAR EL ESTADO DE CARGA Y LA CARGA INICIAL DE NOTIFICACIONES
  useEffect(() => {
    setAuthLoading(false); // Siempre termina de cargar después de la verificación inicial

    // Si hay un token y usuario válidos al inicio, ya se habrá llamado a fetchUnreadNotificationsCount
    // desde getInitialState. Esto evita llamadas duplicadas.
  }, []); 


  // Valor del contexto memoizado para evitar renders innecesarios
  const contextValue = useMemo(
    () => ({
      token,
      user,
      isAuthenticated,
      authLoading,
      signIn,
      signOut,
      addNotification,
      notifications, 
      unreadNotificationsCount,
      fetchUnreadNotificationsCount,
      markNotificationAsRead,
    }),
    [
      token,
      user,
      isAuthenticated,
      authLoading,
      signIn,
      signOut,
      addNotification,
      notifications,
      unreadNotificationsCount,
      fetchUnreadNotificationsCount,
      markNotificationAsRead,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
=======
import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axiosConfig';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';

// Interfaz para la estructura de la respuesta de error de la API
interface ErrorResponseData {
    message?: string;
}

// Interfaz para el objeto de usuario que se guarda en el contexto
export interface User {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'agent' | 'user'; // Roles disponibles: 'admin', 'agent', 'user' (cliente)
}

// Interfaz para el tipo de valor del contexto de autenticación
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean; // Propiedad clave para verificar si el usuario está autenticado
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

// Creación del contexto con un valor por defecto UNDEFINED para TypeScript
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props para el AuthProvider
interface AuthProviderProps {
    children: ReactNode;
}

// Componente proveedor de autenticación
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // isAuthenticated se deriva del estado del usuario
    const isAuthenticated = !!user;

    // Función memorizada para establecer el token en los headers de Axios
    const setAuthToken = useCallback((token: string | null) => {
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete api.defaults.headers.common['Authorization'];
        }
    }, []);

    // Efecto para cargar el usuario desde el localStorage al iniciar la aplicación
    // Se ejecuta una vez al montar el componente.
    useEffect(() => {
        const loadUserFromToken = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                setAuthToken(token); // Configura el token en los headers de Axios
                try {
                    // Llama a la API para obtener el perfil del usuario validando el token
                    const response = await api.get('/api/auth/me');
                    const userData = response.data.user;

                    // Si los datos son válidos, establece el usuario en el estado
                    if (userData && userData.id && userData.username && userData.email && userData.role) {
                        setUser(userData);
                    } else {
                        console.error('Error: Datos de usuario incompletos o inesperados al obtener perfil en el useEffect.');
                        localStorage.removeItem('token');
                        setUser(null);
                        setAuthToken(null);
                    }
                } catch (error: unknown) {
                    if (isAxiosErrorTypeGuard(error)) {
                        const apiError = error.response?.data as ErrorResponseData;
                        console.error('Error al validar token (useEffect):', apiError?.message || error.message);
                    } else {
                        console.error('Error desconocido al validar token (useEffect):', error);
                    }
                    localStorage.removeItem('token'); // Limpia el token si es inválido o expirado
                    setUser(null);
                    setAuthToken(null);
                }
            }
            setLoading(false); // La carga inicial ha terminado
        };

        loadUserFromToken();
    }, [setAuthToken]); // setAuthToken es una dependencia de useCallback

    // Función memorizada para iniciar sesión
    const login = useCallback(async (email: string, password: string) => {
        // Limpiar cualquier estado anterior antes de un nuevo intento de login
        localStorage.removeItem('token');
        setAuthToken(null);
        setUser(null);
        setLoading(true);

        try {
            // Envía credenciales al endpoint de login
            const response = await api.post('/api/auth/login', { email, password });
            const token = response.data.token;

            localStorage.setItem('token', token); // Guarda el nuevo token
            setAuthToken(token); // Configura el token en Axios

            // Vuelve a obtener los datos completos del usuario con el nuevo token
            const userResponse = await api.get('/api/auth/me');
            const userData = userResponse.data.user;

            if (userData && userData.id && userData.username && userData.email && userData.role) {
                setUser(userData); // Guarda los datos del usuario en el estado

                // Redireccionamiento según el rol
                if (userData.role === 'admin') {
                    navigate('/admin');
                } else if (userData.role === 'agent') {
                    navigate('/agent');
                } else if (userData.role === 'user') {
                    navigate('/client');
                } else {
                    console.warn('Rol de usuario no reconocido:', userData.role);
                    navigate('/');
                }
            } else {
                console.error('Error: Datos de usuario incompletos o inesperados después del login exitoso.');
                localStorage.removeItem('token');
                setUser(null);
                setAuthToken(null);
                throw new Error('No se pudieron obtener los datos completos del usuario.');
            }

        } catch (error: unknown) {
            localStorage.removeItem('token'); // Limpia el token si el login falla
            setUser(null);
            setAuthToken(null);
            if (isAxiosErrorTypeGuard(error)) {
                const apiError = error.response?.data as ErrorResponseData;
                console.error('Error al iniciar sesión:', apiError?.message || error.message);
                console.log('Contenido de error.response?.data (Login):', error.response?.data);
                throw new Error(apiError?.message || 'Error de autenticación. Credenciales inválidas.');
            } else {
                console.error('Error desconocido al iniciar sesión:', error);
                throw new Error('Ocurrió un error inesperado durante el login.');
            }
        } finally {
            setLoading(false); // Desactiva el estado de carga
        }
    }, [navigate, setAuthToken]); // Dependencias de useCallback

    // Función memorizada para cerrar sesión
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setAuthToken(null);
        setUser(null);
        navigate('/login'); // Redirige al login después de cerrar sesión
    }, [navigate, setAuthToken]); // Dependencias de useCallback

    // Valor del contexto que se provee a los componentes hijos
    const contextValue: AuthContextType = {
        user,
        isAuthenticated, // Se expone isAuthenticated
        loading,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// Exporta el contexto por defecto (opcional, pero usado si algún componente lo consume directamente)
export default AuthContext;

// Exporta un hook personalizado para consumir el contexto de forma más limpia
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
