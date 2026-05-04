const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// SQL语句
const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      is_template BOOLEAN NOT NULL DEFAULT 0,
      project_type TEXT DEFAULT 'standard',
      final_total_cost REAL,
      final_risk_score INTEGER,
      final_workload_days REAL,
      assessment_details_json TEXT,
      tags_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
  CREATE INDEX IF NOT EXISTS idx_projects_type_created_at ON projects(project_type, created_at);

  CREATE TABLE IF NOT EXISTS config_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT NOT NULL UNIQUE,
      unit_price REAL NOT NULL,
      is_active BOOLEAN DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS config_risk_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      item_name TEXT NOT NULL,
      options_json TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS config_travel_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL UNIQUE,
      cost_per_month REAL NOT NULL,
      is_active BOOLEAN DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS config_business_pricing (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      tax_rate REAL NOT NULL DEFAULT 6,
      management_rate REAL NOT NULL DEFAULT 12,
      sales_rate REAL NOT NULL DEFAULT 12,
      profit_rate REAL NOT NULL DEFAULT 15,
      rd_rate REAL NOT NULL DEFAULT 35,
      cac_rate REAL NOT NULL DEFAULT 40,
      cogs_rate REAL NOT NULL DEFAULT 15,
      csm_rate REAL NOT NULL DEFAULT 10,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT OR IGNORE INTO config_business_pricing
    (id, tax_rate, management_rate, sales_rate, profit_rate, rd_rate, cac_rate, cogs_rate, csm_rate)
  VALUES (1, 6, 12, 12, 15, 35, 40, 15, 10);

  CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS prompt_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    module_tag TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    variables_json TEXT,
    is_system INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_current INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_prompt_module_tag ON prompt_templates(module_tag);
  CREATE INDEX IF NOT EXISTS idx_prompt_active ON prompt_templates(is_active);
  CREATE INDEX IF NOT EXISTS idx_prompt_system ON prompt_templates(is_system);
  CREATE INDEX IF NOT EXISTS idx_prompt_current ON prompt_templates(is_current);

  CREATE TABLE IF NOT EXISTS ai_model_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_name TEXT NOT NULL UNIQUE,
    description TEXT,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    api_host TEXT NOT NULL,
    model_name TEXT NOT NULL,
    temperature REAL NOT NULL DEFAULT 0.7,
    max_tokens INTEGER NOT NULL DEFAULT 2000,
    timeout INTEGER NOT NULL DEFAULT 30,
    is_current INTEGER NOT NULL DEFAULT 0,
    is_current_vision INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    supports_web_search INTEGER NOT NULL DEFAULT 0,
    supports_vision INTEGER NOT NULL DEFAULT 0,
    last_test_time DATETIME,
    test_status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_model_configs_is_current
    ON ai_model_configs(is_current)
    WHERE is_current = 1;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_model_configs_is_current_vision
    ON ai_model_configs(is_current_vision)
    WHERE is_current_vision = 1;

  CREATE INDEX IF NOT EXISTS idx_ai_model_configs_config_name
    ON ai_model_configs(config_name);

  CREATE TABLE IF NOT EXISTS ai_prompts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    variables_json TEXT,
    model_hint TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_ai_prompts_model_hint ON ai_prompts(model_hint);

  CREATE TABLE IF NOT EXISTS ai_assessment_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id TEXT,
    model_used TEXT,
    request_hash TEXT,
    duration_ms INTEGER,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- AI 日志监控性能相关索引（幂等，可重复执行）
  CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_prompt ON ai_assessment_logs(prompt_id);
  CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_request_hash ON ai_assessment_logs(request_hash);
  CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_created_at ON ai_assessment_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_status_created_at ON ai_assessment_logs(status, created_at);
  CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_model_created_at ON ai_assessment_logs(model_used, created_at);
  CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_prompt_created_at ON ai_assessment_logs(prompt_id, created_at);

  CREATE TABLE IF NOT EXISTS web3d_risk_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    step_order INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    item_name TEXT NOT NULL UNIQUE,
    description TEXT,
    weight REAL DEFAULT 1.0,
    options_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_web3d_risk_items_step_order ON web3d_risk_items(step_order);
  CREATE INDEX IF NOT EXISTS idx_web3d_risk_items_step_name ON web3d_risk_items(step_name);

  CREATE TABLE IF NOT EXISTS web3d_workload_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    base_days REAL NOT NULL,
    unit TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_web3d_workload_templates_unique ON web3d_workload_templates(category, item_name);
  CREATE INDEX IF NOT EXISTS idx_web3d_workload_templates_category ON web3d_workload_templates(category);

  CREATE TABLE IF NOT EXISTS opportunity_bidding_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    alias_name TEXT,
    url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    source_level TEXT,
    province TEXT,
    city TEXT,
    platform_type TEXT,
    is_official INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    notes TEXT,
    validation_status TEXT NOT NULL DEFAULT 'never_validated',
    validation_summary TEXT,
    auth_required INTEGER,
    is_bidding_site INTEGER,
    http_status INTEGER,
    final_url TEXT,
    redirect_chain_json TEXT,
    validation_confidence REAL,
    validation_payload_json TEXT,
    last_validated_at DATETIME,
    has_script INTEGER NOT NULL DEFAULT 0,
    script_filename TEXT,
    script_uploaded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_normalized_url
    ON opportunity_bidding_sites(normalized_url);
  CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_source_level
    ON opportunity_bidding_sites(source_level);
  CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_platform_type
    ON opportunity_bidding_sites(platform_type);
  CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_enabled
    ON opportunity_bidding_sites(enabled);
  CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_validation_status
    ON opportunity_bidding_sites(validation_status);
  CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_has_script
    ON opportunity_bidding_sites(has_script);

  CREATE TABLE IF NOT EXISTS opportunity_tender_staging (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_item_id TEXT NOT NULL,
    source_origin_id TEXT,
    source_record_id TEXT,
    title TEXT NOT NULL,
    notice_type TEXT,
    published_at TEXT,
    published_date TEXT,
    deadline_at TEXT,
    deadline_date TEXT,
    issuer TEXT,
    budget_amount TEXT,
    region TEXT,
    source_platform TEXT,
    source_url TEXT,
    summary TEXT,
    detail_excerpt TEXT,
    announcement_html TEXT,
    announcement_plain_text TEXT,
    detail_payload_json TEXT,
    source_file TEXT,
    raw_payload_json TEXT,
    push_status TEXT NOT NULL DEFAULT 'pending',
    push_error TEXT,
    last_synced_at DATETIME,
    pushed_at DATETIME,
    last_parsed_at DATETIME,
    parse_status TEXT NOT NULL DEFAULT 'never_parsed',
    parse_error TEXT,
    parse_meta_json TEXT,
    deleted_at DATETIME,
    delete_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_tender_staging_source_item_id
    ON opportunity_tender_staging(source_item_id);
  CREATE INDEX IF NOT EXISTS idx_opportunity_tender_staging_push_status
    ON opportunity_tender_staging(push_status);
  CREATE INDEX IF NOT EXISTS idx_opportunity_tender_staging_published_date
    ON opportunity_tender_staging(published_date);
  CREATE INDEX IF NOT EXISTS idx_opportunity_tender_staging_source_file
    ON opportunity_tender_staging(source_file);

  CREATE TABLE IF NOT EXISTS tender_staging_web_search_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tender_staging_id INTEGER NOT NULL UNIQUE,
    model_config_id INTEGER NOT NULL,
    prompt_template_id INTEGER NOT NULL,
    searched_at TEXT NOT NULL,
    summary TEXT NOT NULL,
    results_json TEXT NOT NULL,
    meta_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_tender_web_search_results_tender_staging_id
    ON tender_staging_web_search_results(tender_staging_id);
  CREATE INDEX IF NOT EXISTS idx_tender_web_search_results_searched_at
    ON tender_staging_web_search_results(searched_at);
`;

function initDatabase(databasePath = process.env.DB_PATH || './ppa.db') {
  const resolvedPath = path.resolve(databasePath);

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(
      resolvedPath,
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log(`Connected to SQLite database: ${resolvedPath}`);
      }
    );

    db.serialize(() => {
      db.exec(CREATE_TABLES_SQL, (err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('Tables created successfully.');
      });
    });

    db.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Closed the database connection.');
      resolve();
    });
  });
}

if (require.main === module) {
  initDatabase().catch((err) => {
    if (err) {
      console.error(err.message);
      process.exit(1);
    }
  });
}

module.exports = {
  CREATE_TABLES_SQL,
  initDatabase,
};
