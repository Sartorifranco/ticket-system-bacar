// frontend/src/components/Admin/UserForm.tsx
import React, { useState, useEffect } from 'react';
import userService, { User, NewUser } from '../../services/userService';
import axios from 'axios';
// import './UserForm.css'; // <-- Si tienes un archivo CSS para esto, impórtalo aquí

interface UserFormProps {
  onUserCreatedOrUpdated: () => void;
  userToEdit?: User | null;
  onClose?: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ onUserCreatedOrUpdated, userToEdit, onClose }) => {
  const [formData, setFormData] = useState<NewUser>({
    username: '',
    email: '',
    password: '',
    role: 'client',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        username: userToEdit.username,
        email: userToEdit.email,
        password: '',
        role: userToEdit.role,
      });
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'client',
      });
    }
  }, [userToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value as NewUser['role'] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (userToEdit) {
        const dataToUpdate: Partial<NewUser> = {
          username: formData.username,
          email: formData.email,
          role: formData.role,
        };
        if (formData.password && formData.password.trim() !== '') {
          dataToUpdate.password = formData.password;
        }
        await userService.updateUser(userToEdit.id, dataToUpdate);
        alert('Usuario actualizado exitosamente!');
      } else {
        await userService.createUser(formData);
        alert('Usuario creado exitosamente!');
      }
      setFormData({ username: '', email: '', password: '', role: 'client' });
      onUserCreatedOrUpdated();
      if (onClose) onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || `Error ${err.response?.status}: ${err.message || 'Error al guardar usuario.'}`);
      } else {
        setError('Ocurrió un error inesperado al guardar usuario.');
      }
      console.error('Error al guardar usuario:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    // ELIMINA formContainerStyle y usa una clase CSS si es posible
    <div /* style={formContainerStyle} */>
      <h4>{userToEdit ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h4>
      <form onSubmit={handleSubmit}>
        {/* ELIMINA formGroupStyle y usa una clase CSS si es posible */}
        <div /* style={formGroupStyle} */>
          <label htmlFor="username">Nombre de Usuario:</label>
          {/* ELIMINA inputStyle y usa una clase CSS si es posible */}
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            /* style={inputStyle} */
          />
        </div>
        {/* Repetir eliminación de estilos para los demás formGroupStyle e inputStyle */}
        <div /* style={formGroupStyle} */>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            /* style={inputStyle} */
          />
        </div>
        <div /* style={formGroupStyle} */>
          <label htmlFor="password">Contraseña {userToEdit ? '(dejar vacío para no cambiar)' : ':'}</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password || ''}
            onChange={handleChange}
            required={!userToEdit}
            /* style={inputStyle} */
          />
        </div>
        <div /* style={formGroupStyle} */>
          <label htmlFor="role">Rol:</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            /* style={inputStyle} */
          >
            <option value="client">Cliente</option>
            <option value="agent">Agente</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {/* ELIMINA buttonStyle y usa una clase CSS si es posible */}
        <button type="submit" disabled={loading} /* style={buttonStyle} */>
          {loading ? 'Guardando...' : (userToEdit ? 'Actualizar Usuario' : 'Crear Usuario')}
        </button>
        {userToEdit && (
          <button
            type="button"
            onClick={onClose}
            /* style={{ ...buttonStyle, backgroundColor: '#6c757d', marginLeft: '10px' }} */
          >
            Cancelar Edición
          </button>
        )}
      </form>
    </div>
  );
};

// ELIMINA TODOS ESTOS ESTILOS EN LÍNEA
// const formContainerStyle: React.CSSProperties = { ... };
// const formGroupStyle: React.CSSProperties = { ... };
// const inputStyle: React.CSSProperties = { ... };
// const buttonStyle: React.CSSProperties = { ... };

export default UserForm;