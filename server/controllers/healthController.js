const db = require('../utils/db');

/**
 * 健康检查
 */
exports.checkHealth = (req, res, next) => {
  db.get('SELECT 1')
    .then(() => {
      res.json({
        status: 'ok',
        message: 'Backend is healthy and connected to database'
      });
    })
    .catch((err) => {
      res.status(500).json({
        status: 'error',
        message: 'Database connection failed'
      });
      if (next) {
        next(err);
      }
    });
};

/**
 * 根路由
 */
exports.root = (req, res) => {
  res.send('Hello from the backend server!');
};
