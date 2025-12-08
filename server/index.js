const express = require('express');
const app = express();
const allRoutes = require('./routes');
const db = require('./utils/db'); // Import db utility
const errorHandler = require('./middleware/errorHandler'); // Global error handler
const logger = require('./utils/logger');

app.use(express.json({ limit: '1mb' }));
app.use(allRoutes);

// Global error handling middleware (must be last)
app.use(errorHandler);

let server;

async function startServer() {
  try {
    await db.init(); // Initialize database connection
    if (process.env.NODE_ENV !== 'test') {
      server = app.listen(3001, () => {
        logger.info('Server is running on port 3001');
      });
    }
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();

// 优雅退出
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  if (server) {
    server.close(() => {
      logger.info('Server closed.');
    });
  }
  await db.close(); // Close database connection
  process.exit(0);
});

module.exports = { app, server };
