// backend/src/controllers/dashboardController.js
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

// @desc    Obtener métricas del dashboard
// @route   GET /api/dashboard/metrics
// @access  Private/Admin
const getDashboardMetrics = asyncHandler(async (req, res) => {
    try {
        // 1. Total Tickets
        const [totalTicketsResult] = await pool.execute('SELECT COUNT(*) AS count FROM tickets');
        const totalTickets = totalTicketsResult[0].count;

        // 2. Tickets Abiertos
        const [openTicketsResult] = await pool.execute("SELECT COUNT(*) AS count FROM tickets WHERE status = 'open'");
        const openTickets = openTicketsResult[0].count;

        // 3. Tickets En Progreso
        const [inProgressTicketsResult] = await pool.execute("SELECT COUNT(*) AS count FROM tickets WHERE status = 'in-progress'");
        const inProgressTickets = inProgressTicketsResult[0].count;

        // 4. Tickets Cerrados
        const [closedTicketsResult] = await pool.execute("SELECT COUNT(*) AS count FROM tickets WHERE status = 'closed' OR status = 'resolved'");
        const closedTickets = closedTicketsResult[0].count;

        // 5. Tickets Reabiertos (si tu sistema los maneja explícitamente)
        const [reopenedTicketsResult] = await pool.execute("SELECT COUNT(*) AS count FROM tickets WHERE status = 'reopened'");
        const reopenedTickets = reopenedTicketsResult[0].count;

        // 6. Total Usuarios
        const [totalUsersResult] = await pool.execute('SELECT COUNT(*) AS count FROM users');
        const totalUsers = totalUsersResult[0].count;

        // 7. Total Departamentos
        const [totalDepartmentsResult] = await pool.execute('SELECT COUNT(*) AS count FROM departments');
        const totalDepartments = totalDepartmentsResult[0].count;

        // 8. Tickets por Estado (para Pie Chart)
        const [ticketsByStatusRaw] = await pool.execute('SELECT status, COUNT(*) AS count FROM tickets GROUP BY status');
        const ticketsByStatus = ticketsByStatusRaw.map(row => ({ name: row.status, value: row.count }));

        // 9. Tickets por Prioridad (para Pie Chart)
        const [ticketsByPriorityRaw] = await pool.execute('SELECT priority, COUNT(*) AS count FROM tickets GROUP BY priority');
        const ticketsByPriority = ticketsByPriorityRaw.map(row => ({ name: row.priority, value: row.count }));

        // 10. Tickets Creados a lo largo del tiempo (ej. últimos 30 días)
        const [ticketsCreatedOverTimeRaw] = await pool.execute(`
            SELECT DATE(created_at) AS date, COUNT(*) AS count
            FROM tickets
            WHERE created_at >= CURDATE() - INTERVAL 30 DAY
            GROUP BY date
            ORDER BY date ASC
        `);
        const ticketsCreatedOverTime = ticketsCreatedOverTimeRaw.map(row => ({
            date: row.date.toISOString().split('T')[0], // Formatear a 'YYYY-MM-DD'
            count: row.count
        }));

        // 11. Tickets por Estado a lo largo del tiempo (ej. últimos 30 días)
        const [ticketsByStatusOverTimeRaw] = await pool.execute(`
            SELECT
                DATE(created_at) AS date,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open,
                SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) AS inProgress,
                SUM(CASE WHEN status = 'closed' OR status = 'resolved' THEN 1 ELSE 0 END) AS closed,
                SUM(CASE WHEN status = 'reopened' THEN 1 ELSE 0 END) AS reopened
            FROM tickets
            WHERE created_at >= CURDATE() - INTERVAL 30 DAY
            GROUP BY date
            ORDER BY date ASC
        `);
        const ticketsByStatusOverTime = ticketsByStatusOverTimeRaw.map(row => ({
            date: row.date.toISOString().split('T')[0],
            open: row.open,
            inProgress: row.inProgress,
            closed: row.closed,
            reopened: row.reopened
        }));

        // 12. Tickets por Prioridad a lo largo del tiempo (ej. últimos 30 días)
        const [ticketsByPriorityOverTimeRaw] = await pool.execute(`
            SELECT
                DATE(created_at) AS date,
                SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) AS low,
                SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) AS medium,
                SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS high,
                SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) AS urgent
            FROM tickets
            WHERE created_at >= CURDATE() - INTERVAL 30 DAY
            GROUP BY date
            ORDER BY date ASC
        `);
        const ticketsByPriorityOverTime = ticketsByPriorityOverTimeRaw.map(row => ({
            date: row.date.toISOString().split('T')[0],
            low: row.low,
            medium: row.medium,
            high: row.high,
            urgent: row.urgent
        }));

        // 13. Rendimiento de Agentes
        const [agentPerformanceRaw] = await pool.execute(`
            SELECT
                u.username AS agentName,
                COUNT(t.id) AS resolvedTickets,
                AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.closed_at)) AS avgResolutionTimeHours
            FROM users u
            LEFT JOIN tickets t ON u.id = t.assigned_to_user_id
            WHERE u.role = 'agent' AND (t.status = 'closed' OR t.status = 'resolved' OR t.id IS NULL)
            GROUP BY u.id, u.username
            ORDER BY resolvedTickets DESC
        `);
        const agentPerformance = agentPerformanceRaw.map(row => {
            const avgTime = row.avgResolutionTimeHours;
            // Asegurarse de que avgTime sea un número y no NaN antes de toFixed
            const formattedAvgTime = (typeof avgTime === 'number' && !isNaN(avgTime)) ? parseFloat(avgTime.toFixed(2)) : null;
            return {
                agentName: row.agentName,
                resolvedTickets: row.resolvedTickets || 0,
                avgResolutionTimeHours: formattedAvgTime
            };
        });

        // 14. Rendimiento de Departamentos
        const [departmentPerformanceRaw] = await pool.execute(`
            SELECT
                d.name AS departmentName,
                COUNT(t.id) AS totalTickets,
                AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.closed_at)) AS avgResolutionTimeHours
            FROM departments d
            LEFT JOIN tickets t ON d.id = t.department_id
            WHERE (t.status = 'closed' OR t.status = 'resolved' OR t.id IS NULL)
            GROUP BY d.id, d.name
            ORDER BY totalTickets DESC
        `);
        const departmentPerformance = departmentPerformanceRaw.map(row => {
            const avgTime = row.avgResolutionTimeHours;
            // Asegurarse de que avgTime sea un número y no NaN antes de toFixed
            const formattedAvgTime = (typeof avgTime === 'number' && !isNaN(avgTime)) ? parseFloat(avgTime.toFixed(2)) : null;
            return {
                departmentName: row.departmentName,
                totalTickets: row.totalTickets || 0,
                avgResolutionTimeHours: formattedAvgTime
            };
        });


        res.status(200).json({
            totalTickets,
            openTickets,
            inProgressTickets,
            closedTickets,
            reopenedTickets,
            totalUsers,
            totalDepartments,
            ticketsByStatus,
            ticketsByPriority,
            ticketsCreatedOverTime,
            ticketsByStatusOverTime,
            ticketsByPriorityOverTime,
            agentPerformance,
            departmentPerformance
        });

    } catch (error) {
        console.error('Error del servidor al obtener métricas del dashboard:', error);
        res.status(500).json({ message: 'Error del servidor al obtener métricas del dashboard.', stack: error.stack });
    }
});

module.exports = {
    getDashboardMetrics
};
