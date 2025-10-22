const express = require('express');
const router = express.Router();
const calculationController = require('../controllers/calculationController');

// 实时计算路由
router.post('/', calculationController.calculate);

module.exports = router;
