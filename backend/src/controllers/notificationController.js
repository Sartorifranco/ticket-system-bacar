// backend/src/controllers/notificationController.js
// Asumo que tienes un modelo de Notificación importado aquí.
// Ejemplo con un modelo ficticio (ajusta según tu ORM o conexión a DB)
const Notification = require('../models/Notification'); // Ajusta esta ruta a tu modelo de Notificación
const User = require('../models/User'); // Necesario para crear notificaciones para usuarios específicos

// Función para crear una notificación (ejemplo, si no la tienes)
// Esta función es llamada desde otros controladores cuando ocurre un evento
exports.createNotification = async (userId, message, type = 'info', relatedId = null, relatedType = null) => {
  try {
    const newNotification = await Notification.create({
      user_id: userId,
      message,
      type,
      related_id: relatedId,
      related_type: relatedType,
      is_read: false, // Por defecto, una nueva notificación no está leída
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log('Notification created:', newNotification.toJSON());
    return newNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw new Error('Could not create notification');
  }
};


// Obtener notificaciones para el usuario autenticado
exports.getNotifications = async (req, res) => {
  try {
    // req.user debería ser establecido por tu authMiddleware con el ID del usuario
    const userId = req.user.id; 
    
    // Obtener notificaciones ordenadas por fecha de creación descendente
    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error al obtener notificaciones', error: error.message });
  }
};

// Marcar todas las notificaciones de un usuario como leídas
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id; // ID del usuario autenticado

    // Actualizar todas las notificaciones no leídas de este usuario a leídas
    await Notification.update(
      { is_read: true, updated_at: new Date() },
      { where: { user_id: userId, is_read: false } }
    );

    res.status(200).json({ message: 'Notificaciones marcadas como leídas correctamente.' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Error al marcar notificaciones como leídas.', error: error.message });
  }
};

// Obtener el contador de notificaciones no leídas
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id; // ID del usuario autenticado

    const unreadCount = await Notification.count({
      where: { user_id: userId, is_read: false }
    });

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    res.status(500).json({ message: 'Error al obtener el contador de notificaciones no leídas.', error: error.message });
  }
};
