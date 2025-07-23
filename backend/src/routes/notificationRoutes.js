// backend/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

router.use(express.json());

// @desc    Obtener notificaciones para el usuario autenticado
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
    const userId = req.user.id; // Obtener el ID del usuario autenticado

    try {
        // Obtener notificaciones para el usuario actual, ordenadas por fecha de creación descendente
        const [notifications] = await pool.execute(
            `SELECT id, user_id, message, type, related_id, related_type, is_read, created_at
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json(notifications); // ¡CORREGIDO! Envía directamente el array
    } catch (error) {
        console.error('Error al obtener notificaciones:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al obtener notificaciones.' });
    }
}));

// @desc    Obtener el conteo de notificaciones no leídas para el usuario autenticado
// @route   GET /api/notifications/unread-count
// @access  Private
router.get('/unread-count', protect, asyncHandler(async (req, res) => {
    const userId = req.user.id;

    try {
        const [result] = await pool.execute(
            `SELECT COUNT(*) AS unread_count
             FROM notifications
             WHERE user_id = ? AND is_read = 0`,
            [userId]
        );
        res.json({ unreadCount: result[0].unread_count });
    } catch (error) {
        console.error('Error al obtener el conteo de notificaciones no leídas:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al obtener el conteo de notificaciones no leídas.' });
    }
}));

// @desc    Marcar una notificación específica como leída
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, asyncHandler(async (req, res) => { // ¡NUEVA RUTA!
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const [result] = await pool.execute(
            `UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND user_id = ? AND is_read = 0`,
            [id, userId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Notificación no encontrada o ya está leída.' });
        }
        res.json({ message: 'Notificación marcada como leída.' });
    } catch (error) {
        console.error('Error al marcar notificación específica como leída:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al marcar notificación como leída.' });
    }
}));

// @desc    Marcar todas las notificaciones no leídas del usuario como leídas
// @route   PUT /api/notifications/mark-all-read
// @access  Private
router.put('/mark-all-read', protect, asyncHandler(async (req, res) => { // ¡NUEVA RUTA!
    const userId = req.user.id;

    try {
        const [result] = await pool.execute(
            `UPDATE notifications SET is_read = 1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = ? AND is_read = 0`,
            [userId]
        );
        res.json({ message: `Se marcaron ${result.affectedRows} notificaciones como leídas.` });
    } catch (error) {
        console.error('Error al marcar todas las notificaciones como leídas:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al marcar todas las notificaciones como leídas.' });
    }
}));

// @desc    Eliminar una notificación por ID
// @route   DELETE /api/notifications/:id
// @access  Private (solo el usuario propietario o un admin debería poder eliminarla)
router.delete('/:id', protect, asyncHandler(async (req, res) => {
    const notificationId = req.params.id;
    const userId = req.user.id; // Usuario que intenta eliminar
    const userRole = req.user.role; // Rol del usuario

    try {
        // Primero, verificar si la notificación existe y pertenece al usuario, o si el usuario es admin
        const [notificationRows] = await pool.execute(
            `SELECT user_id FROM notifications WHERE id = ?`,
            [notificationId]
        );

        if (notificationRows.length === 0) {
            return res.status(404).json({ message: 'Notificación no encontrada.' });
        }

        const notificationOwnerId = notificationRows[0].user_id;

        // Solo el propietario de la notificación o un administrador puede eliminarla
        if (notificationOwnerId !== userId && userRole !== 'admin') {
            return res.status(403).json({ message: 'No tienes permiso para eliminar esta notificación.' });
        }

        const [result] = await pool.execute(
            `DELETE FROM notifications WHERE id = ?`,
            [notificationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Notificación no encontrada o ya ha sido eliminada.' });
        }

        res.status(200).json({ message: 'Notificación eliminada exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar notificación:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al eliminar la notificación.' });
    }
}));

module.exports = router;
