// frontend/src/components/Departments/CreateDepartmentModal.tsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import api from '../../config/axiosConfig';
import { isAxiosErrorTypeGuard, ApiResponseError } from '../../utils/typeGuards';

interface CreateDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onDepartmentCreated: (message: string, type: 'success' | 'error' | 'info') => void;
}

const CreateDepartmentModal: React.FC<CreateDepartmentModalProps> = ({ isOpen, onClose, token, onDepartmentCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      onDepartmentCreated('No autorizado. Por favor, inicia sesión.', 'error');
      return;
    }

    if (!name) {
      setError('El nombre del departamento es obligatorio.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/api/departments', { // Asumiendo que el endpoint para crear departamentos es POST /api/departments
        name,
        description,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      onDepartmentCreated('Departamento creado exitosamente!', 'success');
      onClose(); // Cerrar el modal al crear el departamento
      // Reiniciar el formulario
      setName('');
      setDescription('');

    } catch (err: unknown) {
      if (isAxiosErrorTypeGuard(err)) {
        const apiError = err.response?.data as ApiResponseError;
        setError(apiError?.message || 'Error al crear el departamento.');
        onDepartmentCreated(`Error al crear el departamento: ${apiError?.message || 'Error desconocido'}`, 'error');
      } else {
        setError('Ocurrió un error inesperado al crear el departamento.');
        onDepartmentCreated('Ocurrió un error inesperado al crear el departamento.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const portalElement = document.getElementById('modal-root');
  if (!portalElement) {
    console.error("Error: 'modal-root' no encontrado para CreateDepartmentModal. El portal no se puede crear.");
    return null;
  }

  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="modal-content admin-modal-size">
        <h2 className="modal-title">Crear Nuevo Departamento</h2>
        <button className="modal-close-button" onClick={onClose}>&times;</button>

        {error && <p className="error-message-modal">{error}</p>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="new-department-name">Nombre del Departamento:</label>
            <input
              type="text"
              id="new-department-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="new-department-description">Descripción (Opcional):</label>
            <textarea
              id="new-department-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              rows={3}
            ></textarea>
          </div>
          <div className="modal-actions">
            <button type="submit" className="button primary-button" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Departamento'}
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

export default CreateDepartmentModal;
