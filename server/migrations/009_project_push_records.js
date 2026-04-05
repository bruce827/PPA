const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'ppa.db');

const CREATE_PUSH_RECORDS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS project_push_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    project_name TEXT NOT NULL,
    project_description TEXT,
    our_quote REAL,
    customer_budget REAL,
    budget_difference REAL,
    cost_breakdown_json TEXT,
    risk_total_score REAL,
    risk_level TEXT,
    total_workload_days REAL,
    new_dev_workload_days REAL,
    travel_cost_total REAL,
    top3_risk_scores TEXT,
    attachment_file_ids TEXT,
    push_time TEXT NOT NULL,
    push_status TEXT NOT NULL DEFAULT 'success',
    push_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_push_records_project_id ON project_push_records(project_id);
  CREATE INDEX IF NOT EXISTS idx_push_records_push_time ON project_push_records(push_time);
`;

function execSql(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

async function runMigration() {
  console.log('开始执行推送记录表迁移...');
  console.log('数据库路径:', dbPath);

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('数据库连接失败:', err.message);
      process.exit(1);
    }
  });

  try {
    await execSql(db, CREATE_PUSH_RECORDS_TABLE_SQL);
    console.log('✅ project_push_records 表创建完成');
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接失败:', err.message);
        return;
      }
      console.log('数据库连接已关闭');
      console.log('迁移完成');
    });
  }
}

runMigration();
