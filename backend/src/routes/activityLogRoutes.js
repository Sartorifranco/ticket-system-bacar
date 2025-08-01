// backend/src/routes/activityLogRoutes.js
const express = require('express');
const { getRecentActivityLogs } = require('../controllers/activityLogController');
// CAMBIADO: Importa 'authenticateToken' en lugar de 'protect'
const { authenticateToken, authorize } = require('../middleware/authMiddleware'); // <-- ¡CAMBIO AQUÍ!

const router = express.Router();

// @route   GET /api/activity-logs
// @desc    Get recent activity logs (Admin only, or Client for their own logs)
// @access  Private
router.get('/', authenticateToken, authorize(['admin', 'client']), getRecentActivityLogs); // <-- ¡CAMBIO AQUÍ!

module.exports = router;
