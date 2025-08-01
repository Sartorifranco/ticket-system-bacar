// frontend/src/components/Tickets/TicketFormModal.tsx
import React, { useState, useEffect } from 'react';
import { Department, TicketData, TicketPriority, User } from '../../types'; // Asegúrate de importar todos los tipos necesarios

interface TicketFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (ticketData: Partial<TicketData>) => Promise<void>;
    initialData: TicketData | null; // Datos del ticket para edición, o null para creación
    departments: Department[]; // Lista de todos los departamentos disponibles
    users: User[]; // Lista de todos los usuarios (para asignar agentes)
}

const TicketFormModal: React.FC<TicketFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    departments,
    users,
}) => {
    const isCreating = !initialData; // Si no hay initialData, estamos creando

    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [departmentId, setDepartmentId] = useState<number | ''>(initialData?.department_id || '');
    const [priority, setPriority] = useState<TicketPriority>(initialData?.priority || 'medium'); // Default a 'medium'
    const [status, setStatus] = useState<'open' | 'in-progress' | 'resolved' | 'closed' | 'reopened'>(initialData?.status || 'open'); // Default a 'open'
    const [assignedToUserId, setAssignedToUserId] = useState<number | ''>(initialData?.assigned_to_user_id || '');
    const [loading, setLoading] = useState(false);

    // Actualizar estados cuando initialData cambia (ej. al abrir el modal para un ticket diferente)
    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title);
            setDescription(initialData.description);
            setDepartmentId(initialData.department_id || '');
            setPriority(initialData.priority);
            setStatus(initialData.status);
            setAssignedToUserId(initialData.assigned_to_user_id || '');
        } else {
            // Resetear para creación
            setTitle('');
            setDescription('');
            setDepartmentId('');
            setPriority('medium');
            setStatus('open');
            setAssignedToUserId('');
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Validaciones básicas
        if (!title.trim() || !description.trim() || departmentId === '') { // Usar === '' para departmentId
            alert('Por favor, complete el título, la descripción y seleccione un departamento.');
            setLoading(false);
            return;
        }

        const ticketData: Partial<TicketData> = {
            title,
            description,
            department_id: Number(departmentId),
            priority: priority,
        };

        // === CAMBIO CLAVE AQUÍ: Asignar status y assigned_to_user_id solo si NO estamos creando ===
        if (!isCreating) {
            ticketData.status = status;
            ticketData.assigned_to_user_id = assignedToUserId === '' ? null : Number(assignedToUserId);
        }
        
        // Si el estado es 'resolved' o 'closed' y no hay fecha de cierre, añadirla
        if ((status === 'resolved' || status === 'closed') && !initialData?.closed_at) {
            ticketData.closed_at = new Date().toISOString();
        } else if (status !== 'resolved' && status !== 'closed' && initialData?.closed_at) {
            // Si el estado cambia a no resuelto/cerrado, quitar la fecha de cierre
            ticketData.closed_at = null;
        }

        try {
            await onSave(ticketData);
            // onClose() y notificaciones se manejan en onSave del padre
        } catch (error) {
            console.error('Error al guardar el ticket:', error);
            // La notificación de error se maneja en el componente padre
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Filtrar usuarios para obtener solo agentes
    const agents = users.filter(user => user.role === 'agent');

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50 overflow-y-auto p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md my-8">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
                    {isCreating ? 'Crear Nuevo Ticket' : `Editar Ticket #${initialData?.id}`}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">Título:</label>
                        <input
                            type="text"
                            id="title"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Descripción:</label>
                        <textarea
                            id="description"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-24"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            disabled={loading}
                        ></textarea>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="department" className="block text-gray-700 text-sm font-bold mb-2">Departamento:</label>
                        <select
                            id="department"
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={departmentId}
                            onChange={(e) => setDepartmentId(Number(e.target.value))}
                            required
                            disabled={loading}
                        >
                            <option value="">Selecciona un departamento</option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="priority" className="block text-gray-700 text-sm font-bold mb-2">Prioridad:</label>
                        <select
                            id="priority"
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as TicketPriority)}
                            required
                            disabled={loading}
                        >
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>

                    {/* Campos solo visibles para edición (cuando isCreating es false) */}
                    {!isCreating && (
                        <>
                            <div className="mb-4">
                                <label htmlFor="status" className="block text-gray-700 text-sm font-bold mb-2">Estado:</label>
                                <select
                                    id="status"
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as 'open' | 'in-progress' | 'resolved' | 'closed' | 'reopened')}
                                    required
                                    disabled={loading}
                                >
                                    <option value="open">Abierto</option>
                                    <option value="in-progress">En Progreso</option>
                                    <option value="resolved">Resuelto</option>
                                    <option value="closed">Cerrado</option>
                                    <option value="reopened">Reabierto</option>
                                </select>
                            </div>

                            <div className="mb-4">
                                <label htmlFor="assignedTo" className="block text-gray-700 text-sm font-bold mb-2">Asignar a:</label>
                                <select
                                    id="assignedTo"
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={assignedToUserId}
                                    onChange={(e) => setAssignedToUserId(e.target.value === '' ? '' : Number(e.target.value))}
                                    disabled={loading}
                                >
                                    <option value="">Sin Asignar</option>
                                    {agents.map((agent) => (
                                        <option key={agent.id} value={agent.id}>
                                            {agent.username}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                            disabled={loading}
                        >
                            {loading ? 'Guardando...' : (isCreating ? 'Crear Ticket' : 'Actualizar Ticket')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TicketFormModal;
