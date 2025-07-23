// frontend/src/pages/Home.tsx
import React from 'react';
import { useAuth } from '../context/AuthContext'; // MODIFICACIÓN: Importar useAuth desde el nuevo archivo de contexto

const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="home-page-container">
      <h1 className="text-4xl font-bold text-primary-color mb-4 text-center">
        Bienvenido al Sistema de Tickets
      </h1>
      <p className="text-lg text-text-light dark:text-text-dark text-center mb-8">
        {user ? `Hola, ${user.username}! Tu rol es: ${user.role}.` : 'Por favor, inicia sesión o regístrate para continuar.'}
      </p>
      {/* Puedes añadir más contenido aquí */}
    </div>
  );
};

export default Home;