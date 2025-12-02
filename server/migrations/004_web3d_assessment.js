const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'ppa.db');

const CREATE_WEB3D_TABLES_SQL = `
  -- projects 表新索引
  CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
  CREATE INDEX IF NOT EXISTS idx_projects_type_created_at ON projects(project_type, created_at);

  -- Web3D 风险配置表
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

  -- Web3D 工作量模板表
  CREATE TABLE IF NOT EXISTS web3d_workload_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL, -- data_processing | core_dev | business_logic
    item_name TEXT NOT NULL,
    description TEXT,
    base_days REAL NOT NULL,
    unit TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_web3d_workload_templates_unique ON web3d_workload_templates(category, item_name);
  CREATE INDEX IF NOT EXISTS idx_web3d_workload_templates_category ON web3d_workload_templates(category);
`;

function ensureProjectTypeColumn(db) {
  return new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(projects);', (err, rows) => {
      if (err) {
        return reject(err);
      }

      const hasProjectType = rows.some((row) => row.name === 'project_type');
      if (hasProjectType) {
        console.log('ℹ️  projects.project_type 列已存在，跳过添加。');
        return resolve();
      }

      db.run("ALTER TABLE projects ADD COLUMN project_type TEXT DEFAULT 'standard';", (alterErr) => {
        if (alterErr) {
          return reject(alterErr);
        }
        console.log('✅ 已为 projects 表添加 project_type 列，默认值 standard。');
        resolve();
      });
    });
  });
}

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
  console.log('开始执行 Web3D 评估相关迁移...');
  console.log('数据库路径:', dbPath);

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('数据库连接失败:', err.message);
      process.exit(1);
    }
  });

  try {
    await ensureProjectTypeColumn(db);
    await execSql(db, CREATE_WEB3D_TABLES_SQL);
    console.log('✅ Web3D 风险配置与工作量模板表创建完成');
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
