// backend/src/controllers/activityLogController.js
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');

// @desc    Get recent activity logs (or all with pagination)
// @route   GET /api/activity-logs
// @access  Private (Admin only, or Client for their own logs)
const getRecentActivityLogs = asyncHandler(async (req, res) => {
    const requestedUserId = req.query.user_id ? parseInt(req.query.user_id, 10) : null;
    const authenticatedUserId = req.user.id;
    const authenticatedUserRole = req.user.role;

    try {
        console.log('[ActivityLogController] Iniciando obtención de logs de actividad...');
        
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = parseInt(req.query.offset, 10) || 0;

        let query = `
            SELECT
                al.id,
                al.user_id,
                al.user_username AS username,
                al.user_role,
                al.action_type AS action,
                al.description AS details,
                al.target_type,
                al.target_id,
                al.old_value,
                al.new_value,
                al.created_at
            FROM activity_logs al
        `;
        const queryParams = [];
        const whereClauses = [];

        // Lógica de filtrado de user_id en el controlador:
        // Si es un cliente, SIEMPRE filtra por su propio user_id.
        // Si es un admin, y se proporciona un user_id en la query, filtra por ese user_id.
        if (authenticatedUserRole === 'client') {
            whereClauses.push('al.user_id = ?');
            queryParams.push(authenticatedUserId);
        } else if (authenticatedUserRole === 'admin' && requestedUserId) {
            whereClauses.push('al.user_id = ?');
            queryParams.push(requestedUserId);
        }
        // Si es admin y no se proporciona requestedUserId, no se añade filtro de user_id (ve todos).

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);

        console.log(`[ActivityLogController] Consulta final: ${query}`);
        console.log(`[ActivityLogController] Parámetros de consulta: ${queryParams}`);

        const [logs] = await pool.execute(query, queryParams);

        const parsedLogs = logs.map(log => ({
            ...log,
            old_value: typeof log.old_value === 'string' && log.old_value !== null ? JSON.parse(log.old_value) : log.old_value,
            new_value: typeof log.new_value === 'string' && log.new_value !== null ? JSON.parse(log.new_value) : log.new_value,
        }));

        // Obtener el total de logs (con los mismos filtros)
        let totalCountQuery = `SELECT COUNT(*) AS total FROM activity_logs al`;
        const totalCountParams = [];
        const totalCountWhereClauses = [];

        if (authenticatedUserRole === 'client') {
            totalCountWhereClauses.push('al.user_id = ?');
            totalCountParams.push(authenticatedUserId);
        } else if (authenticatedUserRole === 'admin' && requestedUserId) {
            totalCountWhereClauses.push('al.user_id = ?');
            totalCountParams.push(requestedUserId);
        }

        if (totalCountWhereClauses.length > 0) {
            totalCountQuery += ` WHERE ${totalCountWhereClauses.join(' AND ')}`;
        }

        const [totalLogsResult] = await pool.execute(totalCountQuery, totalCountParams);
        const totalLogs = totalLogsResult[0].total;

        console.log(`[ActivityLogController] Logs obtenidos: ${parsedLogs.length} resultados. Total en DB (filtrado): ${totalLogs}`);

        res.status(200).json({
            success: true,
            data: parsedLogs,
            count: parsedLogs.length,
            total: totalLogs,
        });

    } catch (error) {
        console.error('[ActivityLogController Error] Error al obtener logs de actividad:', error.message, error.stack);
        res.status(500);
        throw new Error('Error del servidor al obtener logs de actividad');
    }
});

module.exports = {
    getRecentActivityLogs,
};
