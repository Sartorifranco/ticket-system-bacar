// backend/src/routes/activityLogRoutes.js
const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { protect, authorize } = require('../middleware/authMiddleware'); // Asegúrate de que la ruta sea correcta
const { getActivityLogs } = require('../controllers/activityLogController'); // Asegúrate de que la ruta sea correcta

// @desc    Obtener todos los logs de actividad
// @route   GET /api/activity-logs
// @access  Private (Admin only)
router.get('/', protect, authorize(['admin']), asyncHandler(getActivityLogs));

module.exports = router;