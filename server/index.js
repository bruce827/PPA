const express = require('express');
const loadEnvFile = require('./config/loadEnv');
const app = express();
const allRoutes = require('./routes');
const db = require('./utils/db'); // Import db utility
const serverConfig = require('./config/server');
const errorHandler = require('./middleware/errorHandler'); // Global error handler
const logger = require('./utils/logger');
const { mountDocs } = require('./openapi/docs'); // 代码派生 OpenAPI 契约文档
const biddingSiteModel = require('./models/biddingSiteModel');
const tenderStagingModel = require('./models/tenderStagingModel');
const schemaWarmupService = require('./services/schemaWarmupService');
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
const { TABLES_IN_ORDER: REQUIRED_POSTGRES_TABLES } = require('./scripts/migration/lib');

loadEnvFile();

app.use(express.json({ limit: '1mb' }));

// 挂载代码派生的 OpenAPI 契约文档 (/api-docs.json + /api-docs)
mountDocs(app);

app.use(allRoutes);

// Global error handling middleware (must be last)
app.use(errorHandler);

let server;

async function assertPostgresSchemaReady() {
  const placeholders = REQUIRED_POSTGRES_TABLES.map(() => '?').join(', ');
  const rows = await db.all(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN (${placeholders})
    `,
    REQUIRED_POSTGRES_TABLES
  );
  const existing = new Set(rows.map((row) => row.table_name));
  const missing = REQUIRED_POSTGRES_TABLES.filter((tableName) => !existing.has(tableName));

  if (missing.length > 0) {
    throw new Error(
      `PostgreSQL schema missing required tables: ${missing.join(', ')}. Run migration schema setup before starting the server.`
    );
  }
}

function isRetryablePostgresStartupError(error) {
  const message = String(error?.message || '');
  const retryableFragments = [
    'Connection terminated',
    'connection timeout',
    'timeout',
    'ECONNRESET',
    'ETIMEDOUT',
    'EPIPE',
    'ENOTFOUND',
  ];

  return retryableFragments.some((fragment) => message.includes(fragment));
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initPostgresForStartup() {
  const maxAttempts = Math.max(1, parseInt(process.env.PPA_DB_INIT_ATTEMPTS || '3', 10));
  const baseDelayMs = Math.max(0, parseInt(process.env.PPA_DB_INIT_RETRY_DELAY_MS || '1500', 10));
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await db.init();
      await assertPostgresSchemaReady();
      return;
    } catch (error) {
      lastError = error;
      await db.close().catch(() => {});

      const shouldRetry = attempt < maxAttempts && isRetryablePostgresStartupError(error);
      if (!shouldRetry) {
        break;
      }

      const delayMs = baseDelayMs * attempt;
      logger.warn('PostgreSQL startup connection failed; retrying', {
        attempt,
        maxAttempts,
        delayMs,
        error: error.message,
      });
      await wait(delayMs);
    }
  }

  throw lastError;
}

async function startServer() {
  try {
    const isPostgres = db.getConfiguredDbType() === 'postgres';

    if (isPostgres) {
      await initPostgresForStartup();
      await schemaWarmupService.warmupSchemas();
      logger.info('PostgreSQL mode enabled; skipping SQLite bootstrap migrations.');
    } else {
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
      await schemaWarmupService.warmupSchemas();
    }

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
