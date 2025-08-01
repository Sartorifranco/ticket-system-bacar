// backend/src/controllers/dashboardController.js
const pool = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get dashboard metrics for Admin
// @route   GET /api/dashboard/metrics
// @access  Admin
const getDashboardMetrics = asyncHandler(async (req, res) => {
    // Total Tickets
    const [totalTicketsResult] = await pool.execute('SELECT COUNT(*) AS count FROM tickets');
    const totalTickets = totalTicketsResult[0].count;

    // Tickets by Status
    const [ticketsByStatusResult] = await pool.execute('SELECT status, COUNT(*) AS count FROM tickets GROUP BY status');
    const ticketsByStatus = ticketsByStatusResult;

    // Tickets by Priority
    const [ticketsByPriorityResult] = await pool.execute('SELECT priority, COUNT(*) AS count FROM tickets GROUP BY priority');
    const ticketsByPriority = ticketsByPriorityResult;

    // Tickets by Department (assuming department_id is in tickets table and joining with departments)
    const [ticketsByDepartmentResult] = await pool.execute(`
        SELECT d.name AS departmentName, COUNT(t.id) AS count
        FROM tickets t
        JOIN departments d ON t.department_id = d.id
        GROUP BY d.name
    `);
    const ticketsByDepartment = ticketsByDepartmentResult;

    // Total Users
    const [totalUsersResult] = await pool.execute('SELECT COUNT(*) AS count FROM users');
    const totalUsers = totalUsersResult[0].count;

    // Total Departments
    const [totalDepartmentsResult] = await pool.execute('SELECT COUNT(*) AS count FROM departments');
    const totalDepartments = totalDepartmentsResult[0].count;

    // Specific status counts for convenience
    const openTickets = ticketsByStatus.find(s => s.status === 'open')?.count || 0;
    const inProgressTickets = ticketsByStatus.find(s => s.status === 'in-progress')?.count || 0;
    const resolvedTickets = ticketsByStatus.find(s => s.status === 'resolved')?.count || 0;
    const closedTickets = ticketsByStatus.find(s => s.status === 'closed')?.count || 0;
    const reopenedTickets = ticketsByStatus.find(s => s.status === 'reopened')?.count || 0;


    res.status(200).json({
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        reopenedTickets,
        totalUsers,
        totalDepartments,
        ticketsByStatus,
        ticketsByPriority,
        ticketsByDepartment,
    });
});

// @desc    Get dashboard metrics for Agent
// @route   GET /api/dashboard/agent-metrics/:userId
// @access  Agent, Admin
const getAgentDashboardMetrics = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Ensure the requesting user is either an admin or the agent themselves
    if (req.user.role === 'agent' && req.user.id !== parseInt(userId)) {
        res.status(403);
        throw new Error('No autorizado para ver las métricas de otro agente.');
    }

    // Total Assigned Tickets for this agent
    const [totalAssignedTicketsResult] = await pool.execute(
        'SELECT COUNT(*) AS count FROM tickets WHERE assigned_to_user_id = ?',
        [userId]
    );
    const totalTickets = totalAssignedTicketsResult[0].count;

    // Assigned Tickets by Status for this agent
    const [assignedTicketsByStatusResult] = await pool.execute(
        'SELECT status, COUNT(*) AS count FROM tickets WHERE assigned_to_user_id = ? GROUP BY status',
        [userId]
    );
    const assignedTicketsByStatus = assignedTicketsByStatusResult;

    const openTickets = assignedTicketsByStatus.find(s => s.status === 'open')?.count || 0;
    const inProgressTickets = assignedTicketsByStatus.find(s => s.status === 'in-progress')?.count || 0;
    const resolvedTickets = assignedTicketsByStatus.find(s => s.status === 'resolved')?.count || 0;
    const closedTickets = assignedTicketsByStatus.find(s => s.status === 'closed')?.count || 0;
    const reopenedTickets = assignedTicketsByStatus.find(s => s.status === 'reopened')?.count || 0;


    res.status(200).json({
        totalTickets, // Total assigned to this agent
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        reopenedTickets,
        // You might want to add other agent-specific metrics here
    });
});


// Export all functions
module.exports = {
    getDashboardMetrics,
    getAgentDashboardMetrics,
};
