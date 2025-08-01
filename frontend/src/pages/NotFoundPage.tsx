import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    // Contenedor principal para centrar el contenido en la página
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* Tarjeta de error 404 */}
      <div className="text-center p-8 bg-red-100 text-red-800 rounded-lg border border-red-200 shadow-lg max-w-xl w-full">
        <h1 className="text-4xl font-bold mb-4">404 - Página no encontrada</h1>
        <p className="text-lg mb-6">Lo sentimos, la página que buscas no existe.</p>
        <Link to="/" className="text-blue-600 hover:text-blue-800 hover:underline font-bold transition-colors duration-200">
          Volver a la página de inicio
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
