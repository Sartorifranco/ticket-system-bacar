// frontend/src/components/Tickets/CreateTicketForm.tsx
<<<<<<< HEAD
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/axiosConfig';
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards';
import '../../index.css';
import './Tickets.css';
import { useAuth } from '../../context/AuthContext'; // MODIFICACIÓN: Importar useAuth desde el nuevo archivo de contexto

interface CreateTicketFormProps {
  onTicketCreated: () => void;
=======
import React, { useState, useEffect } from 'react'; 
import api from '../../config/axiosConfig'; 
import { isAxiosErrorTypeGuard } from '../../utils/typeGuards'; 
import '../../index.css'; 
import './Tickets.css'; // Importa estilos de tickets si tienes alguno específico para el form

interface CreateTicketFormProps {
  onTicketCreated: () => void; 
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
}

interface Department {
  id: number;
  name: string;
}

<<<<<<< HEAD
interface ApiResponseError {
  message?: string;
}

const CreateTicketForm: React.FC<CreateTicketFormProps> = ({ onTicketCreated }) => {
  const { token, addNotification } = useAuth();

=======
const CreateTicketForm: React.FC<CreateTicketFormProps> = ({ onTicketCreated }) => {
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('low');
  const [departmentId, setDepartmentId] = useState('');
<<<<<<< HEAD
  const [departments, setDepartments] = useState<Department[]>([]);
=======
  const [departments, setDepartments] = useState<Department[]>([]); 
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [departmentError, setDepartmentError] = useState<string | null>(null);

<<<<<<< HEAD
=======
  // Efecto para cargar los departamentos
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoadingDepartments(true);
      setDepartmentError(null);
      try {
<<<<<<< HEAD
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
=======
        // Ahora, esta llamada debería ser exitosa para el rol 'user'
        const response = await api.get<{ success: boolean; count: number; departments: Department[] }>('/api/departments'); 
        setDepartments(response.data.departments);
      } catch (err: unknown) {
        if (isAxiosErrorTypeGuard(err)) {
          const apiError = err.response?.data as { message?: string };
          setDepartmentError(apiError?.message || 'Error al cargar los departamentos.');
        } else {
          setDepartmentError('Ocurrió un error inesperado al cargar los departamentos.');
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
        }
        console.error('Error al cargar departamentos:', err);
      } finally {
        setLoadingDepartments(false);
      }
    };
    fetchDepartments();
<<<<<<< HEAD
  }, [token, addNotification]);
=======
  }, []); 
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e

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
<<<<<<< HEAD
      if (!token) {
        setMessage('No autorizado. Token no disponible.');
        setIsError(true);
        setLoading(false);
        return;
      }

=======
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
      const newTicket = {
        subject,
        description,
        priority,
        department_id: parseInt(departmentId),
      };

<<<<<<< HEAD
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
=======
      await api.post('/api/tickets', newTicket); 

      setMessage('Ticket creado exitosamente!');
      setSubject('');
      setDescription('');
      setPriority('low');
      setDepartmentId(''); 
      onTicketCreated();
    } catch (err: unknown) {
      if (isAxiosErrorTypeGuard(err)) {
        const apiError = err.response?.data as { message?: string };
        setMessage(apiError?.message || 'Error al crear ticket.');
      } else {
        setMessage('Ocurrió un error inesperado al crear el ticket.');
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
      }
      setIsError(true);
      console.error('Error al crear ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
<<<<<<< HEAD
    <form onSubmit={handleSubmit} className="form-card">
=======
    <form onSubmit={handleSubmit} className="form-card"> 
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
      {message && <p className={isError ? 'error-message' : 'success-message'}>{message}</p>}
      <div className="form-group">
        <label htmlFor="subject">Asunto:</label>
        <input
          type="text"
          id="subject"
          className="form-input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="description">Descripción:</label>
        <textarea
          id="description"
          className="form-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        ></textarea>
      </div>
      <div className="form-group">
        <label htmlFor="priority">Prioridad:</label>
        <select
          id="priority"
          className="form-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="department">Departamento:</label>
        {loadingDepartments ? (
          <p style={{ color: 'var(--text-color)' }}>Cargando departamentos...</p>
        ) : departmentError ? (
          <p className="error-message">{departmentError}</p>
        ) : (
          <select
            id="department"
            className="form-select"
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
      <button type="submit" className="button primary-button" disabled={loading || loadingDepartments}>
        {loading ? 'Creando...' : 'Crear Ticket'}
      </button>
    </form>
  );
};

<<<<<<< HEAD
export default CreateTicketForm;

=======
export default CreateTicketForm;
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
