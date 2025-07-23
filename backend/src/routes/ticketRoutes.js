<<<<<<< HEAD
// backend/routes/ticketRoutes.js
const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(express.json());

// @desc    Obtener todos los tickets (con filtros y paginación opcionales)
// @route   GET /api/tickets
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
    const { status, priority, department_id, agent_id, search, limit } = req.query;
    const userId = req.user.id; // ID del usuario autenticado
    const userRole = req.user.role; // Rol del usuario autenticado

    let query = `
        SELECT 
            t.id, t.title, t.description, t.status, t.priority,
            t.user_id, u.username AS user_username, u.email AS user_email,
            t.assigned_to_user_id, a.username AS agent_username, a.email AS agent_email,
            t.department_id, d.name AS department_name,
            t.created_at, t.updated_at, t.closed_at
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN users a ON t.assigned_to_user_id = a.id
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE 1=1
    `;
    const params = [];

    // Filtrar por rol de usuario
    if (userRole === 'client') {
        query += ` AND t.user_id = ?`;
        params.push(userId);
    } else if (userRole === 'agent') {
        query += ` AND (t.assigned_to_user_id = ? OR t.assigned_to_user_id IS NULL)`;
        params.push(userId);
    }

    if (status) {
        const statusValues = status.split(',');
        console.log('[Backend - Tickets Debug] statusValues (raw):', statusValues);
        if (statusValues.length > 0 && statusValues[0] !== '') {
            const escapedStatusValues = statusValues.map(s => pool.escape(s)).join(',');
            query += ` AND t.status IN (${escapedStatusValues})`;
            console.log('[Backend - Tickets Debug] Status filter applied (direct interpolation). SQL IN clause:', `IN (${escapedStatusValues})`);
        } else {
            console.log('[Backend - Tickets Debug] Status filter present but empty or invalid:', status);
        }
    }

    if (priority) {
        const priorityValues = priority.split(',');
        console.log('[Backend - Tickets Debug] priorityValues (raw):', priorityValues);
        if (priorityValues.length > 0 && priorityValues[0] !== '') {
            const escapedPriorityValues = priorityValues.map(p => pool.escape(p)).join(',');
            query += ` AND t.priority IN (${escapedPriorityValues})`;
            console.log('[Backend - Tickets Debug] Priority filter applied (direct interpolation). SQL IN clause:', `IN (${escapedPriorityValues})`);
        } else {
            console.log('[Backend - Tickets Debug] Priority filter present but empty or invalid:', priority);
        }
    }

    if (department_id && department_id !== 'all') {
        query += ` AND t.department_id = ?`;
        params.push(department_id);
    }

    if (agent_id) {
        if (agent_id === 'unassigned') {
            query += ` AND t.assigned_to_user_id IS NULL`;
        } else if (agent_id !== 'all') {
            query += ` AND t.assigned_to_user_id = ?`;
            params.push(agent_id);
        }
    }

    if (search) {
        query += ` AND (t.title LIKE ? OR t.description LIKE ? OR u.username LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY t.created_at DESC`;

    if (limit) {
        query += ` LIMIT ?`;
        params.push(Number(limit)); 
    }

    try {
        console.log('[Backend - Tickets] FINAL SQL Query:', query);
        console.log('[Backend - Tickets] FINAL Query Parameters:', params);
        console.log('[Backend - Tickets] Number of placeholders in query:', (query.match(/\?/g) || []).length);
        console.log('[Backend - Tickets] Number of parameters in array:', params.length);

        const [rows] = await pool.execute(query, params);
        
        console.log('[Backend - Tickets] Tickets fetched from DB:', rows);

        res.json({ tickets: rows });
    } catch (error) {
        console.error('Error fetching tickets:', error.message, error.stack);
        res.status(500).json({ message: 'Internal server error fetching tickets.' });
    }
}));

// @desc    Obtener un ticket por ID
// @route   GET /api/tickets/:id
// @access  Private
router.get('/:id', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
        SELECT 
            t.id, t.title, t.description, t.status, t.priority,
            t.user_id, u.username AS user_username, u.email AS user_email,
            t.assigned_to_user_id, a.username AS agent_username, a.email AS agent_email,
            t.department_id, d.name AS department_name,
            t.created_at, t.updated_at, t.closed_at
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN users a ON t.assigned_to_user_id = a.id
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE t.id = ?
    `;
    const params = [id];

    if (userRole === 'client') {
        query += ` AND t.user_id = ?`;
        params.push(userId);
    } else if (userRole === 'agent') {
        query += ` AND (t.assigned_to_user_id = ? OR t.assigned_to_user_id IS NULL)`;
        params.push(userId);
    }

    try {
        const [rows] = await pool.execute(query, params);

        if (rows.length === 0) {
            res.status(404);
            throw new Error('Ticket no encontrado o no autorizado para ver este ticket.');
        }

        const ticket = rows[0];

        const [comments] = await pool.execute(
            `SELECT c.id, c.ticket_id, c.user_id, u.username AS user_username, c.message AS text, c.created_at
             FROM ticket_responses c
             JOIN users u ON c.user_id = u.id
             WHERE c.ticket_id = ?
             ORDER BY c.created_at ASC`,
            [id]
        );
        ticket.comments = comments;

        const [activityLogs] = await pool.execute(
            `SELECT al.id, al.user_id, u.username AS user_username, u.role AS user_role,
                    al.activity_type, al.description, al.created_at
             FROM activity_logs al
             LEFT JOIN users u ON al.user_id = u.id
             WHERE al.ticket_id = ?
             ORDER BY al.created_at ASC`,
            [id]
        );
        ticket.activity_logs = activityLogs;

        res.json(ticket);
    } catch (error) {
        console.error('Error al obtener ticket por ID:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al obtener ticket.' });
    }
}));

// @desc    Crear un nuevo ticket
// @route   POST /api/tickets
// @access  Private
router.post('/', protect, asyncHandler(async (req, res) => {
    const { title, description, priority, department_id, agent_id } = req.body;
    const userId = req.user.id;

    if (!title || !description || !priority || !department_id) {
        res.status(400);
        throw new Error('Por favor, ingresa todos los campos obligatorios: asunto, descripción, prioridad, departamento.');
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO tickets (title, description, status, priority, user_id, department_id, assigned_to_user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [title, description, 'open', priority, userId, department_id, agent_id || null]
        );

        const newTicketId = result.insertId;
        const [newTicketRows] = await pool.execute(
            `SELECT 
                t.id, t.title, t.description, t.status, t.priority,
                t.user_id, u.username AS user_username, u.email AS user_email,
                t.assigned_to_user_id, a.username AS agent_username, a.email AS agent_email,
                t.department_id, d.name AS department_name,
                t.created_at, t.updated_at, t.closed_at
             FROM tickets t
             LEFT JOIN users u ON t.user_id = u.id
             LEFT JOIN users a ON t.assigned_to_user_id = a.id
             LEFT JOIN departments d ON t.department_id = d.id
             WHERE t.id = ?`,
            [newTicketId]
        );

        await pool.execute(
            `INSERT INTO activity_logs (user_id, activity_type, description, ticket_id)
             VALUES (?, ?, ?, ?)`,
            [
                req.user.id,
                'ticket_created',
                `creó el ticket "${title}" con prioridad "${priority}" en el departamento "${newTicketRows[0].department_name}".`,
                newTicketId
            ]
        );

        await pool.execute(
            `INSERT INTO notifications (user_id, type, message, related_id, related_type)
             VALUES (?, ?, ?, ?, ?)`,
            [
                req.user.id,
                'ticket_status_update',
                `Tu ticket "${title}" (ID: ${newTicketId}) ha sido creado exitosamente.`,
                newTicketId,
                'ticket'
            ]
        );

        if (agent_id) {
            await pool.execute(
                `INSERT INTO notifications (user_id, type, message, related_id, related_type)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    agent_id,
                    'ticket_assigned',
                    `Se te ha asignado un nuevo ticket: "${title}" (ID: ${newTicketId}).`,
                    newTicketId,
                    'ticket'
                ]
            );
        } else {
            const [adminUsers] = await pool.execute(`SELECT id FROM users WHERE role = 'admin'`);
            for (const admin of adminUsers) {
                await pool.execute(
                    `INSERT INTO notifications (user_id, type, message, related_id, related_type)
                             VALUES (?, ?, ?, ?, ?)`,
                    [
                        admin.id,
                        'new_unassigned_ticket',
                        `Un nuevo ticket sin asignar ha sido creado: "${title}" (ID: ${newTicketId}).`,
                        newTicketId,
                        'ticket'
                    ]
                );
            }
        }

        res.status(201).json(newTicketRows[0]);
    } catch (error) {
        console.error('Error al crear ticket:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al crear ticket.' });
    }
}));

// @desc    Actualizar un ticket
// @route   PUT /api/tickets/:id
// @access  Private
router.put('/:id', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, status, priority, agent_id, department_id } = req.body; // CORREGIDO: subject -> title
    const userId = req.user.id;
    const userRole = req.user.role; // Definir userRole aquí

    try {
        const [existingTicketRows] = await pool.execute(
            `SELECT * FROM tickets WHERE id = ?`,
            [id]
        );

        if (existingTicketRows.length === 0) {
            res.status(404);
            throw new Error('Ticket no encontrado.');
        }

        const oldTicket = existingTicketRows[0];
        const updateFields = [];
        const updateValues = [];
        const activityDescriptionParts = [];
        const changes = {};

        if (userRole === 'client' && oldTicket.user_id !== userId) {
            res.status(403);
            throw new Error('No tienes permiso para actualizar este ticket.');
        } else if (userRole === 'agent' && oldTicket.assigned_to_user_id !== userId && oldTicket.assigned_to_user_id !== null) {
            res.status(403);
            throw new Error('No tienes permiso para actualizar este ticket (asignado a otro agente).');
        }

        // CORRECCIÓN: Usar title en lugar de subject
        if (title !== undefined && title !== oldTicket.title) {
            updateFields.push('title = ?');
            updateValues.push(title);
            activityDescriptionParts.push(`cambió el asunto de "${oldTicket.title}" a "${title}"`);
            changes.title = { old: oldTicket.title, new: title };
        }
        if (description !== undefined && description !== oldTicket.description) {
            updateFields.push('description = ?');
            updateValues.push(description);
            activityDescriptionParts.push(`actualizó la descripción.`);
            changes.description = { old: oldTicket.description, new: description };
        }
        if (priority !== undefined && priority !== oldTicket.priority) {
            updateFields.push('priority = ?');
            updateValues.push(priority);
            activityDescriptionParts.push(`cambió la prioridad de "${oldTicket.priority}" a "${priority}"`);
            changes.priority = { old: oldTicket.priority, new: priority };
        }
        if (department_id !== undefined && department_id !== oldTicket.department_id) {
            updateFields.push('department_id = ?');
            updateValues.push(department_id);
            const [oldDept] = await pool.execute('SELECT name FROM departments WHERE id = ?', [oldTicket.department_id]);
            const [newDept] = await pool.execute('SELECT name FROM departments WHERE id = ?', [department_id]);
            activityDescriptionParts.push(`cambió el departamento de "${oldDept[0]?.name || 'N/A'}" a "${newDept[0]?.name || 'N/A'}"`);
            changes.department_id = { old: oldTicket.department_id, new: department_id };
        }

        let newStatus = status;
        let closedAt = oldTicket.closed_at;

        if (status !== undefined && status !== oldTicket.status) {
            updateFields.push('status = ?');
            updateValues.push(status);
            activityDescriptionParts.push(`cambió el estado de "${oldTicket.status}" a "${status}"`);
            changes.status = { old: oldTicket.status, new: status };

            if ((status === 'closed') && oldTicket.status !== 'closed') {
                updateFields.push('closed_at = CURRENT_TIMESTAMP');
                closedAt = new Date().toISOString();
                activityDescriptionParts.push(`y marcó el ticket como cerrado.`);
                changes.closed_at = { old: oldTicket.closed_at, new: closedAt };
            } else if (status !== 'closed' && (oldTicket.status === 'closed')) {
                updateFields.push('closed_at = NULL');
                closedAt = null;
                activityDescriptionParts.push(`y reabrió el ticket (anuló el cierre).`);
                changes.closed_at = { old: oldTicket.closed_at, new: null };
            }
        }

        if (agent_id !== undefined) {
            const currentAgentId = oldTicket.assigned_to_user_id;
            const newAgentId = agent_id === 'null' ? null : agent_id;

            if (newAgentId !== currentAgentId) {
                updateFields.push('assigned_to_user_id = ?');
                updateValues.push(newAgentId);

                const [oldAgent] = currentAgentId ? await pool.execute('SELECT username FROM users WHERE id = ?', [currentAgentId]) : [[]];
                const [newAgent] = newAgentId ? await pool.execute('SELECT username FROM users WHERE id = ?', [newAgentId]) : [[]];

                const oldAgentName = oldAgent[0]?.username || 'N/A';
                const newAgentName = newAgent[0]?.username || 'Sin Asignar';

                activityDescriptionParts.push(`cambió el agente asignado de "${oldAgentName}" a "${newAgentName}"`);
                changes.assigned_to_user_id = { old: oldTicket.assigned_to_user_id, new: newAgentId };

                if (newAgentId) {
                    await pool.execute(
                        `INSERT INTO notifications (user_id, type, message, related_id, related_type)
                         VALUES (?, ?, ?, ?, ?)`,
                        [
                            newAgentId,
                            'ticket_assigned',
                            `Se te ha asignado el ticket "${oldTicket.title}" (ID: ${oldTicket.id}).`,
                            oldTicket.id,
                            'ticket'
                        ]
                    );
                }
                if (currentAgentId && !newAgentId) {
                    await pool.execute(
                        `INSERT INTO notifications (user_id, type, message, related_id, related_type)
                         VALUES (?, ?, ?, ?, ?)`,
                        [
                            currentAgentId,
                            'ticket_unassigned',
                            `Se te ha desasignado el ticket "${oldTicket.title}" (ID: ${oldTicket.id}).`,
                            oldTicket.id,
                            'ticket'
                        ]
                    );
                }
            }
        }

        if (updateFields.length === 0) {
            res.status(400);
            throw new Error('No se proporcionaron campos para actualizar.');
        }

        updateValues.push(id);

        await pool.execute(
            `UPDATE tickets SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            updateValues
        );

        const [updatedTicketRows] = await pool.execute(
            `SELECT 
                t.id, t.title, t.description, t.status, t.priority,
                t.user_id, u.username AS user_username, u.email AS user_email,
                t.assigned_to_user_id, a.username AS agent_username, a.email AS agent_email,
                t.department_id, d.name AS department_name,
                t.created_at, t.updated_at, t.closed_at
             FROM tickets t
             LEFT JOIN users u ON t.user_id = u.id
             LEFT JOIN users a ON t.assigned_to_user_id = a.id
             LEFT JOIN departments d ON t.department_id = d.id
             WHERE t.id = ?`,
            [id]
        );

        await pool.execute(
            `INSERT INTO activity_logs (user_id, activity_type, description, ticket_id)
             VALUES (?, ?, ?, ?)`,
            [
                req.user.id,
                'ticket_updated',
                `actualizó el ticket "${oldTicket.title}": ${activityDescriptionParts.join(', ')}.`,
                id
            ]
        );

        if (status !== undefined && status !== oldTicket.status && oldTicket.user_id !== userId) {
            await pool.execute(
                `INSERT INTO notifications (user_id, type, message, related_id, related_type)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    oldTicket.user_id,
                    'ticket_status_update',
                    `El estado de tu ticket "${oldTicket.title}" (ID: ${oldTicket.id}) ha cambiado a "${status}".`,
                    oldTicket.id,
                    'ticket'
                ]
            );
        }

        res.json(updatedTicketRows[0]);
    } catch (error) {
        console.error('Error al actualizar ticket:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al actualizar ticket.' });
    }
}));

// @desc    Eliminar un ticket
// @route   DELETE /api/tickets/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize(['admin']), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const [existingTicketRows] = await pool.execute('SELECT * FROM tickets WHERE id = ?', [id]);
        if (existingTicketRows.length === 0) {
            res.status(404);
            throw new Error('Ticket no encontrado.');
        }
        const deletedTicket = existingTicketRows[0];

        const [result] = await pool.execute('DELETE FROM tickets WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            res.status(404);
            throw new Error('Ticket no encontrado.');
        }

        await pool.execute(
            `INSERT INTO activity_logs (user_id, activity_type, description, ticket_id)
             VALUES (?, ?, ?, ?)`,
            [
                userId,
                'ticket_deleted',
                `eliminó el ticket "${deletedTicket.title}" (ID: ${deletedTicket.id}).`,
                id
            ]
        );

        await pool.execute(`DELETE FROM notifications WHERE related_type = 'ticket' AND related_id = ?`, [id]);


        res.json({ message: 'Ticket eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar ticket:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al eliminar ticket.' });
    }
}));

// @desc    Añadir un comentario a un ticket
// @route   POST /api/tickets/:id/comments
// @access  Private
router.post('/:id/comments', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { message_text } = req.body;
    const userId = req.user.id;
    const userUsername = req.user.username;
    // CORRECCIÓN: Definir userRole aquí
    const userRole = req.user.role; 

    if (!message_text) {
        res.status(400);
        throw new Error('El comentario no puede estar vacío.');
    }

    try {
        const [ticketRows] = await pool.execute('SELECT * FROM tickets WHERE id = ?', [id]);
        if (ticketRows.length === 0) {
            res.status(404);
            throw new Error('Ticket no encontrado.');
        }
        const ticket = ticketRows[0];

        const [result] = await pool.execute(
            `INSERT INTO ticket_responses (ticket_id, user_id, message)
             VALUES (?, ?, ?)`,
            [id, userId, message_text]
        );

        const newCommentId = result.insertId;
        const [newCommentRows] = await pool.execute(
            `SELECT c.id, c.ticket_id, c.user_id, u.username AS user_username, c.message AS text, c.created_at
             FROM ticket_responses c
             JOIN users u ON c.user_id = u.id
             WHERE c.id = ?`,
            [newCommentId]
        );

        await pool.execute(
            `INSERT INTO activity_logs (user_id, activity_type, description, ticket_id)
             VALUES (?, ?, ?, ?)`,
            [
                userId,
                'comment_added',
                `añadió un comentario al ticket "${ticket.title}" (ID: ${ticket.id}).`,
                id
            ]
        );

        if (ticket.user_id !== userId) {
            await pool.execute(
                `INSERT INTO notifications (user_id, type, message, related_id, related_type)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    ticket.user_id,
                    'new_comment',
                    `${userUsername} comentó en tu ticket "${ticket.title}" (ID: ${ticket.id}).`,
                    ticket.id,
                    'ticket'
                ]
            );
        }
        if (ticket.assigned_to_user_id && ticket.assigned_to_user_id !== userId) {
            await pool.execute(
                `INSERT INTO notifications (user_id, type, message, related_id, related_type)
                 VALUES (?, ?, ?, ?, ?)`,
                [
                    ticket.assigned_to_user_id,
                    'new_comment',
                    `${userUsername} comentó en el ticket "${ticket.title}" (ID: ${ticket.id}) que tienes asignado.`,
                    ticket.id,
                    'ticket'
                ]
            );
        }
        if (userRole !== 'admin' && !ticket.assigned_to_user_id) {
            const [adminUsers] = await pool.execute(`SELECT id FROM users WHERE role = 'admin'`);
            for (const admin of adminUsers) {
                if (admin.id !== userId) {
                    await pool.execute(
                        `INSERT INTO notifications (user_id, type, message, related_id, related_type)
                         VALUES (?, ?, ?, ?, ?)`,
                        [
                            admin.id,
                            'new_unassigned_ticket',
                            `Un nuevo comentario en el ticket sin asignar "${ticket.title}" (ID: ${ticket.id}).`,
                            ticket.id,
                            'ticket'
                        ]
                    );
                }
            }
        }

        res.status(201).json(newCommentRows[0]);
    } catch (error) {
        console.error('Error al añadir comentario:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al añadir comentario.' });
    }
}));

module.exports = router;
=======
// backend/src/routes/ticketRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    addCommentToTicket,
    getCommentsForTicket,
    assignTicketToAgent,
    changeTicketStatus,
    uploadAttachment
} = require('../controllers/ticketController'); 

const { protect, authorize } = require('../middleware/authMiddleware');

// Rutas para tickets (colección)
router.route('/')
    // GET /api/tickets - Obtener todos los tickets (lógica interna del controlador restringe para 'user' rol)
    // El frontend de cliente ahora usará esta misma ruta y el backend la filtrará.
    .get(protect, authorize(['admin', 'agent', 'user']), getAllTickets) 
    .post(protect, authorize(['user', 'agent', 'admin']), createTicket); // Permitir a agentes y admins crear tickets también

// Rutas para tickets (por ID)
router.route('/:id')
    // GET /api/tickets/:id - Obtener un ticket por ID (lógica interna del controlador restringe para 'user' rol)
    // PUT /api/tickets/:id - Actualizar un ticket (Admin y Agente, con restricción para 'user' en controller)
    // DELETE /api/tickets/:id - Eliminar un ticket (solo Admin)
    .get(protect, authorize(['admin', 'agent', 'user']), getTicketById)
    .put(protect, authorize(['admin', 'agent', 'user']), updateTicket) 
    .delete(protect, authorize(['admin']), deleteTicket); 

// Rutas para comentarios
router.route('/:id/comments')
    .post(protect, authorize(['user', 'agent', 'admin']), addCommentToTicket)
    .get(protect, authorize(['user', 'agent', 'admin']), getCommentsForTicket);

// Rutas para asignación de tickets y cambio de estado (acciones más específicas)
router.put('/:id/assign', protect, authorize(['admin', 'agent']), assignTicketToAgent); 
router.put('/:id/status', protect, authorize(['admin', 'agent', 'user']), changeTicketStatus); // El cliente puede reabrir aquí si es necesario, o lo manejas en updateTicket

// Ruta para subir adjuntos
// Si usas Multer, la configuración de Multer debe ir aquí antes del controlador, ej: upload.single('attachment')
router.post('/:id/upload', protect, authorize(['user', 'agent', 'admin']), uploadAttachment); 

module.exports = router;
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
