const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'ppa.db');

const MIGRATION_SQL = `
  -- 核心业务表：项目与模板
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

  -- 配置表：角色单价
  CREATE TABLE IF NOT EXISTS config_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_name TEXT NOT NULL UNIQUE,
    unit_price REAL NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  -- 配置表：风险评估项
  CREATE TABLE IF NOT EXISTS config_risk_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    item_name TEXT NOT NULL,
    options_json TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  -- 配置表：差旅成本
  CREATE TABLE IF NOT EXISTS config_travel_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL UNIQUE,
    cost_per_month REAL NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  -- 用户表（预留）
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  );
`;

console.log('开始执行核心表迁移...');
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
      console.error('创建核心表失败:', err.message);
      process.exit(1);
    }
    console.log('✅ 核心业务表与配置表创建成功');
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
