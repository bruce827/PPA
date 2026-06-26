const logger = require('../utils/logger');

const configModel = require('../models/configModel');
const projectModel = require('../models/projectModel');
const biddingSiteModel = require('../models/biddingSiteModel');
const tenderStagingModel = require('../models/tenderStagingModel');
const tenderWebSearchResultModel = require('../models/tenderWebSearchResultModel');
const aiAssessmentLogModel = require('../models/aiAssessmentLogModel');
const contractsService = require('./contractsService');

const SCHEMA_WARMUP_TASKS = [
  {
    name: 'config',
    run: () => configModel.ensureSchema(),
  },
  {
    name: 'projects',
    run: () => projectModel.ensureSchema(),
  },
  {
    name: 'opportunity_bidding_sites',
    run: () => biddingSiteModel.ensureSchema(),
  },
  {
    name: 'opportunity_tender_staging',
    run: () => tenderStagingModel.ensureSchema(),
  },
  {
    name: 'tender_staging_web_search_results',
    run: () => tenderWebSearchResultModel.ensureSchema(),
  },
  {
    name: 'ai_assessment_logs',
    run: () => aiAssessmentLogModel.ensureSchema(),
  },
  {
    name: 'contracts_total_row_count',
    run: () => contractsService.getContractsTotalRowCount(),
  },
];

async function warmupSchemas() {
  const startedAt = Date.now();

  for (const task of SCHEMA_WARMUP_TASKS) {
    const taskStartedAt = Date.now();
    await task.run();
    logger.info('Schema warmup task completed', {
      task: task.name,
      durationMs: Date.now() - taskStartedAt,
    });
  }

  logger.info('Schema warmup completed', {
    durationMs: Date.now() - startedAt,
    taskCount: SCHEMA_WARMUP_TASKS.length,
  });
}

module.exports = {
  SCHEMA_WARMUP_TASKS,
  warmupSchemas,
};
