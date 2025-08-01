// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
// CAMBIADO: Importa 'authenticateToken' en lugar de 'protect'
const { authenticateToken, authorize } = require('../middleware/authMiddleware'); // <-- ¡CAMBIO AQUÍ!

const {
    registerUser,
    loginUser,
    getMe,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
} = require('../controllers/userController');

// Rutas de autenticación (aunque estas rutas también están en authRoutes,
// si las dejas aquí, asegúrate de que 'registerUser', 'loginUser', 'getMe'
// también se exporten desde userController, lo cual no es lo ideal.
// Lo más común es que estas 3 rutas estén SOLO en authRoutes.js)
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', authenticateToken, getMe); // <-- ¡CAMBIO AQUÍ!

// Rutas de gestión de usuarios (requieren protección y autorización de rol)
router.route('/')
    .get(authenticateToken, authorize('admin'), getUsers); // GET /api/users (obtener todos los usuarios) <-- ¡CAMBIO AQUÍ!

router.route('/:id')
    .get(authenticateToken, authorize('admin', 'agent', 'client'), getUserById) // GET /api/users/:id (obtener un usuario por ID) <-- ¡CAMBIO AQUÍ!
    .put(authenticateToken, authorize('admin'), updateUser) // PUT /api/users/:id (actualizar un usuario) <-- ¡CAMBIO AQUÍ!
    .delete(authenticateToken, authorize('admin'), deleteUser); // DELETE /api/users/:id (eliminar un usuario) <-- ¡CAMBIO AQUÍ!

module.exports = router;
