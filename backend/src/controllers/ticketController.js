// backend/src/controllers/ticketController.js
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');
const { logActivity } = require('../utils/activityLogger');
const { createNotification } = require('../utils/notificationUtils');

// @desc    Obtener todos los tickets
// @route   GET /api/tickets
// @access  Private
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
            t.assigned_to_user_id, -- Usar assigned_to_user_id
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
            users a ON t.assigned_to_user_id = a.id -- Unir por assigned_to_user_id
        LEFT JOIN
            departments d ON t.department_id = d.id
    `;
    const whereClauses = [];
    const queryParams = [];

    if (req.user.role === 'client') {
        whereClauses.push('t.user_id = ?');
        queryParams.push(req.user.id);
    } else if (req.user.role === 'agent') {
        whereClauses.push('(t.assigned_to_user_id = ? OR t.assigned_to_user_id IS NULL)'); // Usar assigned_to_user_id
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
            whereClauses.push('t.assigned_to_user_id IS NULL'); // Usar assigned_to_user_id
        } else {
            whereClauses.push('t.assigned_to_user_id = ?'); // Usar assigned_to_user_id
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


// @desc    Obtener ticket por ID
// @route   GET /api/tickets/:id
// @access  Private
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
            t.assigned_to_user_id, -- Usar assigned_to_user_id
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
            users a ON t.assigned_to_user_id = a.id -- Unir por assigned_to_user_id
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

    // Autorización: admin, creador del ticket o agente asignado
    if (req.user.role !== 'admin' && req.user.id !== ticket.user_id && req.user.id !== ticket.assigned_to_user_id) { // Usar assigned_to_user_id
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
    console.log('[DEBUG getTicketById] Consulta de comentarios completada. Comentarios obtenidos:', comments); 

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

    console.log('[DEBUG getTicketById] Objeto de ticket final a enviar:', { ...ticket, comments, activity_logs: parsedActivityLogs });

    res.status(200).json({ ...ticket, comments, activity_logs: parsedActivityLogs });
});

// @desc    Crear un nuevo ticket
// @route   POST /api/tickets
// @access  Private
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
            t.assigned_to_user_id, -- Usar assigned_to_user_id
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
            users a ON t.assigned_to_user_id = a.id -- Unir por assigned_to_user_id
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
    // Usar 'assigned_to_user_id' para que coincida con la DB y el frontend
    let { title, description, status, priority, department_id, assigned_to_user_id } = req.body; 

    console.log(`[DEBUG updateTicket] Iniciando actualización para ticket ID: ${id}`);
    console.log(`[DEBUG updateTicket] Datos recibidos en req.body (raw):`, req.body);

    department_id = (department_id === '' || isNaN(parseInt(department_id))) ? null : parseInt(department_id);
    assigned_to_user_id = (assigned_to_user_id === '' || isNaN(parseInt(assigned_to_user_id))) ? null : parseInt(assigned_to_user_id); 

    console.log(`[DEBUG updateTicket] Datos procesados (department_id: ${department_id}, assigned_to_user_id: ${assigned_to_user_id})`);


    console.log('[DEBUG updateTicket] Paso 1: Obteniendo ticket existente...');
    const [existingTickets] = await pool.query('SELECT user_id, assigned_to_user_id, status, priority, title, description, department_id, closed_at FROM tickets WHERE id = ?', [id]); // Usar assigned_to_user_id
    const existingTicket = existingTickets[0];
    console.log('[DEBUG updateTicket] Ticket existente:', existingTicket);

    if (!existingTicket) {
        res.status(404);
        throw new Error('Ticket no encontrado');
    }

    if (req.user.role !== 'admin' && req.user.id !== existingTicket.assigned_to_user_id) { // Usar assigned_to_user_id
        res.status(403);
        throw new Error('No autorizado para actualizar este ticket');
    }

    const updateFields = [];
    const updateValues = [];
    const changes = [];

    console.log('[DEBUG updateTicket] Paso 2: Verificando cambios y preparando logs/notificaciones...');

    if (title !== undefined && title !== existingTicket.title) {
        updateFields.push('title = ?'); updateValues.push(title);
        await logActivity(req.user.id, req.user.username, req.user.role, 'ticket_subject_changed', `Asunto cambiado de '${existingTicket.title}' a '${title}'`, 'ticket', id, existingTicket.title, title);
        changes.push(`asunto de '${existingTicket.title}' a '${title}'`);
        console.log(`[DEBUG updateTicket] Cambio detectado: Asunto de '${existingTicket.title}' a '${title}'`);
    }
    if (description !== undefined && description !== existingTicket.description) {
        updateFields.push('description = ?'); updateValues.push(description);
        await logActivity(req.user.id, req.user.username, req.user.role, 'ticket_description_changed', `Descripción cambiada`, 'ticket', id, existingTicket.description, description);
        changes.push(`descripción`);
        console.log(`[DEBUG updateTicket] Cambio detectado: Descripción`);
    }
    if (status !== undefined && status !== existingTicket.status) {
        updateFields.push('status = ?'); updateValues.push(status);
        await logActivity(req.user.id, req.user.username, req.user.role, 'ticket_status_changed', `Estado cambiado de '${existingTicket.status}' a '${status}'`, 'ticket', id, existingTicket.status, status);
        changes.push(`estado de '${existingTicket.status}' a '${status}'`);
        console.log(`[DEBUG updateTicket] Cambio detectado: Estado de '${existingTicket.status}' a '${status}'`);
        if (status === 'closed' && existingTicket.closed_at === null) {
            updateFields.push('closed_at = CURRENT_TIMESTAMP');
            changes.push(`fecha de cierre`);
        } else if (status !== 'closed' && existingTicket.closed_at !== null) {
            updateFields.push('closed_at = NULL');
            changes.push(`fecha de cierre (reabierto)`);
        }

        if (req.user.id !== existingTicket.user_id) {
            await createNotification(existingTicket.user_id, 'status_changed', `El estado de tu ticket #${id} ha cambiado a '${status}'`, id, 'ticket');
        }
        if (existingTicket.assigned_to_user_id && req.user.id !== existingTicket.assigned_to_user_id) { // Usar assigned_to_user_id
            await createNotification(existingTicket.assigned_to_user_id, 'status_changed', `El estado del ticket #${id} ha cambiado a '${status}'`, id, 'ticket'); // Usar assigned_to_user_id
        }
    }
    if (priority !== undefined && priority !== existingTicket.priority) {
        updateFields.push('priority = ?'); updateValues.push(priority);
        await logActivity(req.user.id, req.user.username, req.user.role, 'ticket_priority_changed', `Prioridad cambiada de '${existingTicket.priority}' a '${priority}'`, 'ticket', id, existingTicket.priority, priority);
        changes.push(`prioridad de '${existingTicket.priority}' a '${priority}'`);
        console.log(`[DEBUG updateTicket] Cambio detectado: Prioridad de '${existingTicket.priority}' a '${priority}'`);
        if (req.user.id !== existingTicket.user_id) {
            await createNotification(existingTicket.user_id, 'priority_changed', `La prioridad de tu ticket #${id} ha cambiado a '${priority}'`, id, 'ticket');
        }
    }

    console.log('[DEBUG updateTicket] Verificando cambio de departamento...');
    if (department_id !== undefined && department_id !== existingTicket.department_id) {
        updateFields.push('department_id = ?'); updateValues.push(department_id);
        
        const [oldDeptRows] = await pool.query('SELECT name FROM departments WHERE id = ?', [existingTicket.department_id]);
        const oldDeptName = oldDeptRows && oldDeptRows.length > 0 ? oldDeptRows[0].name : 'Sin Departamento';
        console.log('[DEBUG updateTicket] oldDeptRows:', oldDeptRows, 'oldDeptName:', oldDeptName);

        const [newDeptRows] = department_id ? await pool.query('SELECT name FROM departments WHERE id = ?', [department_id]) : [[]];
        const newDeptName = newDeptRows && newDeptRows.length > 0 ? newDeptRows[0].name : 'Sin Departamento';
        console.log('[DEBUG updateTicket] newDeptRows:', newDeptRows, 'newDeptName:', newDeptName);

        await logActivity(req.user.id, req.user.username, req.user.role, 'ticket_department_changed', `Departamento cambiado de '${oldDeptName}' a '${newDeptName}'`, 'ticket', id, oldDeptName, newDeptName);
        changes.push(`departamento de '${oldDeptName}' a '${newDeptName}'`);
        console.log(`[DEBUG updateTicket] Cambio detectado: Departamento de '${oldDeptName}' a '${newDeptName}'`);
    }

    console.log('[DEBUG updateTicket] Verificando cambio de agente...');
    if (assigned_to_user_id !== undefined && assigned_to_user_id !== existingTicket.assigned_to_user_id) { 
        updateFields.push('assigned_to_user_id = ?'); updateValues.push(assigned_to_user_id); 

        const [oldAgentRows] = existingTicket.assigned_to_user_id ? await pool.query('SELECT username FROM users WHERE id = ?', [existingTicket.assigned_to_user_id]) : [[]]; 
        const oldAgentName = oldAgentRows && oldAgentRows.length > 0 ? oldAgentRows[0].username : 'Sin asignar';
        console.log('[DEBUG updateTicket] oldAgentRows:', oldAgentRows, 'oldAgentName:', oldAgentName);

        const [newAgentRows] = assigned_to_user_id ? await pool.query('SELECT username FROM users WHERE id = ?', [assigned_to_user_id]) : [[]]; 
        const newAgentName = newAgentRows && newAgentRows.length > 0 ? newAgentRows[0].username : 'Sin asignar';
        console.log('[DEBUG updateTicket] newAgentRows:', newAgentRows, 'newAgentName:', newAgentName);

        await logActivity(req.user.id, req.user.username, req.user.role, 'ticket_agent_changed', `Agente asignado cambiado de '${oldAgentName}' a '${newAgentName}'`, 'ticket', id, oldAgentName, newAgentName);
        changes.push(`agente asignado de '${oldAgentName}' a '${newAgentName}'`);
        console.log(`[DEBUG updateTicket] Cambio detectado: Agente de '${oldAgentName}' a '${newAgentName}'`);

        if (assigned_to_user_id) { 
            await createNotification(assigned_to_user_id, 'ticket_assigned', `Se te ha asignado el ticket #${id}: "${existingTicket.title}"`, id, 'ticket'); 
        }
        if (oldAgentName !== 'Sin asignar' && !assigned_to_user_id) { 
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
    console.log('[DEBUG updateTicket] Query:', query);
    console.log('[DEBUG updateTicket] Values:', updateValues);
    await pool.query(query, updateValues);
    console.log('[DEBUG updateTicket] UPDATE completado.');

    const [updatedTickets] = await pool.query(`
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
            t.assigned_to_user_id, 
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
            users a ON t.assigned_to_user_id = a.id 
        LEFT JOIN
            departments d ON t.department_id = d.id
        WHERE t.id = ?
    `, [id]);
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

    if (req.user.role !== 'admin' && req.user.id !== ticketToDelete.user_id) {
        res.status(403);
        throw new Error('No autorizado para eliminar este ticket');
    }

    await pool.query('DELETE FROM ticket_messages WHERE ticket_id = ?', [id]);
    await pool.query('DELETE FROM activity_logs WHERE target_type = ? AND target_id = ?', ['ticket', id]);
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

    const [ticketRows] = await pool.query('SELECT user_id, assigned_to_user_id, title FROM tickets WHERE id = ?', [ticketId]); // Usar assigned_to_user_id
    const ticket = ticketRows[0];

    if (!ticket) {
        res.status(404);
        throw new Error('Ticket no encontrado.');
    }

    if (userRole === 'client' && userId !== ticket.user_id) {
        res.status(403);
        throw new Error('No tienes permiso para comentar en este ticket.');
    }
    if (userRole === 'agent' && userId !== ticket.assigned_to_user_id && userRole !== 'admin') { // Usar assigned_to_user_id
        res.status(403);
        throw new Error('No tienes permiso para comentar en este ticket.');
    }

    console.log(`[DEBUG addCommentToTicket] Añadiendo comentario a ticket ID: ${ticketId} por usuario ID: ${userId}`);

    const [result] = await pool.query(
        'INSERT INTO ticket_messages (ticket_id, user_id, message_text) VALUES (?, ?, ?)',
        [ticketId, userId, message_text]
    );

    const newCommentId = result.insertId;

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

    if (userId !== ticket.user_id) {
        await createNotification(
            ticket.user_id,
            'new_comment',
            `Nuevo comentario en tu ticket #${ticketId}: "${message_text.substring(0, 50)}..."`,
            ticketId,
            'ticket'
        );
    }

    if (ticket.assigned_to_user_id && userId !== ticket.assigned_to_user_id) { // Usar assigned_to_user_id
        await createNotification(
            ticket.assigned_to_user_id, // Usar assigned_to_user_id
            'new_comment',
            `Nuevo comentario en el ticket #${ticketId} asignado a ti: "${message_text.substring(0, 50)}..."`,
            ticketId,
            'ticket'
        );
    }
    
    if (userRole !== 'admin' && userId !== ticket.user_id && userId !== ticket.assigned_to_user_id) { // Usar assigned_to_user_id
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
