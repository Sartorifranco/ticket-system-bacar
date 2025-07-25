import api from '../config/axiosConfig';
import { User, UserRole } from '../types'; 

export interface NewUser {
    username: string;
    email: string;
    password?: string; 
    role: UserRole;
    department_id: number | null; 
}

export interface UpdateUser {
    username?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    department_id?: number | null; 
}

const userService = {
    getAllUsers: async (token: string): Promise<User[]> => {
        const response = await api.get('/api/users', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data.users || []; 
    },

    getUserById: async (token: string, id: number): Promise<User> => {
        const response = await api.get(`/api/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },

    createUser: async (token: string, user: NewUser): Promise<User> => {
        const response = await api.post('/api/users', user, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },

    updateUser: async (token: string, id: number, user: UpdateUser): Promise<User> => {
        const response = await api.put(`/api/users/${id}`, user, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },

    deleteUser: async (token: string, id: number): Promise<void> => {
        await api.delete(`/api/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },
};

export default userService;
