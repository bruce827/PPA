const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const {
  coercePromptTemplateCategoryForStorage,
  getPromptTemplateCategorySqlList,
} = require('../utils/promptTemplateCategories');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'ppa.db');
const LEGACY_TABLE_NAME = 'prompt_templates_legacy_011';

const CREATE_PROMPT_TEMPLATES_SQL = `
  CREATE TABLE IF NOT EXISTS prompt_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN (${getPromptTemplateCategorySqlList()})),
    description TEXT,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    variables_json TEXT,
    is_system BOOLEAN NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_prompt_category ON prompt_templates(category);
  CREATE INDEX IF NOT EXISTS idx_prompt_active ON prompt_templates(is_active);
  CREATE INDEX IF NOT EXISTS idx_prompt_system ON prompt_templates(is_system);
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

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
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

async function recreatePromptTemplatesTable(db) {
  const existingRows = await all(
    db,
    `
      SELECT
        id,
        template_name,
        category,
        description,
        system_prompt,
        user_prompt_template,
        variables_json,
        is_system,
        is_active,
        created_at,
        updated_at
      FROM prompt_templates
      ORDER BY id ASC
    `
  );

  const normalizedRows = existingRows.map((row) => ({
    ...row,
    normalized_category: coercePromptTemplateCategoryForStorage(row.category),
  }));

  await exec(db, 'BEGIN TRANSACTION;');
  try {
    await exec(db, `ALTER TABLE prompt_templates RENAME TO ${LEGACY_TABLE_NAME};`);
    await exec(db, CREATE_PROMPT_TEMPLATES_SQL);

    for (const row of normalizedRows) {
      await run(
        db,
        `
          INSERT INTO prompt_templates (
            id,
            template_name,
            category,
            description,
            system_prompt,
            user_prompt_template,
            variables_json,
            is_system,
            is_active,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          row.id,
          row.template_name,
          row.normalized_category,
          row.description,
          row.system_prompt,
          row.user_prompt_template,
          row.variables_json,
          row.is_system,
          row.is_active,
          row.created_at,
          row.updated_at,
        ]
      );
    }

    await exec(db, `DROP TABLE IF EXISTS ${LEGACY_TABLE_NAME};`);
    await exec(db, 'COMMIT;');
  } catch (error) {
    await exec(db, 'ROLLBACK;');
    throw error;
  }
}

async function runMigration(databasePath = DEFAULT_DB_PATH) {
  console.log('开始执行提示词模板 Web3D Step4 分类迁移...');
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
      ['prompt_templates']
    );

    if (!table) {
      await exec(db, CREATE_PROMPT_TEMPLATES_SQL);
      console.log('✅ prompt_templates 表不存在，已按最新分类约束创建');
      return;
    }

    await recreatePromptTemplatesTable(db);
    console.log('✅ prompt_templates 表已扩展到 Web3D Step4 分类');
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
