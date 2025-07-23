// backend/src/controllers/departmentController.js
<<<<<<< HEAD
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');
const { logActivity } = require('../utils/activityLogger'); // ¡IMPORTA LA FUNCIÓN GLOBAL DE LOGGING!

// @desc     Obtener todos los departamentos
// @route    GET /api/departments
// @access   Private
const getAllDepartments = asyncHandler(async (req, res) => {
    const [departments] = await pool.query('SELECT id, name, description, created_at, updated_at FROM departments');
    res.status(200).json({ departments });
});

// @desc     Obtener un departamento por ID
// @route    GET /api/departments/:id
// @access   Private
const getDepartmentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [departments] = await pool.query('SELECT id, name, description, created_at, updated_at FROM departments WHERE id = ?', [id]);
    const department = departments[0];

    if (!department) {
        res.status(404);
        throw new Error('Departamento no encontrado');
    }
    res.status(200).json(department);
});

// @desc     Crear un nuevo departamento
// @route    POST /api/departments
// @access   Private (Admin only)
const createDepartment = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        res.status(400);
        throw new Error('Por favor, incluye el nombre del departamento.');
    }

    const [existingDepartments] = await pool.query('SELECT id FROM departments WHERE name = ?', [name]);
    if (existingDepartments.length > 0) {
        res.status(400);
        throw new Error('Ya existe un departamento con este nombre.');
    }

    const [result] = await pool.query(
        'INSERT INTO departments (name, description) VALUES (?, ?)',
        [name, description || null]
    );

    const newDepartmentId = result.insertId;

    // --- REGISTRAR ACTIVIDAD: Departamento Creado ---
    await logActivity(
        req.user.id,
        req.user.username,
        req.user.role,
        'department_created',
        `creó el departamento: '${name}'`,
        'department',
        newDepartmentId,
        null,
        { id: newDepartmentId, name, description }
    );

    res.status(201).json({
        id: newDepartmentId,
        name,
        description,
    });
});

// @desc     Actualizar un departamento
// @route    PUT /api/departments/:id
// @access   Private (Admin only)
=======
const pool = require('../config/db');
const asyncHandler = require('express-async-handler'); // Asegúrate de tenerlo importado si lo usas en otros controladores

// @desc    Obtener todos los departamentos
// @route   GET /api/departments
// @access  Private (Admin, Agent, User - para creación de tickets)
const getAllDepartments = asyncHandler(async (req, res) => { // Puedes usar asyncHandler aquí también
    const [rows] = await pool.execute('SELECT id, name, description FROM departments ORDER BY name ASC');
    res.status(200).json({
        success: true,
        count: rows.length,
        departments: rows,
    });
});

// @desc    Crear un nuevo departamento
// @route   POST /api/departments
// @access  Private (Admin)
const createDepartment = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name || !description) {
        res.status(400);
        throw new Error('Nombre y descripción del departamento son requeridos.');
    }

    // Verificar si ya existe un departamento con el mismo nombre
    const [existingDept] = await pool.execute('SELECT id FROM departments WHERE name = ?', [name]);
    if (existingDept.length > 0) {
        res.status(409);
        throw new Error('Ya existe un departamento con ese nombre.');
    }

    const [result] = await pool.execute(
        'INSERT INTO departments (name, description) VALUES (?, ?)',
        [name, description]
    );

    const newDepartmentId = result.insertId;
    const [newDepartment] = await pool.execute(
        'SELECT id, name, description FROM departments WHERE id = ?',
        [newDepartmentId]
    );

    res.status(201).json({
        success: true,
        message: 'Departamento creado exitosamente',
        department: newDepartment[0],
    });
});

// @desc    Obtener un departamento por ID
// @route   GET /api/departments/:id
// @access  Private (Admin, Agent)
const getDepartmentById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [rows] = await pool.execute('SELECT id, name, description FROM departments WHERE id = ?', [id]);
    if (rows.length === 0) {
        res.status(404);
        throw new Error('Departamento no encontrado.');
    }
    res.status(200).json({ success: true, department: rows[0] });
});

// @desc    Actualizar un departamento
// @route   PUT /api/departments/:id
// @access  Private (Admin)
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
const updateDepartment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

<<<<<<< HEAD
    const [existingDepartments] = await pool.query('SELECT name, description FROM departments WHERE id = ?', [id]);
    const existingDepartment = existingDepartments[0];

    if (!existingDepartment) {
        res.status(404);
        throw new Error('Departamento no encontrado');
    }

    const updateFields = [];
    const updateValues = [];
    const changes = [];

    // --- REGISTRAR CAMBIOS PARA EL LOG ---
    if (name !== undefined && name !== existingDepartment.name) {
        // Verificar si el nuevo nombre ya existe en otro departamento
        const [nameCheck] = await pool.query('SELECT id FROM departments WHERE name = ? AND id != ?', [name, id]);
        if (nameCheck.length > 0) {
            res.status(400);
            throw new Error('Ya existe un departamento con este nombre.');
        }
        updateFields.push('name = ?'); updateValues.push(name);
        changes.push(`nombre de '${existingDepartment.name}' a '${name}'`);
    }
    if (description !== undefined && description !== existingDepartment.description) {
        updateFields.push('description = ?'); updateValues.push(description);
        changes.push(`descripción`);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    if (updateFields.length === 0) {
        res.status(400);
        throw new Error('No se proporcionaron campos para actualizar');
    }

    const updateQuery = `UPDATE departments SET ${updateFields.join(', ')} WHERE id = ?`;
    await pool.query(updateQuery, [...updateValues, id]);

    // --- REGISTRAR ACTIVIDAD: Departamento Actualizado ---
    const descriptionLog = changes.length > 0
        ? `actualizó el departamento #${id}: ${changes.join(', ')}`
        : `actualizó el departamento #${id} (sin cambios detectados)`;

    await logActivity(
        req.user.id,
        req.user.username,
        req.user.role,
        'department_updated',
        descriptionLog,
        'department',
        parseInt(id),
        existingDepartment,
        { ...existingDepartment, ...req.body } // Nuevo valor (combinado con los cambios)
    );

    res.status(200).json({ message: 'Departamento actualizado exitosamente.' });
});

// @desc     Eliminar un departamento
// @route    DELETE /api/departments/:id
// @access   Private (Admin only)
const deleteDepartment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [existingDepartments] = await pool.query('SELECT name FROM departments WHERE id = ?', [id]);
    const departmentToDelete = existingDepartments[0];

    if (!departmentToDelete) {
        res.status(404);
        throw new Error('Departamento no encontrado');
    }

    // Opcional: Verificar si hay tickets asociados antes de eliminar
    const [associatedTickets] = await pool.query('SELECT COUNT(*) AS count FROM tickets WHERE department_id = ?', [id]);
    if (associatedTickets[0].count > 0) {
        res.status(400);
        throw new Error('No se puede eliminar el departamento porque tiene tickets asociados.');
    }

    const [result] = await pool.query('DELETE FROM departments WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Departamento no encontrado');
    }

    // --- REGISTRAR ACTIVIDAD: Departamento Eliminado ---
    await logActivity(
        req.user.id,
        req.user.username,
        req.user.role,
        'department_deleted',
        `eliminó el departamento #${id}: '${departmentToDelete.name}'`,
        'department',
        parseInt(id),
        departmentToDelete,
        null
    );

    res.status(200).json({ message: 'Departamento eliminado exitosamente.' });
=======
    if (!name || !description) {
        res.status(400);
        throw new Error('Nombre y descripción del departamento son requeridos.');
    }

    // Verificar si el departamento existe
    const [existingDept] = await pool.execute('SELECT id FROM departments WHERE id = ?', [id]);
    if (existingDept.length === 0) {
        res.status(404);
        throw new Error('Departamento no encontrado.');
    }

    // Verificar si el nuevo nombre ya existe en otro departamento (excluyendo el actual)
    const [nameConflict] = await pool.execute('SELECT id FROM departments WHERE name = ? AND id != ?', [name, id]);
    if (nameConflict.length > 0) {
        res.status(409);
        throw new Error('Ya existe otro departamento con ese nombre.');
    }

    const [result] = await pool.execute(
        'UPDATE departments SET name = ?, description = ? WHERE id = ?',
        [name, description, id]
    );

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Departamento no encontrado o no hubo cambios.');
    }

    const [updatedDepartment] = await pool.execute(
        'SELECT id, name, description FROM departments WHERE id = ?',
        [id]
    );

    res.status(200).json({
        success: true,
        message: 'Departamento actualizado exitosamente',
        department: updatedDepartment[0],
    });
});

// @desc    Eliminar un departamento
// @route   DELETE /api/departments/:id
// @access  Private (Admin)
const deleteDepartment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [result] = await pool.execute('DELETE FROM departments WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Departamento no encontrado.');
    }

    res.status(200).json({ success: true, message: 'Departamento eliminado exitosamente.' });
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
});

module.exports = {
    getAllDepartments,
<<<<<<< HEAD
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
};



=======
    createDepartment,
    getDepartmentById,
    updateDepartment,
    deleteDepartment,
};
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
