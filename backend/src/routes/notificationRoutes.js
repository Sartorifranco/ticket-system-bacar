const express = require('express');
const router = express.Router();
// CAMBIADO: Importa 'authenticateToken' en lugar de 'protect'
const { authenticateToken } = require('../middleware/authMiddleware'); // <-- ¡CAMBIO AQUÍ!
const {
    getNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    deleteNotification,
    markAllNotificationsAsRead,
    deleteAllNotifications
} = require('../controllers/notificationController');

// @desc    Obtener notificaciones para el usuario autenticado
// @route   GET /api/notifications
// @access  Private (El controlador ya filtra por user_id)
router.get('/', authenticateToken, getNotifications); // <-- ¡CAMBIO AQUÍ!

// @desc    Obtener el conteo de notificaciones no leídas para el usuario autenticado
// @route   GET /api/notifications/unread-count
// @access  Private
router.get('/unread-count', authenticateToken, getUnreadNotificationCount); // <-- ¡CAMBIO AQUÍ!

// @desc    Marcar una notificación específica como leída
// @route   PUT /api/notifications/:id/read
// @access  Private (El controlador verifica la propiedad o rol de admin)
router.put('/:id/read', authenticateToken, markNotificationAsRead); // <-- ¡CAMBIO AQUÍ!

// @desc    Eliminar una notificación por ID
// @route   DELETE /api/notifications/:id
// @access  Private (El controlador verifica la propiedad o rol de admin)
router.delete('/:id', authenticateToken, deleteNotification); // <-- ¡CAMBIO AQUÍ!

// --- NUEVAS RUTAS ---

// @desc    Marcar todas las notificaciones del usuario como leídas
// @route   PUT /api/notifications/mark-all-read
// @access  Private
router.put('/mark-all-read', authenticateToken, markAllNotificationsAsRead); // <-- ¡CAMBIO AQUÍ!

// @desc    Eliminar todas las notificaciones del usuario
// @route   DELETE /api/notifications/delete-all
// @access  Private
router.delete('/delete-all', authenticateToken, deleteAllNotifications); // <-- ¡CAMBIO AQUÍ!

module.exports = router;
