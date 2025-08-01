const asyncHandler = require('express-async-handler'); // Asegúrate de que este middleware esté instalado
const pool = require('../config/db'); // Importa tu pool de conexión a la base de datos

// @desc    Añadir un comentario a un ticket
// @route   POST /api/tickets/:ticketId/comments
// @access  Private (Client, Agent, Admin)
const addCommentToTicket = asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const { message } = req.body; // MODIFICADO: Esperar 'message' en lugar de 'comment_text'
    const userId = req.user.id; // User making the comment
    const userRole = req.user.role;

    if (!message || message.trim() === '') {
        res.status(400);
        throw new Error('El texto del comentario es requerido.');
    }

    // Verificar si el ticket existe
    const [tickets] = await pool.execute('SELECT id, user_id, agent_id FROM tickets WHERE id = ?', [ticketId]);
    if (tickets.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado.');
    }

    const ticket = tickets[0];

    // Lógica de permisos para comentar:
    // Admin siempre puede comentar.
    // Cliente solo puede comentar en sus propios tickets.
    // Agente puede comentar en tickets asignados a él, o tickets no asignados.
    // La lógica actual permite al agente comentar en cualquier ticket si no se especifica lo contrario.
    if (userRole === 'client' && ticket.user_id !== userId) {
        res.status(403);
        throw new Error('No tienes permiso para comentar en este ticket.');
    }

    const [result] = await pool.execute(
        'INSERT INTO comments (ticket_id, user_id, comment_text) VALUES (?, ?, ?)',
        [ticketId, userId, message.trim()] // Usar 'message' aquí
    );

    const newCommentId = result.insertId;
    const [newCommentRows] = await pool.execute(
        'SELECT c.id, c.ticket_id, c.user_id, u.username AS user_username, c.comment_text AS message, c.created_at ' + // MODIFICADO: Alias 'comment_text' a 'message'
        'FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?',
        [newCommentId]
    );

    res.status(201).json({
        success: true,
        message: 'Comentario añadido exitosamente',
        comment: newCommentRows[0], // Devuelve el comentario creado
    });
});

// @desc    Obtener comentarios de un ticket
// @route   GET /api/tickets/:ticketId/comments
// @access  Private (Client, Agent, Admin)
const getCommentsForTicket = asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    // Verificar si el ticket existe y si el usuario tiene permiso para verlo
    const [tickets] = await pool.execute('SELECT id, user_id, agent_id FROM tickets WHERE id = ?', [ticketId]);
    if (tickets.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado.');
    }

    const ticket = tickets[0];
    // Lógica de permisos para ver comentarios:
    // Admin y Agente pueden ver cualquier comentario.
    // Cliente solo puede ver comentarios de sus propios tickets.
    if (userRole === 'client' && ticket.user_id !== userId) {
        res.status(403);
        throw new Error('No tienes permiso para ver los comentarios de este ticket.');
    }

    const [rows] = await pool.execute(
        'SELECT c.id, c.ticket_id, c.user_id, u.username AS user_username, c.comment_text AS message, c.created_at ' + // MODIFICADO: Alias 'comment_text' a 'message'
        'FROM comments c JOIN users u ON c.user_id = u.id WHERE c.ticket_id = ? ORDER BY c.created_at ASC',
        [ticketId]
    );

    res.status(200).json({ success: true, count: rows.length, comments: rows });
});

// @desc    Eliminar un comentario
// @route   DELETE /api/comments/:commentId
// @access  Private (Admin, or the user who made the comment)
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [commentRows] = await pool.execute('SELECT user_id FROM comments WHERE id = ?', [commentId]);

    if (commentRows.length === 0) {
        res.status(404);
        throw new Error('Comentario no encontrado');
    }

    const comment = commentRows[0];

    // Solo el administrador o el usuario que creó el comentario pueden eliminarlo
    if (userRole !== 'admin' && comment.user_id !== userId) {
        res.status(403);
        throw new Error('No tienes permiso para eliminar este comentario');
    }

    const [result] = await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Comentario no encontrado');
    }

    res.status(200).json({ success: true, message: 'Comentario eliminado exitosamente' });
});

module.exports = {
    addCommentToTicket,
    getCommentsForTicket,
    deleteComment,
};
