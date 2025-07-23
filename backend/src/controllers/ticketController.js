// backend/src/controllers/ticketController.js
<<<<<<< HEAD
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');
const { logActivity } = require('../utils/activityLogger');
const { createNotification } = require('../utils/notificationUtils'); // Asegúrate de que la ruta sea correcta

const getAllTickets = asyncHandler(async (req, res) => {
    if (!req.user) {
        res.status(401);
        throw new Error('No autorizado');
    }

    let query = `
        SELECT
            t.id,
            t.subject,
            t.description,
            t.status,
            t.priority,
            t.department_id,
            d.name AS department_name,
            t.user_id,
            u.username AS user_username,
            t.agent_id,
            a.username AS agent_username,
            t.created_at,
            t.updated_at
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
        whereClauses.push('(t.subject LIKE ? OR t.description LIKE ? OR u.username LIKE ? OR a.username LIKE ?)');
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
            t.subject,
            t.description,
            t.status,
            t.priority,
            t.department_id,
            d.name AS department_name,
            t.user_id,
            u.username AS user_username,
            t.agent_id,
            a.username AS agent_username,
            t.created_at,
            t.updated_at
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
        SELECT tm.id, tm.ticket_id, tm.user_id, u.username AS user_username, tm.message_text AS text, tm.created_at
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


    res.status(200).json({ ...ticket, comments, activity_logs: parsedActivityLogs });
});

const createTicket = asyncHandler(async (req, res) => {
    const { subject, description, priority, department_id, user_id } = req.body; // Añadir user_id a la desestructuración

    // Si el usuario no es admin, el user_id siempre será el del usuario autenticado
    let userIdToAssign = req.user.id;
    if (req.user.role === 'admin' && user_id) { // Si es admin y se proporciona un user_id en el body
        userIdToAssign = user_id;
    }

    if (!subject || !description || !priority || !department_id) {
        res.status(400);
        throw new Error('Por favor, incluye todos los campos obligatorios: asunto, descripción, prioridad, departamento.');
    }

    console.log('[DEBUG createTicket] Ejecutando INSERT de nuevo ticket...');
    const [result] = await pool.query(
        'INSERT INTO tickets (user_id, subject, description, priority, department_id) VALUES (?, ?, ?, ?, ?)',
        [userIdToAssign, subject, description, priority, department_id]
    );
    console.log('[DEBUG createTicket] INSERT de nuevo ticket completado.');

    const newTicketId = result.insertId;

    await logActivity(
        req.user.id,
        req.user.username,
        req.user.role,
        'ticket_created',
        `creó el ticket #${newTicketId}: '${subject}'`,
        'ticket',
        newTicketId,
        null,
        { subject, description, priority, department_id, user_id: userIdToAssign }
    );

    console.log('[DEBUG createTicket] Ejecutando SELECT de admins para notificación...');
    const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    console.log('[DEBUG createTicket] SELECT de admins completado.');
    for (const admin of admins) {
        await createNotification(admin.id, 'new_ticket', `Nuevo ticket creado: "${subject}" (ID: ${newTicketId})`, newTicketId, 'ticket');
    }
    console.log('[DEBUG createTicket] Ejecutando SELECT de agentes de departamento para notificación...');
    const [departmentAgents] = await pool.query("SELECT u.id FROM users u JOIN departments d ON u.department_id = d.id WHERE u.role = 'agent' AND d.id = ?", [department_id]);
    console.log('[DEBUG createTicket] SELECT de agentes de departamento completado.');
    for (const agent of departmentAgents) {
        await createNotification(agent.id, 'new_ticket_department', `Nuevo ticket en tu departamento: "${subject}" (ID: ${newTicketId})`, newTicketId, 'ticket');
    }


    console.log('[DEBUG createTicket] Ejecutando SELECT de nuevo ticket para respuesta...');
    const [newTickets] = await pool.query(`
        SELECT
            t.id,
            t.subject,
            t.description,
            t.status,
            t.priority,
            t.department_id,
            d.name AS department_name,
            t.user_id,
            u.username AS user_username,
            t.agent_id,
            a.username AS agent_username,
            t.created_at,
            t.updated_at
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

// @desc     Actualizar un ticket
// @route    PUT /api/tickets/:id
// @access   Private (Admin o agente asignado)
const updateTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { subject, description, status, priority, department_id, agent_id } = req.body;

    console.log(`[DEBUG updateTicket] Iniciando actualización para ticket ID: ${id}`);
    console.log(`[DEBUG updateTicket] Datos recibidos en req.body:`, req.body);

    console.log('[DEBUG updateTicket] Paso 1: Obteniendo ticket existente...');
    const [existingTickets] = await pool.query('SELECT user_id, agent_id, status, priority, subject, description, department_id FROM tickets WHERE id = ?', [id]);
    const existingTicket = existingTickets[0];
    console.log('[DEBUG updateTicket] Ticket existente:', existingTicket);

    if (!existingTicket) {
=======
const pool = require('../config/db');
const asyncHandler = require('express-async-handler');

// @desc    Crear un nuevo ticket
// @route   POST /api/tickets
// @access  Private (Client, Agent, Admin)
const createTicket = asyncHandler(async (req, res) => {
    const { subject, description, department_id, priority } = req.body;
    const userId = req.user.id; 

    if (!subject || !description || !department_id) {
        res.status(400);
        throw new Error('Por favor, proporciona el asunto, la descripción y el departamento.');
    }

    const [departments] = await pool.execute('SELECT id FROM departments WHERE id = ?', [department_id]);
    if (departments.length === 0) {
        res.status(404);
        throw new Error('Departamento no encontrado');
    }

    const [result] = await pool.execute(
        'INSERT INTO tickets (user_id, department_id, subject, description, priority, status) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, department_id, subject, description, priority || 'medium', 'open'] 
    );

    const newTicketId = result.insertId;
    const [newTicket] = await pool.execute(
        'SELECT t.id, t.user_id, t.agent_id, t.department_id, u.username as user_username, d.name as department_name, t.subject, t.description, t.status, t.priority, t.created_at, t.updated_at ' +
        'FROM tickets t JOIN users u ON t.user_id = u.id JOIN departments d ON t.department_id = d.id WHERE t.id = ?',
        [newTicketId]
    );

    res.status(201).json({
        success: true,
        message: 'Ticket creado exitosamente',
        ticket: newTicket[0],
    });
});

// @desc    Obtener todos los tickets (o solo los del cliente, según rol)
// @route   GET /api/tickets
// @access  Private (Client can see their own, Agent/Admin can see all/assigned)
const getAllTickets = asyncHandler(async (req, res) => {
    const userRole = req.user.role;
    const userId = req.user.id;
    let query =
        'SELECT t.id, t.user_id, t.agent_id, t.department_id, u.username AS user_username, d.name AS department_name, ag.username AS agent_username, ' +
        't.subject, t.description, t.status, t.priority, t.created_at, t.updated_at ' +
        'FROM tickets t ' +
        'JOIN users u ON t.user_id = u.id ' +
        'JOIN departments d ON t.department_id = d.id ' +
        'LEFT JOIN users ag ON t.agent_id = ag.id ';

    let queryParams = [];

    if (userRole === 'user') { 
        query += 'WHERE t.user_id = ?';
        queryParams.push(userId);
    } 
    
    query += ' ORDER BY t.created_at DESC';

    const [rows] = await pool.execute(query, queryParams);
    res.status(200).json({ success: true, count: rows.length, tickets: rows });
});

// @desc    Obtener un ticket por ID
// @route   GET /api/tickets/:id
// @access  Private (Client can see their own, Agent/Admin can see any)
const getTicketById = asyncHandler(async (req, res) => {
    const ticketId = req.params.id;
    const userRole = req.user.role;
    const userId = req.user.id;

    let ticketQuery =
        'SELECT t.id, t.user_id, t.agent_id, t.department_id, u.username AS user_username, d.name AS department_name, ag.username AS agent_username, ' +
        't.subject, t.description, t.status, t.priority, t.created_at, t.updated_at ' +
        'FROM tickets t ' +
        'JOIN users u ON t.user_id = u.id ' +
        'JOIN departments d ON t.department_id = d.id ' +
        'LEFT JOIN users ag ON t.agent_id = ag.id ' +
        'WHERE t.id = ?';

    const [ticketRows] = await pool.execute(ticketQuery, [ticketId]);

    if (ticketRows.length === 0) {
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
        res.status(404);
        throw new Error('Ticket no encontrado');
    }

<<<<<<< HEAD
    // Autorización: solo admin o agente asignado pueden actualizar
    if (req.user.role !== 'admin' && req.user.id !== existingTicket.agent_id) {
        res.status(403);
        throw new Error('No autorizado para actualizar este ticket');
    }

    const updateFields = [];
    const updateValues = [];
    const changes = [];

    console.log('[DEBUG updateTicket] Paso 2: Verificando cambios y preparando logs/notificaciones...');

    // Sujeto
    if (subject !== undefined && subject !== existingTicket.subject) {
        updateFields.push('subject = ?'); updateValues.push(subject);
        await logActivity(req.user.id, req.user.username, req.user.role, 'ticket_subject_changed', `Asunto cambiado de '${existingTicket.subject}' a '${subject}'`, 'ticket', id, existingTicket.subject, subject);
        changes.push(`asunto de '${existingTicket.subject}' a '${subject}'`);
        console.log(`[DEBUG updateTicket] Cambio detectado: Asunto de '${existingTicket.subject}' a '${subject}'`);
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
    // Manejar department_id como null si se envía una cadena vacía desde el frontend
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
    const newAgentId = agent_id === '' || agent_id === null ? null : parseInt(agent_id); // Asegurar que sea null si es string vacío o null
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
            await createNotification(newAgentId, 'ticket_assigned', `Se te ha asignado el ticket #${id}: "${existingTicket.subject}"`, id, 'ticket');
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

// @desc     Eliminar un ticket
// @route    DELETE /api/tickets/:id
// @access   Private (Admin only)
const deleteTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;

    console.log(`[DEBUG deleteTicket] Iniciando eliminación para ticket ID: ${id}`);

    const [ticketRows] = await pool.query('SELECT * FROM tickets WHERE id = ?', [id]);
    const ticketToDelete = ticketRows[0];

    if (!ticketToDelete) {
=======
    const ticket = ticketRows[0];

    // Verificar permisos:
    if (userRole === 'user' && ticket.user_id !== userId) {
        res.status(403);
        throw new Error('No tienes permiso para ver este ticket');
    }

    // Obtener comentarios del ticket
    const [commentRows] = await pool.execute(
        'SELECT c.id, c.ticket_id, c.user_id, u.username AS user_username, c.comment_text, c.created_at ' +
        'FROM comments c JOIN users u ON c.user_id = u.id WHERE c.ticket_id = ? ORDER BY c.created_at ASC',
        [ticketId]
    );

    res.status(200).json({ success: true, ticket: ticket, comments: commentRows });
});

// @desc    Actualizar un ticket
// @route   PUT /api/tickets/:id
// @access  Private (Agent, Admin. Client can only update status if reopened/closed)
const updateTicket = asyncHandler(async (req, res) => {
    const { subject, description, status, priority, agent_id, department_id } = req.body;
    const ticketId = req.params.id;
    const userRole = req.user.role;
    const userId = req.user.id;

    const [existingTickets] = await pool.execute('SELECT user_id, agent_id, status FROM tickets WHERE id = ?', [ticketId]);
    if (existingTickets.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado');
    }
    const currentTicket = existingTickets[0];

    // Clientes (rol 'user') solo pueden reabrir un ticket cerrado o resuelto
    if (userRole === 'user') { 
        if (currentTicket.user_id !== userId) {
            res.status(403);
            throw new Error('No tienes permiso para actualizar este ticket');
        }
        if (status && status !== 'open') {
            res.status(403);
            throw new Error('Como cliente, solo puedes reabrir un ticket (cambiar a estado "open").');
        }
        if (subject || description || priority || agent_id !== undefined || department_id) {
            res.status(403);
            throw new Error('Como cliente, solo puedes modificar el estado (reabrir).');
        }
        if (status === 'open' && !['resolved', 'closed'].includes(currentTicket.status)) {
            res.status(400);
            throw new Error('El ticket solo puede reabrirse si está resuelto o cerrado.');
        }
        if (status === 'open') {
            const [result] = await pool.execute(
                'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, ticketId]
            );
            if (result.affectedRows === 0) {
                res.status(404);
                throw new Error('Ticket no encontrado o sin cambios');
            }
            const [updatedTicket] = await pool.execute(
                'SELECT t.id, t.user_id, t.agent_id, t.department_id, u.username AS user_username, d.name AS department_name, ag.username AS agent_username, ' +
                't.subject, t.description, t.status, t.priority, t.created_at, t.updated_at ' +
                'FROM tickets t JOIN users u ON t.user_id = u.id JOIN departments d ON t.department_id = d.id LEFT JOIN users ag ON t.agent_id = ag.id WHERE t.id = ?',
                [ticketId]
            );
            return res.status(200).json({ success: true, message: 'Ticket actualizado exitosamente', ticket: updatedTicket[0] });
        }
    }

    // Agentes y Admins pueden actualizar cualquier campo
    let updateFields = [];
    let updateValues = [];

    if (subject) {
        updateFields.push('subject = ?');
        updateValues.push(subject);
    }
    if (description) {
        updateFields.push('description = ?');
        updateValues.push(description);
    }
    if (status) {
        updateFields.push('status = ?');
        updateValues.push(status);
        if (['in-progress', 'assigned'].includes(status) && !currentTicket.agent_id && (userRole === 'agent' || userRole === 'admin') && agent_id === undefined) {
             updateFields.push('agent_id = ?');
             updateValues.push(userId);
        }
    }
    if (priority) {
        updateFields.push('priority = ?');
        updateValues.push(priority);
    }
    if (agent_id !== undefined) { // Permite desasignar si agent_id es null
        updateFields.push('agent_id = ?');
        updateValues.push(agent_id);
    }
    if (department_id) {
        const [departments] = await pool.execute('SELECT id FROM departments WHERE id = ?', [department_id]);
        if (departments.length === 0) {
            res.status(404);
            throw new Error('Departamento no encontrado para actualizar');
        }
        updateFields.push('department_id = ?');
        updateValues.push(department_id);
    }

    if (updateFields.length === 0) {
        res.status(400);
        throw new Error('No hay datos para actualizar');
    }

    const query = `UPDATE tickets SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    updateValues.push(ticketId);

    const [result] = await pool.execute(query, updateValues);

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado o sin cambios');
    }

    const [updatedTicket] = await pool.execute(
        'SELECT t.id, t.user_id, t.agent_id, t.department_id, u.username AS user_username, d.name AS department_name, ag.username AS agent_username, ' +
        't.subject, t.description, t.status, t.priority, t.created_at, t.updated_at ' +
        'FROM tickets t JOIN users u ON t.user_id = u.id JOIN departments d ON t.department_id = d.id LEFT JOIN users ag ON t.agent_id = ag.id WHERE t.id = ?',
        [ticketId]
    );

    res.status(200).json({ success: true, message: 'Ticket actualizado exitosamente', ticket: updatedTicket[0] });
});

// @desc    Eliminar un ticket
// @route   DELETE /api/tickets/:id
// @access  Private/Admin
const deleteTicket = asyncHandler(async (req, res) => {
    const ticketId = req.params.id;
    const userRole = req.user.role;

    const [ticketExists] = await pool.execute('SELECT id FROM tickets WHERE id = ?', [ticketId]);
    if (ticketExists.length === 0) {
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
        res.status(404);
        throw new Error('Ticket no encontrado');
    }

<<<<<<< HEAD
    // Opcional: Eliminar comentarios asociados si existen
    await pool.query('DELETE FROM ticket_messages WHERE ticket_id = ?', [id]);
    console.log(`[DEBUG deleteTicket] Comentarios asociados al ticket ${id} eliminados.`);

    await pool.query('DELETE FROM tickets WHERE id = ?', [id]);
    console.log(`[DEBUG deleteTicket] Ticket ${id} eliminado de la base de datos.`);

    await logActivity(
        req.user.id,
        req.user.username,
        req.user.role,
        'ticket_deleted',
        `eliminó el ticket #${id}: '${ticketToDelete.subject}'`,
        'ticket',
        id,
        ticketToDelete,
        null
    );

    res.status(200).json({ message: 'Ticket eliminado exitosamente' });
});

// NUEVO: Función para añadir un comentario a un ticket
// @desc    Añadir un comentario a un ticket
// @route   POST /api/tickets/:id/comments
// @access  Private
const addCommentToTicket = asyncHandler(async (req, res) => {
    const { id: ticketId } = req.params;
    const { message_text } = req.body; // Asegúrate de que el frontend envíe 'message_text'
    const userId = req.user.id;
    const username = req.user.username;
    const userRole = req.user.role;

    if (!message_text) {
        res.status(400);
        throw new Error('El mensaje del comentario no puede estar vacío.');
    }

    // Verificar si el ticket existe y si el usuario tiene permiso para comentar
    const [ticketRows] = await pool.query('SELECT user_id, agent_id, subject FROM tickets WHERE id = ?', [ticketId]);
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
    if (userRole === 'agent' && userId !== ticket.agent_id && userRole !== 'admin') { // Agente puede comentar si está asignado o es admin
        res.status(403);
        throw new Error('No tienes permiso para comentar en este ticket.');
    }
    // Si es admin, puede comentar sin más validación de asignación.

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
        null, // No hay valor antiguo para un comentario nuevo
        { message_text } // Nuevo valor del comentario
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
    // Esto es para asegurar que los admins estén al tanto de la actividad si no están directamente involucrados
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
        SELECT tm.id, tm.ticket_id, tm.user_id, u.username AS user_username, tm.message_text AS text, tm.created_at
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
    addCommentToTicket // NUEVO: Exportar la función
};
=======
    if (userRole !== 'admin') {
        res.status(403);
        throw new Error('No tienes permiso para eliminar tickets.');
    }

    await pool.execute('DELETE FROM comments WHERE ticket_id = ?', [ticketId]);
    await pool.execute('DELETE FROM attachments WHERE ticket_id = ?', [ticketId]);

    const [result] = await pool.execute('DELETE FROM tickets WHERE id = ?', [ticketId]);

    if (result.affectedRows === 0) {
        res.status(500);
        throw new Error('Error al eliminar el ticket');
    }
    res.status(200).json({ success: true, message: 'Ticket y sus datos relacionados eliminados exitosamente' });
});

// @desc    Agregar un comentario a un ticket
// @route   POST /api/tickets/:id/comments
// @access  Private (User, Agent, Admin)
const addCommentToTicket = asyncHandler(async (req, res) => {
    const { comment_text } = req.body;
    const ticketId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!comment_text) {
        res.status(400);
        throw new Error('El comentario no puede estar vacío');
    }

    const [tickets] = await pool.execute('SELECT user_id, status FROM tickets WHERE id = ?', [ticketId]);
    if (tickets.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado para agregar comentario');
    }
    const ticket = tickets[0];

    if (userRole === 'user' && ticket.user_id !== userId) {
        res.status(403);
        throw new Error('No tienes permiso para comentar en este ticket.');
    }

    const [result] = await pool.execute(
        'INSERT INTO comments (ticket_id, user_id, comment_text) VALUES (?, ?, ?)',
        [ticketId, userId, comment_text]
    );

    const newCommentId = result.insertId;
    const [newComment] = await pool.execute(
        'SELECT c.id, c.ticket_id, c.user_id, u.username AS user_username, c.comment_text, c.created_at ' +
        'FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?',
        [newCommentId]
    );

    res.status(201).json({
        success: true,
        message: 'Comentario agregado exitosamente',
        comment: newComment[0],
    });
});

// @desc    Obtener comentarios para un ticket
// @route   GET /api/tickets/:id/comments
// @access  Private (User, Agent, Admin)
const getCommentsForTicket = asyncHandler(async (req, res) => {
    const ticketId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [tickets] = await pool.execute('SELECT user_id FROM tickets WHERE id = ?', [ticketId]);
    if (tickets.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado para obtener comentarios');
    }
    const ticket = tickets[0];

    if (userRole === 'user' && ticket.user_id !== userId) {
        res.status(403);
        throw new Error('No tienes permiso para ver los comentarios de este ticket.');
    }

    const [comments] = await pool.execute(
        'SELECT c.id, c.ticket_id, c.user_id, u.username AS user_username, c.comment_text, c.created_at ' +
        'FROM comments c JOIN users u ON c.user_id = u.id WHERE c.ticket_id = ? ORDER BY c.created_at ASC',
        [ticketId]
    );

    res.status(200).json({ success: true, count: comments.length, comments: comments });
});

// @desc    Asignar un ticket a un agente (MANUAL)
// @route   PUT /api/tickets/:id/assign
// @access  Private/Admin
const assignTicketToAgent = asyncHandler(async (req, res) => {
    const { agent_id } = req.body;
    const ticketId = req.params.id;
    const userRole = req.user.role;

    if (userRole !== 'admin' && userRole !== 'agent') {
        res.status(403);
        throw new Error('No tienes permiso para asignar tickets.');
    }

    if (agent_id !== null && agent_id !== undefined) {
        const [agentExists] = await pool.execute('SELECT id FROM users WHERE id = ? AND role = "agent"', [agent_id]);
        if (agentExists.length === 0) {
            res.status(400);
            throw new Error('El ID de agente proporcionado no es válido o no es un agente.');
        }
    }

    const [result] = await pool.execute(
        'UPDATE tickets SET agent_id = ?, status = "in-progress", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [agent_id, ticketId]
    );

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado o no se pudo asignar');
    }

    res.status(200).json({ success: true, message: 'Ticket asignado exitosamente' });
});

// @desc    Cambiar el estado de un ticket
// @route   PUT /api/tickets/:id/status
// @access  Private (Agent, Admin)
const changeTicketStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const ticketId = req.params.id;
    const userRole = req.user.role;
    const userId = req.user.id;
    const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];

    if (!status || !validStatuses.includes(status)) {
        res.status(400);
        throw new Error(`Estado inválido. Los estados permitidos son: ${validStatuses.join(', ')}`);
    }

    const [tickets] = await pool.execute('SELECT user_id, agent_id FROM tickets WHERE id = ?', [ticketId]);
    if (tickets.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado');
    }
    const ticket = tickets[0];

    if (userRole === 'user') {
        res.status(403);
        throw new Error('Los clientes solo pueden reabrir tickets a través de la actualización general (PUT /api/tickets/:id).');
    }

    if (userRole === 'agent') {
        if (ticket.agent_id !== userId && ticket.status !== 'open') {
            res.status(403);
            throw new Error('No tienes permiso para cambiar el estado de este ticket.');
        }
        if (status === 'in-progress' && !ticket.agent_id) {
            const [result] = await pool.execute(
                'UPDATE tickets SET status = ?, agent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [status, userId, ticketId]
            );
            if (result.affectedRows === 0) {
                res.status(404);
                throw new Error('Ticket no encontrado o no se pudo actualizar el estado');
            }
            return res.status(200).json({ success: true, message: `Estado del ticket actualizado a: ${status} y asignado a ti` });
        }
    }

    const [result] = await pool.execute(
        'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, ticketId]
    );

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado o no se pudo actualizar el estado');
    }

    res.status(200).json({ success: true, message: `Estado del ticket actualizado a: ${status}` });
});

// @desc    Subir un adjunto a un ticket
// @route   POST /api/tickets/:id/upload
// @access  Private (User, Agent, Admin)
const uploadAttachment = asyncHandler(async (req, res) => {
    const ticketId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const [tickets] = await pool.execute('SELECT user_id, agent_id, status FROM tickets WHERE id = ?', [ticketId]);
    if (tickets.length === 0) {
        res.status(404);
        throw new Error('Ticket no encontrado para subir adjunto');
    }
    const ticket = tickets[0];

    if (userRole === 'user' && ticket.user_id !== userId) {
      res.status(403);
      throw new Error('No tienes permiso para adjuntar archivos a este ticket.');
    }
    if (userRole === 'agent' && ticket.agent_id !== userId && ticket.user_id !== userId) {
        res.status(403);
        throw new Error('No tienes permiso para adjuntar archivos a este ticket.');
    }

    if (!req.file) {
        res.status(400);
        throw new Error('No se proporcionó ningún archivo para subir.');
    }

    const { originalname, mimetype, filename, size } = req.file;

    const [result] = await pool.execute(
        'INSERT INTO attachments (ticket_id, user_id, file_name, file_type, file_path, file_size) VALUES (?, ?, ?, ?, ?, ?)',
        [ticketId, userId, originalname, mimetype, filename, size]
    );

    res.status(201).json({
        success: true,
        message: 'Archivo adjunto subido exitosamente',
        attachment: {
            id: result.insertId,
            file_name: originalname,
            file_type: mimetype,
            file_server_name: filename,
            file_size: size,
        },
    });
});

// NUEVO: Función para asignar tickets no asignados aleatoriamente
// Esta función NO es un controlador de ruta directamente, sino una utilidad.
// Debería ser llamada por un scheduler (ej. cron job)
const assignRandomUnassignedTickets = asyncHandler(async () => {
    console.log('[Scheduler] Iniciando asignación aleatoria de tickets no asignados...');

    const [unassignedTickets] = await pool.execute(
        `SELECT id FROM tickets 
         WHERE agent_id IS NULL 
         AND status = 'open'
         AND created_at < NOW() - INTERVAL 2 HOUR` // Tickets creados hace más de 2 horas
    );

    if (unassignedTickets.length === 0) {
        console.log('[Scheduler] No hay tickets abiertos sin asignar que cumplan el criterio de 2 horas.');
        return;
    }

    const [agents] = await pool.execute(
        `SELECT id FROM users WHERE role = 'agent'`
    );

    if (agents.length === 0) {
        console.warn('[Scheduler] No hay agentes disponibles para asignar tickets.');
        return;
    }

    let assignedCount = 0;
    for (const ticket of unassignedTickets) {
        const randomAgent = agents[Math.floor(Math.random() * agents.length)];
        await pool.execute(
            'UPDATE tickets SET agent_id = ?, status = "in-progress", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [randomAgent.id, ticket.id]
        );
        assignedCount++;
    }

    console.log(`[Scheduler] ${assignedCount} tickets asignados aleatoriamente.`);
});

module.exports = {
    createTicket,
    getAllTickets,
    getTicketById,
    updateTicket,
    deleteTicket,
    addCommentToTicket,
    getCommentsForTicket,
    assignTicketToAgent,
    changeTicketStatus,
    uploadAttachment,
    assignRandomUnassignedTickets, // Exportar la nueva función
};
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
