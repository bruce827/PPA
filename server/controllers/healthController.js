const { getDatabase } = require('../config/database');

/**
 * 健康检查
 */
exports.checkHealth = (req, res, next) => {
  const db = getDatabase();
  db.get('SELECT 1', (err, row) => {
    if (err) {
      res.status(500).json({ 
        status: 'error', 
        message: 'Database connection failed' 
      });
    } else {
      res.json({ 
        status: 'ok', 
        message: 'Backend is healthy and connected to database' 
      });
    }
  });
};

/**
 * 根路由
 */
exports.root = (req, res) => {
  res.send('Hello from the backend server!');
};
