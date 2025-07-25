// backend/src/routes/departmentRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
} = require('../controllers/departmentController'); // Importa las funciones del controlador

const { protect, authorize } = require('../middleware/authMiddleware');

// Rutas para departamentos
router.route('/')
    // GET /api/departments - Obtener todos los departamentos (accesible para admin, agent, y client)
    .get(protect, authorize(['admin', 'agent', 'client']), getAllDepartments) // Acceso ampliado para clientes
    .post(protect, authorize(['admin']), createDepartment);

router.route('/:id')
    .get(protect, authorize(['admin', 'agent', 'client']), getDepartmentById) // Acceso ampliado para clientes
    .put(protect, authorize(['admin']), updateDepartment)
    .delete(protect, authorize(['admin']), deleteDepartment);

module.exports = router;
