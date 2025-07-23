// frontend/src/components/Admin/DepartmentList.tsx
import React, { useState, useEffect } from 'react';
import departmentService, { Department } from '../../services/departmentService';
// CAMBIO CLAVE AQUÍ: Importación directa de los iconos
import * as FaIcons from 'react-icons/fa'; // Importa todo el módulo como FaIcons 

import axios from 'axios';
// import './DepartmentList.css'; // <-- Si tienes un archivo CSS para esto, impórtalo aquí

interface DepartmentListProps {
  onEditDepartment: (department: Department) => void;
  onDepartmentCreatedOrUpdated: () => void;
  refreshDepartments?: boolean;
}

const DepartmentList: React.FC<DepartmentListProps> = ({ onEditDepartment, onDepartmentCreatedOrUpdated, refreshDepartments }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, [onDepartmentCreatedOrUpdated, refreshDepartments]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await departmentService.getAllDepartments();
      setDepartments(data);
      setError(null);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || `Error ${err.response?.status}: ${err.message || 'Error al cargar departamentos.'}`);
      } else {
        setError('Ocurrió un error inesperado al cargar departamentos.');
      }
      console.error('Error al cargar departamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepartment = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este departamento? Esto también puede afectar a los tickets asociados.')) {
      return;
    }
    try {
      await departmentService.deleteDepartment(id);
      alert('Departamento eliminado exitosamente!');
      fetchDepartments();
      onDepartmentCreatedOrUpdated();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || `Error ${err.response?.status}: ${err.message || 'Error al eliminar departamento.'}`);
      } else {
        setError('Ocurrió un error inesperado al eliminar el departamento.');
      }
      console.error('Error al eliminar departamento:', err);
    }
  };

  if (loading) return <p>Cargando departamentos...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h3>Departamentos Existentes</h3>
      {departments.length === 0 ? (
        <p>No hay departamentos registrados.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((department) => (
              <tr key={department.id}>
                <td>{department.id}</td>
                <td>{department.name}</td>
                <td>{department.description}</td>
                <td>
                  <button
                    onClick={() => onEditDepartment(department)}
                    title="Editar Departamento"
                  >
                    <FaIcons.FaEdit /> Editar {/* Usa el componente directamente */}
                  </button>
                  <button
                    onClick={() => handleDeleteDepartment(department.id)}
                    title="Eliminar Departamento"
                  >
                    <FaIcons.FaTrash /> Eliminar {/* Usa el componente directamente */}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DepartmentList;