// frontend/src/components/Admin/DepartmentForm.tsx
import React, { useState, useEffect } from 'react';
import departmentService, { Department, NewDepartment } from '../../services/departmentService';
import axios from 'axios'; // Asegúrate de importar axios para el manejo de errores
// import './DepartmentForm.css'; // <-- Si tienes un archivo CSS para esto, impórtalo aquí

interface DepartmentFormProps {
  departmentToEdit: Department | null;
  onClose: () => void;
  onDepartmentCreatedOrUpdated: () => void;
}

const DepartmentForm: React.FC<DepartmentFormProps> = ({ departmentToEdit, onClose, onDepartmentCreatedOrUpdated }) => {
  const [formData, setFormData] = useState<NewDepartment>({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (departmentToEdit) {
      setFormData({
        name: departmentToEdit.name,
        description: departmentToEdit.description,
      });
    } else {
      setFormData({
        name: '',
        description: '',
      });
    }
    setError(null);
  }, [departmentToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (departmentToEdit) {
        await departmentService.updateDepartment(departmentToEdit.id, formData);
        alert('Departamento actualizado exitosamente!');
      } else {
        await departmentService.createDepartment(formData);
        alert('Departamento creado exitosamente!');
        setFormData({ name: '', description: '' });
      }
      onDepartmentCreatedOrUpdated();
      onClose();
    } catch (err: unknown) { // Cambiar 'any' a 'unknown' para un mejor tipado
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || `Error ${err.response?.status}: ${err.message || 'Error al guardar departamento.'}`);
      } else {
        setError('Ocurrió un error inesperado al guardar departamento.');
      }
      console.error('Error al guardar departamento:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    // ELIMINA formContainerStyle y usa una clase CSS si es posible
    <div /* style={formContainerStyle} */>
      <h3>{departmentToEdit ? `Editar Departamento #${departmentToEdit.id}` : 'Crear Nuevo Departamento'}</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        {/* ELIMINA formGroupStyle y usa una clase CSS si es posible */}
        <div /* style={formGroupStyle} */>
          <label htmlFor="name" /* style={labelStyle} */>Nombre del Departamento:</label>
          {/* ELIMINA inputStyle y usa una clase CSS si es posible */}
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            /* style={inputStyle} */
            required
          />
        </div>
        {/* Repetir eliminación de estilos para los demás formGroupStyle e inputStyle */}
        <div /* style={formGroupStyle} */>
          <label htmlFor="description" /* style={labelStyle} */>Descripción:</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            /* style={inputStyle} */
            rows={3}
            required
          ></textarea>
        </div>
        {/* ELIMINA buttonGroupStyle y usa una clase CSS si es posible */}
        <div /* style={buttonGroupStyle} */>
          {/* ELIMINA buttonStyle y usa una clase CSS si es posible */}
          <button type="submit" disabled={loading} /* style={{ ...buttonStyle, backgroundColor: '#28a745' }} */>
            {loading ? 'Guardando...' : departmentToEdit ? 'Actualizar Departamento' : 'Crear Departamento'}
          </button>
          <button type="button" onClick={onClose} /* style={{ ...buttonStyle, backgroundColor: '#6c757d', marginLeft: '10px' }} */>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

// ELIMINA TODOS ESTOS ESTILOS EN LÍNEA
// const formContainerStyle: React.CSSProperties = { ... };
// const formGroupStyle: React.CSSProperties = { ... };
// const labelStyle: React.CSSProperties = { ... };
// const inputStyle: React.CSSProperties = { ... };
// const buttonGroupStyle: React.CSSProperties = { ... };
// const buttonStyle: React.CSSProperties = { ... };

export default DepartmentForm;