// frontend/src/components/Tickets/CreateTicketModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import api from '../../config/axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext'; // <-- AÑADIDO: Importar useNotification
import { Department, User } from '../../types';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

interface CreateTicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTicketCreated: () => void; // Cambiado para que no necesite message/type
    token: string | null;
    departments: Department[];
    users: User[]; // Para asignar agentes si es necesario
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
    isOpen,
    onClose,
    onTicketCreated,
    token,
    departments,
    users,
}) => {
    const { addNotification } = useNotification(); // <-- MODIFICADO: Obtener addNotification del contexto de notificaciones
    // CORREGIDO: Usar 'title' en lugar de 'subject'
    const [title, setTitle] = useState(''); 
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium'); // Valor por defecto
    const [departmentId, setDepartmentId] = useState<number | null>(null);
    const [assignedToUserId, setAssignedToUserId] = useState<number | null>(null); // Para el agente
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Resetear el formulario cuando se abre el modal
    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setDescription('');
            setPriority('medium');
            setDepartmentId(null);
            setAssignedToUserId(null);
            setError(null);
        }
    }, [isOpen]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validaciones en el frontend
        // CORREGIDO: Usar 'title' en lugar de 'subject'
        if (!title.trim() || !description.trim() || !priority || !departmentId) {
            setError('Por favor, completa todos los campos obligatorios: Asunto, Descripción, Prioridad y Departamento.');
            addNotification('Por favor, completa todos los campos obligatorios.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (!token) {
                throw new Error('No autorizado. Token no disponible.');
            }

            const ticketData = {
                title, // CORREGIDO: subject -> title
                description,
                priority,
                department_id: departmentId,
                assigned_to_user_id: assignedToUserId, // Coincide con el backend (ahora usa assigned_to_user_id)
            };

            await api.post('/api/tickets', ticketData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            addNotification('Ticket creado exitosamente.', 'success');
            onTicketCreated(); // Llama al callback para notificar al padre
            onClose(); // Cierra el modal
        } catch (err: unknown) {
            if (isAxiosErrorTypeGuard(err)) {
                const apiError = err.response?.data as ApiResponseError;
                setError(apiError?.message || 'Error al crear el ticket.');
                addNotification(`Error al crear ticket: ${apiError?.message || 'Error desconocido'}`, 'error');
            } else {
                setError('Ocurrió un error inesperado al crear el ticket.');
                addNotification('Ocurrió un error inesperado al crear el ticket.', 'error');
            }
            console.error('Error creating ticket:', err);
        } finally {
            setLoading(false);
        }
    }, [title, description, priority, departmentId, assignedToUserId, token, addNotification, onTicketCreated, onClose]);

    if (!isOpen) return null;

    const portalElement = document.getElementById('modal-root');
    if (!portalElement) {
        console.error("Error: 'modal-root' no encontrado para CreateTicketModal. El portal no se puede crear.");
        return null;
    }

    // Filtrar usuarios con rol de 'agent' o 'admin' para la asignación
    const agents = users.filter(user => user.role === 'agent' || user.role === 'admin');

    return ReactDOM.createPortal(
        <div className="modal-overlay">
            <div className="modal-content admin-modal-size">
                <h2 className="modal-title">Crear Nuevo Ticket</h2>
                <button className="modal-close-button" onClick={onClose}>&times;</button>

                {error && <p className="error-message-modal">{error}</p>}

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label htmlFor="title">Asunto:</label> {/* CORREGIDO: subject -> title */}
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="form-input"
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="description">Descripción:</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="form-input"
                            rows={4}
                            required
                            disabled={loading}
                        ></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="priority">Prioridad:</label>
                        <select
                            id="priority"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                            className="form-select"
                            required
                            disabled={loading}
                        >
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="department">Departamento:</label>
                        <select
                            id="department"
                            value={departmentId || ''} // Usar cadena vacía para el valor nulo
                            onChange={(e) => setDepartmentId(e.target.value ? parseInt(e.target.value) : null)}
                            className="form-select"
                            required
                            disabled={loading}
                        >
                            <option value="">Seleccionar Departamento</option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="assignedToUser">Asignar a Agente (Opcional):</label>
                        <select
                            id="assignedToUser"
                            value={assignedToUserId || ''} // Usar cadena vacía para el valor nulo
                            onChange={(e) => setAssignedToUserId(e.target.value ? parseInt(e.target.value) : null)}
                            className="form-select"
                            disabled={loading}
                        >
                            <option value="">Sin Asignar</option>
                            {agents.map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                    {agent.username} ({agent.role})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="modal-actions">
                        <button type="submit" className="button primary-button" disabled={loading}>
                            {loading ? 'Creando...' : 'Crear Ticket'}
                        </button>
                        <button type="button" className="button secondary-button" onClick={onClose} disabled={loading}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        portalElement
    );
};

export default CreateTicketModal;
