const loadEnvFile = require('../../config/loadEnv');
const { buildPostgresConnectionConfig } = require('../../utils/postgresConfig');

loadEnvFile();

const SLOW_QUERY_INDEXES = [
  {
    name: 'idx_prompt_tpl_created_desc',
    table: 'prompt_templates',
    reason: '/api/config/prompts default pagination sorts by created_at DESC',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_tpl_created_desc
        ON prompt_templates (created_at DESC)
    `,
  },
  {
    name: 'idx_prompt_tpl_module_created_desc',
    table: 'prompt_templates',
    reason: '/api/config/prompts filters by module_tag and sorts by created_at DESC',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_tpl_module_created_desc
        ON prompt_templates (module_tag, created_at DESC)
    `,
  },
  {
    name: 'idx_prompt_tpl_active_created_desc',
    table: 'prompt_templates',
    reason: '/api/config/prompts filters by is_active and sorts by created_at DESC',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_tpl_active_created_desc
        ON prompt_templates (is_active, created_at DESC)
    `,
  },
  {
    name: 'idx_prompt_tpl_system_created_desc',
    table: 'prompt_templates',
    reason: '/api/config/prompts filters by is_system and sorts by created_at DESC',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prompt_tpl_system_created_desc
        ON prompt_templates (is_system, created_at DESC)
    `,
  },
  {
    name: 'idx_ai_model_configs_list_order',
    table: 'ai_model_configs',
    reason: '/api/config/ai-models default listing sorts by current flags and created_at DESC',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_model_configs_list_order
        ON ai_model_configs (is_current DESC, is_current_vision DESC, created_at DESC)
    `,
  },
  {
    name: 'idx_ai_model_configs_active_order',
    table: 'ai_model_configs',
    reason: '/api/config/ai-models filters by is_active and keeps the same listing order',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_model_configs_active_order
        ON ai_model_configs (is_active, is_current DESC, is_current_vision DESC, created_at DESC)
    `,
  },
  {
    name: 'idx_bidding_sites_updated_id_desc',
    table: 'opportunity_bidding_sites',
    reason: '/api/opportunity/bidding-sites default listing sorts by updated_at DESC, id DESC',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bidding_sites_updated_id_desc
        ON opportunity_bidding_sites (updated_at DESC, id DESC)
    `,
  },
  {
    name: 'idx_bidding_sites_enabled_updated_desc',
    table: 'opportunity_bidding_sites',
    reason: '/api/opportunity/bidding-sites filters by enabled and sorts by updated_at DESC, id DESC',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bidding_sites_enabled_updated_desc
        ON opportunity_bidding_sites (enabled, updated_at DESC, id DESC)
    `,
  },
  {
    name: 'idx_bidding_sites_validation_updated_desc',
    table: 'opportunity_bidding_sites',
    reason: '/api/opportunity/bidding-sites filters by validation_status and sorts by updated_at DESC, id DESC',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bidding_sites_validation_updated_desc
        ON opportunity_bidding_sites (validation_status, updated_at DESC, id DESC)
    `,
  },
  {
    name: 'idx_ai_logs_step_created_desc',
    table: 'ai_assessment_logs',
    reason: '/api/monitoring/logs filters by step and sorts by created_at DESC',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_logs_step_created_desc
        ON ai_assessment_logs (step, created_at DESC)
    `,
  },
  {
    name: 'idx_ai_logs_project_created_desc',
    table: 'ai_assessment_logs',
    reason: '/api/monitoring/logs filters by project_id and sorts by created_at DESC',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_logs_project_created_desc
        ON ai_assessment_logs (project_id, created_at DESC)
    `,
  },
  {
    name: 'idx_ai_logs_req_hash_created_desc',
    table: 'ai_assessment_logs',
    reason: '/api/monitoring/logs metadata lookup searches request_hash and sorts by created_at DESC',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_logs_req_hash_created_desc
        ON ai_assessment_logs (request_hash, created_at DESC)
    `,
  },
  {
    name: 'idx_ai_logs_req_step_route_id_desc',
    table: 'ai_assessment_logs',
    reason: 'AI log_dir updates find the latest row by request_hash, step, route and id DESC',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_logs_req_step_route_id_desc
        ON ai_assessment_logs (request_hash, step, route, id DESC)
    `,
  },
  {
    name: 'idx_projects_standard_cost_not_null',
    table: 'projects',
    reason: '/api/dashboard/cost-range counts standard non-template projects by final_total_cost buckets',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_standard_cost_not_null
        ON projects (final_total_cost)
        WHERE is_template = 0
          AND final_total_cost IS NOT NULL
          AND (project_type IS NULL OR project_type = 'standard' OR project_type NOT IN ('web3d'))
    `,
  },
  {
    name: 'idx_projects_non_template_updated_desc',
    table: 'projects',
    reason: '/api/dashboard/trend and overview scan non-template projects by updated_at',
    sql: `
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_non_template_updated_desc
        ON projects (updated_at DESC)
        WHERE is_template = 0
    `,
  },
];

function normalizeSql(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim();
}

function buildPgConfig() {
  const connectionString = process.env.DATABASE_URL;
  const config = {
    ...buildPostgresConnectionConfig(connectionString, {
      missingMessage: 'DATABASE_URL is required to apply PostgreSQL slow-query indexes',
    }),
    connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT || '30000', 10),
  };

  return config;
}

async function applyIndexes({ dryRun = true } = {}) {
  if (dryRun) {
    console.log('Dry run: no schema changes will be executed.');
    SLOW_QUERY_INDEXES.forEach((indexDef, index) => {
      console.log(`\n-- ${index + 1}. ${indexDef.name}`);
      console.log(`-- table: ${indexDef.table}`);
      console.log(`-- reason: ${indexDef.reason}`);
      console.log(`${normalizeSql(indexDef.sql)};`);
    });
    return;
  }

  const { Pool } = require('pg');
  const pool = new Pool(buildPgConfig());

  try {
    for (const indexDef of SLOW_QUERY_INDEXES) {
      console.log(`Applying ${indexDef.name} on ${indexDef.table}...`);
      await pool.query(normalizeSql(indexDef.sql));
    }
    console.log(`Applied ${SLOW_QUERY_INDEXES.length} slow-query indexes.`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  const shouldApply = process.argv.includes('--apply') || process.env.PPA_APPLY_SLOW_QUERY_INDEXES === '1';
  applyIndexes({ dryRun: !shouldApply }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  SLOW_QUERY_INDEXES,
  applyIndexes,
  normalizeSql,
};
