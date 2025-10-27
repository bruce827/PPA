const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, '..', 'ppa.db');

// AI模型配置表SQL
const CREATE_AI_MODEL_CONFIGS_SQL = `
  -- 创建 AI 模型配置表
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

  -- 创建唯一索引，确保只有一个 is_current=1 的记录
  CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_model_configs_is_current 
  ON ai_model_configs(is_current) 
  WHERE is_current = 1;

  -- 创建 config_name 索引提升查询性能
  CREATE INDEX IF NOT EXISTS idx_ai_model_configs_config_name 
  ON ai_model_configs(config_name);
`;

console.log('开始执行 AI 模型配置表迁移...');
console.log('数据库路径:', dbPath);

// 连接数据库并执行
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('成功连接到 SQLite 数据库');
});

db.serialize(() => {
  db.exec(CREATE_AI_MODEL_CONFIGS_SQL, (err) => {
    if (err) {
      console.error('创建表失败:', err.message);
      process.exit(1);
    }
    console.log('✅ AI 模型配置表创建成功');
    console.log('✅ 唯一索引 idx_ai_model_configs_is_current 创建成功');
    console.log('✅ 索引 idx_ai_model_configs_config_name 创建成功');
  });
});

// 关闭数据库连接
db.close((err) => {
  if (err) {
    console.error('关闭数据库连接失败:', err.message);
    return;
  }
  console.log('数据库连接已关闭');
  console.log('\n迁移完成！');
});
