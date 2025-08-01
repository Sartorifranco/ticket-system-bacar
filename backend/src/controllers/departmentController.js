// backend/src/controllers/departmentController.js
const pool = require('../config/db');
const asyncHandler = require('express-async-handler'); // Usar express-async-handler
const { logActivity } = require('../services/activityLogService');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Admin, Agent, Client
const getAllDepartments = asyncHandler(async (req, res) => {
    console.log('[DepartmentController] Iniciando obtención de todos los departamentos...');
    try {
        const [departments] = await pool.execute('SELECT id, name, description, created_at, updated_at FROM departments ORDER BY name ASC');
        console.log(`[DepartmentController] Departamentos obtenidos: ${departments.length} resultados.`);
        res.status(200).json({
            success: true,
            count: departments.length,
            data: departments,
        });
    } catch (error) {
        console.error('[DepartmentController Error] Error al obtener departamentos:', error.message, error.stack);
        res.status(500);
        throw new Error('Error del servidor al obtener departamentos');
    }
});

// @desc    Get single department by ID
// @route   GET /api/departments/:id
// @access  Admin, Agent
const getDepartmentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log(`[DepartmentController] Iniciando obtención de departamento por ID: ${id}...`);
    try {
        const [rows] = await pool.execute('SELECT id, name, description, created_at, updated_at FROM departments WHERE id = ?', [id]);
        if (rows.length === 0) {
            res.status(404);
            throw new Error('Departamento no encontrado');
        }
        console(`[DepartmentController] Departamento ${id} obtenido.`);
        res.status(200).json({
            success: true,
            data: rows[0],
        });
    } catch (error) {
        console.error(`[DepartmentController Error] Error al obtener departamento ${id}:`, error.message, error.stack);
        res.status(500);
        throw new Error('Error del servidor al obtener departamento');
    }
});

// @desc    Create new department
// @route   POST /api/departments
// @access  Admin
const createDepartment = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const userId = req.user.id;
    const username = req.user.username;
    const userRole = req.user.role;

    if (!name || !description) {
        res.status(400);
        throw new Error('Por favor, ingrese el nombre y la descripción del departamento.');
    }

    console.log(`[DepartmentController] Intentando crear departamento: ${name}`);
    try {
        const [result] = await pool.execute(
            'INSERT INTO departments (name, description) VALUES (?, ?)',
            [name, description]
        );

        const newDepartmentId = result.insertId;

        await logActivity(
            userId,
            username,
            userRole,
            'department_created',
            `Departamento "${name}" (ID: ${newDepartmentId}) creado por ${username}.`,
            'department',
            newDepartmentId,
            null,
            { name, description }
        );

        res.status(201).json({
            success: true,
            message: 'Departamento creado exitosamente',
            departmentId: newDepartmentId,
        });
    } catch (error) {
        console.error('[DepartmentController Error] Error al crear departamento:', error.message, error.stack);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409);
            throw new Error('Ya existe un departamento con ese nombre.');
        }
        res.status(500);
        throw new Error('Error del servidor al crear departamento');
    }
});

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Admin
const updateDepartment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;
    const username = req.user.username;
    const userRole = req.user.role;

    if (!name || !description) {
        res.status(400);
        throw new Error('Por favor, ingrese el nombre y la descripción del departamento.');
    }

    console.log(`[DepartmentController] Intentando actualizar departamento ID: ${id}`);
    try {
        const [existingDeptRows] = await pool.execute('SELECT * FROM departments WHERE id = ?', [id]);
        if (existingDeptRows.length === 0) {
            res.status(404);
            throw new Error('Departamento no encontrado');
        }
        const oldDepartmentData = existingDeptRows[0];

        await pool.execute(
            'UPDATE departments SET name = ?, description = ? WHERE id = ?',
            [name, description, id]
        );

        const [updatedDeptRows] = await pool.execute('SELECT * FROM departments WHERE id = ?', [id]);
        const newDepartmentData = updatedDeptRows[0];

        await logActivity(
            userId,
            username,
            userRole,
            'department_updated',
            `Departamento "${oldDepartmentData.name}" (ID: ${id}) actualizado por ${username}.`,
            'department',
            parseInt(id),
            oldDepartmentData,
            newDepartmentData
        );

        res.status(200).json({
            success: true,
            message: 'Departamento actualizado exitosamente.',
        });
    } catch (error) {
        console.error(`[DepartmentController Error] Error al actualizar departamento ${id}:`, error.message, error.stack);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409);
            throw new Error('Ya existe un departamento con ese nombre.');
        }
        res.status(500);
        throw new Error('Error del servidor al actualizar departamento');
    }
});

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Admin
const deleteDepartment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const username = req.user.username;
    const userRole = req.user.role;

    console.log(`[DepartmentController] Intentando eliminar departamento ID: ${id}`);
    try {
        const [existingDeptRows] = await pool.execute('SELECT * FROM departments WHERE id = ?', [id]);
        if (existingDeptRows.length === 0) {
            res.status(404);
            throw new Error('Departamento no encontrado');
        }
        const deletedDepartmentData = existingDeptRows[0];

        // Check if there are any tickets associated with this department
        const [ticketCountRows] = await pool.execute('SELECT COUNT(*) AS count FROM tickets WHERE department_id = ?', [id]);
        if (ticketCountRows[0].count > 0) {
            res.status(400);
            throw new Error('No se puede eliminar el departamento porque tiene tickets asociados.');
        }

        await pool.execute('DELETE FROM departments WHERE id = ?', [id]);

        await logActivity(
            userId,
            username,
            userRole,
            'department_deleted',
            `Departamento "${deletedDepartmentData.name}" (ID: ${id}) eliminado por ${username}.`,
            'department',
            parseInt(id),
            deletedDepartmentData,
            null
        );

        res.status(200).json({
            success: true,
            message: 'Departamento eliminado exitosamente.',
        });
    } catch (error) {
        console.error(`[DepartmentController Error] Error al eliminar departamento ${id}:`, error.message, error.stack);
        res.status(500);
        throw new Error(error.message || 'Error del servidor al eliminar departamento');
    }
});

// Export all functions
module.exports = {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
};
