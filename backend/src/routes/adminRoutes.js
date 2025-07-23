// backend/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Ajusta la ruta a tu db.js
// ¡CORRECCIÓN AQUÍ! Usa 'authorize' en lugar de 'authorizeRole'
const { protect, authorize } = require('../middleware/authMiddleware'); // Asume que estas rutas son correctas

// Middleware de autenticación y autorización para todas las rutas de admin
router.use(protect); // Usa el nombre correcto de tu middleware de autenticación
router.use(authorize(['admin'])); // ¡CORREGIDO! Usa 'authorize' y pásale el array de roles

/**
 * @route GET /api/admin/reports
 * @description Obtiene métricas y datos para reportes avanzados.
 * @access Private (Admin only)
 * @queryParam {string} startDate - Fecha de inicio (YYYY-MM-DD)
 * @queryParam {string} endDate - Fecha de fin (YYYY-MM-DD)
 */
router.get('/reports', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Las fechas de inicio y fin son requeridas." });
        }

        // Convertir fechas a formato de MySQL (YYYY-MM-DD HH:MM:SS)
        const startOfDay = `${startDate} 00:00:00`;
        const endOfDay = `${endDate} 23:59:59`;

        // --- 1. Tickets por Estado a lo largo del tiempo ---
        const [ticketsByStatusOverTimeRows] = await connection.execute(`
            SELECT
                DATE(created_at) AS date,
                status,
                COUNT(*) AS count
            FROM tickets
            WHERE created_at BETWEEN ? AND ?
            GROUP BY DATE(created_at), status
            ORDER BY date ASC, status;
        `, [startOfDay, endOfDay]);

        // Procesar los resultados para el formato DailyTicketStatus
        const dailyStatusMap = new Map();
        // Inicializar todas las fechas en el rango con 0 para todos los estados
        let currentDate = new Date(startDate);
        const end = new Date(endDate);
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            dailyStatusMap.set(dateStr, { date: dateStr, open: 0, inProgress: 0, resolved: 0, closed: 0 });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        ticketsByStatusOverTimeRows.forEach(row => {
            const entry = dailyStatusMap.get(row.date);
            if (entry) { // Asegurarse de que la fecha exista en el mapa
                if (row.status === 'open') entry.open = row.count;
                else if (row.status === 'in-progress') entry.inProgress = row.count;
                else if (row.status === 'resolved') entry.resolved = row.count;
                else if (row.status === 'closed') entry.closed = row.count;
            }
        });
        const ticketsByStatusOverTime = Array.from(dailyStatusMap.values());


        // --- 2. Tickets por Prioridad a lo largo del tiempo ---
        const [ticketsByPriorityOverTimeRows] = await connection.execute(`
            SELECT
                DATE(created_at) AS date,
                priority,
                COUNT(*) AS count
            FROM tickets
            WHERE created_at BETWEEN ? AND ?
            GROUP BY DATE(created_at), priority
            ORDER BY date ASC, priority;
        `, [startOfDay, endOfDay]);

        const dailyPriorityMap = new Map();
        // Inicializar todas las fechas en el rango con 0 para todas las prioridades
        currentDate = new Date(startDate); // Resetear currentDate
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            dailyPriorityMap.set(dateStr, { date: dateStr, low: 0, medium: 0, high: 0 });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        ticketsByPriorityOverTimeRows.forEach(row => {
            const entry = dailyPriorityMap.get(row.date);
            if (entry) { // Asegurarse de que la fecha exista en el mapa
                if (row.priority === 'low') entry.low = row.count;
                else if (row.priority === 'medium') entry.medium = row.count;
                else if (row.priority === 'high') entry.high = row.count;
            }
        });
        const ticketsByPriorityOverTime = Array.from(dailyPriorityMap.values());


        // --- 3. Rendimiento de Agentes (Tickets Resueltos y Tiempo Promedio de Resolución) ---
        const [agentPerformanceRows] = await connection.execute(`
            SELECT
                u.username AS agentName,
                COUNT(t.id) AS resolvedTickets,
                AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.updated_at)) AS avgResolutionTimeHours
            FROM tickets t
            JOIN users u ON t.agent_id = u.id
            WHERE t.status = 'resolved' AND t.updated_at BETWEEN ? AND ?
            GROUP BY u.username
            ORDER BY resolvedTickets DESC;
        `, [startOfDay, endOfDay]);
        const agentPerformance = agentPerformanceRows.map(row => ({
            agentName: row.agentName,
            resolvedTickets: row.resolvedTickets,
            // Asegurarse de que avgResolutionTimeHours sea un número y tenga 1 decimal
            avgResolutionTimeHours: parseFloat(row.avgResolutionTimeHours ? parseFloat(row.avgResolutionTimeHours).toFixed(1) : '0.0'),
        }));


        // --- 4. Rendimiento de Departamentos (Total de Tickets y Tiempo Promedio de Resolución) ---
        const [departmentPerformanceRows] = await connection.execute(`
            SELECT
                d.name AS departmentName,
                COUNT(t.id) AS totalTickets,
                AVG(CASE WHEN t.status = 'resolved' THEN TIMESTAMPDIFF(HOUR, t.created_at, t.updated_at) ELSE NULL END) AS avgResolutionTimeHours
            FROM tickets t
            JOIN departments d ON t.department_id = d.id
            WHERE t.created_at BETWEEN ? AND ?
            GROUP BY d.name
            ORDER BY totalTickets DESC;
        `, [startOfDay, endOfDay]);
        const departmentPerformance = departmentPerformanceRows.map(row => ({
            departmentName: row.departmentName,
            totalTickets: row.totalTickets,
            // Asegurarse de que avgResolutionTimeHours sea un número y tenga 1 decimal
            avgResolutionTimeHours: parseFloat(row.avgResolutionTimeHours ? parseFloat(row.avgResolutionTimeHours).toFixed(1) : '0.0'),
        }));

        res.json({
            ticketsByStatusOverTime,
            ticketsByPriorityOverTime,
            agentPerformance,
            departmentPerformance,
        });

    } catch (error) {
        console.error('Error al obtener reportes:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener reportes.' });
    } finally {
        if (connection) connection.release();
    }
});


/**
 * @route GET /api/admin/activity-logs
 * @description Obtiene el registro de actividad del sistema con filtros.
 * @access Private (Admin only)
 * @queryParam {string} user_username - Filtro por nombre de usuario
 * @queryParam {string} action_type - Filtro por tipo de acción
 * @queryParam {string} target_type - Filtro por tipo de entidad
 * @queryParam {string} start_date - Fecha de inicio (YYYY-MM-DD)
 * @queryParam {string} end_date - Fecha de fin (YYYY-MM-DD)
 */
router.get('/activity-logs', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { user_username, action_type, target_type, start_date, end_date } = req.query;

        let query = `SELECT * FROM activity_logs WHERE 1=1`;
        const params = [];

        if (user_username) {
            query += ` AND user_username LIKE ?`;
            params.push(`%${user_username}%`);
        }
        if (action_type && action_type !== 'all') {
            query += ` AND action_type = ?`;
            params.push(action_type);
        }
        if (target_type && target_type !== 'all') {
            query += ` AND target_type = ?`;
            params.push(target_type);
        }
        if (start_date) {
            query += ` AND created_at >= ?`;
            params.push(`${start_date} 00:00:00`);
        }
        if (end_date) {
            query += ` AND created_at <= ?`;
            params.push(`${end_date} 23:59:59`);
        }

        query += ` ORDER BY created_at DESC`;

        const [rows] = await connection.execute(query, params);

        // Asegurarse de que old_value y new_value se parseen de JSON si es necesario
        const logs = rows.map(log => ({
            ...log,
            old_value: log.old_value ? JSON.parse(log.old_value) : null,
            new_value: log.new_value ? JSON.parse(log.new_value) : null,
        }));

        res.json({ logs: logs });

    } catch (error) {
        console.error('Error al obtener registro de actividad:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el registro de actividad.' });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
