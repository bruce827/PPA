const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'ppa.db');

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        return reject(err);
      }
      resolve(this.changes || 0);
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

async function runMigration(databasePath = DEFAULT_DB_PATH) {
  console.log('开始清理不受支持 provider 的视觉模型标记...');
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
      console.log('ℹ️ ai_model_configs 表不存在，跳过视觉模型标记清理');
      return;
    }

    const affectedRows = await run(
      db,
      `
        UPDATE ai_model_configs
           SET supports_vision = 0,
               is_current_vision = 0,
               updated_at = CURRENT_TIMESTAMP
         WHERE (supports_vision = 1 OR is_current_vision = 1)
           AND LOWER(COALESCE(provider, '')) NOT LIKE '%google%'
           AND LOWER(COALESCE(provider, '')) NOT LIKE '%gemini%'
           AND LOWER(COALESCE(provider, '')) NOT LIKE '%minimax%'
      `
    );

    console.log(`✅ 已清理 ${affectedRows} 条无效视觉模型配置`);
  } catch (error) {
    console.error('❌ 清理执行失败:', error.message);
    throw error;
  } finally {
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          console.error('关闭数据库连接失败:', err.message);
          return reject(err);
        }
        console.log('数据库连接已关闭');
        console.log('清理完成');
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
