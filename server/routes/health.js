const express = require('express');
const router = express.Router();
const db = require('../utils/db');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: 系统健康检查
 *     description: 检查系统运行状态和数据库连接
 *     tags: [健康检查]
 *     responses:
 *       200:
 *         description: 系统健康状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "healthy"
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-01T00:00:00.000Z"
 *                     uptime:
 *                       type: number
 *                       description: 系统运行时间（秒）
 *                       example: 3600
 *                     database:
 *                       type: object
 *                       properties:
 *                         connected:
 *                           type: boolean
 *                           example: true
 *                         type:
 *                           type: string
 *                           example: "postgres"
 *                     version:
 *                       type: string
 *                       example: "1.0.0"
 *                     environment:
 *                       type: string
 *                       example: "development"
 *       500:
 *         description: 系统异常
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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
