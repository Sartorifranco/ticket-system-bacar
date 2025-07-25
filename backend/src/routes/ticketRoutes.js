// backend/src/routes/ticketRoutes.js
const express = require('express');
const router = express.Router();
const {
    getAllTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    addCommentToTicket,
    // Las siguientes funciones deben existir en ticketController.js si se usan aquí
    // getCommentsForTicket, // Si tienes una ruta GET específica para comentarios
    // assignTicketToAgent,  // Si tienes una ruta PUT específica para asignar
    // changeTicketStatus,   // Si tienes una ruta PUT específica para cambiar estado
    // uploadAttachment      // Si tienes una ruta POST específica para adjuntos
} = require('../controllers/ticketController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Si usas Multer para la subida de archivos, necesitarás importarlo y configurarlo aquí.
// Ejemplo: const multer = require('multer');
// const upload = multer({ dest: 'uploads/' }); // Configura tu destino de archivos

// Rutas para tickets (colección)
router.route('/')
    // GET /api/tickets - Obtener todos los tickets (lógica interna del controlador restringe para 'user' rol)
    .get(protect, authorize(['admin', 'agent', 'client']), getAllTickets)
    .post(protect, authorize(['client', 'agent', 'admin']), createTicket); // Permitir a todos los roles crear tickets

// Rutas para tickets (por ID)
router.route('/:id')
    // GET /api/tickets/:id - Obtener un ticket por ID
    .get(protect, authorize(['admin', 'agent', 'client']), getTicketById)
    // PUT /api/tickets/:id - Actualizar un ticket (Admin y Agente, con restricción para 'user' en controller)
    .put(protect, authorize(['admin', 'agent', 'client']), updateTicket) // Cliente puede actualizar si la lógica en controller lo permite (ej. reabrir)
    // DELETE /api/tickets/:id - Eliminar un ticket (solo Admin)
    .delete(protect, authorize(['admin']), deleteTicket);

// Rutas para comentarios (POST para añadir)
router.post('/:id/comments', protect, authorize(['client', 'agent', 'admin']), addCommentToTicket);

// Si tienes rutas específicas para estas funcionalidades y están implementadas en el controlador:
/*
router.get('/:id/comments', protect, authorize(['client', 'agent', 'admin']), getCommentsForTicket); // Si tienes un GET para comentarios
router.put('/:id/assign', protect, authorize(['admin', 'agent']), assignTicketToAgent); // Si tienes una ruta específica para asignar
router.put('/:id/status', protect, authorize(['admin', 'agent', 'client']), changeTicketStatus); // Si tienes una ruta específica para cambiar estado
router.post('/:id/upload', protect, authorize(['client', 'agent', 'admin']), upload.single('attachment'), uploadAttachment); // Si tienes una ruta específica para adjuntos
*/

module.exports = router;
