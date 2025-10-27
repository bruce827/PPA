const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库文件路径
const dbPath = path.join(__dirname, '..', 'ppa.db');

// 提示词模板表SQL
const CREATE_PROMPT_TEMPLATES_SQL = `
  -- 创建提示词模板表
  CREATE TABLE IF NOT EXISTS prompt_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('risk_analysis', 'cost_estimation', 'report_generation', 'custom')),
    description TEXT,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    variables_json TEXT,
    is_system BOOLEAN NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 创建索引
  CREATE INDEX IF NOT EXISTS idx_prompt_category ON prompt_templates(category);
  CREATE INDEX IF NOT EXISTS idx_prompt_active ON prompt_templates(is_active);
  CREATE INDEX IF NOT EXISTS idx_prompt_system ON prompt_templates(is_system);
`;

console.log('开始执行提示词模板表迁移...');
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
  db.exec(CREATE_PROMPT_TEMPLATES_SQL, (err) => {
    if (err) {
      console.error('创建表失败:', err.message);
      process.exit(1);
    }
    console.log('✅ 提示词模板表 prompt_templates 创建成功');
    console.log('✅ 索引 idx_prompt_category 创建成功');
    console.log('✅ 索引 idx_prompt_active 创建成功');
    console.log('✅ 索引 idx_prompt_system 创建成功');
  });
});

// 关闭数据库连接
db.close((err) => {
  if (err) {
    console.error('关闭数据库连接失败:', err.message);
    return;
  }
  console.log('数据库连接已关闭');
  console.log('迁移完成！');
});