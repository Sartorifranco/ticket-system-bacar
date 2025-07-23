import React from 'react';
import { useAuth } from '../context/AuthContext';

const AgentDashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div style={{ padding: '20px' }}>
      <h1>Panel del Agente</h1>
      {user && <p>Bienvenido, {user.username} (Rol: {user.role})</p>}
      
      <div style={{ marginTop: '30px' }}>
        <h3>Aquí va la gestión de tickets para Agentes:</h3>
        <p>Ver tickets asignados, tomar tickets, cambiar estado, añadir comentarios.</p>
        {/* <AgentTicketDashboard /> */}
      </div>
    </div>
  );
};

export default AgentDashboard;