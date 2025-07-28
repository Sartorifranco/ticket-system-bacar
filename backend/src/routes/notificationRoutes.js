// backend/src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware'); // Asegúrate de que authorize esté importado si lo usas en otras rutas
const {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    deleteNotification // Asegúrate de que deleteNotification esté importado
} = require('../controllers/notificationController');

// No es necesario router.use(express.json()) aquí si ya lo tienes en app.js

// @desc    Obtener notificaciones para el usuario autenticado
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, getNotifications);

// @desc    Obtener el conteo de notificaciones no leídas para el usuario autenticado
// @route   GET /api/notifications/unread-count
// @access  Private
router.get('/unread-count', protect, getUnreadNotificationCount);

// @desc    Marcar una notificación específica como leída
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, markNotificationAsRead); // Apunta directamente al controlador

// @desc    Marcar todas las notificaciones no leídas del usuario como leídas
// @route   PUT /api/notifications/mark-all-read
// @access  Private
// NOTA: Esta ruta no existe en tu controlador actual. Si la necesitas, deberías crearla en notificationController.js
// Por ahora, la comento para evitar errores si no está implementada.
/*
router.put('/mark-all-read', protect, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    try {
        const [result] = await pool.execute(
            `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`,
            [userId]
        );
        res.json({ message: `Se marcaron ${result.affectedRows} notificaciones como leídas.` });
    } catch (error) {
        console.error('Error al marcar todas las notificaciones como leídas:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al marcar todas las notificaciones como leídas.' });
    }
}));
*/

// @desc    Eliminar una notificación por ID
// @route   DELETE /api/notifications/:id
// @access  Private (solo el usuario propietario o un admin debería poder eliminarla)
router.delete('/:id', protect, deleteNotification); // Apunta directamente al controlador

module.exports = router;
