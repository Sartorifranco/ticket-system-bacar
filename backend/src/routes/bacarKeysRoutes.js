// backend/routes/bacarKeysRoutes.js
const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler'); // Para manejar errores asíncronos
const pool = require('../config/db'); // Importa tu conexión a la base de datos

// Importa tus middlewares de autenticación y autorización
// NOTA IMPORTANTE: Si tu authMiddleware.js está en 'backend/src/middleware/',
// y este archivo (bacarKeysRoutes.js) está en 'backend/src/routes/',
// entonces la ruta '../middleware/authMiddleware' es CORRECTA.
// Si tu estructura es diferente, ajusta esta ruta.
const { protect, authorize } = require('../middleware/authMiddleware'); 

// --- DEBUGGING INICIO ---
console.log('--- DEBUGGING bacarKeysRoutes.js ---');
console.log('Tipo de protect:', typeof protect);
console.log('Valor de protect:', protect);
console.log('Tipo de authorize:', typeof authorize);
console.log('Valor de authorize:', authorize);

if (typeof protect !== 'function') {
  console.error('ERROR CRÍTICO: "protect" NO ES UNA FUNCIÓN al ser importado en bacarKeysRoutes.js');
  // Esto hará que el servidor falle al iniciar si 'protect' no es una función
  throw new Error('Configuración de autenticación inválida: "protect" no es una función.');
}
if (typeof authorize !== 'function') {
  console.error('ERROR CRÍTICO: "authorize" NO ES UNA FUNCIÓN al ser importado en bacarKeysRoutes.js');
  // Esto hará que el servidor falle al iniciar si 'authorize' no es una función
  throw new Error('Configuración de autorización inválida: "authorize" no es una función.');
}
console.log('--- DEBUGGING bacarKeysRoutes.js (FIN) ---');
// --- DEBUGGING FIN ---


// Middleware para parsear JSON en las peticiones (ya lo tienes en app.js, pero es buena práctica aquí también)
router.use(express.json());

// @desc    Obtener todas las claves Bacar
// @route   GET /api/bacar-keys
// @access  Private/Admin
router.get('/', protect, authorize(['admin']), asyncHandler(async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, device_user, username, password, notes, created_by_user_id, created_by_username, created_at, updated_at
      FROM bacar_keys
      ORDER BY created_at DESC
    `);
    // CUIDADO: En un entorno real, NO se devolvería la contraseña en texto plano.
    // Aquí se devuelve para el propósito del ejercicio de visualización en el frontend.
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener claves Bacar:', error);
    res.status(500).json({ message: 'Error interno del servidor al obtener claves Bacar.' });
  }
}));

// @desc    Crear una nueva clave Bacar
// @route   POST /api/bacar-keys
// @access  Private/Admin
router.post('/', protect, authorize(['admin']), asyncHandler(async (req, res) => {
  const { device_user, username, password, notes } = req.body;
  const created_by_user_id = req.user.id; // ID del usuario autenticado desde el token
  const created_by_username = req.user.username; // Nombre del usuario autenticado desde el token

  if (!device_user || !username || !password) {
    res.status(400);
    throw new Error('Faltan campos obligatorios: device_user, username, password.');
  }

  try {
    // CUIDADO: En un entorno real, la contraseña debería ser hasheada aquí antes de guardarla (ej. con bcrypt).
    const [result] = await pool.execute(
      `INSERT INTO bacar_keys (device_user, username, password, notes, created_by_user_id, created_by_username)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [device_user, username, password, notes, created_by_user_id, created_by_username]
    );

    const newKeyId = result.insertId;
    const [newKeyRows] = await pool.execute('SELECT * FROM bacar_keys WHERE id = ?', [newKeyId]);
    res.status(201).json(newKeyRows[0]);
  } catch (error) {
    console.error('Error al crear clave Bacar:', error);
    res.status(500).json({ message: 'Error interno del servidor al crear clave Bacar.' });
  }
}));

// @desc    Actualizar una clave Bacar existente
// @route   PUT /api/bacar-keys/:id
// @access  Private/Admin
router.put('/:id', protect, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { device_user, username, password, notes } = req.body;

  try {
    const [existingKeyRows] = await pool.execute('SELECT * FROM bacar_keys WHERE id = ?', [id]);
    if (existingKeyRows.length === 0) {
      res.status(404);
      throw new Error('Clave Bacar no encontrada.');
    }

    const updateFields = [];
    const updateValues = [];

    if (device_user !== undefined) { updateFields.push('device_user = ?'); updateValues.push(device_user); }
    if (username !== undefined) { updateFields.push('username = ?'); updateValues.push(username); }
    if (password !== undefined) {
      // CUIDADO: Aquí iría el hashing de la nueva contraseña
      updateFields.push('password = ?'); updateValues.push(password);
    }
    if (notes !== undefined) { updateFields.push('notes = ?'); updateValues.push(notes); }

    if (updateFields.length === 0) {
      res.status(400);
      throw new Error('No se proporcionaron campos para actualizar.');
    }

    updateValues.push(id); // Añade el ID al final para la cláusula WHERE

    await pool.execute(
      `UPDATE bacar_keys SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );

    const [updatedKeyRows] = await pool.execute('SELECT * FROM bacar_keys WHERE id = ?', [id]);
    res.json(updatedKeyRows[0]);
  } catch (error) {
    console.error('Error al actualizar clave Bacar:', error);
    res.status(500).json({ message: 'Error interno del servidor al actualizar clave Bacar.' });
  }
}));

// @desc    Eliminar una clave Bacar
// @route   DELETE /api/bacar-keys/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize(['admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.execute('DELETE FROM bacar_keys WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      res.status(404);
      throw new Error('Clave Bacar no encontrada.');
    }
    res.json({ message: 'Clave Bacar eliminada exitosamente.' });
  } catch (error) {
    console.error('Error al eliminar clave Bacar:', error);
    res.status(500).json({ message: 'Error interno del servidor al eliminar clave Bacar.' });
  }
}));

module.exports = router;

