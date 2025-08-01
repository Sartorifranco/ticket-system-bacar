// backend/src/routes/ticketRoutes.js
const express = require('express');
const {
    getAllTickets,
    getTicketById,
    createTicket,
    updateTicket,
    deleteTicket,
    addCommentToTicket,
    getTicketComments
} = require('../controllers/ticketController');
// CAMBIADO: Importa 'authenticateToken' en lugar de 'protect'
const { authenticateToken, authorize } = require('../middleware/authMiddleware'); // <-- ¡CAMBIO AQUÍ!

const router = express.Router();

// @route   GET /api/tickets
// @desc    Get all tickets (Admin, Agent) or client's own tickets (Client)
// @access  Private
router.get('/', authenticateToken, authorize(['admin', 'agent', 'client']), getAllTickets); // <-- ¡CAMBIO AQUÍ!

// @route   GET /api/tickets/:id
// @desc    Get single ticket by ID
// @access  Private
router.get('/:id', authenticateToken, authorize(['admin', 'agent', 'client']), getTicketById); // <-- ¡CAMBIO AQUÍ!

// @route   POST /api/tickets
// @desc    Create new ticket
// @access  Private (Client only for now, can be extended)
router.post('/', authenticateToken, authorize(['client', 'admin']), createTicket); // <-- ¡CAMBIO AQUÍ!

// @route   PUT /api/tickets/:id
// @desc    Update ticket
// @access  Private (Admin, Agent)
router.put('/:id', authenticateToken, authorize(['admin', 'agent']), updateTicket); // <-- ¡CAMBIO AQUÍ!

// @route   DELETE /api/tickets/:id
// @desc    Delete ticket
// @access  Private (Admin only)
router.delete('/:id', authenticateToken, authorize(['admin']), deleteTicket); // <-- ¡CAMBIO AQUÍ!

// @route   POST /api/tickets/:id/comments
// @desc    Add comment to ticket
// @access  Private
router.post('/:id/comments', authenticateToken, authorize(['admin', 'agent', 'client']), addCommentToTicket); // <-- ¡CAMBIO AQUÍ!

// @route   GET /api/tickets/:id/comments
// @desc    Get comments for a ticket
// @access  Private
router.get('/:id/comments', authenticateToken, authorize(['admin', 'agent', 'client']), getTicketComments); // <-- ¡CAMBIO AQUÍ!

module.exports = router;
