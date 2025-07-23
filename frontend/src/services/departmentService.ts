// frontend/src/services/departmentService.ts
import api from '../config/axiosConfig';

export interface Department {
  id: number;
  name: string;
  description: string;
}

export interface NewDepartment {
  name: string;
  description: string;
}

const departmentService = {
  getAllDepartments: async (): Promise<Department[]> => {
    const response = await api.get<{ success: boolean; count: number; departments: Department[] }>('/api/departments'); // <-- CAMBIO: /api/departments
    return response.data.departments;
  },

  getDepartmentById: async (id: number): Promise<Department> => {
    const response = await api.get<{ success: boolean; department: Department }>(`/api/departments/${id}`); // <-- CAMBIO: /api/departments/:id
    return response.data.department;
  },

  createDepartment: async (departmentData: NewDepartment): Promise<Department> => {
    const response = await api.post<{ success: boolean; message: string; department: Department }>('/api/departments', departmentData); // <-- CAMBIO: /api/departments
    return response.data.department;
  },

  updateDepartment: async (id: number, departmentData: NewDepartment): Promise<Department> => {
    const response = await api.put<{ success: boolean; message: string; department: Department }>(`/api/departments/${id}`, departmentData); // <-- CAMBIO: /api/departments/:id
    return response.data.department;
  },

  deleteDepartment: async (id: number): Promise<void> => {
    await api.delete<{ success: boolean; message: string }>(`/api/departments/${id}`); // <-- CAMBIO: /api/departments/:id
  }
};

export default departmentService;