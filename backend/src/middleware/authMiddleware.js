<<<<<<< HEAD
// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const pool = require('../config/db'); // Asegúrate de que esta ruta sea correcta

// Middleware para proteger rutas
const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Verificar si el token está en los headers de autorización
=======
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
// Asegúrate de que tu modelo de usuario esté importado si lo usas aquí
// const User = require('../models/userModel'); // O como sea que lo tengas

const protect = asyncHandler(async (req, res, next) => {
    let token;

>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtener token del header
            token = req.headers.authorization.split(' ')[1];
<<<<<<< HEAD
            console.log('[BACKEND DEBUG - Protect] Token recibido:', token);

            // Verificar token
            // AÑADIR DEBUG: Log del secreto JWT
            // Asegúrate de que process.env.JWT_SECRET esté cargado (ej. con dotenv)
            if (!process.env.JWT_SECRET) {
                console.error('[BACKEND ERROR - Protect] JWT_SECRET no está definido en las variables de entorno.');
                res.status(500);
                throw new Error('Configuración del servidor incompleta: JWT_SECRET no definido.');
            }
            console.log('[BACKEND DEBUG - Protect] JWT_SECRET usado para verificar:', process.env.JWT_SECRET);
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('[BACKEND DEBUG - Protect] Token decodificado:', decoded);

            // Obtener usuario del token
            const [users] = await pool.execute('SELECT id, username, email, role, department_id FROM users WHERE id = ?', [decoded.id]); // Asegúrate de seleccionar department_id si lo usas en el frontend

            if (users.length === 0) {
                res.status(401);
                throw new Error('Usuario no encontrado');
            }

            req.user = users[0]; // Adjuntar el usuario a la solicitud
            console.log(`[BACKEND DEBUG - Protect] Usuario adjuntado a req.user: ${req.user.username} (ID: ${req.user.id}, Rol: ${req.user.role})`);
            next(); // Pasar al siguiente middleware
        } catch (error) {
            // AÑADIR DEBUG: Log del error exacto de jwt.verify
            console.error('[BACKEND ERROR - Protect] Error en la validación del token (detalles):', error);
            console.error('[BACKEND ERROR - Protect] Mensaje de error JWT:', error.message);
            
            // Si el error es de token expirado o firma inválida, dar un mensaje más específico
            if (error.name === 'TokenExpiredError') {
                res.status(401);
                throw new Error('No autorizado, el token ha expirado.');
            } else if (error.name === 'JsonWebTokenError') {
                res.status(401);
                throw new Error('No autorizado, token inválido o malformado.');
            } else {
                res.status(401);
                throw new Error('No autorizado, token fallido.');
            }
        }
    } else {
        // Si no hay token en la cabecera
        console.log('[BACKEND DEBUG - Protect] No se encontró token en la cabecera de autorización.');
        res.status(401);
        throw new Error('No autorizado, no hay token.');
    }
});

// Middleware para autorizar roles
const authorize = (roles) => {
    return (req, res, next) => {
        // req.user debe estar disponible gracias al middleware 'protect'
        if (!req.user) {
            console.error('[BACKEND ERROR - Authorize] req.user no está definido. El middleware protect no se ejecutó o falló.');
            res.status(401);
            throw new Error('No autorizado, usuario no autenticado.');
        }

        console.log(`[BACKEND DEBUG - Authorize] Autorizando rol. Rol del usuario: ${req.user.role}. Roles permitidos: ${roles.join(', ')}`);

        if (!roles.includes(req.user.role)) {
            console.warn(`[BACKEND WARNING - Authorize] Acceso denegado para usuario ${req.user.username} (Rol: ${req.user.role}). Requiere: ${roles.join(', ')}`);
            res.status(403); // Forbidden
            throw new Error('No tienes permiso para acceder a esta ruta.');
        }
        console.log(`[BACKEND DEBUG - Authorize] Usuario ${req.user.username} autorizado para la ruta.`);
=======

            // Verificar token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Adjuntar usuario de la base de datos a la solicitud
            // ¡Correcto! decoded.role ahora tendrá un valor real como 'admin' o 'client'
            req.user = { id: decoded.id, role: decoded.role }; // Asumiendo que el token tiene el rol
            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            throw new Error('No autorizado, token fallido');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('No autorizado, no hay token');
    }
});

// Middleware para autorizar por rol
const authorize = (roles) => { // 'roles' debe ser un array, ej: ['admin', 'agent']
    return (req, res, next) => {
        // req.user.role ahora será un string ('admin', 'agent', 'client') y no undefined
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403);
            throw new Error('Acceso denegado, no tiene los permisos necesarios');
        }
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
        next();
    };
};

<<<<<<< HEAD
module.exports = { protect, authorize };


=======
module.exports = {
    protect,
    authorize,
};
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
