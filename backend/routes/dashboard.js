const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const rbacMiddleware = require('../middleware/rbacMiddleware');

// Get statistics (dashboard) - Available for Admin and Operator
router.get('/stats/all', authMiddleware, rbacMiddleware(['admin', 'operator']), dashboardController.getStatistics);

// Get complete dashboard data - Available for Admin and Operator
router.get('/', authMiddleware, rbacMiddleware(['admin', 'operator']), dashboardController.getDashboardData);

// Get daily summary for sidebar - Available for all authenticated users
router.get('/daily-summary', authMiddleware, dashboardController.getDailySummary);

module.exports = router;