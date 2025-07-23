<<<<<<< HEAD
// backend/src/controllers/authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const pool = require('../config/db'); // Asegúrate de que esta ruta sea correcta
const { logActivity } = require('../utils/activityLogger');

// Generar JWT
const generateToken = (id, role) => {
    const expiresIn = process.env.JWT_EXPIRE || '30d'; 
    console.log(`[BACKEND DEBUG] Token JWT expirará en: ${expiresIn}`);

    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: expiresIn,
    });
};

// @desc    Autenticar un usuario
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400);
        throw new Error('Por favor, introduce todos los campos.');
    }

    const [users] = await pool.execute('SELECT id, username, email, password_hash, role, department_id FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
        res.status(400);
        throw new Error('Credenciales inválidas.');
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (user && isMatch) {
        await logActivity(
            user.id,
            user.username,
            user.role,
            'user_login', 
            'Usuario ha iniciado sesión.', 
            'user', 
            user.id, 
            null, 
            null 
        );

        // CORREGIDO: Estructura de la respuesta para que el frontend pueda desestructurar { token, user }
        res.json({
            token: generateToken(user.id, user.role), // El token va como una propiedad 'token'
            user: { // El objeto usuario va anidado bajo una propiedad 'user'
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                department_id: user.department_id,
            },
        });
    } else {
        res.status(400);
        throw new Error('Credenciales inválidas.');
    }
});

// @desc    Registrar un nuevo usuario
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        res.status(400);
        throw new Error('Por favor, introduce todos los campos.');
    }

    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
        res.status(400);
        throw new Error('El usuario con ese email ya existe.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.execute(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [username, email, hashedPassword, 'user']
    );

    const newUser = {
        id: result.insertId,
        username,
        email,
        role: 'user',
    };

    await logActivity(
        newUser.id,
        newUser.username,
        newUser.role,
        'user_registered', 
        `Nuevo usuario ${newUser.username} registrado.`, 
        'user', 
        newUser.id, 
        null, 
        null 
    );

    res.status(201).json({
        message: 'Usuario registrado exitosamente. Por favor, inicia sesión.',
        user: { // Asegúrate de que la respuesta de registro también tenga la misma estructura si se usa para login automático
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            role: newUser.role,
        }
    });
});

// @desc    Obtener datos del usuario actual (ruta protegida)
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    res.status(200).json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        department_id: req.user.department_id || null,
    });
});

=======
// backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

// Función auxiliar para generar un JSON Web Token
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

// @desc    Registrar un nuevo usuario
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'Por favor, introduce todos los campos requeridos' });
    }

    try {
        const [existingUsers] = await pool.execute('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);

        if (existingUsers.length > 0) {
            return res.status(400).json({ success: false, message: 'El nombre de usuario o correo electrónico ya está en uso' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const defaultRole = role || 'user'; // Rol por defecto 'user'

        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, defaultRole]
        );

        const userId = result.insertId;
        const token = generateToken(userId, defaultRole);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user: {
                id: userId,
                username,
                email,
                role: defaultRole,
            },
            token,
        });
    } catch (error) {
        console.error('Error en registerUser:', error);
        next(error);
    }
};

// @desc    Autenticar un usuario y obtener token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Por favor, introduce correo y contraseña' });
    }

    try {
        const [users] = await pool.execute('SELECT id, username, email, password_hash, role FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            console.log(`[DEBUG LOGIN] Usuario con email "${email}" NO encontrado en la DB.`); // Debug: Usuario no encontrado
            return res.status(400).json({ success: false, message: 'Credenciales inválidas' });
        }

        const user = users[0];

        // --- INICIO DE SECCIÓN DE DEPURACIÓN CRÍTICA ---
        console.log(`\n--- INICIO DEBUG DE LOGIN ---`);
        console.log(`[DEBUG LOGIN] Intentando iniciar sesión para email: "${email}"`);
        console.log(`[DEBUG LOGIN] Contraseña recibida (TEXTO PLANO): "${password}"`); // ¡ADVERTENCIA: REMOVER EN PRODUCCIÓN!
        console.log(`[DEBUG LOGIN] Hash de contraseña de la DB: "${user.password_hash}"`);
        // --- FIN DE SECCIÓN DE DEPURACIÓN CRÍTICA ---

        const isMatch = await bcrypt.compare(password, user.password_hash);

        console.log(`[DEBUG LOGIN] Resultado de bcrypt.compare(): ${isMatch}`); // Debug: Resultado de la comparación

        if (!isMatch) {
            console.log(`[DEBUG LOGIN] Contraseñas NO COINCIDEN para el usuario "${email}".`); // Debug: Contraseña incorrecta
            return res.status(400).json({ success: false, message: 'Credenciales inválidas' });
        }

        console.log(`[DEBUG LOGIN] Contraseñas COINCIDEN para el usuario "${email}".`); // Debug: Contraseña correcta

        const token = generateToken(user.id, user.role);

        res.status(200).json({
            success: true,
            message: 'Login exitoso',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
            token,
        });
    } catch (error) {
        console.error('Error en loginUser (bloque catch):', error); // Debug: Error inesperado en el try/catch
        next(error);
    }
};

// @desc    Obtener perfil del usuario actual (protegido por token)
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'No autorizado, ID de usuario no disponible en el token.' });
        }

        const [rows] = await pool.execute('SELECT id, username, email, role FROM users WHERE id = ?', [req.user.id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }

        res.status(200).json({
            success: true,
            user: rows[0],
        });
    } catch (error) {
        console.error('Error en getMe:', error);
        next(error);
    }
};

// Exporta las funciones del controlador
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
module.exports = {
    registerUser,
    loginUser,
    getMe,
<<<<<<< HEAD
    generateToken
};
=======
};
>>>>>>> 738f5bd513da1312d47de3d73a8767aec7efc67e
