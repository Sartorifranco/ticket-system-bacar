// backend/src/app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
<<<<<<< HEAD
const asyncHandler = require('express-async-handler');

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
const errorHandler = require('./middleware/errorMiddleware');
const { protect, authorize } = require('./middleware/authMiddleware');

// Controladores de usuario (importados directamente, ya que las rutas se definirán aquí)
=======

// Importaciones de Controladores y Middlewares que userRoutes usaba
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
const {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
<<<<<<< HEAD
} = require('./controllers/userController');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json()); // Para parsear JSON en el body de las peticiones

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
app.get('/api/users', protect, authorize(['admin']), asyncHandler(getAllUsers));
app.post('/api/users', protect, authorize(['admin']), asyncHandler(createUser));
app.get('/api/users/:id', protect, authorize(['admin']), asyncHandler(getUserById));
app.put('/api/users/:id', protect, authorize(['admin']), asyncHandler(updateUser));
app.delete('/api/users/:id', protect, authorize(['admin']), asyncHandler(deleteUser));
// --- FIN: Rutas de Usuario ---

// Middleware de manejo de errores (debe ser el ÚLTIMO middleware en la cadena)
app.use(errorHandler);

// Configuración del puerto del servidor
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces de red

// Iniciar el servidor Express
app.listen(PORT, HOST, () => { 
    console.log(`Servidor iniciado en http://${HOST}:${PORT}`); 
});
=======
} = require('./controllers/userController'); 
const { protect, authorize } = require('./middleware/authMiddleware');

// Importaciones de otras rutas (estas no cambian)
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const departmentRoutes = require('./routes/departmentRoutes');

const errorHandler = require('./middleware/errorMiddleware');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Rutas API existentes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/departments', departmentRoutes);

// --- INICIO: Rutas de Usuario (Anteriormente en userRoutes.js) ---
// Ahora se definen directamente aquí en app.js
const usersRouter = express.Router(); // Creamos un nuevo router aquí mismo

usersRouter.route('/')
    .get(protect, authorize(['admin']), getAllUsers)
    .post(protect, authorize(['admin']), createUser);

usersRouter.route('/:id')
    .get(protect, authorize(['admin']), getUserById)
    .put(protect, authorize(['admin']), updateUser)
    .delete(protect, authorize(['admin']), deleteUser);

// Usamos el router de usuarios que acabamos de definir
app.use('/api/users', usersRouter); // <-- Usamos el router definido LOCALMENTE
// --- FIN: Rutas de Usuario ---

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
});

const pool = require('./config/db');
pool.getConnection()
    .then(connection => {
        console.log('Conectado a la base de datos MySQL!');
        connection.release();
    })
    .catch(err => {
        console.error('Error al conectar con la base de datos:', err);
        process.exit(1);
    });
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
