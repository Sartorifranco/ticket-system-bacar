// backend/src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
// CAMBIADO: Importa 'authenticateToken' en lugar de 'protect'
const { authenticateToken, authorize } = require('../middleware/authMiddleware'); // <-- ¡CAMBIO AQUÍ!

const {
    getDashboardMetrics,
    getAgentDashboardMetrics
} = require('../controllers/dashboardController');

// Rutas para métricas del dashboard
router.get('/metrics', authenticateToken, authorize('admin'), getDashboardMetrics); // <-- ¡CAMBIO AQUÍ!
router.get('/agent-metrics/:userId', authenticateToken, authorize('agent', 'admin'), getAgentDashboardMetrics); // <-- ¡CAMBIO AQUÍ!

module.exports = router;
