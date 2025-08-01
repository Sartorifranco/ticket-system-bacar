// src/components/Departments/Departments.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Department, ApiResponseError } from '../../types';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';

// Asumo que tienes un modal para el formulario de departamento
// import DepartmentFormModal from './DepartmentFormModal'; // Asegúrate de que la ruta es correcta

interface DepartmentsProps {
    // Si este componente se usa directamente en DepartmentsPage, no necesita props para onEdit/onDelete
    // Si se usa como subcomponente, estas props serían necesarias.
    // Para simplificar y revertir al estilo de UserList, lo haremos autónomo.
    onEditDepartment: (department: Department) => void;
    onDeleteDepartment: (id: number, name: string) => void;
    onRefreshDepartments: () => void; // Añadido para que DepartmentsPage pueda forzar una recarga
}

const Departments: React.FC<DepartmentsProps> = ({ onEditDepartment, onDeleteDepartment, onRefreshDepartments }) => {
    const { token } = useAuth();
    const { addNotification } = useNotification();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- NUEVO ESTADO PARA EL MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ---
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [departmentToDelete, setDepartmentToDelete] = useState<{ id: number; name: string } | null>(null);

    const fetchDepartments = useCallback(async () => {
        if (!token) {
            setLoading(false);
            addNotification('No autorizado para ver departamentos.', 'error');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await api.get<{ departments: Department[] }>('/api/departments', { headers: { Authorization: `Bearer ${token}` } });
            setDepartments(response.data.departments);
        } catch (err: unknown) {
            console.error('Error al obtener departamentos:', err);
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar departamentos.');
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

    // --- MODIFICADO: Función para abrir el modal de confirmación ---
    const handleDeleteClick = (id: number, name: string) => {
        setDepartmentToDelete({ id, name });
        setIsConfirmModalOpen(true);
    };

    // --- NUEVO: Función para confirmar y ejecutar la eliminación ---
    const confirmDeleteDepartment = async () => {
        if (!departmentToDelete || !token) return;

        setIsConfirmModalOpen(false); // Cerrar el modal de confirmación
        setLoading(true);
        setError(null);
        try {
            await api.delete(`/api/departments/${departmentToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification(`Departamento "${departmentToDelete.name}" eliminado exitosamente.`, 'success');
            fetchDepartments(); // Recargar la lista después de eliminar
            onRefreshDepartments(); // Notificar a la página padre si es necesario
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al eliminar departamento.');
                addNotification(`Error al eliminar departamento: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al eliminar el departamento.');
                addNotification('Ocurrió un error inesperado al eliminar el departamento.', 'error');
            }
            console.error('Error al eliminar departamento:', err);
        } finally {
            setLoading(false);
            setDepartmentToDelete(null); // Limpiar el departamento después de la operación
        }
    };

    if (loading) {
        return <p className="text-center text-gray-600">Cargando departamentos...</p>;
    }

    if (error) {
        return <p className="text-center text-red-500">Error: {error}</p>;
    }

    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Departamentos</h2>
            {/* El botón "Crear Nuevo Departamento" se moverá a DepartmentsPage.tsx */}

            {departments.length === 0 ? (
                <p className="text-gray-600">No hay departamentos registrados.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado En</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actualizado En</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {departments.map((dept) => (
                                <tr key={dept.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dept.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(dept.created_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(dept.updated_at).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => onEditDepartment(dept)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                            title="Editar Departamento"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg> Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(dept.id, dept.name)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Eliminar Departamento"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg> Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {isConfirmModalOpen && departmentToDelete && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Confirmar Eliminación</h3>
                        <p className="mb-6 text-gray-700">
                            ¿Estás seguro de que quieres eliminar el departamento **{departmentToDelete.name}**? Esta acción es irreversible.
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsConfirmModalOpen(false);
                                    setDepartmentToDelete(null);
                                }}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors duration-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteDepartment}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                                disabled={loading}
                            >
                                {loading ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Departments;
