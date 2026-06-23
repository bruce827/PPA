const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'ppa.db');

const CREATE_AI_MODEL_CONFIGS_SQL = `
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
    supports_web_search INTEGER NOT NULL DEFAULT 0,
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
`;

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row);
    });
  });
}

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

async function runMigration(databasePath = DEFAULT_DB_PATH) {
  console.log('开始执行 AI 模型联网搜索能力字段迁移...');
  console.log('数据库路径:', databasePath);

  const db = new sqlite3.Database(databasePath, (err) => {
    if (err) {
      throw err;
    }
  });

  try {
    const table = await get(
      db,
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      ['ai_model_configs']
    );

    if (!table) {
      await exec(db, CREATE_AI_MODEL_CONFIGS_SQL);
      console.log('✅ ai_model_configs 表不存在，已按最新结构创建');
      return;
    }

    const column = await get(
      db,
      "SELECT name FROM pragma_table_info('ai_model_configs') WHERE name = ?",
      ['supports_web_search']
    );

    if (!column) {
      await run(
        db,
        'ALTER TABLE ai_model_configs ADD COLUMN supports_web_search INTEGER NOT NULL DEFAULT 0'
      );
      console.log('✅ 已新增 supports_web_search 字段');
    } else {
      console.log('ℹ️ supports_web_search 字段已存在，跳过新增');
    }

    await exec(
      db,
      `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_model_configs_is_current
          ON ai_model_configs(is_current)
          WHERE is_current = 1;
        CREATE INDEX IF NOT EXISTS idx_ai_model_configs_config_name
          ON ai_model_configs(config_name);
      `
    );
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    throw error;
  } finally {
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          console.error('关闭数据库连接失败:', err.message);
          return reject(err);
        }
        console.log('数据库连接已关闭');
        console.log('迁移完成');
        resolve();
      });
    });
  }
}

if (require.main === module) {
  runMigration().catch(() => {
    process.exit(1);
  });
}

module.exports = {
  runMigration,
};
