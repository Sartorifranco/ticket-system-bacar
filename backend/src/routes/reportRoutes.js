// backend/src/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
// CAMBIADO: Importa 'authenticateToken' en lugar de 'protect'
const { authenticateToken, authorize } = require('../middleware/authMiddleware'); // <-- ¡CAMBIO AQUÍ!
const asyncHandler = require('../middleware/asyncHandler'); // Asegúrate de importar asyncHandler

const {
    getTicketsByDepartment,
    getTicketsByStatus,
    getTicketsByPriority,
    // Agrega aquí cualquier otra función de reporte que tengas en tu reportController
} = require('../controllers/reportController'); // Asegúrate de que estas funciones existan y se exporten correctamente

// Rutas para reportes
router.get('/tickets-by-department', authenticateToken, authorize('admin'), asyncHandler(getTicketsByDepartment)); // <-- ¡CAMBIO AQUÍ!
router.get('/tickets-by-status', authenticateToken, authorize('admin'), asyncHandler(getTicketsByStatus)); // <-- ¡CAMBIO AQUÍ!
router.get('/tickets-by-priority', authenticateToken, authorize('admin'), asyncHandler(getTicketsByPriority)); // <-- ¡CAMBIO AQUÍ!
// Agrega aquí más rutas de reportes si las tienes

module.exports = router;
