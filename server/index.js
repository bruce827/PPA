
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3001; // 使用3001端口，以避免与前端可能使用的3000端口冲突

// 连接到SQLite数据库 (如果db文件不存在，则会自动创建)
const db = new sqlite3.Database('./ppa.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Successfully connected to the SQLite database.');
  }
});

app.use(express.json()); // 中间件，用于解析JSON格式的请求体

// API 健康检查端点
app.get('/api/health', (req, res) => {
  // 简单查询数据库以确认连接正常
  db.get('SELECT 1', (err, row) => {
    if (err) {
      res.status(500).json({ status: 'error', message: 'Database connection failed' });
    } else {
      res.json({ status: 'ok', message: 'Backend is healthy and connected to database' });
    }
  });
});

// 根路由的一个简单响应
app.get('/', (req, res) => {
  res.send('Hello from the backend server!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
