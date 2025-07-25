// backend/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
// Importa el controlador de dashboard
const { getDashboardMetrics } = require('../controllers/dashboardController'); 

// @desc    Obtener métricas del dashboard para administradores
// @route   GET /api/dashboard/metrics
// @access  Private (Admin only)
router.get('/metrics', protect, getDashboardMetrics); // Usa la función del controlador directamente

module.exports = router;
