const express = require('express');
const loadEnvFile = require('./config/loadEnv');
const app = express();
const allRoutes = require('./routes');
const db = require('./utils/db'); // Import db utility
const errorHandler = require('./middleware/errorHandler'); // Global error handler
const logger = require('./utils/logger');
const biddingSiteModel = require('./models/biddingSiteModel');
const tenderStagingModel = require('./models/tenderStagingModel');
const {
  runMigration: runAIModelSupportsWebSearchMigration,
} = require('./migrations/006_add_supports_web_search_to_ai_model_configs');
const {
  runMigration: runPromptTemplateCategoryMigration,
} = require('./migrations/007_expand_prompt_template_categories');
const {
  runMigration: runTenderWebSearchResultsMigration,
} = require('./migrations/008_create_tender_web_search_results');
const {
  runMigration: runProjectPushRecordsMigration,
} = require('./migrations/009_project_push_records');
const {
  runMigration: runAIModelVisionFlagsMigration,
} = require('./migrations/010_add_vision_flags_to_ai_model_configs');
const {
  runMigration: runPromptTemplateWeb3dStep4Migration,
} = require('./migrations/011_expand_prompt_template_categories_for_web3d_step4');
const {
  runMigration: runCleanupInvalidVisionModelFlagsMigration,
} = require('./migrations/012_cleanup_invalid_vision_model_flags');

loadEnvFile();

app.use(express.json({ limit: '1mb' }));
app.use(allRoutes);

// Global error handling middleware (must be last)
app.use(errorHandler);

let server;

async function startServer() {
  try {
    await runAIModelSupportsWebSearchMigration();
    await runPromptTemplateCategoryMigration();
    await runTenderWebSearchResultsMigration();
    await runProjectPushRecordsMigration();
    await runAIModelVisionFlagsMigration();
    await runPromptTemplateWeb3dStep4Migration();
    await runCleanupInvalidVisionModelFlagsMigration();
    await db.init(); // Initialize database connection
    await biddingSiteModel.ensureSchema();
    await tenderStagingModel.ensureSchema();
    if (process.env.NODE_ENV !== 'test') {
      server = app.listen(3001, () => {
        logger.info('Server is running on port 3001');
        try {
          const monitoringWsService = require('./services/monitoringWsService');
          monitoringWsService.init(server);
          logger.info('Monitoring WS is enabled on /api/monitoring/ws');
        } catch (e) {
          logger.warn('Failed to init monitoring ws', { error: e && e.message });
        }
      });
    }
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

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
