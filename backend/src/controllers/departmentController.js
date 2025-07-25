// backend/src/controllers/departmentController.js
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');
const { logActivity } = require('../utils/activityLogger'); // Asegúrate de que esta utilidad exista

// @desc    Obtener todos los departamentos
// @route   GET /api/departments
// @access  Private (Admin, Agent, Client)
const getAllDepartments = asyncHandler(async (req, res) => {
    console.log('[DepartmentController] Obteniendo todos los departamentos...');
    const [departments] = await pool.query('SELECT id, name, description, created_at, updated_at FROM departments ORDER BY name ASC');
    console.log('[DepartmentController] Departamentos obtenidos:', departments.length);
    res.status(200).json({ departments });
});

// @desc    Obtener un departamento por ID
// @route   GET /api/departments/:id
// @access  Private (Admin, Agent, Client)
const getDepartmentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log(`[DepartmentController] Obteniendo departamento por ID: ${id}`);
    const [departmentRows] = await pool.query('SELECT id, name, description, created_at, updated_at FROM departments WHERE id = ?', [id]);
    const department = departmentRows[0];

    if (!department) {
        res.status(404);
        throw new Error('Departamento no encontrado');
    }
    console.log(`[DepartmentController] Departamento ${id} obtenido.`);
    res.status(200).json(department);
});

// @desc    Crear un nuevo departamento
// @route   POST /api/departments
// @access  Private (Admin only)
const createDepartment = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        res.status(400);
        throw new Error('Por favor, introduce el nombre del departamento.');
    }

    // Verificar si ya existe un departamento con el mismo nombre
    const [existingDept] = await pool.query('SELECT id FROM departments WHERE name = ?', [name]);
    if (existingDept.length > 0) {
        res.status(400);
        throw new Error('Ya existe un departamento con ese nombre.');
    }

    console.log(`[DepartmentController] Creando nuevo departamento: ${name}`);
    const [result] = await pool.query(
        'INSERT INTO departments (name, description) VALUES (?, ?)',
        [name, description || null]
    );

    const newDepartmentId = result.insertId;
    const [newDepartmentRows] = await pool.query('SELECT id, name, description, created_at, updated_at FROM departments WHERE id = ?', [newDepartmentId]);
    const newDepartment = newDepartmentRows[0];

    await logActivity(
        req.user.id,
        req.user.username,
        req.user.role,
        'department_created',
        `creó el departamento '${name}' (ID: ${newDepartmentId})`,
        'department',
        newDepartmentId,
        null,
        { name, description }
    );
    console.log(`[DepartmentController] Departamento '${name}' creado exitosamente.`);
    res.status(201).json(newDepartment);
});

// @desc    Actualizar un departamento
// @route   PUT /api/departments/:id
// @access  Private (Admin only)
const updateDepartment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    console.log(`[DepartmentController] Actualizando departamento ID: ${id}`);
    const [existingDeptRows] = await pool.query('SELECT id, name, description FROM departments WHERE id = ?', [id]);
    const existingDepartment = existingDeptRows[0];

    if (!existingDepartment) {
        res.status(404);
        throw new Error('Departamento no encontrado');
    }

    if (!name) {
        res.status(400);
        throw new new Error('El nombre del departamento no puede estar vacío.');
    }

    // Verificar si el nuevo nombre ya existe en otro departamento
    const [duplicateName] = await pool.query('SELECT id FROM departments WHERE name = ? AND id != ?', [name, id]);
    if (duplicateName.length > 0) {
        res.status(400);
        throw new Error('Ya existe otro departamento con ese nombre.');
    }

    const updateFields = [];
    const updateValues = [];
    const changes = {};

    if (name !== existingDepartment.name) {
        updateFields.push('name = ?');
        updateValues.push(name);
        changes.name = { old: existingDepartment.name, new: name };
    }
    if (description !== undefined && description !== existingDepartment.description) {
        updateFields.push('description = ?');
        updateValues.push(description);
        changes.description = { old: existingDepartment.description, new: description };
    }

    if (updateFields.length === 0) {
        console.log('[DepartmentController] No se detectaron cambios para actualizar.');
        return res.status(200).json(existingDepartment);
    }

    const query = `UPDATE departments SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    updateValues.push(id);

    await pool.query(query, updateValues);

    const [updatedDeptRows] = await pool.query('SELECT id, name, description, created_at, updated_at FROM departments WHERE id = ?', [id]);
    const updatedDepartment = updatedDeptRows[0];

    await logActivity(
        req.user.id,
        req.user.username,
        req.user.role,
        'department_updated',
        `actualizó el departamento '${existingDepartment.name}' (ID: ${id})`,
        'department',
        parseInt(id),
        existingDepartment,
        updatedDepartment
    );
    console.log(`[DepartmentController] Departamento ${id} actualizado exitosamente.`);
    res.status(200).json(updatedDepartment);
});

// @desc    Eliminar un departamento
// @route   DELETE /api/departments/:id
// @access  Private (Admin only)
const deleteDepartment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    console.log(`[DepartmentController] Eliminando departamento ID: ${id}`);
    const [departmentRows] = await pool.query('SELECT id, name FROM departments WHERE id = ?', [id]);
    const departmentToDelete = departmentRows[0];

    if (!departmentToDelete) {
        res.status(404);
        throw new Error('Departamento no encontrado');
    }

    // Opcional: Verificar si hay tickets asociados a este departamento
    // Si hay tickets, podrías:
    // 1. Impedir la eliminación y pedir que los tickets sean reasignados.
    // 2. Reasignar los tickets a un departamento por defecto o a NULL.
    // Por ahora, asumimos que la base de datos maneja la restricción de clave foránea (ON DELETE SET NULL o RESTRICT)
    // o que no hay tickets asociados.

    const [result] = await pool.query('DELETE FROM departments WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Departamento no encontrado');
    }

    await logActivity(
        req.user.id,
        req.user.username,
        req.user.role,
        'department_deleted',
        `eliminó el departamento '${departmentToDelete.name}' (ID: ${id})`,
        'department',
        parseInt(id),
        departmentToDelete,
        null
    );
    console.log(`[DepartmentController] Departamento ${id} eliminado exitosamente.`);
    res.status(200).json({ message: 'Departamento eliminado exitosamente.' });
});

module.exports = {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
};
