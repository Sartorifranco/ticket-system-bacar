// backend/src/controllers/ticketController.js
const pool = require('../config/db');
const asyncHandler = require('express-async-handler'); // Usar express-async-handler
const { logActivity } = require('../services/activityLogService'); // Importar SOLO este servicio de log

// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Admin, Agent, Client (with filters)
const getAllTickets = asyncHandler(async (req, res) => {
    const { status, priority, department_id, assigned_to_user_id, user_id, limit, offset, sort_by, sort_order, title } = req.query;
    const authenticatedUserId = req.user.id;
    const authenticatedUserRole = req.user.role;

    let query = `
        SELECT
            t.*,
            u.username AS user_username,
            d.name AS department_name,
            a.username AS agent_username,
            tf.id AS feedback_id, tf.rating AS feedback_rating, tf.comment AS feedback_comment, tf.created_at AS feedback_created_at
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN users a ON t.assigned_to_user_id = a.id
        LEFT JOIN ticket_feedback tf ON t.id = tf.ticket_id -- <-- ¡CLAVE! JOIN para obtener el feedback
    `;
    const queryParams = [];
    const whereClauses = [];

    // Lógica de autorización para clientes: Un cliente solo puede ver sus propios tickets.
    if (authenticatedUserRole === 'client') {
        whereClauses.push('t.user_id = ?');
        queryParams.push(authenticatedUserId);
    } else {
        // Para admin/agente, aplicar filtro user_id si se proporciona en la query.
        if (user_id) {
            whereClauses.push('t.user_id = ?');
            queryParams.push(user_id);
        }
    }

    // Otros filtros
    if (status) {
        const statuses = status.split(',');
        const statusPlaceholders = statuses.map(() => '?').join(',');
        whereClauses.push(`t.status IN (${statusPlaceholders})`);
        queryParams.push(...statuses);
    }
    if (priority) {
        const priorities = priority.split(',');
        const priorityPlaceholders = priorities.map(() => '?').join(',');
        whereClauses.push(`t.priority IN (${priorityPlaceholders})`);
        queryParams.push(...priorities);
    }
    if (department_id) {
        whereClauses.push('t.department_id = ?');
        queryParams.push(department_id);
    }
    if (assigned_to_user_id) {
        whereClauses.push('t.assigned_to_user_id = ?');
        queryParams.push(assigned_to_user_id);
    }
    if (title) { // Añadir filtro por título
        whereClauses.push('t.title LIKE ?');
        queryParams.push(`%${title}%`);
    }

    if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Sorting
    const validSortColumns = ['id', 'title', 'status', 'priority', 'created_at', 'updated_at', 'closed_at'];
    const orderByColumn = (sort_by && validSortColumns.includes(sort_by)) ? sort_by : 'created_at';
    const orderDirection = (sort_order && ['ASC', 'DESC'].includes(sort_order.toUpperCase())) ? sort_order.toUpperCase() : 'DESC';
    query += ` ORDER BY t.${orderByColumn} ${orderDirection}`;

    // Pagination
    const limitNum = parseInt(limit, 10) || 10;
    const offsetNum = parseInt(offset, 10) || 0;
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(limitNum, offsetNum);

    const [rawTickets] = await pool.execute(query, queryParams);

    // Formatear los tickets para incluir el objeto feedback
    const tickets = rawTickets.map(ticket => {
        const formattedTicket = {
            id: ticket.id,
            title: ticket.title,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            department_id: ticket.department_id,
            department_name: ticket.department_name,
            user_id: ticket.user_id,
            user_username: ticket.user_username,
            assigned_to_user_id: ticket.assigned_to_user_id,
            agent_username: ticket.agent_username,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            closed_at: ticket.closed_at,
            feedback: null // Inicializar feedback como null
        };

        // Si hay datos de feedback (es decir, feedback_id no es null), adjuntarlos
        if (ticket.feedback_id) {
            formattedTicket.feedback = {
                id: ticket.feedback_id,
                ticket_id: ticket.id,
                user_id: ticket.user_id, // El user_id del feedback es el cliente que lo envió
                rating: ticket.feedback_rating,
                comment: ticket.feedback_comment,
                created_at: ticket.feedback_created_at
            };
        }
        return formattedTicket;
    });


    // Para obtener el total de tickets sin el límite/offset para la paginación
    let countQuery = `SELECT COUNT(*) AS total FROM tickets t`;
    const countQueryParams = [];
    
    // Replicar la lógica de filtrado para el contador
    const countWhereClauses = [];
    if (authenticatedUserRole === 'client') {
        countWhereClauses.push('t.user_id = ?');
        countQueryParams.push(authenticatedUserId);
    } else {
        if (user_id) {
            countWhereClauses.push('t.user_id = ?');
            countQueryParams.push(user_id);
        }
    }
    if (status) {
        const statuses = status.split(',');
        const statusPlaceholders = statuses.map(() => '?').join(',');
        countWhereClauses.push(`t.status IN (${statusPlaceholders})`);
        countQueryParams.push(...statuses);
    }
    if (priority) {
        const priorities = priority.split(',');
        const priorityPlaceholders = priorities.map(() => '?').join(',');
        countWhereClauses.push(`t.priority IN (${priorityPlaceholders})`);
        countQueryParams.push(...priorities);
    }
    if (department_id) {
        countWhereClauses.push('t.department_id = ?');
        countQueryParams.push(department_id);
    }
    if (assigned_to_user_id) {
        countWhereClauses.push('t.assigned_to_user_id = ?');
        countQueryParams.push(assigned_to_user_id);
    }
    if (title) {
        countWhereClauses.push('t.title LIKE ?');
        countQueryParams.push(`%${title}%`);
    }

    if (countWhereClauses.length > 0) {
        countQuery += ` WHERE ${countWhereClauses.join(' AND ')}`;
    }

    const [totalRows] = await pool.execute(countQuery, countQueryParams);
    const total = totalRows[0].total;

    res.status(200).json({
        success: true,
        count: tickets.length,
        total: total, // Asegúrate de enviar el total
        data: tickets,
    });
});

// @desc    Get single ticket by ID
// @route   GET /api/tickets/:id
// @access  Admin, Agent, Client (if creator or assigned)
const getTicketById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const authenticatedUserId = req.user.id;
    const authenticatedUserRole = req.user.role;

    let query = `
        SELECT
            t.*,
            u.username AS user_username,
            d.name AS department_name,
            a.username AS agent_username,
            tf.id AS feedback_id, tf.rating AS feedback_rating, tf.comment AS feedback_comment, tf.created_at AS feedback_created_at
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN users a ON t.assigned_to_user_id = a.id
        LEFT JOIN ticket_feedback tf ON t.id = tf.ticket_id -- <-- ¡CLAVE! JOIN para obtener el feedback
        WHERE t.id = ?
    `;
    const queryParams = [id];

    // Authorization check in controller:
    // Client can only see their own ticket
    // Agent can see tickets assigned to them or in their department
    if (authenticatedUserRole === 'client') {
        query += ` AND t.user_id = ?`;
        queryParams.push(authenticatedUserId);
    } else if (authenticatedUserRole === 'agent') {
        query += ` AND (t.assigned_to_user_id = ? OR t.department_id = ?)`;
        queryParams.push(authenticatedUserId, req.user.department_id);
    }
    // Admin can see any ticket, no extra WHERE clause needed for them

    const [ticketRows] = await pool.execute(query, queryParams);

    if (ticketRows.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado o no autorizado.');
    }

    const ticket = ticketRows[0];

    // Formatear el objeto de ticket para que coincida con la interfaz de frontend
    const formattedTicket = {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        department_id: ticket.department_id,
        department_name: ticket.department_name,
        user_id: ticket.user_id,
        user_username: ticket.user_username,
        assigned_to_user_id: ticket.assigned_to_user_id,
        agent_username: ticket.agent_username,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        closed_at: ticket.closed_at,
        feedback: null // Inicializar feedback como null
    };

    // Si hay datos de feedback (es decir, feedback_id no es null), adjuntarlos
    if (ticket.feedback_id) {
        formattedTicket.feedback = {
            id: ticket.feedback_id,
            ticket_id: ticket.id,
            user_id: ticket.user_id, // El user_id del feedback es el cliente que lo envió
            rating: ticket.feedback_rating,
            comment: ticket.feedback_comment,
            created_at: ticket.feedback_created_at
        };
    }

    res.status(200).json(formattedTicket);
});

// @desc    Create new ticket
// @route   POST /api/tickets
// @access  Client
const createTicket = asyncHandler(async (req, res) => {
    const { title, description, priority, department_id } = req.body;
    const userId = req.user.id; // ID del usuario autenticado (cliente)
    const username = req.user.username;
    const userRole = req.user.role;

    if (!title || !description || !priority || !department_id) {
        res.status(400);
        throw new Error('Por favor, complete todos los campos requeridos: título, descripción, prioridad, departamento.');
    }

    const [result] = await pool.execute(
        'INSERT INTO tickets (title, description, status, priority, user_id, department_id) VALUES (?, ?, ?, ?, ?, ?)',
        [title, description, 'open', priority, userId, department_id]
    );

    const newTicketId = result.insertId;

    // Log activity
    console.log(`[TicketController] Llamando logActivity para creación de ticket por usuario ${userId}`);
    await logActivity(
        userId,
        username,
        userRole,
        'ticket_created',    // action_type (más específico)
        `Ticket "${title}" (ID: ${newTicketId}) creado por ${username}.`, // description
        'ticket',            // target_type
        newTicketId,         // target_id
        null,                // old_value
        { title, description, priority, department_id, status: 'open', user_id: userId } // new_value
    );

    // Emit socket event (assuming 'io' is available via req.app.get('io'))
    if (req.app.get('io')) {
        req.app.get('io').to('admin').emit('newTicket', {
            message: `Nuevo ticket #${newTicketId} creado por ${req.user.username}: "${title}"`,
            ticketId: newTicketId,
        });
        req.app.get('io').to('agent').emit('newTicket', { // Notificar a todos los agentes
            message: `Nuevo ticket #${newTicketId} creado por ${req.user.username}: "${title}"`,
            ticketId: newTicketId,
        });
    }

    res.status(201).json({
        success: true,
        message: 'Ticket creado exitosamente',
        ticketId: newTicketId,
    });
});

// @desc    Update ticket
// @route   PUT /api/tickets/:id
// @access  Admin, Agent (assigned or in department)
const updateTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, status, priority, department_id, assigned_to_user_id } = req.body;
    const userId = req.user.id;
    const username = req.user.username;
    const userRole = req.user.role;

    const [existingTicketRows] = await pool.execute('SELECT * FROM tickets WHERE id = ?', [id]);
    if (existingTicketRows.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado');
    }
    const oldTicketData = existingTicketRows[0];

    // Authorization check: only admin/agent can update, and agent must be assigned or in department
    if (userRole === 'client') { // Clients cannot update tickets directly via this endpoint
        res.status(403);
        throw new Error('No autorizado para actualizar tickets.');
    }
    if (userRole === 'agent' && oldTicketData.assigned_to_user_id !== userId && oldTicketData.department_id !== req.user.department_id) {
        res.status(403);
        throw new Error('No autorizado para actualizar este ticket.');
    }

    const updateFields = {};
    const updateParams = [];

    if (title !== undefined) { updateFields.title = title; updateParams.push(title); }
    if (description !== undefined) { updateFields.description = description; updateParams.push(description); }
    if (status !== undefined) { updateFields.status = status; updateParams.push(status); }
    if (priority !== undefined) { updateFields.priority = priority; updateParams.push(priority); }
    if (department_id !== undefined) { updateFields.department_id = department_id; updateParams.push(department_id); }
    if (assigned_to_user_id !== undefined) { updateFields.assigned_to_user_id = assigned_to_user_id; updateParams.push(assigned_to_user_id); }

    // Set closed_at if status becomes 'resolved' or 'closed' and wasn't before
    if ((status === 'resolved' || status === 'closed') && !oldTicketData.closed_at) {
        updateFields.closed_at = new Date();
        updateParams.push(updateFields.closed_at);
    } else if (status !== 'resolved' && status !== 'closed' && oldTicketData.closed_at) {
        // If status changes from resolved/closed to something else, clear closed_at
        updateFields.closed_at = null;
        updateParams.push(updateFields.closed_at);
    }


    if (Object.keys(updateFields).length === 0) {
        res.status(400);
        throw new Error('No se proporcionaron campos para actualizar.');
    }

    const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    updateParams.push(id); // Add ticket ID for WHERE clause

    await pool.execute(`UPDATE tickets SET ${setClauses} WHERE id = ?`, updateParams);

    // Fetch updated ticket data for logging
    const [updatedTicketRows] = await pool.execute('SELECT * FROM tickets WHERE id = ?', [id]);
    const newTicketData = updatedTicketRows[0];

    // Log activity
    console.log(`[TicketController] Llamando logActivity para actualización de ticket ${id} por usuario ${userId}`);
    await logActivity(
        userId,
        username,
        userRole,
        'ticket_updated',    // action_type (más específico)
        `Ticket "${oldTicketData.title}" (ID: ${id}) actualizado por ${username}.`, // description
        'ticket',            // target_type
        parseInt(id),        // target_id
        oldTicketData,       // old_value
        newTicketData        // new_value
    );

    // Emit socket event
    if (req.app.get('io')) {
        req.app.get('io').to(`ticket-${id}`).emit('ticketUpdated', {
            message: `Ticket #${id} ha sido actualizado por ${req.user.username}.`,
            ticketId: parseInt(id),
        });
        req.app.get('io').to('admin').emit('ticketUpdated', {
            message: `Ticket #${id} ha sido actualizado por ${req.user.username}.`,
            ticketId: parseInt(id),
        });
        // Notificar al creador del ticket si es diferente del que actualizó
        if (newTicketData.user_id && newTicketData.user_id !== userId) {
            req.app.get('io').to(`user-${newTicketData.user_id}`).emit('ticketUpdated', {
                message: `Tu ticket #${id} ha sido actualizado.`,
                ticketId: parseInt(id),
            });
        }
        // Notificar al nuevo agente asignado si hubo cambio
        if (newTicketData.assigned_to_user_id && newTicketData.assigned_to_user_id !== oldTicketData.assigned_to_user_id) {
            req.app.get('io').to(`user-${newTicketData.assigned_to_user_id}`).emit('ticketAssigned', {
                message: `Se te ha asignado el ticket #${id}.`,
                ticketId: parseInt(id),
            });
        }
    }

    res.status(200).json({
        success: true,
        message: 'Ticket actualizado exitosamente.',
        updatedFields: updateFields,
    });
});

// @desc    Delete ticket
// @route   DELETE /api/tickets/:id
// @access  Admin
const deleteTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const username = req.user.username;
    const userRole = req.user.role;

    const [existingTicketRows] = await pool.execute('SELECT * FROM tickets WHERE id = ?', [id]);
    if (existingTicketRows.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado');
    }
    const deletedTicketData = existingTicketRows[0];

    await pool.execute('DELETE FROM tickets WHERE id = ?', [id]);

    // Log activity
    console.log(`[TicketController] Llamando logActivity para eliminación de ticket ${id} por usuario ${userId}`);
    await logActivity(
        userId,
        username,
        userRole,
        'ticket_deleted',    // action_type (más específico)
        `Ticket "${deletedTicketData.title}" (ID: ${id}) eliminado por ${username}.`, // description
        'ticket',            // target_type
        parseInt(id),        // target_id
        deletedTicketData,   // old_value
        null                 // new_value
    );

    // Emit socket event
    if (req.app.get('io')) {
        req.app.get('io').to('admin').emit('ticketDeleted', {
            message: `Ticket #${id} ha sido eliminado por ${req.user.username}.`,
            ticketId: parseInt(id),
        });
        // Notificar al creador del ticket si no es el admin que lo eliminó
        if (deletedTicketData.user_id && deletedTicketData.user_id !== userId) {
            req.app.get('io').to(`user-${deletedTicketData.user_id}`).emit('ticketDeleted', {
                message: `Tu ticket #${id} ha sido eliminado.`,
                ticketId: parseInt(id),
            });
        }
    }

    res.status(200).json({
        success: true,
        message: 'Ticket eliminado exitosamente.',
    });
});

// @desc    Add comment to ticket
// @route   POST /api/tickets/:id/comments
// @access  Admin, Agent, Client (if creator or assigned)
const addCommentToTicket = asyncHandler(async (req, res) => {
    const { id: ticketId } = req.params;
    const { comment_text } = req.body;
    const userId = req.user.id;
    const username = req.user.username; // Obtener el username del usuario autenticado
    const userRole = req.user.role;

    if (!comment_text) {
        res.status(400);
        throw new Error('El texto del comentario no puede estar vacío.');
    }

    // Verify ticket existence and user authorization
    const [ticketRows] = await pool.execute('SELECT user_id, assigned_to_user_id, department_id, title FROM tickets WHERE id = ?', [ticketId]);
    if (ticketRows.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado.');
    }
    const ticket = ticketRows[0];

    // Authorization check (similar to getTicketById or updateTicket)
    if (userRole === 'client' && ticket.user_id !== userId) {
        res.status(403);
        throw new Error('No autorizado para añadir comentarios a este ticket.');
    }
    if (userRole === 'agent' && ticket.assigned_to_user_id !== userId && ticket.department_id !== req.user.department_id) {
        res.status(403);
        throw new Error('No autorizado para añadir comentarios a este ticket.');
    }

    const [result] = await pool.execute(
        'INSERT INTO ticket_comments (ticket_id, user_id, comment_text) VALUES (?, ?, ?)',
        [ticketId, userId, comment_text]
    );

    const newCommentId = result.insertId;

    // Log activity
    console.log(`[TicketController] Llamando logActivity para añadir comentario a ticket ${ticketId} por usuario ${userId}`);
    await logActivity(
        userId,
        username,
        userRole,
        'comment_added',     // action_type (más específico)
        `Comentario añadido al ticket "${ticket.title}" (ID: ${ticketId}) por ${username}.`, // description
        'comment',           // target_type
        newCommentId,        // target_id
        null,                // old_value
        { ticket_id: parseInt(ticketId), comment_text: comment_text.substring(0, 50) + '...' } // new_value
    );

    // Emit socket event
    if (req.app.get('io')) {
        // Notificar a la sala del ticket (todos los que lo están viendo)
        req.app.get('io').to(`ticket-${ticketId}`).emit('newComment', {
            message: `Nuevo comentario en ticket #${ticketId} por ${username}.`,
            ticketId: parseInt(ticketId),
            commentId: newCommentId,
        });

        // Notificar a otros roles relevantes si es necesario
        if (userRole === 'client') {
            // Si el cliente comenta, notificar al agente asignado y a los admins
            if (ticket.assigned_to_user_id) {
                req.app.get('io').to(`user-${ticket.assigned_to_user_id}`).emit('newComment', {
                    message: `Nuevo comentario en tu ticket asignado #${ticketId}.`,
                    ticketId: parseInt(ticketId),
                });
            }
            req.app.get('io').to('admin').emit('newComment', {
                message: `Nuevo comentario en ticket #${ticketId}.`,
                ticketId: parseInt(ticketId),
            });
        } else if (userRole === 'agent' || userRole === 'admin') {
            // Si un agente/admin comenta, notificar al creador del ticket (cliente)
            req.app.get('io').to(`user-${ticket.user_id}`).emit('newComment', {
                message: `Nuevo comentario en tu ticket #${ticketId}.`,
                ticketId: parseInt(ticketId),
            });
        }
    }

    res.status(201).json({
        success: true,
        message: 'Comentario añadido exitosamente.',
        commentId: newCommentId,
    });
});

// @desc    Get comments for a ticket
// @route   GET /api/tickets/:id/comments
// @access  Admin, Agent, Client (if creator or assigned)
const getTicketComments = asyncHandler(async (req, res) => {
    const { id: ticketId } = req.params;
    const authenticatedUserId = req.user.id;
    const authenticatedUserRole = req.user.role;

    // Verify ticket existence and user authorization (similar to getTicketById)
    const [ticketRows] = await pool.execute('SELECT user_id, assigned_to_user_id, department_id FROM tickets WHERE id = ?', [ticketId]);
    if (ticketRows.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado.');
    }
    const ticket = ticketRows[0];

    // Authorization check
    if (authenticatedUserRole === 'client' && ticket.user_id !== authenticatedUserId) {
        res.status(403);
        throw new Error('No autorizado para ver los comentarios de este ticket.');
    }
    if (authenticatedUserRole === 'agent' && ticket.assigned_to_user_id !== authenticatedUserId && ticket.department_id !== req.user.department_id) {
        res.status(403);
        throw new Error('No autorizado para ver los comentarios de este ticket.');
    }

    const [comments] = await pool.execute(
        `SELECT tc.*, u.username AS user_username
         FROM ticket_comments tc
         JOIN users u ON tc.user_id = u.id
         WHERE tc.ticket_id = ?
         ORDER BY tc.created_at ASC`,
        [ticketId]
    );

    res.status(200).json(comments);
});


// Export all functions
module.exports = {
    getAllTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    addCommentToTicket,
    getTicketComments,
};
