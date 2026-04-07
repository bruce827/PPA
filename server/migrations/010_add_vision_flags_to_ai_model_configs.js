const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'ppa.db');

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

async function ensureColumn(db, columnName, definitionSql) {
  const column = await get(
    db,
    "SELECT name FROM pragma_table_info('ai_model_configs') WHERE name = ?",
    [columnName]
  );

  if (!column) {
    await run(db, `ALTER TABLE ai_model_configs ADD COLUMN ${definitionSql}`);
    console.log(`✅ 已新增 ${columnName} 字段`);
  } else {
    console.log(`ℹ️ ${columnName} 字段已存在，跳过新增`);
  }
}

async function runMigration(databasePath = DEFAULT_DB_PATH) {
  console.log('开始执行 AI 模型视觉能力字段迁移...');
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
      console.log('ℹ️ ai_model_configs 表不存在，跳过视觉能力字段迁移');
      return;
    }

    await ensureColumn(db, 'supports_vision', 'supports_vision INTEGER NOT NULL DEFAULT 0');
    await ensureColumn(db, 'is_current_vision', 'is_current_vision INTEGER NOT NULL DEFAULT 0');

    await exec(
      db,
      `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_model_configs_is_current_vision
          ON ai_model_configs(is_current_vision)
          WHERE is_current_vision = 1;
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
