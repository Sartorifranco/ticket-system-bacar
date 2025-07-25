import React, { useState, useEffect, useCallback } from 'react';
import { TicketData, User, Department, TicketStatus, TicketPriority } from '../../types';
import userService from '../../services/userService';
import departmentService from '../../services/departmentService';
import { useAuth } from '../../context/AuthContext'; 
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';
import api from '../../config/axiosConfig'; 
import { ticketStatusTranslations, ticketPriorityTranslations } from '../../utils/traslations'; 

interface TicketDetailFormProps {
    ticket: TicketData;
    onSave: (updatedTicket: TicketData) => void;
    onCancel: () => void;
    token: string | null; 
}

const TicketDetailForm: React.FC<TicketDetailFormProps> = ({ ticket, onSave, onCancel, token }) => {
    const { addNotification } = useNotification(); // <-- MODIFICADO: Obtener addNotification del contexto de notificaciones
    const [formData, setFormData] = useState<TicketData>(ticket);
    const [agents, setAgents] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAgentsAndDepartments = async () => {
            setLoading(true);
            setError(null);
            try {
                if (!token) {
                    addNotification('No autorizado. Token no disponible.', 'error');
                    setLoading(false);
                    return;
                }
                const allUsers = await userService.getAllUsers(token); 
                const fetchedAgents = allUsers.filter(u => u.role === 'agent');
                setAgents(fetchedAgents);

                const fetchedDepartments = await departmentService.getAllDepartments(token); 
                setDepartments(fetchedDepartments);
            } catch (err: unknown) { 
                if (isAxiosErrorTypeGuard(err)) {
                    const apiError = err.response?.data as ApiResponseError;
                    setError(apiError?.message || 'Error al cargar agentes o departamentos.');
                    addNotification(`Error al cargar datos: ${apiError?.message || 'Error desconocido'}`, 'error');
                } else {
                    setError('Ocurrió un error inesperado al cargar los datos.');
                }
                console.error('Error fetching agents or departments:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAgentsAndDepartments();
    }, [token, addNotification]); 

    useEffect(() => {
        setFormData(ticket);
    }, [ticket]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === 'department_id' || name === 'assigned_to_user_id' ? (value === '' ? null : parseInt(value)) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!token) {
            addNotification('No autorizado. Por favor, inicia sesión de nuevo.', 'error');
            setLoading(false);
            return;
        }

        try {
            const updatedFields: Partial<TicketData> = {};
            if (formData.title !== ticket.title) updatedFields.title = formData.title; 
            if (formData.description !== ticket.description) updatedFields.description = formData.description;
            if (formData.status !== ticket.status) updatedFields.status = formData.status;
            if (formData.priority !== ticket.priority) updatedFields.priority = formData.priority;
            if (formData.department_id !== ticket.department_id) updatedFields.department_id = formData.department_id;
            if (formData.assigned_to_user_id !== ticket.assigned_to_user_id) updatedFields.assigned_to_user_id = formData.assigned_to_user_id; 

            if (Object.keys(updatedFields).length === 0) {
                addNotification('No se detectaron cambios para guardar.', 'info');
                onCancel(); 
                return;
            }

            const response = await api.put(`/api/tickets/${ticket.id}`, updatedFields, {
                headers: { Authorization: `Bearer ${token}` },
            });
            addNotification('Ticket actualizado exitosamente!', 'success');
            onSave(response.data); 
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al actualizar el ticket.');
                addNotification(`Error al actualizar ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al actualizar el ticket.');
            }
            console.error('Error updating ticket:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Editar Ticket #{ticket.id}</h2>
            {error && <div className="text-red-500 mb-4">{error}</div>}

            <div className="mb-4">
                <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2"> 
                    Asunto:
                </label>
                <input
                    type="text"
                    id="title"
                    name="title" 
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.title} 
                    onChange={handleChange}
                    required
                    disabled={loading}
                />
            </div>

            <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
                    Descripción:
                </label>
                <textarea
                    id="description"
                    name="description"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    required
                    disabled={loading}
                ></textarea>
            </div>

            <div className="mb-4">
                <label htmlFor="status" className="block text-gray-700 text-sm font-bold mb-2">
                    Estado:
                </label>
                <select
                    id="status"
                    name="status"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.status}
                    onChange={handleChange}
                    required
                    disabled={loading}
                >
                    {Object.entries(ticketStatusTranslations).map(([key, value]) => (
                        <option key={key} value={key}>{value as string}</option> 
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">
                    Prioridad:
                </label>
                <select
                    id="priority"
                    name="priority"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.priority}
                    onChange={handleChange}
                    required
                    disabled={loading}
                >
                    {Object.entries(ticketPriorityTranslations).map(([key, value]) => (
                        <option key={key} value={key}>{value as string}</option> 
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <label htmlFor="department_id" className="block text-gray-700 text-sm font-bold mb-2">
                    Departamento:
                </label>
                <select
                    id="department_id"
                    name="department_id"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.department_id || ''}
                    onChange={handleChange}
                    required
                    disabled={loading}
                >
                    <option value="">Seleccionar Departamento</option>
                    {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>
            </div>

            <div className="mb-4">
                <label htmlFor="assigned_to_user_id" className="block text-gray-700 text-sm font-bold mb-2"> 
                    Agente Asignado:
                </label>
                <select
                    id="assigned_to_user_id"
                    name="assigned_to_user_id" 
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    value={formData.assigned_to_user_id || ''} 
                    onChange={handleChange}
                    disabled={loading}
                >
                    <option value="">Sin asignar</option>
                    {agents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.username}</option>
                    ))}
                </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <button
                    type="button"
                    onClick={onCancel}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-md transition-colors duration-200"
                    disabled={loading}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                    disabled={loading}
                >
                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </form>
    );
};

export default TicketDetailForm;
