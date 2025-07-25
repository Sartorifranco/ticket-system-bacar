import api from '../config/axiosConfig';

export interface Department {
    id: number;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface NewDepartment {
    name: string;
    description: string;
}

const departmentService = {
    getAllDepartments: async (token: string): Promise<Department[]> => {
        const response = await api.get('/api/departments', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data.departments || []; 
    },

    createDepartment: async (token: string, department: NewDepartment): Promise<Department> => {
        const response = await api.post('/api/departments', department, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },

    updateDepartment: async (token: string, id: number, department: Partial<NewDepartment>): Promise<Department> => {
        const response = await api.put(`/api/departments/${id}`, department, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },

    deleteDepartment: async (token: string, id: number): Promise<void> => {
        await api.delete(`/api/departments/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },
};

export default departmentService;
