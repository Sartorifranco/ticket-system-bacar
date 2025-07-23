import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div style={{ textAlign: 'center', marginTop: '50px', padding: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', border: '1px solid #f5c6cb', maxWidth: '600px', margin: '50px auto' }}>
      <h1>404 - Página no encontrada</h1>
      <p style={{ fontSize: '1.2em', marginBottom: '20px' }}>Lo sentimos, la página que buscas no existe.</p>
      <Link to="/" style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}>Volver a la página de inicio</Link>
    </div>
  );
};

export default NotFoundPage;