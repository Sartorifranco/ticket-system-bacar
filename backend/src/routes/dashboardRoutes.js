// backend/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

router.use(express.json());

// @desc    Obtener métricas del dashboard para administradores
// @route   GET /api/dashboard/metrics
// @access  Private (Admin only)
router.get('/metrics', protect, asyncHandler(async (req, res) => {
    // Solo permitir acceso a administradores
    if (req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Acceso denegado. Solo los administradores pueden ver estas métricas.');
    }

    try {
        console.log('Backend: Iniciando fetch de métricas del dashboard...');

        // Total Tickets
        const [totalTicketsResult] = await pool.execute('SELECT COUNT(*) AS count FROM tickets');
        const totalTickets = totalTicketsResult[0].count;
        console.log('Backend: Total Tickets:', totalTickets);

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
        console.log('Backend: Tickets por estado (RAW):', ticketsByStatusResult);
        console.log('Backend: Tickets por estado (Formateado):', ticketsByStatus);


        // Tickets Abiertos
        const [openTicketsResult] = await pool.execute(
            `SELECT COUNT(*) AS count FROM tickets WHERE status = 'open'`
        );
        const openTickets = openTicketsResult[0].count;
        console.log('Backend: Tickets Abiertos:', openTickets);

        // Tickets en progreso
        const [inProgressTicketsResult] = await pool.execute(
            `SELECT COUNT(*) AS count FROM tickets WHERE status = 'in-progress'`
        );
        const inProgressTickets = inProgressTicketsResult[0].count;
        console.log('Backend: Tickets en Progreso:', inProgressTickets);

        // Tickets resueltos (cambiado de 'resolved' a 'closed' si tu ENUM no tiene 'resolved')
        // Si tu ENUM de status en la tabla 'tickets' incluye 'resolved', déjalo como 'resolved'.
        // Si solo tienes 'open', 'in-progress', 'closed', 'reopened', entonces 'closed' es el estado final.
        const [resolvedTicketsResult] = await pool.execute(
            `SELECT COUNT(*) AS count FROM tickets WHERE status = 'closed'` // Asumiendo 'closed' como estado final
        );
        const resolvedTickets = resolvedTicketsResult[0].count;
        console.log('Backend: Tickets Resueltos (asumiendo "closed"):', resolvedTickets);

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
        console.log('Backend: Tickets por Prioridad:', ticketsByPriority);

        // Tickets por agente (incluyendo 'unassigned')
        // CORRECCIÓN: Cambiado t.agent_id a t.assigned_to_user_id
        const [ticketsByAgentResult] = await pool.execute(
            `SELECT COALESCE(u.username, 'unassigned') AS agent_name, COUNT(t.id) AS count
             FROM tickets t
             LEFT JOIN users u ON t.assigned_to_user_id = u.id
             GROUP BY agent_name`
        );
        const ticketsByAgent = ticketsByAgentResult.map(row => ({
            name: row.agent_name,
            value: row.count
        }));
        console.log('Backend: Tickets por Agente:', ticketsByAgent);

        // Total Users
        const [totalUsersResult] = await pool.execute('SELECT COUNT(*) AS count FROM users');
        const totalUsers = totalUsersResult[0].count;
        console.log('Backend: Total Usuarios:', totalUsers);

        // Total Departments
        const [totalDepartmentsResult] = await pool.execute('SELECT COUNT(*) AS count FROM departments');
        const totalDepartments = totalDepartmentsResult[0].count;
        console.log('Backend: Total Departamentos:', totalDepartments);

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
        console.log('Backend: Tickets Creados por Día:', ticketsCreatedOverTime);

        // Tickets por estado a lo largo del tiempo (ejemplo simplificado)
        const [ticketsByStatusOverTimeResult] = await pool.execute(
            `SELECT DATE(created_at) AS date,
                    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open,
                    SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) AS inProgress,
                    SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS closed, -- Asumiendo 'closed' como estado final
                    SUM(CASE WHEN status = 'reopened' THEN 1 ELSE 0 END) AS reopened -- Añadido si tu ENUM lo tiene
             FROM tickets
             GROUP BY DATE(created_at)
             ORDER BY date ASC`
        );
        const ticketsByStatusOverTime = ticketsByStatusOverTimeResult.map(row => ({
            date: row.date.toISOString().split('T')[0],
            open: row.open,
            inProgress: row.inProgress,
            resolved: row.closed, // Mapea 'closed' a 'resolved' para el frontend si es necesario
            closed: row.closed,
            reopened: row.reopened || 0 // Si no hay 'reopened', será 0
        }));
        console.log('Backend: Tickets por Estado a lo largo del tiempo:', ticketsByStatusOverTime);

        // Tickets por prioridad a lo largo del tiempo (ejemplo simplificado)
        const [ticketsByPriorityOverTimeResult] = await pool.execute(
            `SELECT DATE(created_at) AS date,
                    SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) AS low,
                    SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) AS medium,
                    SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) AS high,
                    SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) AS urgent -- Añadido si tu ENUM lo tiene
             FROM tickets
             GROUP BY DATE(created_at)
             ORDER BY date ASC`
        );
        const ticketsByPriorityOverTime = ticketsByPriorityOverTimeResult.map(row => ({
            date: row.date.toISOString().split('T')[0],
            low: row.low,
            medium: row.medium,
            high: row.high,
            urgent: row.urgent || 0 // Si no hay 'urgent', será 0
        }));
        console.log('Backend: Tickets por Prioridad a lo largo del tiempo:', ticketsByPriorityOverTime);

        // Rendimiento de Agentes (ejemplo simplificado)
        // CORRECCIÓN: Cambiado t.agent_id a t.assigned_to_user_id y t.resolved_at a t.closed_at
        const [agentPerformanceResult] = await pool.execute(
            `SELECT COALESCE(u.username, 'unassigned') AS agentName,
                    COUNT(CASE WHEN t.status = 'closed' THEN 1 ELSE NULL END) AS resolvedTickets, -- Asumiendo 'closed' como resuelto
                    AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.closed_at)) AS avgResolutionTimeHours
             FROM tickets t
             LEFT JOIN users u ON t.assigned_to_user_id = u.id
             GROUP BY agentName`
        );
        const agentPerformance = agentPerformanceResult.map(row => ({
            agentName: row.agentName,
            resolvedTickets: row.resolvedTickets || 0,
            avgResolutionTimeHours: row.avgResolutionTimeHours ? parseFloat(row.avgResolutionTimeHours.toFixed(2)) : 0
        }));
        console.log('Backend: Rendimiento de Agentes:', agentPerformance);

        // Rendimiento de Departamentos (ejemplo simplificado)
        // CORRECCIÓN: Cambiado t.resolved_at a t.closed_at
        const [departmentPerformanceResult] = await pool.execute(
            `SELECT d.name AS departmentName,
                    COUNT(t.id) AS totalTickets,
                    AVG(TIMESTAMPDIFF(HOUR, t.created_at, t.closed_at)) AS avgResolutionTimeHours
             FROM tickets t
             JOIN departments d ON t.department_id = d.id
             GROUP BY departmentName`
        );
        const departmentPerformance = departmentPerformanceResult.map(row => ({
            departmentName: row.departmentName,
            totalTickets: row.totalTickets || 0,
            avgResolutionTimeHours: row.avgResolutionTimeHours ? parseFloat(row.avgResolutionTimeHours.toFixed(2)) : 0
        }));
        console.log('Backend: Rendimiento de Departamentos:', departmentPerformance);


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
        console.log('Backend: Métricas del dashboard enviadas exitosamente.');

    } catch (error) {
        console.error('Error al obtener métricas del dashboard:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al obtener métricas del dashboard.' });
    }
}));

module.exports = router;
