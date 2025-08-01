// src/pages/Admin/DepartmentsPage.tsx
import React, { useState } from 'react';
import Layout from '../../components/Layout/Layout';
import Departments from '../../components/Departments/Departments'; // El componente de lista de departamentos
import DepartmentFormModal from '../../components/Departments/DepartmentFormModal'; // El modal de formulario de departamento
import { ApiResponseError, Department } from '../../types';
import api from '../../config/axiosConfig'; // Asegúrate de que esta importación es correcta
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';

const DepartmentsPage: React.FC = () => {
    const { token } = useAuth();
    const { addNotification } = useNotification();
    const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);

    // Estado para forzar la recarga de la lista de departamentos en el componente Departments
    const [refreshDepartmentsKey, setRefreshDepartmentsKey] = useState(0);

    const handleEditDepartment = (department: Department) => {
        setCurrentDepartment(department);
        setIsDepartmentModalOpen(true);
    };

    const handleSaveDepartment = async (departmentData: Omit<Department, 'id' | 'created_at' | 'updated_at'> | Partial<Department>) => {
        try {
            if (currentDepartment) {
                await api.put(`/api/departments/${currentDepartment.id}`, departmentData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Departamento actualizado exitosamente.', 'success');
            } else {
                await api.post('/api/departments', departmentData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Departamento creado exitosamente.', 'success');
            }
            setIsDepartmentModalOpen(false);
            setRefreshDepartmentsKey(prevKey => prevKey + 1); // Forzar recarga del componente Departments
        } catch (err: unknown) {
            console.error('Error saving department:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al guardar departamento: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al guardar el departamento.', 'error');
            }
        }
    };

    // Esta función se pasa al componente Departments para que pueda notificar a la página padre que recargue
    const handleRefreshDepartments = () => {
        setRefreshDepartmentsKey(prevKey => prevKey + 1);
    };

    return (
        <Layout>
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b-2 border-blue-300 pb-2">Gestión de Departamentos</h1>

                <button
                    onClick={() => {
                        setCurrentDepartment(null);
                        setIsDepartmentModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md mb-4 transition-colors duration-200"
                >
                    Crear Nuevo Departamento
                </button>

                {/* El key fuerza al componente Departments a re-montarse cuando refreshDepartmentsKey cambia */}
                <Departments
                    key={refreshDepartmentsKey}
                    onEditDepartment={handleEditDepartment}
                    onDeleteDepartment={(id, name) => { /* La lógica de eliminación se maneja dentro de Departments.tsx */ }}
                    onRefreshDepartments={handleRefreshDepartments} // Pasar la función de recarga
                />

                {isDepartmentModalOpen && (
                    <DepartmentFormModal
                        isOpen={isDepartmentModalOpen}
                        onClose={() => setIsDepartmentModalOpen(false)}
                        onSave={handleSaveDepartment}
                        initialData={currentDepartment}
                    />
                )}
            </div>
        </Layout>
    );
};

export default DepartmentsPage;
