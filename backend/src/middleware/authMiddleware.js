// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const pool = require('../config/db'); // Asume que tienes un archivo db.js en config

// Middleware para proteger rutas
const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Verificar si el token está en los headers de autorización (Bearer Token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtener token del header
            token = req.headers.authorization.split(' ')[1];

            // Verificar token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Obtener el usuario del token
            const [rows] = await pool.query('SELECT id, username, email, role FROM users WHERE id = ?', [decoded.id]);

            if (rows.length === 0) {
                res.status(401);
                throw new Error('No autorizado, usuario no encontrado');
            }

            req.user = rows[0]; // Adjuntar el usuario a la solicitud
            next();

        } catch (error) {
            console.error('Error en el middleware de autenticación:', error);
            res.status(401);
            throw new Error('No autorizado, token fallido');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('No autorizado, no hay token');
    }
});

// Middleware para autorización basada en roles
const authorize = (roles = []) => {
    // roles puede ser un string o un array de strings
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.user) {
            res.status(401);
            throw new Error('No autorizado, usuario no autenticado');
        }
        if (roles.length > 0 && !roles.includes(req.user.role)) {
            res.status(403);
            throw new Error('Acceso denegado, no tienes los permisos necesarios');
        }
        next();
    };
};

module.exports = { protect, authorize };
