// frontend/src/components/Departments/DepartmentEditModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Common/Modal'; 
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext'; 
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification
import { Department } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

interface DepartmentEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    department: Department | null; 
    onDepartmentUpdated: () => void; 
    token: string | null; 
}

const DepartmentEditModal: React.FC<DepartmentEditModalProps> = ({
    isOpen,
    onClose,
    department,
    onDepartmentUpdated,
    token, 
}) => {
    const { addNotification } = useNotification(); // <-- MODIFICADO: Obtener addNotification del contexto de notificaciones
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (department) {
            setName(department.name);
        } else {
            setName(''); 
        }
        setError(null);
    }, [department]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!name.trim()) {
            setError('El nombre del departamento es obligatorio.');
            addNotification('El nombre del departamento es obligatorio.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }

            const departmentData = { name };

            if (department) {
                await api.put(`/api/departments/${department.id}`, departmentData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Departamento actualizado exitosamente.', 'success');
            } else {
                await api.post('/api/departments', departmentData, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                addNotification('Departamento creado exitosamente.', 'success');
            }
            onDepartmentUpdated(); 
            onClose(); 
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al guardar departamento.');
                addNotification(`Error al guardar departamento: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al guardar el departamento.');
            }
            console.error('Error saving department:', err);
        } finally {
            setLoading(false);
        }
    }, [name, department, token, addNotification, onDepartmentUpdated, onClose]);

    const modalTitle = department ? `Editar Departamento: ${department.name}` : 'Crear Nuevo Departamento';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <form onSubmit={handleSubmit} className="p-4">
                {error && <div className="error-message text-center p-3 mb-4">{error}</div>}

                <div className="form-group mb-4">
                    <label htmlFor="name" className="form-label">Nombre del Departamento:</label>
                    <input
                        type="text"
                        id="name"
                        className="form-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                        required
                    />
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        type="submit"
                        className="button primary-button"
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="button secondary-button"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default DepartmentEditModal;
