import React, { useState, useEffect, useCallback } from 'react';
import departmentService, { Department } from '../../services/departmentService';
// Eliminadas las importaciones de react-icons/fa
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

const DepartmentList: React.FC = () => {
    const { token } = useAuth(); // <-- MODIFICADO: Solo token de useAuth
    const { addNotification } = useNotification(); // <-- AÑADIDO: addNotification de useNotification
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [newDepartmentDescription, setNewDepartmentDescription] = useState('');

    const fetchDepartments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('No autorizado para ver departamentos.', 'error');
                setLoading(false);
                return;
            }
            const data = await departmentService.getAllDepartments(token);
            setDepartments(data);
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al cargar departamentos.');
                addNotification(`Error al cargar departamentos: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al cargar los departamentos.');
            }
            console.error('Error fetching departments:', err);
        } finally {
            setLoading(false);
        }
    }, [token, addNotification]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    const handleCreateDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDepartmentName.trim() || !newDepartmentDescription.trim()) {
            addNotification('El nombre y la descripción del departamento no pueden estar vacíos.', 'warning');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('No autorizado para crear departamento.', 'error');
                return;
            }
            await departmentService.createDepartment(token, { name: newDepartmentName, description: newDepartmentDescription });
            addNotification('Departamento creado exitosamente.', 'success');
            setIsModalOpen(false);
            setNewDepartmentName('');
            setNewDepartmentDescription('');
            fetchDepartments();
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al crear departamento.');
                addNotification(`Error al crear departamento: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al crear el departamento.');
            }
            console.error('Error creating department:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditDepartment = (department: Department) => {
        setCurrentDepartment(department);
        setNewDepartmentName(department.name);
        setNewDepartmentDescription(department.description);
        setIsModalOpen(true);
    };

    const handleUpdateDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentDepartment || !newDepartmentName.trim() || !newDepartmentDescription.trim()) {
            addNotification('El nombre y la descripción del departamento no pueden estar vacíos.', 'warning');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                addNotification('No autorizado para actualizar departamento.', 'error');
                return;
            }
            await departmentService.updateDepartment(token, currentDepartment.id, { name: newDepartmentName, description: newDepartmentDescription });
            addNotification('Departamento actualizado exitosamente.', 'success');
            setIsModalOpen(false);
            setCurrentDepartment(null);
            setNewDepartmentName('');
            setNewDepartmentDescription('');
            fetchDepartments();
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al actualizar departamento.');
                addNotification(`Error al actualizar departamento: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al actualizar el departamento.');
            }
            console.error('Error updating department:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDepartment = async (id: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este departamento? Esta acción es irreversible.')) {
            setLoading(true);
            setError(null);
            try {
                if (!token) {
                    addNotification('No autorizado para eliminar departamento.', 'error');
                    return;
                }
                await departmentService.deleteDepartment(token, id);
                addNotification('Departamento eliminado exitosamente.', 'success');
                fetchDepartments();
            } catch (err: unknown) {
                if (isAxiosErrorTypeGuard(err)) {
                    const apiError = err.response?.data as ApiResponseError;
                    setError(apiError?.message || 'Error al eliminar departamento.');
                    addNotification(`Error al eliminar departamento: ${apiError?.message || 'Error desconocido'}`, 'error');
                } else {
                    setError('Ocurrió un error inesperado al eliminar el departamento.');
                }
                console.error('Error deleting department:', err);
            } finally {
                setLoading(false);
            }
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
            <button
                onClick={() => {
                    setCurrentDepartment(null);
                    setNewDepartmentName('');
                    setNewDepartmentDescription('');
                    setIsModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md mb-4 transition-colors duration-200"
            >
                Crear Nuevo Departamento
            </button>

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
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {departments.map((department) => (
                                <tr key={department.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{department.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{department.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{department.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEditDepartment(department)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                                            title="Editar Departamento"
                                        >
                                            {/* SVG para Editar */}
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg> Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteDepartment(department.id)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Eliminar Departamento"
                                        >
                                            {/* SVG para Eliminar */}
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">
                            {currentDepartment ? 'Editar Departamento' : 'Crear Nuevo Departamento'}
                        </h3>
                        <form onSubmit={currentDepartment ? handleUpdateDepartment : handleCreateDepartment}>
                            <div className="mb-4">
                                <label htmlFor="departmentName" className="block text-gray-700 text-sm font-bold mb-2">
                                    Nombre:
                                </label>
                                <input
                                    type="text"
                                    id="departmentName"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={newDepartmentName}
                                    onChange={(e) => setNewDepartmentName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="departmentDescription" className="block text-gray-700 text-sm font-bold mb-2">
                                    Descripción:
                                </label>
                                <textarea
                                    id="description"
                                    name="description"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={newDepartmentDescription}
                                    onChange={(e) => setNewDepartmentDescription(e.target.value)}
                                    rows={3}
                                    required
                                ></textarea>
                            </div>
                            <div className="flex justify-end space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors duration-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                                    disabled={loading}
                                >
                                    {loading ? 'Guardando...' : (currentDepartment ? 'Actualizar' : 'Crear')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentList;
