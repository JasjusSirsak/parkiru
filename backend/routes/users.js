const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authMiddleware = require('../middleware/authMiddleware');
const rbacMiddleware = require('../middleware/rbacMiddleware');

// Get all users (Admin only)
router.get('/', authMiddleware, rbacMiddleware(['admin']), usersController.getAllUsers);

// Get user by ID (Admin only)
router.get('/:id', authMiddleware, rbacMiddleware(['admin']), usersController.getUserById);

// Create new user (Admin only)
router.post('/', authMiddleware, rbacMiddleware(['admin']), usersController.createUser);

// Update user (Admin only)
router.put('/:id', authMiddleware, rbacMiddleware(['admin']), usersController.updateUser);

// Delete user (Admin only)
router.delete('/:id', authMiddleware, rbacMiddleware(['admin']), usersController.deleteUser);

// Get operator report (Current user)
router.get('/report', authMiddleware, usersController.getOperatorReport);

// Verify master key (Public/Operator can verify)
router.post('/verify-key', authMiddleware, usersController.verifyMasterKey);

module.exports = router;
