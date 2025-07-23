<<<<<<< HEAD
// backend/routes/departmentRoutes.js
const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');
const { createNotification } = require('../utils/notificationUtils'); // NUEVO: Importar la utilidad de notificaciones

router.use(express.json());

// @desc    Obtener todos los departamentos
// @route   GET /api/departments
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
    const [departments] = await pool.execute('SELECT * FROM departments');
    res.json({ departments });
}));

// @desc    Obtener un departamento por ID
// @route   GET /api/departments/:id
// @access  Private
router.get('/:id', protect, asyncHandler(async (req, res) => {
    const departmentId = req.params.id;
    const [departments] = await pool.execute('SELECT * FROM departments WHERE id = ?', [departmentId]);

    if (departments.length === 0) {
        res.status(404);
        throw new Error('Departamento no encontrado');
    }
    res.json(departments[0]);
}));

// @desc    Crear un nuevo departamento
// @route   POST /api/departments
// @access  Private/Admin
router.post('/', protect, authorize(['admin']), asyncHandler(async (req, res) => {
    const { name } = req.body;
    const adminUser = req.user; // Administrador que crea el departamento

    if (!name) {
        res.status(400);
        throw new Error('Por favor, ingresa el nombre del departamento.');
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO departments (name) VALUES (?)',
            [name]
        );

        const newDepartmentId = result.insertId;
        const [newDepartmentRows] = await pool.execute('SELECT * FROM departments WHERE id = ?', [newDepartmentId]);
        const newDepartment = newDepartmentRows[0];

        // Registrar actividad
        await pool.execute(
            `INSERT INTO activity_logs (user_id, user_username, user_role, action_type, description, target_type, target_id, new_value)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [adminUser.id, adminUser.username, adminUser.role, 'department_created', `Departamento "${name}" creado por ${adminUser.username}.`, 'department', newDepartmentId, JSON.stringify({ name })]
        );

        // NUEVO: Notificar a los administradores sobre la creación de un nuevo departamento
        await createNotification(
            `Nuevo departamento creado: "${name}" (ID: ${newDepartmentId}).`,
            'info',
            null, // Notificar a todos los administradores
            newDepartmentId,
            'department'
        );

        res.status(201).json(newDepartment);
    } catch (error) {
        console.error('Error al crear departamento:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400);
            throw new Error('El nombre del departamento ya existe.');
        }
        res.status(500).json({ message: 'Error interno del servidor al crear departamento.' });
    }
}));

// @desc    Actualizar un departamento
// @route   PUT /api/departments/:id
// @access  Private/Admin
router.put('/:id', protect, authorize(['admin']), asyncHandler(async (req, res) => {
    const departmentId = req.params.id;
    const { name } = req.body;
    const adminUser = req.user;

    if (!name) {
        res.status(400);
        throw new Error('Por favor, ingresa el nombre del departamento.');
    }

    try {
        const [departmentRows] = await pool.execute('SELECT * FROM departments WHERE id = ?', [departmentId]);
        if (departmentRows.length === 0) {
            res.status(404);
            throw new Error('Departamento no encontrado');
        }
        const oldDepartment = departmentRows[0];

        if (name === oldDepartment.name) {
            return res.status(200).json(oldDepartment); // No hay cambios
        }

        await pool.execute(
            'UPDATE departments SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, departmentId]
        );

        // Registrar actividad
        await pool.execute(
            `INSERT INTO activity_logs (user_id, user_username, user_role, action_type, description, target_type, target_id, old_value, new_value)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [adminUser.id, adminUser.username, adminUser.role, 'department_updated', `Nombre del departamento ID ${departmentId} cambiado de "${oldDepartment.name}" a "${name}".`, 'department', departmentId, JSON.stringify(oldDepartment.name), JSON.stringify(name)]
        );

        const [updatedDepartmentRows] = await pool.execute('SELECT * FROM departments WHERE id = ?', [departmentId]);
        res.json(updatedDepartmentRows[0]);

    } catch (error) {
        console.error('Error al actualizar departamento:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400);
            throw new Error('El nombre del departamento ya existe.');
        }
        res.status(500).json({ message: 'Error interno del servidor al actualizar departamento.' });
    }
}));

// @desc    Eliminar un departamento
// @route   DELETE /api/departments/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize(['admin']), asyncHandler(async (req, res) => {
    const departmentId = req.params.id;
    const adminUser = req.user;

    try {
        const [departmentRows] = await pool.execute('SELECT * FROM departments WHERE id = ?', [departmentId]);
        if (departmentRows.length === 0) {
            res.status(404);
            throw new Error('Departamento no encontrado');
        }
        const departmentToDelete = departmentRows[0];

        // Antes de eliminar un departamento, asegúrate de que no haya tickets asociados a él
        // o reasigna esos tickets a otro departamento o a NULL.
        const [associatedTickets] = await pool.execute('SELECT COUNT(*) AS count FROM tickets WHERE department_id = ?', [departmentId]);
        if (associatedTickets[0].count > 0) {
            res.status(400);
            throw new Error('No se puede eliminar el departamento porque tiene tickets asociados. Reasigna los tickets primero.');
        }

        await pool.execute('DELETE FROM departments WHERE id = ?', [departmentId]);

        // Registrar actividad
        await pool.execute(
            `INSERT INTO activity_logs (user_id, user_username, user_role, action_type, description, target_type, target_id, old_value)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [adminUser.id, adminUser.username, adminUser.role, 'department_deleted', `Departamento "${departmentToDelete.name}" (ID: ${departmentId}) eliminado por ${adminUser.username}.`, 'department', departmentId, JSON.stringify(departmentToDelete)]
        );

        // NUEVO: Notificar a los administradores sobre la eliminación de un departamento
        await createNotification(
            `Departamento eliminado: "${departmentToDelete.name}" (ID: ${departmentId}).`,
            'info',
            null, // Notificar a todos los administradores
            departmentId,
            'department'
        );

        res.json({ message: 'Departamento eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar departamento:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar departamento.' });
    }
}));
=======
// backend/src/routes/departmentRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
} = require('../controllers/departmentController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Rutas para departamentos
router.route('/')
    // GET /api/departments - Obtener todos los departamentos (accesible para admin, agent, y AHORA user/cliente)
    .get(protect, authorize(['admin', 'agent', 'user']), getAllDepartments) // <--- ¡CAMBIO AQUÍ!
    .post(protect, authorize(['admin']), createDepartment);

router.route('/:id')
    .get(protect, authorize(['admin', 'agent']), getDepartmentById)
    .put(protect, authorize(['admin']), updateDepartment)
    .delete(protect, authorize(['admin']), deleteDepartment);
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e

module.exports = router;