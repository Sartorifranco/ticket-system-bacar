// backend/src/controllers/userController.js
const pool = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createActivityLog } = require('../utils/activityLogger'); // Asegúrate de importar esto

// Helper function to generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h', // Token expires in 1 hour
    });
};

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, role, department_id } = req.body;

    if (!username || !email || !password) {
        res.status(400);
        throw new Error('Por favor, ingrese todos los campos requeridos: nombre de usuario, email y contraseña.');
    }

    // Check if user exists
    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
        res.status(400);
        throw new Error('El usuario con este email ya existe.');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Default role to 'client' if not provided or invalid
    const userRole = ['admin', 'agent', 'client'].includes(role) ? role : 'client';

    // Handle department_id for agents
    let finalDepartmentId = null;
    if (userRole === 'agent') {
        if (!department_id) {
            res.status(400);
            throw new Error('Los agentes deben tener un department_id asignado.');
        }
        // Optional: Verify if department_id exists in the departments table
        const [deptExists] = await pool.execute('SELECT id FROM departments WHERE id = ?', [department_id]);
        if (deptExists.length === 0) {
            res.status(400);
            throw new Error('El department_id proporcionado no es válido.');
        }
        finalDepartmentId = department_id;
    }

    // Insert user into database
    const [result] = await pool.execute(
        'INSERT INTO users (username, email, password_hash, role, department_id) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashedPassword, userRole, finalDepartmentId]
    );

    const newUserId = result.insertId;
    const token = generateToken(newUserId);

    // Log activity
    await createActivityLog(
        newUserId,
        'user',
        'created',
        `Nuevo usuario registrado: ${username} (${userRole})`,
        newUserId,
        null,
        { username, email, role: userRole, department_id: finalDepartmentId }
    );

    res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente.',
        user: {
            id: newUserId,
            username,
            email,
            role: userRole,
            department_id: finalDepartmentId,
            token,
        },
    });
});

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check for user email
    const [users] = await pool.execute('SELECT id, username, email, password_hash, role, department_id FROM users WHERE email = ?', [email]);
    const user = users[0];

    if (user && (await bcrypt.compare(password, user.password_hash))) {
        const token = generateToken(user.id);

        // Log activity
        await createActivityLog(
            user.id,
            'auth',
            'login',
            `Inicio de sesión exitoso para ${user.username} (${user.role})`,
            user.id,
            null,
            null
        );

        res.status(200).json({
            success: true,
            message: 'Inicio de sesión exitoso.',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                department_id: user.department_id,
                token,
            },
        });
    } else {
        res.status(401);
        throw new Error('Credenciales inválidas.');
    }
});

// @desc    Get user profile
// @route   GET /api/users/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    // req.user is set by the protect middleware
    const [userRows] = await pool.execute('SELECT id, username, email, role, department_id, created_at, updated_at FROM users WHERE id = ?', [req.user.id]);
    const user = userRows[0];

    if (user) {
        res.status(200).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                department_id: user.department_id,
                created_at: user.created_at,
                updated_at: user.updated_at,
            },
        });
    } else {
        res.status(404);
        throw new Error('Usuario no encontrado.');
    }
});

// @desc    Get all users
// @route   GET /api/users
// @access  Admin
const getUsers = asyncHandler(async (req, res) => {
    const [users] = await pool.execute('SELECT id, username, email, role, department_id, created_at, updated_at FROM users');
    res.status(200).json({
        success: true,
        count: users.length,
        data: users,
    });
});

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Admin, Agent, Client (self)
const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [userRows] = await pool.execute('SELECT id, username, email, role, department_id, created_at, updated_at FROM users WHERE id = ?', [id]);

    if (userRows.length === 0) {
        res.status(404);
        throw new Error('Usuario no encontrado.');
    }

    const user = userRows[0];

    // Authorization check: Admin can see any user. Agent can see any user. Client can only see their own profile.
    if (req.user.role === 'client' && req.user.id !== user.id) {
        res.status(403);
        throw new Error('No autorizado para ver este perfil de usuario.');
    }

    res.status(200).json({
        success: true,
        data: user,
    });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Admin
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { username, email, password, role, department_id } = req.body;
    const requestingUserId = req.user.id;

    const [existingUserRows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (existingUserRows.length === 0) {
        res.status(404);
        throw new Error('Usuario no encontrado.');
    }
    const oldUserData = existingUserRows[0];

    const updateFields = {};
    const updateParams = [];

    if (username !== undefined) { updateFields.username = username; updateParams.push(username); }
    if (email !== undefined) { updateFields.email = email; updateParams.push(email); }
    if (password !== undefined && password !== '') {
        const salt = await bcrypt.genSalt(10);
        updateFields.password_hash = await bcrypt.hash(password, salt);
        updateParams.push(updateFields.password_hash);
    }
    if (role !== undefined && ['admin', 'agent', 'client'].includes(role)) {
        updateFields.role = role;
        updateParams.push(role);
    }

    // Handle department_id update for agents
    if (updateFields.role === 'agent' || oldUserData.role === 'agent') {
        if (department_id !== undefined) {
            // Optional: Verify if department_id exists in the departments table
            if (department_id !== null) {
                const [deptExists] = await pool.execute('SELECT id FROM departments WHERE id = ?', [department_id]);
                if (deptExists.length === 0) {
                    res.status(400);
                    throw new Error('El department_id proporcionado no es válido.');
                }
            }
            updateFields.department_id = department_id;
            updateParams.push(department_id);
        } else if (updateFields.role === 'agent' && department_id === undefined && oldUserData.department_id === null) {
            // If changing to agent role and no department_id is provided, and old was null
            res.status(400);
            throw new Error('Los agentes deben tener un department_id asignado.');
        }
    } else if (updateFields.role !== 'agent' && oldUserData.role === 'agent') {
        // If changing from agent role to non-agent, clear department_id
        updateFields.department_id = null;
        updateParams.push(null);
    }


    if (Object.keys(updateFields).length === 0) {
        res.status(400);
        throw new Error('No se proporcionaron campos para actualizar.');
    }

    const setClauses = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    updateParams.push(id); // Add user ID for WHERE clause

    await pool.execute(`UPDATE users SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, updateParams);

    // Fetch updated user data for logging
    const [updatedUserRows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    const newUserData = updatedUserRows[0];

    // Log activity
    await createActivityLog(
        requestingUserId,
        'user',
        'updated',
        `Usuario #${id} actualizado por ${req.user.username}.`,
        parseInt(id),
        oldUserData,
        newUserData
    );

    res.status(200).json({
        success: true,
        message: 'Usuario actualizado exitosamente.',
        updatedFields: updateFields,
    });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Admin
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    const [existingUserRows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (existingUserRows.length === 0) {
        res.status(404);
        throw new Error('Usuario no encontrado.');
    }
    const deletedUserData = existingUserRows[0];

    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    // Log activity
    await createActivityLog(
        requestingUserId,
        'user',
        'deleted',
        `Usuario eliminado: ${deletedUserData.username} (ID: ${id})`,
        parseInt(id),
        deletedUserData,
        null
    );

    res.status(200).json({
        success: true,
        message: 'Usuario eliminado exitosamente.',
    });
});

// Export all functions
module.exports = {
    registerUser,
    loginUser,
    getMe,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
};
