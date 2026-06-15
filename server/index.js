const express = require('express');
const loadEnvFile = require('./config/loadEnv');
const app = express();
const allRoutes = require('./routes');
const db = require('./utils/db'); // Import db utility
const serverConfig = require('./config/server');
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
const formDesignMigration = require('./migrations/015_create_form_design_tables');
const wikiMigration = require('./migrations/016_create_wiki_project_relations');

loadEnvFile();

app.use(express.json({ limit: '1mb' }));
app.use(allRoutes);

// Global error handling middleware (must be last)
app.use(errorHandler);

let server;

async function startServer() {
  try {
    const databasePath = db.getDefaultDatabasePath();
    await runAIModelSupportsWebSearchMigration(databasePath);
    await runPromptTemplateCategoryMigration(databasePath);
    await runTenderWebSearchResultsMigration(databasePath);
    await runProjectPushRecordsMigration(databasePath);
    await runAIModelVisionFlagsMigration(databasePath);
    await runPromptTemplateWeb3dStep4Migration(databasePath);
    await runCleanupInvalidVisionModelFlagsMigration(databasePath);
    await db.init(databasePath); // Initialize database connection
    await formDesignMigration.up(); // Create form design tables
    await wikiMigration.up(); // Create wiki relations table
    await biddingSiteModel.ensureSchema();
    await tenderStagingModel.ensureSchema();
    if (process.env.NODE_ENV !== 'test') {
      server = app.listen(serverConfig.port, () => {
        logger.info(`Server is running on port ${serverConfig.port}`);
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
