// backend/src/controllers/feedbackController.js
const db = require('../config/db'); // Asegúrate de que esta ruta sea correcta a tu configuración de base de datos

/**
 * @route POST /api/feedback
 * @desc Permite a un cliente enviar feedback para un ticket cerrado/resuelto.
 * @access Private (solo clientes autenticados)
 */
exports.submitFeedback = async (req, res) => {
    const { ticket_id, rating, comment } = req.body;
    const user_id = req.user.id; // Asume que el ID del usuario se adjunta al objeto req por tu middleware de autenticación

    console.log(`[FeedbackController] Intentando enviar feedback para Ticket ID: ${ticket_id}, User ID: ${user_id}, Rating: ${rating}`);

    // Validaciones básicas de entrada
    if (!ticket_id || !rating) {
        console.log('[FeedbackController] Error 400: Ticket ID y Rating son obligatorios.');
        return res.status(400).json({ success: false, message: 'Ticket ID y Rating son obligatorios.' });
    }

    if (rating < 1 || rating > 5) {
        console.log('[FeedbackController] Error 400: La calificación debe ser un número entre 1 y 5.');
        return res.status(400).json({ success: false, message: 'La calificación debe ser un número entre 1 y 5.' });
    }

    try {
        // 1. Verificar si el ticket existe y está cerrado/resuelto
        const [ticketRows] = await db.query(
            'SELECT id, status FROM tickets WHERE id = ?',
            [ticket_id]
        );

        if (ticketRows.length === 0) {
            console.log(`[FeedbackController] Error 404: Ticket con ID ${ticket_id} no encontrado.`);
            return res.status(404).json({ success: false, message: 'Ticket no encontrado.' });
        }

        const ticket = ticketRows[0];
        if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
            console.log(`[FeedbackController] Error 400: Solo se puede calificar tickets resueltos o cerrados. Estado actual: ${ticket.status}`);
            return res.status(400).json({ success: false, message: 'Solo se puede calificar tickets resueltos o cerrados.' });
        }

        // 2. Verificar si el usuario ya ha enviado feedback para este ticket
        // Esta es la primera línea de defensa antes de intentar la inserción
        const [existingFeedback] = await db.query(
            'SELECT id FROM ticket_feedback WHERE ticket_id = ? AND user_id = ?',
            [ticket_id, user_id]
        );

        if (existingFeedback.length > 0) {
            console.log(`[FeedbackController] Error 409: Feedback duplicado detectado para Ticket ID ${ticket_id} y User ID ${user_id}.`);
            return res.status(409).json({ success: false, message: 'Ya has calificado este ticket.' });
        }

        // 3. Insertar el nuevo feedback en la base de datos
        const [result] = await db.query(
            'INSERT INTO ticket_feedback (ticket_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
            [ticket_id, user_id, rating, comment || null] // comment puede ser null
        );

        console.log(`[FeedbackController] Feedback enviado exitosamente. ID: ${result.insertId}`);
        res.status(201).json({ success: true, message: 'Feedback enviado exitosamente.', feedbackId: result.insertId });

    } catch (error) {
        console.error('[FeedbackController] Error al enviar feedback:', error);
        // Manejo específico para errores de clave única que vienen de la DB
        // Esto es una segunda línea de defensa si la verificación previa falla por alguna razón
        if (error.code === 'ER_DUP_ENTRY' || (error.sqlMessage && error.sqlMessage.includes('Duplicate entry'))) {
            console.log(`[FeedbackController] Error 409 (DB): Feedback duplicado detectado por la base de datos para Ticket ID ${ticket_id} y User ID ${user_id}.`);
            return res.status(409).json({ success: false, message: 'Ya has calificado este ticket.' });
        }
        console.log('[FeedbackController] Error 500: Error interno del servidor al procesar el feedback.');
        res.status(500).json({ success: false, message: 'Error interno del servidor al procesar el feedback.' });
    }
};
