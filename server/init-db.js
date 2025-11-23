const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'ppa.db');

// SQL语句
const CREATE_TABLES_SQL = `
  -- 核心业务表：项目/模板
  CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      is_template INTEGER NOT NULL DEFAULT 0,
      final_total_cost REAL,
      final_risk_score INTEGER,
      final_workload_days REAL,
      assessment_details_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 配置：角色单价
  CREATE TABLE IF NOT EXISTS config_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT NOT NULL UNIQUE,
      unit_price REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
  );

  -- 配置：风险评估项
  CREATE TABLE IF NOT EXISTS config_risk_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      item_name TEXT NOT NULL,
      options_json TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
  );

  -- 配置：差旅成本
  CREATE TABLE IF NOT EXISTS config_travel_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL UNIQUE,
      cost_per_month REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
  );

  -- 用户
  CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user'
  );

  -- AI 模型配置
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
    is_active INTEGER NOT NULL DEFAULT 1,
    last_test_time DATETIME,
    test_status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_model_configs_is_current 
  ON ai_model_configs(is_current) 
  WHERE is_current = 1;

  CREATE INDEX IF NOT EXISTS idx_ai_model_configs_config_name 
  ON ai_model_configs(config_name);

  -- 提示词模板
  CREATE TABLE IF NOT EXISTS prompt_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('risk_analysis', 'cost_estimation', 'report_generation', 'custom')),
    description TEXT,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    variables_json TEXT, -- Stored as JSON string, use JSON1 functions for querying
    is_system BOOLEAN NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_prompt_category ON prompt_templates(category);
  CREATE INDEX IF NOT EXISTS idx_prompt_active ON prompt_templates(is_active);
  CREATE INDEX IF NOT EXISTS idx_prompt_system ON prompt_templates(is_system);

  -- AI 提示词
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

  -- AI 调用日志
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

  CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_prompt ON ai_assessment_logs(prompt_id);
`;

// 连接数据库并执行
const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
  console.log('DB path:', DB_PATH);
});

db.serialize(() => {
  db.exec(CREATE_TABLES_SQL, (err) => {
    if (err) {
      return console.error('Error creating tables:', err.message);
    }
    console.log('Tables created successfully.');
  });
});

// 关闭数据库连接
db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Closed the database connection.');
});
