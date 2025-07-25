const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const asyncHandler = require('express-async-handler'); // Asegúrate de que este paquete esté instalado (npm install express-async-handler)

// Carga variables de entorno
dotenv.config();

// Importación de la conexión a la base de datos
const pool = require('./config/db'); // Importa el pool directamente

// Importación de tus rutas existentes
const notificationRoutes = require('./routes/notificationRoutes');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); // Importación de las rutas del dashboard

// Importación de las rutas de administración (ya existente)
const adminRoutes = require('./routes/adminRoutes');

// NUEVA IMPORTACIÓN: Rutas para Claves Bacar
const bacarKeysRoutes = require('./routes/bacarKeysRoutes');

// NUEVA IMPORTACIÓN: Rutas para Activity Log
const activityLogRoutes = require('./routes/activityLogRoutes'); // AÑADIDO

// Importación de middlewares y controladores necesarios
// CORRECCIÓN CLAVE AQUÍ: Desestructurar para obtener solo la función errorHandler
const { errorHandler } = require('./middleware/errorMiddleware'); 
const { protect, authorize } = require('./middleware/authMiddleware');

// Controladores de usuario (importados directamente, ya que las rutas se definirán aquí)
const userController = require('./controllers/userController'); 
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    changePassword 
} = userController; 

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json()); // Para parsear JSON en el body de las peticiones

// --- DEBUGGING: Verificando tipos de módulos de ruta antes de usarlos ---
console.log('DEBUG: Tipo de notificationRoutes:', typeof notificationRoutes);
console.log('DEBUG: Tipo de authRoutes:', typeof authRoutes);
console.log('DEBUG: Tipo de ticketRoutes:', typeof ticketRoutes);
console.log('DEBUG: Tipo de departmentRoutes:', typeof departmentRoutes);
console.log('DEBUG: Tipo de dashboardRoutes:', typeof dashboardRoutes);
console.log('DEBUG: Tipo de adminRoutes:', typeof adminRoutes);
console.log('DEBUG: Tipo de bacarKeysRoutes:', typeof bacarKeysRoutes);
console.log('DEBUG: Tipo de activityLogRoutes:', typeof activityLogRoutes);
// --- FIN DEBUGGING ---


// Definición de las rutas de la API que usan módulos de router separados
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/dashboard', dashboardRoutes); // Uso de las rutas del dashboard

// Monta las rutas de administración
app.use('/api/admin', adminRoutes);

// Monta las rutas de Claves Bacar
app.use('/api/bacar-keys', bacarKeysRoutes);

// NUEVO: Monta las rutas de Activity Log
app.use('/api/activity-logs', activityLogRoutes); // AÑADIDO

// --- INICIO: Rutas de Usuario (DEFINIDAS DIRECTAMENTE EN 'app' para evitar problemas de contexto) ---
// Usamos asyncHandler para envolver los controladores y manejar errores de forma asíncrona
app.get('/api/users', protect, authorize(['admin']), asyncHandler(getAllUsers));
app.post('/api/users', protect, authorize(['admin']), asyncHandler(createUser));
app.get('/api/users/:id', protect, authorize(['admin']), asyncHandler(getUserById));
app.put('/api/users/:id', protect, authorize(['admin']), asyncHandler(updateUser));

// Añadir una ruta para cambiar la contraseña del usuario (si existe en userController)
if (typeof changePassword === 'function') {
    app.put('/api/users/:id/change-password', protect, asyncHandler(changePassword));
} else {
    console.warn('WARNING: userController.changePassword is not a function. Route /api/users/:id/change-password will not be active.');
}

app.delete('/api/users/:id', protect, authorize(['admin']), asyncHandler(deleteUser));
// --- FIN: Rutas de Usuario ---

// Middleware de manejo de errores (debe ser el ÚLTIMO middleware en la cadena)
app.use(errorHandler); // Ahora errorHandler es la función correcta

// Configuración del puerto del servidor
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces de red

// Iniciar el servidor Express
app.listen(PORT, HOST, () => {
    console.log(`Servidor iniciado en http://${HOST}:${PORT}`);
    // Verificar conexión a la base de datos al iniciar el servidor
    pool.getConnection()
        .then(connection => {
            console.log('Conectado a la base de datos MySQL!');
            connection.release(); // Liberar la conexión inmediatamente después de la prueba
        })
        .catch(err => {
            console.error('Error al conectar con la base de datos:', err);
            // Si la base de datos es crítica para iniciar, puedes salir del proceso
            // process.exit(1); 
        });
});
