// backend/src/controllers/notificationController.js
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');
const { logActivity } = require('../utils/activityLogger'); // Asegúrate de que esto esté importado

// @desc    Obtener todas las notificaciones para el usuario autenticado
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    try {
        const [notifications] = await pool.execute(
            `SELECT id, user_id, type, message, related_id, related_type, is_read, created_at
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error al obtener notificaciones:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al obtener notificaciones.' });
    }
});

// @desc    Obtener el conteo de notificaciones no leídas
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadNotificationCount = asyncHandler(async (req, res) => {
    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    try {
        const [result] = await pool.execute(
            `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
            [req.user.id]
        );
        res.status(200).json({ count: result[0].count });
    } catch (error) {
        console.error('Error al obtener conteo de notificaciones no leídas:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al obtener conteo de notificaciones no leídas.' });
    }
});

// @desc    Marcar notificación como leída
// @route   PUT /api/notifications/:id/read
// @access  Private
const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    try {
        // Verificar que la notificación exista y pertenezca al usuario
        const [notificationRows] = await pool.execute(
            `SELECT id, user_id FROM notifications WHERE id = ?`,
            [id]
        );

        const notification = notificationRows[0];

        if (!notification) {
            res.status(404);
            throw new Error('Notificación no encontrada.');
        }

        if (notification.user_id !== req.user.id && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('No autorizado para marcar esta notificación.');
        }

        // Marcar como leída
        // CORREGIDO: Eliminado 'updated_at' de la consulta UPDATE
        const [result] = await pool.execute(
            `UPDATE notifications SET is_read = TRUE WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            res.status(404);
            throw new Error('Notificación no encontrada o ya estaba marcada como leída.');
        }

        // Log de actividad para marcar notificación como leída
        await logActivity(
            req.user.id,
            req.user.username,
            req.user.role,
            'notification_read',
            `marcó la notificación #${id} como leída`,
            'notification',
            parseInt(id),
            { is_read: false }, // Old value
            { is_read: true }    // New value
        );

        res.status(200).json({ message: 'Notificación marcada como leída exitosamente.' });
    } catch (error) {
        console.error('Error del servidor al marcar notificación como leída:', error.message, error.stack);
        // Asegúrate de que el mensaje de error sea consistente con lo que espera el frontend
        res.status(error.statusCode || 500).json({ message: error.message || 'Error interno del servidor al marcar notificación como leída.' });
    }
});

// @desc    Eliminar notificación
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    try {
        // Verificar que la notificación exista y pertenezca al usuario
        const [notificationRows] = await pool.execute(
            `SELECT id, user_id FROM notifications WHERE id = ?`,
            [id]
        );

        const notification = notificationRows[0];

        if (!notification) {
            res.status(404);
            throw new Error('Notificación no encontrada.');
        }

        if (notification.user_id !== req.user.id && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('No autorizado para eliminar esta notificación.');
        }

        const [result] = await pool.execute(
            `DELETE FROM notifications WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            res.status(404);
            throw new Error('Notificación no encontrada.');
        }

        // Log de actividad para eliminar notificación
        await logActivity(
            req.user.id,
            req.user.username,
            req.user.role,
            'notification_deleted',
            `eliminó la notificación #${id}`,
            'notification',
            parseInt(id),
            notification, // Old value (la notificación eliminada)
            null
        );

        res.status(200).json({ message: 'Notificación eliminada exitosamente.' });
    } catch (error) {
        console.error('Error del servidor al eliminar notificación:', error.message, error.stack);
        res.status(error.statusCode || 500).json({ message: error.message || 'Error interno del servidor al eliminar notificación.' });
    }
});

module.exports = {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    deleteNotification
};
