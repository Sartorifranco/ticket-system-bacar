// frontend/src/components/CreateTicketForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

interface CreateTicketFormProps {
    onTicketCreated: () => void;
}

interface Department {
    id: number;
    name: string;
}

const CreateTicketForm: React.FC<CreateTicketFormProps> = ({ onTicketCreated }) => {
    const { token } = useAuth();
    const { addNotification } = useNotification();

    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('low');
    const [departmentId, setDepartmentId] = useState('');
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingDepartments, setLoadingDepartments] = useState(true);
    const [departmentError, setDepartmentError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDepartments = async () => {
            setLoadingDepartments(true);
            setDepartmentError(null);
            try {
                if (!token) {
                    setDepartmentError('No autorizado. Token no disponible.');
                    addNotification('No autorizado. Token no disponible para cargar departamentos.', 'error');
                    return;
                }
                const response = await api.get<{ success: boolean; count: number; departments: Department[] }>('/api/departments', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setDepartments(response.data.departments);
                // Set default department if available
                if (response.data.departments.length > 0 && !departmentId) {
                    setDepartmentId(String(response.data.departments[0].id));
                }
            } catch (err: unknown) {
                if (isAxiosErrorTypeGuard(err)) {
                    const apiError = err.response?.data as ApiResponseError;
                    setDepartmentError(apiError?.message || 'Error al cargar los departamentos.');
                    addNotification(`Error al cargar departamentos: ${apiError?.message || 'Error desconocido'}`, 'error');
                } else {
                    setDepartmentError('Ocurrió un error inesperado al cargar los departamentos.');
                    addNotification('Ocurrió un error inesperado al cargar los departamentos.', 'error');
                }
                console.error('Error al cargar departamentos:', err);
            } finally {
                setLoadingDepartments(false);
            }
        };
        fetchDepartments();
    }, [token, addNotification, departmentId]); // Added departmentId to dependencies to re-evaluate default selection

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Client-side validation
        if (!subject.trim() || !description.trim() || !departmentId) {
            addNotification('Por favor, completa todos los campos obligatorios.', 'warning');
            return;
        }

        setLoading(true);

        try {
            if (!token) {
                addNotification('No autorizado. Token no disponible.', 'error');
                setLoading(false);
                return;
            }

            const newTicket = {
                subject: subject.trim(),
                description: description.trim(),
                priority,
                department_id: parseInt(departmentId),
            };

            await api.post('/api/tickets', newTicket, {
                headers: { Authorization: `Bearer ${token}` },
            });

            addNotification('Ticket creado exitosamente!', 'success');
            setSubject('');
            setDescription('');
            setPriority('low');
            setDepartmentId(''); // Reset department selection
            onTicketCreated(); // Notify parent component
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                addNotification(`Error al crear ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                addNotification('Ocurrió un error inesperado al crear el ticket.', 'error');
            }
            console.error('Error al crear ticket:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto">
            {/* Mensajes de notificación ahora manejados por ToastContainer a través de useNotification */}
            <div className="mb-4">
                <label htmlFor="subject" className="block text-gray-700 text-sm font-bold mb-2">Asunto:</label>
                <input
                    type="text"
                    id="subject"
                    className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>
            <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Descripción:</label>
                <textarea
                    id="description"
                    className="shadow appearance-none border rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-y"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    disabled={loading}
                ></textarea>
            </div>
            <div className="mb-4">
                <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">Prioridad:</label>
                <div className="relative">
                    <select
                        id="priority"
                        className="block appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 px-3 pr-8 rounded-md leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        disabled={loading}
                    >
                        <option value="low">Baja</option>
                        <option value="medium">Media</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option> {/* Added urgent priority */}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
            </div>
            <div className="mb-6">
                <label htmlFor="department" className="block text-gray-700 text-sm font-bold mb-2">Departamento:</label>
                {loadingDepartments ? (
                    <p className="text-gray-600 text-sm">Cargando departamentos...</p>
                ) : departmentError ? (
                    <p className="text-red-500 text-sm">{departmentError}</p>
                ) : (
                    <div className="relative">
                        <select
                            id="department"
                            className="block appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 px-3 pr-8 rounded-md leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={departmentId}
                            onChange={(e) => setDepartmentId(e.target.value)}
                            required
                            disabled={loading}
                        >
                            <option value="">Selecciona un departamento</option>
                            {departments.map(dep => (
                                <option key={dep.id} value={dep.id}>{dep.name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                )}
            </div>
            <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition-colors duration-200"
                disabled={loading || loadingDepartments}
            >
                {loading ? 'Creando...' : 'Crear Ticket'}
            </button>
        </form>
    );
};

export default CreateTicketForm;
