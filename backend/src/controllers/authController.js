// backend/src/controllers/authController.js
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // Asume que tienes un archivo db.js en config

// @desc    Registrar un nuevo usuario
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, role, department_id } = req.body;

    // Validación básica de campos
    if (!username || !email || !password) {
        res.status(400);
        throw new Error('Por favor, ingresa todos los campos requeridos: nombre de usuario, email y contraseña.');
    }

    // Verificar si el usuario ya existe
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);

    if (existingUsers.length > 0) {
        res.status(400);
        throw new Error('El usuario con ese email o nombre de usuario ya existe.');
    }

    // Hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Determinar el rol (por defecto 'client' si no se especifica o no es válido)
    const userRole = ['admin', 'agent', 'client'].includes(role) ? role : 'client';
    
    // Si el rol es 'agent' y no se proporciona department_id, o si department_id no es válido
    let finalDepartmentId = null;
    if (userRole === 'agent' && department_id) {
        const [departments] = await pool.query('SELECT id FROM departments WHERE id = ?', [department_id]);
        if (departments.length > 0) {
            finalDepartmentId = department_id;
        } else {
            // Opcional: Lanzar un error o asignar a null si el department_id no es válido
            console.warn(`Departamento con ID ${department_id} no encontrado para el agente ${username}. Asignando a NULL.`);
        }
    }

    // Insertar nuevo usuario en la base de datos
    const [result] = await pool.query(
        'INSERT INTO users (username, email, password_hash, role, department_id) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashedPassword, userRole, finalDepartmentId]
    );

    const userId = result.insertId;

    if (userId) {
        res.status(201).json({
            id: userId,
            username,
            email,
            role: userRole,
            department_id: finalDepartmentId,
            token: generateToken(userId),
        });
    } else {
        res.status(400);
        throw new Error('Datos de usuario inválidos');
    }
});

// @desc    Autenticar un usuario
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Verificar si el usuario existe por email
    const [users] = await pool.query('SELECT id, username, email, password_hash, role, department_id FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
        res.status(400);
        throw new Error('Credenciales inválidas');
    }

    const user = users[0];

    // Comparar contraseña
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
        res.status(400);
        throw new Error('Credenciales inválidas');
    }

    res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        token: generateToken(user.id),
    });
});

// @desc    Obtener datos del usuario actual
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    // El usuario ya está adjunto a req.user por el middleware 'protect'
    res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        department_id: req.user.department_id,
    });
});

// Generar JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h', // Token expira en 1 hora
    });
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
};
