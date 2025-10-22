const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// 健康检查端点
router.get('/health', healthController.checkHealth);

module.exports = router;
