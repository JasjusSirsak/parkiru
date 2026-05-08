const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/parkingSessionsController');

// Entry - Create parking session (Motor masuk)
router.post('/', sessionController.createSession);

// Live Monitor - Get all active sessions
router.get('/active', sessionController.getActiveSessions);

router.get('/peak-hours/today', sessionController.getPeakHoursToday);

// Get all sessions (completed, active, etc)
router.get('/', sessionController.getAllSessions);

// Get history sessions (completed only)
router.get('/history', sessionController.getHistorySessions);

// Search by plate number (untuk Exit/Checker)
router.get('/plate/:plate_number', sessionController.getSessionByPlate);

// Get session by transaction_id (untuk QR Code Scanner)
router.get('/transaction/:transaction_id', sessionController.getSessionByTransactionId);

// Complete session - Exit motor (Ubah status ke completed)
router.put('/:id/complete', sessionController.completeSession);

// Lost Ticket - Process lost ticket
router.put('/:id/lost-ticket', sessionController.processLostTicket);

module.exports = router;
