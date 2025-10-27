const express = require('express');
const app = express();
const allRoutes = require('./routes');

app.use(express.json());
app.use(allRoutes);

let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(3001, () => {
    console.log('Server is running on port 3001');
  });
}

module.exports = { app, server };

// 优雅退出
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  const { closeDatabase } = require('./config/database');
  closeDatabase();
  process.exit(0);
});
