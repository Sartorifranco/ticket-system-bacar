// backend/controllers/commentController.js
const pool = require('../config/db');

// @desc    Añadir un comentario a un ticket
// @route   POST /api/tickets/:ticketId/comments
// @access  Private (Client, Agent, Admin)
const addCommentToTicket = async (req, res, next) => {
    const { ticketId } = req.params;
    const { comment_text } = req.body;
    const userId = req.user.id; // User making the comment
    const userRole = req.user.role;

    if (!comment_text) {
        return res.status(400).json({ success: false, message: 'El texto del comentario es requerido.' });
    }

    try {
        // Verificar si el ticket existe
        const [tickets] = await pool.execute('SELECT id, user_id, agent_id FROM tickets WHERE id = ?', [ticketId]);
        if (tickets.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket no encontrado.' });
        }

        const ticket = tickets[0];

        // Lógica de permisos para comentar:
        // Admin siempre puede comentar.
        // Cliente solo puede comentar en sus propios tickets.
        // Agente puede comentar en tickets asignados a él, O tickets no asignados, O si se implementa, tickets de su departamento.
        // Tu lógica actual:
        // if (userRole === 'client' && ticket.user_id !== userId) {
        //     return res.status(403).json({ success: false, message: 'No tienes permiso para comentar en este ticket' });
        // }
        // if (userRole === 'agent' && ticket.agent_id !== userId) {
        //      return res.status(403).json({ success: false, message: 'No tienes permiso para comentar en este ticket (no asignado)' });
        // }
        // Para simplificar y para el admin panel, vamos a permitir que el agente comente en cualquier ticket
        // ya que está interactuando con tickets en un contexto de soporte interno.
        // Si quieres que el agente solo comente si está asignado o es el cliente, usa tu lógica original.
        // Si quieres que el agente comente siempre, solo deja el check para cliente.

        if (userRole === 'client' && ticket.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para comentar en este ticket.' });
        }
        // Si no es cliente o es el cliente del ticket, o es agente/admin, puede comentar.
        // Esto cubre: Admin, Agente (cualquiera), Cliente (de su ticket).


        const [result] = await pool.execute(
            'INSERT INTO comments (ticket_id, user_id, comment_text) VALUES (?, ?, ?)',
            [ticketId, userId, comment_text]
        );

        const newCommentId = result.insertId;
        const [newComment] = await pool.execute(
            'SELECT c.id, c.ticket_id, c.user_id, u.username AS user_username, c.comment_text, c.created_at ' + // <-- CAMBIADO author_username a user_username
            'FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?',
            [newCommentId]
        );

        res.status(201).json({
            success: true,
            message: 'Comentario añadido exitosamente',
            comment: newComment[0], // Devuelve el comentario creado
        });

    } catch (error) {
        next(error);
    }
};

// @desc    Obtener comentarios de un ticket
// @route   GET /api/tickets/:ticketId/comments
// @access  Private (Client, Agent, Admin)
const getCommentsForTicket = async (req, res, next) => { // <-- CAMBIADO EL NOMBRE DE LA FUNCIÓN
    const { ticketId } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    try {
        // Verificar si el ticket existe y si el usuario tiene permiso para verlo
        const [tickets] = await pool.execute('SELECT id, user_id, agent_id FROM tickets WHERE id = ?', [ticketId]);
        if (tickets.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket no encontrado.' });
        }

        const ticket = tickets[0];
        // Lógica de permisos para ver comentarios:
        // Admin y Agente pueden ver cualquier comentario.
        // Cliente solo puede ver comentarios de sus propios tickets.
        if (userRole === 'client' && ticket.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para ver los comentarios de este ticket.' });
        }

        const [rows] = await pool.execute(
            'SELECT c.id, c.ticket_id, c.user_id, u.username AS user_username, c.comment_text, c.created_at ' + // <-- CAMBIADO author_username a user_username y añadido ticket_id, user_id
            'FROM comments c JOIN users u ON c.user_id = u.id WHERE c.ticket_id = ? ORDER BY c.created_at ASC',
            [ticketId]
        );

        res.status(200).json({ success: true, count: rows.length, comments: rows });
    } catch (error) {
        next(error);
    }
};

// @desc    Eliminar un comentario
// @route   DELETE /api/comments/:commentId
// @access  Private (Admin, or the user who made the comment)
const deleteComment = async (req, res, next) => {
    const { commentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const [commentRows] = await pool.execute('SELECT user_id FROM comments WHERE id = ?', [commentId]);

        if (commentRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Comentario no encontrado' });
        }

        const comment = commentRows[0];

        // Solo el administrador o el usuario que creó el comentario pueden eliminarlo
        if (userRole !== 'admin' && comment.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este comentario' });
        }

        const [result] = await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Comentario no encontrado' });
        }

        res.status(200).json({ success: true, message: 'Comentario eliminado exitosamente' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addCommentToTicket,
    getCommentsForTicket, // <-- Asegúrate de exportar la función con el nuevo nombre
    deleteComment,
};