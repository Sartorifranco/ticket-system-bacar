// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

// Middleware para proteger rutas, renombrado de 'protect' a 'authenticateToken'
const authenticateToken = asyncHandler(async (req, res, next) => { // <-- ¡CAMBIO AQUÍ!
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            // console.log(`[AuthMiddleware - AuthenticateToken] Token recibido: ${token}`); // Descomentar para depuración

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // console.log(`[AuthMiddleware - AuthenticateToken] Token decodificado:`, decoded); // Descomentar para depuración

            const [rows] = await pool.execute('SELECT id, username, email, role, department_id FROM users WHERE id = ?', [decoded.id]);
            req.user = rows[0];

            if (!req.user) {
                res.status(401);
                throw new Error('No autorizado, usuario no encontrado');
            }
            // console.log(`[AuthMiddleware - AuthenticateToken] Usuario autenticado: ${req.user.username} (ID: ${req.user.id}, Rol: ${req.user.role})`); // Descomentar para depuración
            next();
        } catch (error) {
            console.error('[AuthMiddleware - AuthenticateToken] Error en la verificación del token:', error.message);
            if (error.name === 'TokenExpiredError') {
                res.status(401);
                throw new Error('No autorizado, token ha expirado');
            } else {
                res.status(401);
                throw new Error('No autorizado, token fallido');
            }
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('No autorizado, no hay token');
    }
});

// Middleware para autorizar roles
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            console.log('[AuthMiddleware - Authorize] No hay usuario en la solicitud. Acceso denegado.');
            res.status(401);
            throw new Error('No autorizado, usuario no autenticado');
        }

        const rolesString = Array.isArray(roles) ? roles.join(', ') : String(roles);
        // console.log(`[AuthMiddleware - Authorize] Verificando rol del usuario: ${req.user.role}. Roles permitidos: ${rolesString}`); // Descomentar para depuración

        // Si el usuario es un administrador, siempre tiene acceso
        if (req.user.role === 'admin') {
            // console.log('[AuthMiddleware - Authorize] Autorizado: Usuario es administrador.'); // Descomentar para depuración
            return next();
        }

        // Si el rol del usuario está en la lista de roles permitidos
        if (Array.isArray(roles) && roles.includes(req.user.role)) {
            // console.log('[AuthMiddleware - Authorize] Autorizado: Rol coincide.'); // Descomentar para depuración
            return next();
        } else if (!Array.isArray(roles) && roles === req.user.role) { // Si se pasó un solo string de rol
            // console.log('[AuthMiddleware - Authorize] Autorizado: Rol coincide (string).'); // Descomentar para depuración
            return next();
        }

        console.log('[AuthMiddleware - Authorize] Acceso denegado. Rol no autorizado o no cumple las condiciones.');
        res.status(403);
        throw new Error('No autorizado para acceder a esta ruta');
    };
};

// Exporta ambas funciones, ahora 'authenticateToken' está disponible
module.exports = { authenticateToken, authorize }; // <-- ¡CAMBIO AQUÍ!
