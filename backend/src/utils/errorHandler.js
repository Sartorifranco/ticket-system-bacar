const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Loguea el error en la consola del servidor

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    message: message,
    // stack: process.env.NODE_ENV === 'development' ? err.stack : {} // Opcional: mostrar stack en desarrollo
  });
};

module.exports = errorHandler;