// frontend/src/pages/AdminDepartmentsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout/Layout';
import DepartmentFormModal from '../components/Departments/DepartmentFormModal'; // Asume que tienes este componente
import { Department, ApiResponseError } from '../types';
import { isAxiosErrorTypeGuard } from '../utils/typeGuards';

const AdminDepartmentsPage: React.FC = () => {
    const { token } = useAuth();
    const { addNotification } = useNotification();

    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);

    const fetchDepartments = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const response = await api.get<{ success: boolean; data: Department[]; count: number }>('/api/departments', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setDepartments(Array.isArray(response.data.data) ? response.data.data : []);
        } catch (err: unknown) {
            console.error('Error fetching departments:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar los departamentos.');
                addNotification(`Error al cargar departamentos: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar los departamentos.');
                addNotification('Ocurrió un error inesperado al cargar los departamentos.', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    const handleCreateDepartment = () => {
        setCurrentDepartment(null); // Para crear, no hay datos iniciales
        setIsModalOpen(true);
    };

    const handleEditDepartment = (department: Department) => {
        setCurrentDepartment(department); // Para editar, pasamos los datos del departamento
        setIsModalOpen(true);
    };

    const handleDeleteDepartment = async (id: number) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este departamento?')) {
            return;
        }
        if (!token) return;
        setLoading(true);
        try {
            await api.delete(`/api/departments/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Departamento eliminado exitosamente.', 'success');
            fetchDepartments(); // Recargar la lista
        } catch (err: unknown) {
            console.error('Error deleting department:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al eliminar departamento: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al eliminar el departamento.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDepartment = async (departmentData: Partial<Department>) => {
        if (!token) return;
        setLoading(true);
        try {
            if (currentDepartment) { // Editando
                await api.put(`/api/departments/${currentDepartment.id}`, departmentData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Departamento actualizado exitosamente.', 'success');
            } else { // Creando
                await api.post('/api/departments', departmentData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Departamento creado exitosamente.', 'success');
            }
            setIsModalOpen(false);
            fetchDepartments(); // Recargar la lista
        } catch (err: unknown) {
            console.error('Error saving department:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al guardar departamento: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al guardar el departamento.', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Layout><div className="flex justify-center items-center h-full"><span className="text-lg">Cargando departamentos...</span></div></Layout>;
    }

    if (error) {
        return <Layout><div className="text-red-500 text-center p-4">Error: {error}</div></Layout>;
    }

    return (
        <Layout>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Gestión de Departamentos</h1>
                    <button
                        onClick={handleCreateDepartment}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                    >
                        Crear Nuevo Departamento
                    </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
                    {departments.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">No hay departamentos registrados.</p>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Creación</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {departments.map((dept) => (
                                    <tr key={dept.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{dept.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{dept.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{new Date(dept.created_at).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleEditDepartment(dept)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-3"
                                                title="Editar Departamento"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDeleteDepartment(dept.id)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Eliminar Departamento"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <DepartmentFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveDepartment}
                    initialData={currentDepartment}
                />
            )}
        </Layout>
    );
};

export default AdminDepartmentsPage;
