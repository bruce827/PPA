const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'ppa.db');

const MIGRATION_SQL = `
  -- AI 提示词模板表
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

  CREATE INDEX IF NOT EXISTS idx_ai_prompts_model_hint
    ON ai_prompts(model_hint);

  -- AI 调用日志表（可选写入）
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
  CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_prompt
    ON ai_assessment_logs(prompt_id);

  CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_request_hash
    ON ai_assessment_logs(request_hash);

  CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_created_at
    ON ai_assessment_logs(created_at);

  CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_status_created_at
    ON ai_assessment_logs(status, created_at);

  CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_model_created_at
    ON ai_assessment_logs(model_used, created_at);

  CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_prompt_created_at
    ON ai_assessment_logs(prompt_id, created_at);
`;

console.log('开始执行 AI 提示词与日志表迁移...');
console.log('数据库路径:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('成功连接到 SQLite 数据库');
});

db.serialize(() => {
  db.exec(MIGRATION_SQL, (err) => {
    if (err) {
      console.error('创建表失败:', err.message);
      process.exit(1);
    }
    console.log('✅ 表 ai_prompts / ai_assessment_logs 创建成功');
    console.log('✅ 相关索引创建成功');
  });
});

db.close((err) => {
  if (err) {
    console.error('关闭数据库连接失败:', err.message);
    return;
  }
  console.log('数据库连接已关闭');
  console.log('迁移完成！');
});
