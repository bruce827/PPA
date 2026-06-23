const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const {
  ENSURE_SCHEMA_STATEMENTS,
} = require('../models/tenderWebSearchResultModel');

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

async function runMigration(databasePath = DEFAULT_DB_PATH) {
  console.log('开始执行招标联网搜索结果表迁移...');
  console.log('数据库路径:', databasePath);

  const migrationDb = new sqlite3.Database(databasePath, (err) => {
    if (err) {
      throw err;
    }
  });

  try {
    for (const statement of ENSURE_SCHEMA_STATEMENTS) {
      await run(migrationDb, statement);
    }
    console.log('✅ tender_staging_web_search_results 表及索引已就绪');
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    throw error;
  } finally {
    await new Promise((resolve, reject) => {
      migrationDb.close((err) => {
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
