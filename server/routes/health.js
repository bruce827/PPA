const express = require('express');
const router = express.Router();
const db = require('../utils/db');

router.get('/health', async (req, res) => {
  try {
    // 使用已初始化的连接执行轻量探活；不要在请求热路径重建连接池。
    await db.get('SELECT 1 AS test');
    res.json({
      status: 'ok',
      message: 'Backend is healthy and connected to database',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    });
  }
});

module.exports = router;
