// backend/src/routes/departmentRoutes.js
const express = require('express');
const {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
} = require('../controllers/departmentController');
// CAMBIADO: Importa 'authenticateToken' en lugar de 'protect'
const { authenticateToken, authorize } = require('../middleware/authMiddleware'); // <-- ¡CAMBIO AQUÍ!

const router = express.Router();

// @route   GET /api/departments
// @desc    Get all departments
// @access  Private (Admin, Agent, Client)
router.get('/', authenticateToken, authorize(['admin', 'agent', 'client']), getAllDepartments); // <-- ¡CAMBIO AQUÍ!

// @route   GET /api/departments/:id
// @desc    Get single department by ID
// @access  Private (Admin, Agent)
router.get('/:id', authenticateToken, authorize(['admin', 'agent']), getDepartmentById); // <-- ¡CAMBIO AQUÍ!

// @route   POST /api/departments
// @desc    Create new department
// @access  Private (Admin only)
router.post('/', authenticateToken, authorize(['admin']), createDepartment); // <-- ¡CAMBIO AQUÍ!

// @route   PUT /api/departments/:id
// @desc    Update department
// @access  Private (Admin only)
router.put('/:id', authenticateToken, authorize(['admin']), updateDepartment); // <-- ¡CAMBIO AQUÍ!

// @route   DELETE /api/departments/:id
// @desc    Delete department
// @access  Private (Admin only)
router.delete('/:id', authenticateToken, authorize(['admin']), deleteDepartment); // <-- ¡CAMBIO AQUÍ!

module.exports = router;
