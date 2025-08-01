// backend/src/app.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Cargar variables de entorno
dotenv.config();

const app = express();

// Crear un servidor HTTP a partir de la aplicación Express
const server = http.createServer(app);

// Configurar Socket.IO
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middleware para parsear JSON
app.use(express.json());

// Configuración de CORS para Express (para las rutas REST)
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Conexión a la base de datos
const pool = require('./config/db');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes'); // Ya estaba descomentada
const bacarKeyRoutes = require('./routes/bacarKeyRoutes'); // <-- ¡DESCOMENTADA!

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/feedback', feedbackRoutes); // Ya estaba descomentada
app.use('/api/bacar-keys', bacarKeyRoutes); // <-- ¡DESCOMENTADA!

// Hacer que 'io' esté disponible en las solicitudes de Express
app.set('io', io);

// Lógica de Socket.IO
io.on('connection', (socket) => {
    console.log(`[Socket.IO Server] Usuario conectado: ${socket.id}`);

    const token = socket.handshake.auth.token;
    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            console.log(`[Socket.IO Server] Socket ${socket.id} autenticado como usuario ${decoded.id} (${decoded.role})`);

            if (decoded.role) {
                socket.join(decoded.role);
                console.log(`[Socket.IO Server] Socket ${socket.id} se unió a la sala '${decoded.role}'.`);
            }
            if (decoded.department_id) {
                socket.join(`department-${decoded.department_id}`);
                console.log(`[Socket.IO Server] Socket ${socket.id} se unió a la sala 'department-${decoded.department_id}'.`);
            }

        } catch (error) {
            console.error('[Socket.IO Server] Error de autenticación de Socket.IO:', error.message);
            socket.disconnect(true);
        }
    } else {
        console.log('[Socket.IO Server] Socket conectado sin token de autenticación.');
    }

    socket.on('joinRoom', ({ roomName, userId }) => {
        socket.join(roomName);
        console.log(`[Socket.IO Server] Socket ${socket.id} se unió a la sala '${roomName}'.`);
    });

    socket.on('leaveRoom', ({ roomName }) => {
        socket.leave(roomName);
        console.log(`[Socket.IO Server] Socket ${socket.id} dejó la sala '${roomName}'.`);
    });

    socket.on('disconnect', (reason) => {
        console.log(`[Socket.IO Server] Usuario desconectado: ${socket.id}. Razón: ${reason}`);
    });
});


// Servir archivos estáticos en producción
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../frontend/build')));

    app.get('*', (req, res) =>
        res.sendFile(path.resolve(__dirname, '../../frontend', 'build', 'index.html'))
    );
} else {
    app.get('/', (req, res) => res.send('API is running...'));
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Servidor iniciado en http://0.0.0.0:${PORT}`);
});
