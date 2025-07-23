// backend/src/controllers/activityLogController.js
const asyncHandler = require('express-async-handler');
const pool = require('../config/db'); // Importa tu pool de conexión a la base de datos

// @desc    Obtener todos los logs de actividad
// @route   GET /api/activity-logs
// @access  Private (Admin only)
const getActivityLogs = asyncHandler(async (req, res) => {
    // req.user viene del middleware 'protect'
    if (!req.user || req.user.role !== 'admin') {
        res.status(403);
        throw new Error('No autorizado para ver el registro de actividad');
    }

    try {
        console.log('[DEBUG ActivityLogController] Obteniendo logs de actividad...');

        // Parámetros de paginación y límite
        const limit = parseInt(req.query.limit) || 10; // Límite por defecto de 10
        const offset = parseInt(req.query.offset) || 0; // Offset por defecto de 0

        // Consulta para obtener logs de actividad con paginación
        // CORRECCIONES:
        // - 'action_type' cambiado a 'activity_type'
        // - Eliminadas columnas 'target_type', 'target_id', 'old_value', 'new_value'
        //   ya que no existen en la tabla 'activity_logs' según el script de creación.
        // - Añadido t.title para el título del ticket asociado.
        const [logs] = await pool.query(`
            SELECT 
                al.id,
                al.user_id,
                u.username AS user_username,
                u.role AS user_role,
                al.ticket_id, -- Añadido: ID del ticket asociado
                t.title AS ticket_title, -- Añadido: Título del ticket asociado
                al.activity_type, -- CORREGIDO: de action_type a activity_type
                al.description,
                al.created_at
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN tickets t ON al.ticket_id = t.id -- Añadido JOIN para obtener el título del ticket
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        // Consulta para obtener el total de logs (para paginación)
        const [totalLogsResult] = await pool.query('SELECT COUNT(*) AS total FROM activity_logs');
        const totalLogs = totalLogsResult[0].total;

        console.log('[DEBUG ActivityLogController] Logs de actividad obtenidos:', logs.length, 'de', totalLogs);
        res.status(200).json({
            logs,
            total: totalLogs,
            page: Math.floor(offset / limit) + 1,
            pages: Math.ceil(totalLogs / limit)
        });

    } catch (error) {
        console.error('[ActivityLogController Error] Error al obtener logs de actividad:', error.message, error.stack); // Imprime detalles del error
        res.status(500);
        throw new Error('Error del servidor al obtener logs de actividad');
    }
});

module.exports = {
    getActivityLogs
};
