// frontend/src/components/Departments/Departments.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext'; 
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification
import { Department } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import DepartmentEditModal from './DepartmentEditModal'; 

interface DepartmentsProps {
    onEditDepartment: (department: Department | null) => void;
}

const Departments: React.FC<DepartmentsProps> = ({ onEditDepartment }) => { 
    const { token, signOut } = useAuth(); // <-- MODIFICADO: Solo token y signOut de useAuth
    const { addNotification } = useNotification(); // <-- AÑADIDO: addNotification de useNotification
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateDepartmentModalOpen, setIsCreateDepartmentModalOpen] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

    const fetchDepartments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            const response = await api.get('/api/departments', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setDepartments(response.data.departments || []);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar departamentos.');
                addNotification(`Error al cargar departamentos: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al cargar los departamentos.');
            }
            console.error('Error fetching departments:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification, signOut]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    const handleCreateDepartment = () => {
        setSelectedDepartment(null); 
        setIsCreateDepartmentModalOpen(true);
    };

    const handleEditDepartmentClick = (department: Department) => {
        onEditDepartment(department); 
    };

    const handleDepartmentUpdatedOrCreated = () => {
        setIsCreateDepartmentModalOpen(false); 
        fetchDepartments(); 
    };

    const handleDeleteDepartment = async (departmentId: number) => {
        const confirmed = window.confirm('¿Estás seguro de que quieres eliminar este departamento?');
        if (!confirmed) return;

        setLoading(true);
        setError(null);
        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }
            await api.delete(`/api/departments/${departmentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Departamento eliminado exitosamente.', 'success');
            fetchDepartments(); 
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al eliminar departamento.');
                addNotification(`Error al eliminar departamento: ${apiError?.message || 'Error desconocido'}`, 'error');
                if (err.response?.status === 401) signOut();
            } else {
                setError('Ocurrió un error inesperado al eliminar el departamento.');
            }
            console.error('Error deleting department:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-message">🔄 Cargando departamentos...</div>
        );
    }

    if (error) {
        return (
            <div className="error-message text-center p-4">
                <p>{error}</p>
                <button onClick={fetchDepartments} className="button primary-button mt-2">Reintentar</button>
            </div>
        );
    }

    return (
        <div className="departments-management">
            <h2 className="text-2xl font-bold text-primary-color mb-4 text-center">Gestión de Departamentos</h2>
            <p className="info-text text-center mb-6">Administra los departamentos del sistema.</p>

            <div className="flex justify-end mb-4">
                <button onClick={handleCreateDepartment} className="button primary-button">
                    Crear Nuevo Departamento
                </button>
            </div>

            {departments.length > 0 ? (
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre del Departamento</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departments.map((department) => (
                                <tr key={department.id}>
                                    <td>{department.id}</td>
                                    <td>{department.name}</td>
                                    <td>
                                        <button
                                            onClick={() => handleEditDepartmentClick(department)}
                                            className="button small-button secondary-button mr-2"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteDepartment(department.id)}
                                            className="button small-button delete-button"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="info-text">No hay departamentos registrados.</p>
            )}

            {/* Modal de Creación/Edición de Departamento (si lo manejas aquí) */}
            {isCreateDepartmentModalOpen && (
                <DepartmentEditModal
                    isOpen={isCreateDepartmentModalOpen}
                    onClose={() => setIsCreateDepartmentModalOpen(false)}
                    department={null} 
                    onDepartmentUpdated={handleDepartmentUpdatedOrCreated}
                    token={token} 
                />
            )}
        </div>
    );
};

export default Departments;
