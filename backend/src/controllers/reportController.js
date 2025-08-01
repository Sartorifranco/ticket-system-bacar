// backend/src/controllers/reportController.js
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

// @desc    Get tickets count by department
// @route   GET /api/reports/tickets-by-department
// @access  Private (Admin)
const getTicketsByDepartment = asyncHandler(async (req, res) => {
    console.log('[ReportController] Obteniendo tickets por departamento...');
    try {
        // Asegúrate de que el usuario es admin antes de permitir el acceso a esta ruta
        if (req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Acceso denegado. Solo administradores pueden acceder a este reporte.');
        }

        const [rows] = await pool.execute(
            `SELECT d.name AS department_name, COUNT(t.id) AS count
            FROM departments d
            LEFT JOIN tickets t ON t.department_id = d.id
            GROUP BY d.name
            ORDER BY d.name;`
        );
        console.log('[ReportController] Tickets por departamento obtenidos:', rows);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener tickets por departamento:', error.message);
        res.status(500).json({ message: 'Error interno del servidor al obtener tickets por departamento.' });
    }
});

// @desc    Get tickets count by status
// @route   GET /api/reports/tickets-by-status
// @access  Private (Admin)
const getTicketsByStatus = asyncHandler(async (req, res) => {
    console.log('[ReportController] Obteniendo tickets por estado...');
    try {
        if (req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Acceso denegado. Solo administradores pueden acceder a este reporte.');
        }

        const [rows] = await pool.execute(
            `SELECT status, COUNT(id) AS count
            FROM tickets
            GROUP BY status
            ORDER BY status;`
        );
        console.log('[ReportController] Tickets por estado obtenidos:', rows);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener tickets por estado:', error.message);
        res.status(500).json({ message: 'Error interno del servidor al obtener tickets por estado.' });
    }
});

// @desc    Get tickets count by priority
// @route   GET /api/reports/tickets-by-priority
// @access  Private (Admin)
const getTicketsByPriority = asyncHandler(async (req, res) => {
    console.log('[ReportController] Obteniendo tickets por prioridad...');
    try {
        if (req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Acceso denegado. Solo administradores pueden acceder a este reporte.');
        }

        const [rows] = await pool.execute(
            `SELECT priority, COUNT(id) AS count
            FROM tickets
            GROUP BY priority
            ORDER BY priority;`
        );
        console.log('[ReportController] Tickets por prioridad obtenidos:', rows);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener tickets por prioridad:', error.message);
        res.status(500).json({ message: 'Error interno del servidor al obtener tickets por prioridad.' });
    }
});

module.exports = {
    getTicketsByDepartment,
    getTicketsByStatus,
    getTicketsByPriority,
};
