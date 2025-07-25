// frontend/src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../config/axiosConfig';
import { User } from '../types';

// Definir la interfaz para el estado de autenticación
interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    authLoading: boolean;
}

// Definir la interfaz para el contexto de autenticación
interface AuthContextType extends AuthState {
    signIn: (token: string, user: User) => void;
    signOut: () => void;
    updateUser: (updatedUserData: Partial<User>) => void;
    fetchUnreadNotificationsCount: () => Promise<void>; 
    unreadNotificationsCount: number;
}

// Crear el contexto de autenticación
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Proveedor de autenticación
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        token: localStorage.getItem('token'), 
        isAuthenticated: !!localStorage.getItem('token'),
        authLoading: true, // Iniciar en true para la carga inicial
    });
    const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

    // Efecto para la carga inicial y revalidación del token
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user'); // Recuperar la cadena del usuario

        // Verificar explícitamente que storedUser no sea null ni una cadena vacía
        if (storedToken && storedUser && storedUser !== 'undefined' && storedUser !== 'null') { 
            try {
                const parsedUser: User = JSON.parse(storedUser); // Intentar parsear
                setState(prevState => ({
                    ...prevState,
                    user: parsedUser,
                    isAuthenticated: true,
                    token: storedToken,
                    authLoading: false,
                }));
            } catch (e) {
                console.error("Error parsing user from localStorage:", e);
                // Si hay un error al parsear, limpiar localStorage para evitar bucles
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setState({ user: null, token: null, isAuthenticated: false, authLoading: false });
            }
        } else {
            // Si no hay token, o no hay usuario válido en localStorage, no estamos autenticados
            // y terminamos la carga.
            localStorage.removeItem('token'); // Asegurarse de que no haya un token "huérfano"
            localStorage.removeItem('user'); // Asegurarse de que no haya un usuario "huérfano"
            setState(prevState => ({ ...prevState, authLoading: false }));
        }
    }, []); // Dependencias vacías para que se ejecute solo una vez al montar

    // Función para manejar el login (renombrada a signIn)
    const signIn = useCallback((token: string, user: User) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user)); // Guardar el objeto user completo
        setState({ user, token, isAuthenticated: true, authLoading: false });
    }, []);

    // Función para manejar el logout (renombrada a signOut)
    const signOut = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user'); // Eliminar el objeto user
        setState({ user: null, token: null, isAuthenticated: false, authLoading: false });
    }, []);

    // Función para actualizar los datos del usuario en el estado del contexto
    const updateUser = useCallback((updatedUserData: Partial<User>) => {
        setState(prevState => {
            const updatedUser = prevState.user ? { ...prevState.user, ...updatedUserData } : null;
            if (updatedUser) {
                localStorage.setItem('user', JSON.stringify(updatedUser)); // Actualizar en localStorage
            }
            return {
                ...prevState,
                user: updatedUser,
            };
        });
    }, []);

    // Función para obtener el conteo de notificaciones no leídas
    const fetchUnreadNotificationsCount = useCallback(async () => {
        if (!state.token || !state.user) {
            setUnreadNotificationsCount(0);
            return;
        }
        try {
            const response = await api.get<{ count: number }>('/api/notifications/unread/count', {
                headers: { Authorization: `Bearer ${state.token}` },
            });
            setUnreadNotificationsCount(response.data.count);
        } catch (error) {
            console.error('Error fetching unread notifications count:', error);
            setUnreadNotificationsCount(0);
        }
    }, [state.token, state.user]); 

    // Efecto para cargar el conteo de notificaciones no leídas cuando el usuario o el token cambian
    useEffect(() => {
        if (state.isAuthenticated && state.token && state.user) {
            fetchUnreadNotificationsCount();
        }
    }, [state.isAuthenticated, state.token, state.user, fetchUnreadNotificationsCount]); 

    return (
        <AuthContext.Provider 
            value={{ 
                ...state, 
                signIn, 
                signOut, 
                updateUser, 
                fetchUnreadNotificationsCount, 
                unreadNotificationsCount,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
