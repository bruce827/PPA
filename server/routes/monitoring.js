const express = require('express');
const monitoringController = require('../controllers/monitoringController');

const router = express.Router();

router.get('/logs', monitoringController.getLogs);

router.get('/stats', monitoringController.getStats);

router.get('/logs/:requestHash', monitoringController.getLogDetail);

module.exports = router;
