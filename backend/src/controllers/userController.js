// backend/src/controllers/userController.js
<<<<<<< HEAD
const asyncHandler = require('express-async-handler');
const pool = require('../config/db');
const bcrypt = require('bcryptjs'); // Asegúrate de que estás usando bcryptjs o bcrypt

// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
    try {
        const [users] = await pool.execute(
            `SELECT id, username, email, role, department_id, created_at, updated_at FROM users`
        );
        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al obtener usuarios.' });
    }
});

// @desc    Obtener usuario por ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
        const [user] = await pool.execute(
            `SELECT id, username, email, role, department_id, created_at, updated_at FROM users WHERE id = ?`,
            [id]
        );
        if (user.length === 0) {
            res.status(404);
            throw new Error('Usuario no encontrado.');
        }
        res.json(user[0]);
    } catch (error) {
        console.error('Error al obtener usuario por ID:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al obtener usuario.' });
    }
});

// @desc    Crear un nuevo usuario
// @route   POST /api/users
// @access  Private/Admin
const createUser = asyncHandler(async (req, res) => {
    const { username, email, password, role, department_id } = req.body;

    if (!username || !email || !password || !role) {
        res.status(400);
        throw new Error('Por favor, ingresa todos los campos obligatorios: nombre de usuario, email, contraseña, rol.');
    }

    try {
        // Verificar si el usuario o email ya existen
        const [existingUser] = await pool.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
        if (existingUser.length > 0) {
            res.status(400);
            throw new Error('El nombre de usuario o el email ya están registrados.');
        }

        // Hashear la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // CORRECCIÓN: 'password' a 'password_hash'
        const [result] = await pool.execute(
            `INSERT INTO users (username, email, password_hash, role, department_id) VALUES (?, ?, ?, ?, ?)`,
            [username, email, hashedPassword, role, department_id || null]
        );

        const newUserId = result.insertId;
        const [newUser] = await pool.execute(
            `SELECT id, username, email, role, department_id, created_at, updated_at FROM users WHERE id = ?`,
            [newUserId]
        );

        res.status(201).json(newUser[0]);
    } catch (error) {
        console.error('Error al crear usuario:', error.message, error.stack);
        // Asegúrate de que el error se propague correctamente para que el errorHandler lo capture
        if (res.statusCode === 200) res.status(500); // Si no se ha establecido un status, usar 500
        throw new Error(error.message || 'Error interno del servidor al crear usuario.');
    }
});

// @desc    Actualizar usuario
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { username, email, password, role, department_id } = req.body;

    try {
        const [userRows] = await pool.execute(`SELECT * FROM users WHERE id = ?`, [id]);
        if (userRows.length === 0) {
            res.status(404);
            throw new Error('Usuario no encontrado.');
        }

        const oldUser = userRows[0];
        const updateFields = [];
        const updateValues = [];

        if (username !== undefined && username !== oldUser.username) {
            // Verificar si el nuevo username ya existe (excluyendo al propio usuario)
            const [existingUsername] = await pool.execute('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
            if (existingUsername.length > 0) {
                res.status(400);
                throw new Error('El nombre de usuario ya está en uso.');
            }
            updateFields.push('username = ?');
            updateValues.push(username);
        }
        if (email !== undefined && email !== oldUser.email) {
            // Verificar si el nuevo email ya existe (excluyendo al propio usuario)
            const [existingEmail] = await pool.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
            if (existingEmail.length > 0) {
                res.status(400);
                throw new Error('El email ya está en uso.');
            }
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        if (password !== undefined && password !== '') {
            // Hashear la nueva contraseña si se proporciona
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            updateFields.push('password_hash = ?'); // CORRECCIÓN: 'password' a 'password_hash'
            updateValues.push(hashedPassword);
        }
        if (role !== undefined && role !== oldUser.role) {
            // Validar que el rol sea uno de los permitidos (admin, user, agent)
            const validRoles = ['admin', 'user', 'agent'];
            if (!validRoles.includes(role)) {
                res.status(400);
                throw new Error('Rol de usuario no válido.');
            }
            updateFields.push('role = ?');
            updateValues.push(role);
        }
        if (department_id !== undefined) { // Permite null para desasignar
            // Opcional: validar que department_id exista si no es null
            if (department_id !== null) {
                const [deptExists] = await pool.execute('SELECT id FROM departments WHERE id = ?', [department_id]);
                if (deptExists.length === 0) {
                    res.status(400);
                    throw new Error('El ID de departamento proporcionado no existe.');
                }
            }
            updateFields.push('department_id = ?');
            updateValues.push(department_id);
        }

        if (updateFields.length === 0) {
            res.status(400);
            throw new Error('No se proporcionaron campos para actualizar.');
        }

        updateValues.push(id); // Añadir el ID del usuario al final para la cláusula WHERE

        await pool.execute(
            `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            updateValues
        );

        const [updatedUser] = await pool.execute(
            `SELECT id, username, email, role, department_id, created_at, updated_at FROM users WHERE id = ?`,
            [id]
        );

        res.json(updatedUser[0]);
    } catch (error) {
        console.error('Error al actualizar usuario:', error.message, error.stack);
        if (res.statusCode === 200) res.status(500); // Si no se ha establecido un status, usar 500
        throw new Error(error.message || 'Error interno del servidor al actualizar usuario.');
    }
});

// @desc    Eliminar usuario
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            res.status(404);
            throw new Error('Usuario no encontrado.');
        }
        res.json({ message: 'Usuario eliminado exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error.message, error.stack);
        res.status(500).json({ message: 'Error interno del servidor al eliminar usuario.' });
    }
=======
const pool = require('../config/db');
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');

// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private (Admin)
const getAllUsers = asyncHandler(async (req, res) => {
    // No devolver password_hash por seguridad
    const [users] = await pool.execute('SELECT id, username, email, role, created_at, updated_at FROM users ORDER BY created_at DESC');
    res.status(200).json({
        success: true,
        count: users.length,
        users,
    });
});

// @desc    Obtener un usuario por ID
// @route   GET /api/users/:id
// @access  Private (Admin)
const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [user] = await pool.execute('SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?', [id]);
    if (user.length === 0) {
        res.status(404);
        throw new Error('Usuario no encontrado');
    }
    res.status(200).json({ success: true, user: user[0] });
});

// @desc    Crear un nuevo usuario (gestionado por Admin)
// @route   POST /api/users
// @access  Private (Admin)
const createUser = asyncHandler(async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
        res.status(400);
        throw new Error('Por favor, ingresa todos los campos requeridos: nombre de usuario, email, contraseña y rol.');
    }

    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
        res.status(400);
        throw new Error('Ya existe un usuario con ese email.');
    }

    // Asegúrate de que el rol sea válido y esté permitido
    if (!['admin', 'agent', 'user'].includes(role)) {
        res.status(400);
        throw new Error('Rol de usuario inválido.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.execute(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, role]
    );

    const newUserId = result.insertId;
    const [newUser] = await pool.execute('SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?', [newUserId]);

    res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        user: newUser[0],
    });
});

// @desc    Actualizar un usuario
// @route   PUT /api/users/:id
// @access  Private (Admin)
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { username, email, role, password } = req.body;

    const [existingUsers] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [id]);
    if (existingUsers.length === 0) {
        res.status(404);
        throw new Error('Usuario no encontrado');
    }

    let updateFields = [];
    let updateValues = [];

    if (username) {
        updateFields.push('username = ?');
        updateValues.push(username);
    }
    if (email) {
        updateFields.push('email = ?');
        updateValues.push(email);
    }
    if (role) {
        if (!['admin', 'agent', 'user'].includes(role)) {
            res.status(400);
            throw new Error('Rol de usuario inválido.');
        }
        updateFields.push('role = ?');
        updateValues.push(role);
    }
    if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        updateFields.push('password_hash = ?');
        updateValues.push(hashedPassword);
    }

    if (updateFields.length === 0) {
        res.status(400);
        throw new Error('No hay datos para actualizar');
    }

    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    updateValues.push(id);

    const [result] = await pool.execute(query, updateValues);

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Usuario no encontrado o sin cambios');
    }

    const [updatedUser] = await pool.execute('SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?', [id]);

    res.status(200).json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        user: updatedUser[0],
    });
});

// @desc    Eliminar un usuario
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
        res.status(404);
        throw new Error('Usuario no encontrado.');
    }

    res.status(200).json({ success: true, message: 'Usuario eliminado exitosamente.' });
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
});

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
<<<<<<< HEAD
};
=======
};
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
