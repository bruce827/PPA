const express = require('express');
const { getDatabase } = require('./config/database');
const serverConfig = require('./config/server');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const healthController = require('./controllers/healthController');

const app = express();

// 初始化数据库连接
getDatabase();

// 中间件
app.use(express.json());

// 根路由
app.get('/', healthController.root);

// 挂载所有路由
app.use(routes);

// 全局错误处理中间件（必须放在最后）
app.use(errorHandler);

// 启动服务器
app.listen(serverConfig.port, () => {
  console.log(`Server is running on http://localhost:${serverConfig.port}`);
  console.log(`Environment: ${serverConfig.env}`);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  const { closeDatabase } = require('./config/database');
  closeDatabase();
  process.exit(0);
});
