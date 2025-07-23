// src/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config(); // Carga las variables de entorno desde el archivo .env

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT, // ¡Añadido! Usa la variable de entorno para el puerto
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Opcional: Bloque para verificar la conexión al inicio
pool.getConnection()
  .then(connection => {
    console.log('Conectado a la base de datos MySQL!');
    connection.release(); // Liberar la conexión
  })
  .catch(err => {
    console.error('Error al conectar con la base de datos:', err);
    process.exit(1); // Salir de la aplicación si no se puede conectar a la DB
  });

module.exports = pool;