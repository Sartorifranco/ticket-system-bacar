// frontend/src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import api from '../config/axiosConfig';
import { User, ApiResponseError } from '../types'; // Mantenemos User y ApiResponseError
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';

// Definiciones de tipos para LoginData y RegisterData
// Si estas interfaces existen y son más complejas en types.ts,
// asegúrate de que se exporten desde allí y luego puedes eliminar estas definiciones locales.
interface LoginData {
    email: string;
    password: string;
}

interface RegisterData {
    username: string;
    email: string;
    password: string;
    role: 'client' | 'agent' | 'admin';
    department_id?: number | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean; // Cambiado de 'authLoading' a 'loading'
    error: string | null;
    login: (credentials: LoginData) => Promise<boolean>; // Cambiado de 'signIn' a 'login'
    register: (userData: RegisterData) => Promise<boolean>;
    logout: () => void; // Cambiado de 'signOut' a 'logout'
    clearError: () => void;
    updateUserContext: (updatedUserData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUserData = useCallback(async (authToken: string) => {
        try {
            const response = await api.get('/api/auth/me', {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            setUser(response.data);
            setIsAuthenticated(true);
            setError(null);
            return true;
        } catch (err: unknown) {
            console.error('Failed to fetch user data:', err);
            if (isAxiosErrorTypeGuard(err) && err.response?.status === 401) {
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
                setIsAuthenticated(false);
                setError('Tu sesión ha expirado o no es válida. Por favor, inicia sesión de nuevo.');
            } else if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al obtener datos del usuario.');
            } else {
                setError('Ocurrió un error inesperado al obtener los datos del usuario.');
            }
            return false;
        }
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            if (token) {
                await fetchUserData(token);
            }
            setLoading(false);
        };
        checkAuth();
    }, [token, fetchUserData]);

    const login = useCallback(async (credentials: LoginData) => { // Cambiado de signIn a login
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/api/auth/login', credentials);
            const { token: newToken, ...userData } = response.data;
            localStorage.setItem('token', newToken);
            setToken(newToken);
            setUser(userData);
            setIsAuthenticated(true);
            setLoading(false);
            return true;
        } catch (err: unknown) {
            setLoading(false);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error de inicio de sesión.');
            } else {
                setError('Ocurrió un error inesperado durante el inicio de sesión.');
            }
            return false;
        }
    }, []);

    const register = useCallback(async (userData: RegisterData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/api/auth/register', userData);
            const { token: newToken, ...newUserData } = response.data;
            localStorage.setItem('token', newToken);
            setToken(newToken);
            setUser(newUserData);
            setIsAuthenticated(true);
            setLoading(false);
            return true;
        } catch (err: unknown) {
            setLoading(false);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error de registro.');
            } else {
                setError('Ocurrió un error inesperado durante el registro.');
            }
            return false;
        }
    }, []);

    const logout = useCallback(() => { // Cambiado de signOut a logout
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
        setLoading(false);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const updateUserContext = useCallback((updatedUserData: Partial<User>) => {
        setUser(prevUser => prevUser ? { ...prevUser, ...updatedUserData } : null);
    }, []);


    const value = {
        user,
        token,
        isAuthenticated,
        loading,
        error,
        login,
        register,
        logout,
        clearError,
        updateUserContext
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
