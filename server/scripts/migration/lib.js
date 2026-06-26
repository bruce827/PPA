const path = require('path');

const TABLES_IN_ORDER = [
  'config_roles',
  'config_risk_items',
  'config_travel_costs',
  'config_business_pricing',
  'prompt_module_tags',
  'ai_model_configs',
  'ai_prompts',
  'prompt_templates',
  'opportunity_bidding_sites',
  'users',
  'projects',
  'opportunity_tender_staging',
  'form_project',
  'form_app',
  'form_definition',
  'form_field',
  'data_metrics_project',
  'data_metrics',
  'data_metric_categories',
  'ai_assessment_logs',
  'web3d_risk_items',
  'web3d_workload_templates',
  'tender_staging_web_search_results',
  'project_push_records',
  'wiki_project_relations',
];

const getSqlitePath = () => path.resolve(
  process.env.SQLITE_DB_PATH || process.env.DB_PATH || path.join(__dirname, '../../ppa.db')
);

const getPostgresConfig = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const shouldUseSsl =
    /[?&]sslmode=require/i.test(process.env.DATABASE_URL) ||
    process.env.PGSSLMODE === 'require';

  const config = { connectionString: process.env.DATABASE_URL };
  if (shouldUseSsl) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
};

const quoteIdentifier = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;

module.exports = {
  TABLES_IN_ORDER,
  getSqlitePath,
  getPostgresConfig,
  quoteIdentifier,
};
