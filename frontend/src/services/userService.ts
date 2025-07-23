// frontend/src/services/userService.ts
import api from '../config/axiosConfig';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'agent' | 'client';
  created_at: string;
  updated_at: string;
}

export interface NewUser {
  username: string;
  email: string;
  password?: string;
  role: 'admin' | 'agent' | 'client';
}

const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await api.get<{ success: boolean; count: number; users: User[] }>('/api/users'); // <-- CAMBIO: /api/users
    return response.data.users;
  },

  getUserById: async (id: number): Promise<User> => {
    const response = await api.get<{ success: boolean; user: User }>(`/api/users/${id}`); // <-- CAMBIO: /api/users/:id
    return response.data.user;
  },

  createUser: async (userData: NewUser): Promise<User> => {
    const response = await api.post<{ success: boolean; message: string; user: User }>('/api/users', userData); // <-- CAMBIO: /api/users
    return response.data.user;
  },

  updateUser: async (id: number, userData: Partial<NewUser>): Promise<User> => {
    const response = await api.put<{ success: boolean; message: string; user: User }>(`/api/users/${id}`, userData); // <-- CAMBIO: /api/users/:id
    return response.data.user;
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete<{ success: boolean; message: string }>(`/api/users/${id}`); // <-- CAMBIO: /api/users/:id
  }
};

export default userService;