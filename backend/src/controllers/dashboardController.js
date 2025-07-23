// backend/src/controllers/dashboardController.js
const asyncHandler = require('express-async-handler');
const pool = require('../config/db'); // Importa el pool de conexión a la base de datos

// @desc    Obtener métricas del dashboard
// @route   GET /api/dashboard/metrics
// @access  Private (Admin only)
const getDashboardMetrics = asyncHandler(async (req, res) => {
    // req.user viene del middleware 'protect'
    if (!req.user || req.user.role !== 'admin') {
        res.status(403);
        throw new Error('No autorizado para acceder a las métricas del dashboard');
    }

    try {
        console.log('[DEBUG DashboardController] Obteniendo métricas del dashboard...');

        // Total Tickets
        const [totalTicketsResult] = await pool.execute('SELECT COUNT(*) AS count FROM tickets');
        const totalTickets = totalTicketsResult[0].count;
        console.log('[DEBUG DashboardController] Total Tickets:', totalTickets);

        // Tickets por estado
        const [ticketsByStatusResult] = await pool.execute(
            `SELECT status, COUNT(*) AS count
             FROM tickets
             GROUP BY status`
        );
        const ticketsByStatus = ticketsByStatusResult.map(row => ({
            name: row.status,
            value: row.count
        }));
        console.log('[DEBUG DashboardController] Tickets por estado (RAW):', ticketsByStatusResult);
        console.log('[DEBUG DashboardController] Tickets por estado (Formateado):', ticketsByStatus);


        // Tickets Abiertos
        const [openTicketsResult] = await pool.execute(
            `SELECT COUNT(*) AS count FROM tickets WHERE status = 'open'`
        );
        const openTickets = openTicketsResult[0].count;
        console.log('[DEBUG DashboardController] Tickets Abiertos:', openTickets);

        // Tickets en progreso
        const [inProgressTicketsResult] = await pool.execute(
            `SELECT COUNT(*) AS count FROM tickets WHERE status = 'in-progress'`
        );
        const inProgressTickets = inProgressTicketsResult[0].count;
        console.log('[DEBUG DashboardController] Tickets en Progreso:', inProgressTickets);

        // Tickets resueltos
        const [resolvedTicketsResult] = await pool.execute(
            `SELECT COUNT(*) AS count FROM tickets WHERE status = 'resolved'`
        );
        const resolvedTickets = resolvedTicketsResult[0].count;
        console.log('[DEBUG DashboardController] Tickets Resueltos:', resolvedTickets);

        // Tickets por prioridad
        const [ticketsByPriorityResult] = await pool.execute(
            `SELECT priority, COUNT(*) AS count
             FROM tickets
             GROUP BY priority`
        );
        const ticketsByPriority = ticketsByPriorityResult.map(row => ({
            name: row.priority,
            value: row.count
        }));
        console.log('[DEBUG DashboardController] Tickets por Prioridad:', ticketsByPriority);

        // Tickets por agente (incluyendo 'unassigned')
        const [ticketsByAgentResult] = await pool.execute(
            `SELECT COALESCE(u.username, 'unassigned') AS agent_name, COUNT(t.id) AS count
             FROM tickets t
             LEFT JOIN users u ON t.agent_id = u.id
             GROUP BY agent_name`
        );
        const ticketsByAgent = ticketsByAgentResult.map(row => ({
            name: row.agent_name,
            value: row.count
        }));
        console.log('[DEBUG DashboardController] Tickets por Agente:', ticketsByAgent);

        // Total Users
        const [totalUsersResult] = await pool.execute('SELECT COUNT(*) AS count FROM users');
        const totalUsers = totalUsersResult[0].count;
        console.log('[DEBUG DashboardController] Total Usuarios:', totalUsers);

        // Total Departments
        const [totalDepartmentsResult] = await pool.execute('SELECT COUNT(*) AS count FROM departments');
        const totalDepartments = totalDepartmentsResult[0].count;
        console.log('[DEBUG DashboardController] Total Departamentos:', totalDepartments);

        // Reportes de tendencia (ejemplo: tickets creados por día)
        const [ticketsCreatedOverTimeResult] = await pool.execute(
            `SELECT DATE(created_at) AS date, COUNT(*) AS count
             FROM tickets
             GROUP BY DATE(created_at)
             ORDER BY date ASC`
        );
        const ticketsCreatedOverTime = ticketsCreatedOverTimeResult.map(row => ({
            date: row.date.toISOString().split('T')[0],
            count: row.count
        }));
        console.log('[DEBUG DashboardController] Tickets Creados por Día:', ticketsCreatedOverTime);

        // Tickets por estado a lo largo del tiempo (ejemplo simplificado)
        const [ticketsByStatusOverTimeResult] = await pool.execute(
            `SELECT DATE(created_at) AS date,
                    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open,
                    SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) AS inProgress,
                    SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
                    SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed
             FROM tickets
             GROUP BY DATE(created_at)
             ORDER BY date ASC`
        );
        const ticketsByStatusOverTime = ticketsByStatusOverTimeResult.map(row => ({
            date: row.date.toISOString().split('T')[0],
            open: row.open,
            inProgress: row.inProgress,
            resolved: row.resolved,
            closed: row.closed,
        }));
        console.log('[DEBUG DashboardController] Tickets por Estado a lo largo del tiempo:', ticketsByStatusOverTime);

        // Tickets por prioridad a lo largo del tiempo (ejemplo simplificado)
        const [ticketsByPriorityOverTimeResult] = await pool.execute(
            `SELECT DATE(created_at) AS date,
                    SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) AS low,
                    SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) AS medium,
                    SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS high
             FROM tickets
             GROUP BY DATE(created_at)
             ORDER BY date ASC`
        );
        const ticketsByPriorityOverTime = ticketsByPriorityOverTimeResult.map(row => ({
            date: row.date.toISOString().split('T')[0],
            low: row.low,
            medium: row.medium,
            high: row.high,
        }));
        console.log('[DEBUG DashboardController] Tickets por Prioridad a lo largo del tiempo:', ticketsByPriorityOverTime);

        // Rendimiento de Agentes (ejemplo simplificado)
        const [agentPerformanceResult] = await pool.execute(
            `SELECT COALESCE(u.username, 'unassigned') AS agentName,
                    COUNT(CASE WHEN t.status = 'resolved' THEN 1 ELSE NULL END) AS resolvedTickets,
                    AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.resolved_at)) AS avgResolutionTimeHours
             FROM tickets t
             LEFT JOIN users u ON t.agent_id = u.id
             GROUP BY agentName`
        );
        const agentPerformance = agentPerformanceResult.map(row => ({
            agentName: row.agentName,
            resolvedTickets: row.resolvedTickets || 0,
            avgResolutionTimeHours: row.avgResolutionTimeHours ? parseFloat(row.avgResolutionTimeHours.toFixed(2)) : 0
        }));
        console.log('[DEBUG DashboardController] Rendimiento de Agentes:', agentPerformance);

        // Rendimiento de Departamentos (ejemplo simplificado)
        const [departmentPerformanceResult] = await pool.execute(
            `SELECT d.name AS departmentName,
                    COUNT(t.id) AS totalTickets,
                    AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.resolved_at)) AS avgResolutionTimeHours
             FROM tickets t
             JOIN departments d ON t.department_id = d.id
             GROUP BY departmentName`
        );
        const departmentPerformance = departmentPerformanceResult.map(row => ({
            departmentName: row.departmentName,
            totalTickets: row.totalTickets || 0,
            avgResolutionTimeHours: row.avgResolutionTimeHours ? parseFloat(row.avgResolutionTimeHours.toFixed(2)) : 0
        }));
        console.log('[DEBUG DashboardController] Rendimiento de Departamentos:', departmentPerformance);


        res.json({
            totalTickets,
            openTickets,
            inProgressTickets,
            resolvedTickets,
            ticketsByStatus, // Asegurarse de que esto se envíe
            ticketsByPriority,
            ticketsByAgent,
            totalUsers,
            totalDepartments,
            ticketsCreatedOverTime,
            ticketsByStatusOverTime,
            ticketsByPriorityOverTime,
            agentPerformance,
            departmentPerformance
        });
        console.log('[DEBUG DashboardController] Métricas del dashboard enviadas exitosamente.');

    } catch (error) {
        console.error('[DashboardController Error] Error al obtener métricas del dashboard:', error);
        res.status(500);
        throw new Error('Error del servidor al obtener métricas del dashboard');
    }
});

module.exports = {
    getDashboardMetrics
};
