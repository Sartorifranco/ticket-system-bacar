import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import { useAuth } from '../../context/AuthContext'; // Importar useAuth
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification

interface CreateTicketFormProps {
    onTicketCreated: () => void;
}

interface Department {
    id: number;
    name: string;
}

interface ApiResponseError {
    message?: string;
}

const CreateTicketForm: React.FC<CreateTicketFormProps> = ({ onTicketCreated }) => {
    const { token } = useAuth(); // <-- MODIFICADO: Solo token de useAuth
    const { addNotification } = useNotification(); // <-- AÑADIDO: addNotification de useNotification

    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('low');
    const [departmentId, setDepartmentId] = useState('');
    const [departments, setDepartments] = useState<Department[]>([]);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
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
                    return;
                }
                const response = await api.get<{ success: boolean; count: number; departments: Department[] }>('/api/departments', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setDepartments(response.data.departments);
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
    }, [token, addNotification]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject || !description || !departmentId) {
            setMessage('Por favor, completa todos los campos.');
            setIsError(true);
            return;
        }

        setLoading(true);
        setMessage('');
        setIsError(false);

        try {
            if (!token) {
                setMessage('No autorizado. Token no disponible.');
                setIsError(true);
                setLoading(false);
                return;
            }

            const newTicket = {
                subject,
                description,
                priority,
                department_id: parseInt(departmentId),
            };

            await api.post('/api/tickets', newTicket, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setMessage('Ticket creado exitosamente!');
            addNotification('Ticket creado exitosamente.', 'success');
            setSubject('');
            setDescription('');
            setPriority('low');
            setDepartmentId('');
            onTicketCreated();
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setMessage(apiError?.message || 'Error al crear ticket.');
                addNotification(`Error al crear ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setMessage('Ocurrió un error inesperado al crear el ticket.');
                addNotification('Ocurrió un error inesperado al crear el ticket.', 'error');
            }
            setIsError(true);
            console.error('Error al crear ticket:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto">
            {message && (
                <p className={`p-3 mb-4 rounded-md ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message}
                </p>
            )}
            <div className="mb-4">
                <label htmlFor="subject" className="block text-gray-700 text-sm font-bold mb-2">Asunto:</label>
                <input
                    type="text"
                    id="subject"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                />
            </div>
            <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Descripción:</label>
                <textarea
                    id="description"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 h-32 resize-y"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                ></textarea>
            </div>
            <div className="mb-4">
                <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">Prioridad:</label>
                <select
                    id="priority"
                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                </select>
            </div>
            <div className="mb-4">
                <label htmlFor="department" className="block text-gray-700 text-sm font-bold mb-2">Departamento:</label>
                {loadingDepartments ? (
                    <p className="text-gray-600">Cargando departamentos...</p>
                ) : departmentError ? (
                    <p className="text-red-500 text-sm">{departmentError}</p>
                ) : (
                    <select
                        id="department"
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        required
                    >
                        <option value="">Selecciona un departamento</option>
                        {departments.map(dep => (
                            <option key={dep.id} value={dep.id}>{dep.name}</option>
                        ))}
                    </select>
                )}
            </div>
            <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={loading || loadingDepartments}
            >
                {loading ? 'Creando...' : 'Crear Ticket'}
            </button>
        </form>
    );
};

export default CreateTicketForm;
