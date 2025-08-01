// backend/src/controllers/authController.js
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const { logActivity } = require('../services/activityLogService'); // Importar el servicio de log

// Función auxiliar para generar el token JWT
const generateToken = (id, role, department_id) => {
    return jwt.sign({ id, role, department_id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (inicialmente, luego podría ser restringido por admin)
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, role, department_id } = req.body;

    if (!username || !email || !password || !role) {
        res.status(400);
        throw new Error('Por favor, ingresa todos los campos requeridos: username, email, password, role.');
    }

    // Validar si el rol es válido
    const validRoles = ['admin', 'agent', 'client'];
    if (!validRoles.includes(role)) {
        res.status(400);
        throw new Error('Rol inválido. Los roles permitidos son: admin, agent, client.');
    }

    // Validar department_id para agentes
    if (role === 'agent' && !department_id) {
        res.status(400);
        throw new Error('Los agentes deben tener un department_id asignado.');
    }
    // Asegurarse de que department_id sea null para clientes y admins si no aplica
    const finalDepartmentId = (role === 'agent' && department_id) ? department_id : null;

    // Comprobar si el usuario ya existe
    const [userExistsRows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (userExistsRows.length > 0) {
        res.status(400);
        throw new Error('El usuario ya existe con ese email.');
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insertar usuario en la base de datos
    const [result] = await pool.execute(
        `INSERT INTO users (username, email, password_hash, role, department_id)
         VALUES (?, ?, ?, ?, ?)`,
        [username, email, hashedPassword, role, finalDepartmentId]
    );

    const newUserId = result.insertId; // ID del usuario recién insertado (para MySQL)
    const [newUserRows] = await pool.execute('SELECT id, username, email, role, department_id FROM users WHERE id = ?', [newUserId]);
    const newUser = newUserRows[0];

    if (!newUser) {
        res.status(500);
        throw new Error('Error al recuperar el usuario recién registrado.');
    }

    // Generar token JWT con el ID, ROL y DEPARTMENT_ID del usuario
    const token = generateToken(newUser.id, newUser.role, newUser.department_id);

    // --- REGISTRAR ACTIVIDAD DE REGISTRO ---
    console.log(`[AuthController] Llamando logActivity para registro de usuario ${newUser.id}`);
    await logActivity(
        newUser.id,
        newUser.username, // username
        newUser.role,     // user_role
        'user',           // action_type
        `Usuario ${newUser.username} se ha registrado como ${newUser.role}.`, // description
        'user',           // target_type
        newUser.id,       // target_id
        null,             // old_value
        { username: newUser.username, email: newUser.email, role: newUser.role } // new_value
    );
    // ------------------------------------

    res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        department_id: newUser.department_id,
        token: token,
    });
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Comprobar si el usuario existe y obtener su hash de contraseña
    const [userRows] = await pool.execute('SELECT id, username, email, password_hash, role, department_id FROM users WHERE email = ?', [email]);
    const user = userRows[0];

    if (user && (await bcrypt.compare(password, user.password_hash))) {
        // Generar token JWT con el ID, ROL y DEPARTMENT_ID del usuario
        const token = generateToken(user.id, user.role, user.department_id);

        // --- REGISTRAR ACTIVIDAD DE LOGIN ---
        console.log(`[AuthController] Llamando logActivity para login de usuario ${user.id}`);
        await logActivity(
            user.id,
            user.username, // username
            user.role,     // user_role
            'user',           // action_type
            `Usuario ${user.username} ha iniciado sesión.`, // description
            'user',           // target_type
            user.id,          // target_id
            null,             // old_value
            { ip: req.ip }    // new_value (solo se registra la IP en este caso)
        );
        // ------------------------------------

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            department_id: user.department_id,
            token: token,
        });
    } else {
        res.status(401);
        throw new Error('Credenciales inválidas (email o contraseña incorrectos).');
    }
});

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    // req.user viene del middleware 'protect'
    const [rows] = await pool.execute('SELECT id, username, email, role, department_id FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    if (user) {
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            department_id: user.department_id,
        });
    } else {
        res.status(401);
        throw new Error('Usuario no autenticado o no encontrado.');
    }
});

// @desc    Logout user
// @route   POST /api/auth/logout (o GET, dependiendo de tu implementación)
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
    // Asegúrate de que req.user esté disponible (viene del middleware de autenticación)
    const userId = req.user ? req.user.id : null; 
    const username = req.user ? req.user.username : 'Desconocido';
    const userRole = req.user ? req.user.role : 'N/A';
    
    // --- REGISTRAR ACTIVIDAD DE LOGOUT ---
    console.log(`[AuthController] Llamando logActivity para logout de usuario ${userId}`);
    await logActivity(
        userId,
        username,
        userRole,
        'user',           // action_type
        `Usuario ${username} ha cerrado sesión.`, // description
        'user',           // target_type
        userId,           // target_id
        null,             // old_value
        null              // new_value
    );
    // ------------------------------------
    res.status(200).json({ message: 'Sesión cerrada exitosamente.' });
});


module.exports = {
    registerUser,
    loginUser,
    getMe,
    logoutUser, // Asegúrate de exportar logoutUser si lo usas en tus rutas
};
