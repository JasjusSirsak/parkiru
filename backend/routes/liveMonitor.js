const express = require('express');
const router = express.Router();
const parkingSessionsController = require('../controllers/parkingSessionsController');

router.get('/live-monitor', parkingSessionsController.getLiveMonitorData);

module.exports = router;
