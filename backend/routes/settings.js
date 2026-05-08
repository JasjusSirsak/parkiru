const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');
const rbacMiddleware = require('../middleware/rbacMiddleware');

// PARKING SETTINGS ROUTES
router.get('/parking', authMiddleware, rbacMiddleware(['admin', 'operator']), settingsController.getParkingSettings);
router.put('/parking', authMiddleware, rbacMiddleware(['admin']), settingsController.updateParkingSettings);

// CAFE PROFILE ROUTES
router.get('/profile', authMiddleware, rbacMiddleware(['admin', 'operator']), settingsController.getCafeProfile);
router.put('/profile', authMiddleware, rbacMiddleware(['admin']), settingsController.updateCafeProfile);

module.exports = router;
