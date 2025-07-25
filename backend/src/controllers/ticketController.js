// backend/src/controllers/ticketController.js
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');
const { logActivity } = require('../utils/activityLogger');
const { createNotification } = require('../utils/notificationUtils');

const getAllTickets = asyncHandler(async (req, res) => {
    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    let query = `
        SELECT
            t.id,
            t.title,
            t.description,
            t.status,
            t.priority,
            t.department_id,
            d.name AS department_name,
            t.user_id,
            u.username AS user_username,
            u.email AS user_email,
            t.agent_id,
            a.username AS agent_username,
            a.email AS agent_email,
            t.created_at,
            t.updated_at,
            t.closed_at
        FROM
            tickets t
        LEFT JOIN
            users u ON t.user_id = u.id
        LEFT JOIN
            users a ON t.agent_id = a.id
        LEFT JOIN
            departments d ON t.department_id = d.id
    `;
    const whereClauses = [];
    const queryParams = [];

    if (req.user.role === 'client') {
        whereClauses.push('t.user_id = ?');
        queryParams.push(req.user.id);
    } else if (req.user.role === 'agent') {
        whereClauses.push('(t.agent_id = ? OR t.agent_id IS NULL)');
        queryParams.push(req.user.id);
    }

    const { status, priority, department_id, agent_id, search } = req.query;

    if (status && status !== 'all') {
        whereClauses.push('t.status = ?');
        queryParams.push(status);
    }

    if (priority && priority !== 'all') {
        whereClauses.push('t.priority = ?');
        queryParams.push(priority);
    }

    if (department_id && department_id !== 'all') {
        whereClauses.push('t.department_id = ?');
        queryParams.push(department_id);
    }

    if (agent_id && agent_id !== 'all') {
        if (agent_id === 'unassigned' || agent_id === 'null') {
            whereClauses.push('t.agent_id IS NULL');
        } else {
            whereClauses.push('t.agent_id = ?');
            queryParams.push(parseInt(agent_id));
        }
    }

    if (search) {
        const searchTerm = `%${search}%`;
        whereClauses.push('(t.title LIKE ? OR t.description LIKE ? OR u.username LIKE ? OR a.username LIKE ?)');
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY t.created_at DESC';

    console.log('[DEBUG getAllTickets] Ejecutando consulta de tickets...');
    const [tickets] = await pool.query(query, queryParams);
    console.log('[DEBUG getAllTickets] Consulta de tickets completada.');

    res.status(200).json({ tickets });
});


const getTicketById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    console.log('[DEBUG getTicketById] Ejecutando consulta de ticket principal...');
    const [tickets] = await pool.query(`
        SELECT
            t.id,
            t.title,
            t.description,
            t.status,
            t.priority,
            t.department_id,
            d.name AS department_name,
            t.user_id,
            u.username AS user_username,
            u.email AS user_email,
            t.agent_id,
            a.username AS agent_username,
            a.email AS agent_email,
            t.created_at,
            t.updated_at,
            t.closed_at
        FROM
            tickets t
        LEFT JOIN
            users u ON t.user_id = u.id
        LEFT JOIN
            users a ON t.agent_id = a.id
        LEFT JOIN
            departments d ON t.department_id = d.id
        WHERE t.id = ?
    `, [id]);
    console.log('[DEBUG getTicketById] Consulta de ticket principal completada.');

    const ticket = tickets[0];

    if (!ticket) {
        res.status(404);
        throw new Error('Ticket no encontrado');
    }

    if (req.user.role !== 'admin' && req.user.id !== ticket.user_id && req.user.id !== ticket.agent_id) {
        res.status(403);
        throw new Error('No autorizado para ver este ticket');
    }

    console.log('[DEBUG getTicketById] Ejecutando consulta de comentarios...');
    const [comments] = await pool.query(`
        SELECT tm.id, tm.ticket_id, tm.user_id, u.username AS user_username, tm.message_text AS message, tm.created_at
        FROM ticket_messages tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.ticket_id = ?
        ORDER BY tm.created_at ASC
    `, [id]);
    console.log('[DEBUG getTicketById] Consulta de comentarios completada. Comentarios obtenidos:', comments); // <-- AÑADIDO: Log de comentarios

    console.log('[DEBUG getTicketById] Ejecutando consulta de activity_logs...');
    const [activity_logs] = await pool.query(`
        SELECT al.id, al.user_id, al.user_username, al.user_role, al.action_type, al.description, al.target_type, al.target_id, al.old_value, al.new_value, al.created_at
        FROM activity_logs al
        WHERE al.target_type = 'ticket' AND al.target_id = ?
        ORDER BY al.created_at DESC
    `, [id]);
    console.log('[DEBUG getTicketById] Consulta de activity_logs completada.');

    const parsedActivityLogs = activity_logs.map(log => ({
        ...log,
        old_value: log.old_value ? JSON.parse(log.old_value) : null,
        new_value: log.new_value ? JSON.parse(log.new_value) : null,
    }));

    // --- AÑADIDO: Log del objeto completo del ticket antes de enviarlo ---
    console.log('[DEBUG getTicketById] Objeto de ticket final a enviar:', { ...ticket, comments, activity_logs: parsedActivityLogs });
    // --- FIN AÑADIDO ---

    res.status(200).json({ ...ticket, comments, activity_logs: parsedActivityLogs });
});

const createTicket = asyncHandler(async (req, res) => {
    const { title, description, priority, department_id, user_id } = req.body;

    let userIdToAssign = req.user.id;
    if (req.user.role === 'admin' && user_id) {
        userIdToAssign = user_id;
    }

    if (!title || !description || !priority || !department_id) {
        res.status(400);
        throw new Error('Por favor, incluye todos los campos obligatorios: asunto, descripción, prioridad, departamento.');
    }

    console.log('[DEBUG createTicket] Ejecutando INSERT de nuevo ticket...');
    const [result] = await pool.query(
        'INSERT INTO tickets (user_id, title, description, priority, department_id) VALUES (?, ?, ?, ?, ?)',
        [userIdToAssign, title, description, priority, department_id]
    );
    console.log('[DEBUG createTicket] INSERT de nuevo ticket completado.');

    const newTicketId = result.insertId;

    await logActivity(
        req.user.id,
        req.user.username,
        req.user.role,
        'ticket_created',
        `creó el ticket #${newTicketId}: '${title}'`,
        'ticket',
        newTicketId,
        null,
        { title, description, priority, department_id, user_id: userIdToAssign }
    );

    console.log('[DEBUG createTicket] Ejecutando SELECT de admins para notificación...');
    const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    console.log('[DEBUG createTicket] SELECT de admins completado.');
    for (const admin of admins) {
        await createNotification(admin.id, 'new_ticket', `Nuevo ticket creado: "${title}" (ID: ${newTicketId})`, newTicketId, 'ticket');
    }
    console.log('[DEBUG createTicket] Ejecutando SELECT de agentes de departamento para notificación...');
    const [departmentAgents] = await pool.query("SELECT u.id FROM users u JOIN departments d ON u.department_id = d.id WHERE u.role = 'agent' AND d.id = ?", [department_id]);
    console.log('[DEBUG createTicket] SELECT de agentes de departamento completado.');
    for (const agent of departmentAgents) {
        await createNotification(agent.id, 'new_ticket_department', `Nuevo ticket en tu departamento: "${title}" (ID: ${newTicketId})`, newTicketId, 'ticket');
    }

    console.log('[DEBUG createTicket] Ejecutando SELECT de nuevo ticket para respuesta...');
    const [newTickets] = await pool.query(`
        SELECT
            t.id,
            t.title,
            t.description,
            t.status,
            t.priority,
            t.department_id,
            d.name AS department_name,
            t.user_id,
            u.username AS user_username,
            u.email AS user_email,
            t.agent_id,
            a.username AS agent_username,
            a.email AS agent_email,
            t.created_at,
            t.updated_at,
            t.closed_at
        FROM
            tickets t
        LEFT JOIN
            users u ON t.user_id = u.id
        LEFT JOIN
            users a ON t.agent_id = a.id
        LEFT JOIN
            departments d ON t.department_id = d.id
        WHERE t.id = ?
    `, [newTicketId]);
    console.log('[DEBUG createTicket] SELECT de nuevo ticket para respuesta completado.');

    res.status(201).json(newTickets[0]);
});

// @desc    Actualizar un ticket
// @route   PUT /api/tickets/:id
// @access  Private (Admin o agente asignado)
const updateTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, status, priority, department_id, agent_id } = req.body;

    console.log(`[DEBUG updateTicket] Iniciando actualización para ticket ID: ${id}`);
    console.log(`[DEBUG updateTicket] Datos recibidos en req.body:`, req.body);

    console.log('[DEBUG updateTicket] Paso 1: Obteniendo ticket existente...');
    const [existingTickets] = await pool.query('SELECT user_id, agent_id, status, priority, title, description, department_id, closed_at FROM tickets WHERE id = ?', [id]);
    const existingTicket = existingTickets[0];
    console.log('[DEBUG updateTicket] Ticket existente:', existingTicket);

    if (!existingTicket) {
        res.status(404);
        throw new Error('Ticket no encontrado');
    }

    // Autorización: solo admin o agente asignado pueden actualizar
    if (req.user.role !== 'admin' && req.user.id !== existingTicket.agent_id) {
        res.status(403);
        throw new Error('No autorizado para actualizar este ticket');
    }

    const updateFields = [];
    const updateValues = [];
    const changes = [];

    console.log('[DEBUG updateTicket] Paso 2: Verificando cambios y preparando logs/notificaciones...');

    // Título
    if (title !== undefined && title !== existingTicket.title) {
        updateFields.push('title = ?'); updateValues.push(title);
        await logActivity(req.user.id, req.user.username, req.user.role, 'ticket_subject_changed', `Asunto cambiado de '${existingTicket.title}' a '${title}'`, 'ticket', id, existingTicket.title, title);
        changes.push(`asunto de '${existingTicket.title}' a '${title}'`);
        console.log(`[DEBUG updateTicket] Cambio detectado: Asunto de '${existingTicket.title}' a '${title}'`);
    }
    // Descripción
    if (description !== undefined && description !== existingTicket.description) {
        updateFields.push('description = ?'); updateValues.push(description);
        await logActivity(req.user.id, req.user.username, req.user.role, 'ticket_description_changed', `Descripción cambiada`, 'ticket', id, existingTicket.description, description);
        changes.push(`descripción`);
        console.log(`[DEBUG updateTicket] Cambio detectado: Descripción`);
    }
    // Estado
    if (status !== undefined && status !== existingTicket.status) {
        updateFields.push('status = ?'); updateValues.push(status);
        await logActivity(req.user.id, req.user.username, req.user.role, 'ticket_status_changed', `Estado cambiado de '${existingTicket.status}' a '${status}'`, 'ticket', id, existingTicket.status, status);
        changes.push(`estado de '${existingTicket.status}' a '${status}'`);
        console.log(`[DEBUG updateTicket] Cambio detectado: Estado de '${existingTicket.status}' a '${status}'`);
        // Manejar closed_at si el estado cambia a 'closed' o 'resolved'
        if (status === 'closed' && existingTicket.closed_at === null) {
            updateFields.push('closed_at = CURRENT_TIMESTAMP');
            changes.push(`fecha de cierre`);
        } else if (status !== 'closed' && existingTicket.closed_at !== null) {
            // Si el estado cambia de 'closed' a otro, resetear closed_at a NULL
            updateFields.push('closed_at = NULL');
            changes.push(`fecha de cierre (reabierto)`);
        }

        // Notificación al usuario si no es el mismo que actualiza
        if (req.user.id !== existingTicket.user_id) {
            await createNotification(existingTicket.user_id, 'status_changed', `El estado de tu ticket #${id} ha cambiado a '${status}'`, id, 'ticket');
        }
        // Notificación al agente si no es el mismo que actualiza y hay agente asignado
        if (existingTicket.agent_id && req.user.id !== existingTicket.agent_id) {
            await createNotification(existingTicket.agent_id, 'status_changed', `El estado del ticket #${id} ha cambiado a '${status}'`, id, 'ticket');
        }
    }
    // Prioridad
    if (priority !== undefined && priority !== existingTicket.priority) {
        updateFields.push('priority = ?'); updateValues.push(priority);
        await logActivity(req.user.id, req.user.username, req.user.role, 'ticket_priority_changed', `Prioridad cambiada de '${existingTicket.priority}' a '${priority}'`, 'ticket', id, existingTicket.priority, priority);
        changes.push(`prioridad de '${existingTicket.priority}' a '${priority}'`);
        console.log(`[DEBUG updateTicket] Cambio detectado: Prioridad de '${existingTicket.priority}' a '${priority}'`);
        // Notificación al usuario si no es el mismo que actualiza
        if (req.user.id !== existingTicket.user_id) {
            await createNotification(existingTicket.user_id, 'priority_changed', `La prioridad de tu ticket #${id} ha cambiado a '${priority}'`, id, 'ticket');
        }
    }

    // Departamento
    console.log('[DEBUG updateTicket] Verificando cambio de departamento...');
    const newDepartmentId = department_id === '' ? null : department_id;
    if (newDepartmentId !== undefined && newDepartmentId !== existingTicket.department_id) {
        updateFields.push('department_id = ?'); updateValues.push(newDepartmentId);
        
        const [oldDeptRows] = await pool.query('SELECT name FROM departments WHERE id = ?', [existingTicket.department_id]);
        const oldDeptName = oldDeptRows && oldDeptRows.length > 0 ? oldDeptRows[0].name : 'Sin Departamento';
        console.log('[DEBUG updateTicket] oldDeptRows:', oldDeptRows, 'oldDeptName:', oldDeptName);

        const [newDeptRows] = newDepartmentId ? await pool.query('SELECT name FROM departments WHERE id = ?', [newDepartmentId]) : [[]];
        const newDeptName = newDeptRows && newDeptRows.length > 0 ? newDeptRows[0].name : 'Sin Departamento';
        console.log('[DEBUG updateTicket] newDeptRows:', newDeptRows, 'newDeptName:', newDeptName);

        await logActivity(req.user.id, req.user.username, req.user.role, 'ticket_department_changed', `Departamento cambiado de '${oldDeptName}' a '${newDeptName}'`, 'ticket', id, oldDeptName, newDeptName);
        changes.push(`departamento de '${oldDeptName}' a '${newDeptName}'`);
        console.log(`[DEBUG updateTicket] Cambio detectado: Departamento de '${oldDeptName}' a '${newDeptName}'`);
    }

    // Agente
    console.log('[DEBUG updateTicket] Verificando cambio de agente...');
    const newAgentId = agent_id === '' || agent_id === null ? null : parseInt(agent_id);
    if (newAgentId !== undefined && newAgentId !== existingTicket.agent_id) {
        updateFields.push('agent_id = ?'); updateValues.push(newAgentId);

        const [oldAgentRows] = existingTicket.agent_id ? await pool.query('SELECT username FROM users WHERE id = ?', [existingTicket.agent_id]) : [[]];
        const oldAgentName = oldAgentRows && oldAgentRows.length > 0 ? oldAgentRows[0].username : 'Sin asignar';
        console.log('[DEBUG updateTicket] oldAgentRows:', oldAgentRows, 'oldAgentName:', oldAgentName);

        const [newAgentRows] = newAgentId ? await pool.query('SELECT username FROM users WHERE id = ?', [newAgentId]) : [[]];
        const newAgentName = newAgentRows && newAgentRows.length > 0 ? newAgentRows[0].username : 'Sin asignar';
        console.log('[DEBUG updateTicket] newAgentRows:', newAgentRows, 'newAgentName:', newAgentName);

        await logActivity(req.user.id, req.user.username, req.user.role, 'ticket_agent_changed', `Agente asignado cambiado de '${oldAgentName}' a '${newAgentName}'`, 'ticket', id, oldAgentName, newAgentName);
        changes.push(`agente asignado de '${oldAgentName}' a '${newAgentName}'`);
        console.log(`[DEBUG updateTicket] Cambio detectado: Agente de '${oldAgentName}' a '${newAgentName}'`);

        // Notificar al nuevo agente si se le asigna el ticket
        if (newAgentId) {
            await createNotification(newAgentId, 'ticket_assigned', `Se te ha asignado el ticket #${id}: "${existingTicket.title}"`, id, 'ticket');
        }
        // Notificar al agente anterior si se le desasigna el ticket
        if (oldAgentName !== 'Sin asignar' && !newAgentId) {
            // Considerar si quieres notificar al agente anterior que se le desasignó
        }
    }

    if (updateFields.length === 0) {
        console.log('[DEBUG updateTicket] No se detectaron cambios. Devolviendo ticket existente.');
        return res.status(200).json(existingTicket);
    }

    const query = `UPDATE tickets SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    updateValues.push(id);

    console.log('[DEBUG updateTicket] Paso 3: Ejecutando UPDATE en la base de datos...');
    await pool.query(query, updateValues);
    console.log('[DEBUG updateTicket] UPDATE completado.');

    const [updatedTickets] = await pool.query('SELECT * FROM tickets WHERE id = ?', [id]);
    console.log('[DEBUG updateTicket] Ticket actualizado obtenido para respuesta:', updatedTickets[0]);

    res.status(200).json(updatedTickets[0]);
});

// @desc    Eliminar un ticket
// @route   DELETE /api/tickets/:id
// @access  Private (Admin only)
const deleteTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;

    console.log(`[DEBUG deleteTicket] Iniciando eliminación para ticket ID: ${id}`);

    const [ticketRows] = await pool.query('SELECT * FROM tickets WHERE id = ?', [id]);
    const ticketToDelete = ticketRows[0];

    if (!ticketToDelete) {
        res.status(404);
        throw new Error('Ticket no encontrado');
    }

    // Autorización: solo admin o el creador del ticket pueden eliminar
    if (req.user.role !== 'admin' && req.user.id !== ticketToDelete.user_id) {
        res.status(403);
        throw new Error('No autorizado para eliminar este ticket');
    }

    // Eliminar comentarios asociados
    await pool.query('DELETE FROM ticket_messages WHERE ticket_id = ?', [id]);
    // Eliminar logs de actividad asociados
    await pool.query('DELETE FROM activity_logs WHERE target_type = ? AND target_id = ?', ['ticket', id]);
    // Eliminar notificaciones asociadas
    await pool.query('DELETE FROM notifications WHERE related_type = ? AND related_id = ?', ['ticket', id]);

    const [result] = await pool.query('DELETE FROM tickets WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado');
    }

    await logActivity(
        req.user.id,
        req.user.username,
        req.user.role,
        'ticket_deleted',
        `eliminó el ticket #${id}: '${ticketToDelete.title}'`,
        'ticket',
        parseInt(id),
        ticketToDelete,
        null
    );

    res.status(200).json({ message: 'Ticket eliminado exitosamente.' });
});

// NUEVO: Función para añadir un comentario a un ticket
// @desc    Añadir un comentario a un ticket
// @route   POST /api/tickets/:id/comments
// @access  Private
const addCommentToTicket = asyncHandler(async (req, res) => {
    const { id: ticketId } = req.params;
    const { message_text } = req.body;
    const userId = req.user.id;
    const username = req.user.username;
    const userRole = req.user.role;

    if (!message_text) {
        res.status(400);
        throw new Error('El mensaje del comentario no puede estar vacío.');
    }

    // Verificar si el ticket existe y si el usuario tiene permiso para comentar
    const [ticketRows] = await pool.query('SELECT user_id, agent_id, title FROM tickets WHERE id = ?', [ticketId]);
    const ticket = ticketRows[0];

    if (!ticket) {
        res.status(404);
        throw new Error('Ticket no encontrado.');
    }

    // Solo el cliente que creó el ticket, el agente asignado o un admin pueden comentar
    if (userRole === 'client' && userId !== ticket.user_id) {
        res.status(403);
        throw new Error('No tienes permiso para comentar en este ticket.');
    }
    if (userRole === 'agent' && userId !== ticket.agent_id && userRole !== 'admin') {
        res.status(403);
        throw new Error('No tienes permiso para comentar en este ticket.');
    }

    console.log(`[DEBUG addCommentToTicket] Añadiendo comentario a ticket ID: ${ticketId} por usuario ID: ${userId}`);

    const [result] = await pool.query(
        'INSERT INTO ticket_messages (ticket_id, user_id, message_text) VALUES (?, ?, ?)',
        [ticketId, userId, message_text]
    );

    const newCommentId = result.insertId;

    // Registrar actividad
    await logActivity(
        userId,
        username,
        userRole,
        'comment_added',
        `añadió un comentario al ticket #${ticketId}: '${message_text.substring(0, 50)}...'`,
        'ticket',
        ticketId,
        null,
        { message_text }
    );

    // Notificar al creador del ticket (si no es el que comenta)
    if (userId !== ticket.user_id) {
        await createNotification(
            ticket.user_id,
            'new_comment',
            `Nuevo comentario en tu ticket #${ticketId}: "${message_text.substring(0, 50)}..."`,
            ticketId,
            'ticket'
        );
    }

    // Notificar al agente asignado (si no es el que comenta y hay un agente)
    if (ticket.agent_id && userId !== ticket.agent_id) {
        await createNotification(
            ticket.agent_id,
            'new_comment',
            `Nuevo comentario en el ticket #${ticketId} asignado a ti: "${message_text.substring(0, 50)}..."`,
            ticketId,
            'ticket'
        );
    }
    
    // Notificar a los administradores (si el que comenta no es admin y no es el creador ni el agente)
    if (userRole !== 'admin' && userId !== ticket.user_id && userId !== ticket.agent_id) {
        const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin'");
        for (const admin of admins) {
            await createNotification(
                admin.id,
                'new_comment_admin',
                `Nuevo comentario en ticket #${ticketId} por ${username}: "${message_text.substring(0, 50)}..."`,
                ticketId,
                'ticket'
            );
        }
    }

    const [newCommentRows] = await pool.query(`
        SELECT tm.id, tm.ticket_id, tm.user_id, u.username AS user_username, tm.message_text AS message, tm.created_at
        FROM ticket_messages tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.id = ?
    `, [newCommentId]);

    res.status(201).json(newCommentRows[0]);
});


module.exports = {
    getAllTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    addCommentToTicket
};
