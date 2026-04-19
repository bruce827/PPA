const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const {
  coercePromptTemplateCategoryForStorage,
  getPromptTemplateCategorySqlList,
  LEGACY_CATEGORY_MAP,
} = require('../utils/promptTemplateCategories');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'ppa.db');
const LEGACY_TABLE_NAME = 'prompt_templates_legacy_007';

const CREATE_PROMPT_TEMPLATES_SQL = `
  CREATE TABLE IF NOT EXISTS prompt_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    module_tag TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    variables_json TEXT,
    is_system INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_current INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_prompt_module_tag ON prompt_templates(module_tag);
  CREATE INDEX IF NOT EXISTS idx_prompt_active ON prompt_templates(is_active);
  CREATE INDEX IF NOT EXISTS idx_prompt_system ON prompt_templates(is_system);
  CREATE INDEX IF NOT EXISTS idx_prompt_current ON prompt_templates(is_current);
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
  // 通过 PRAGMA table_info 判断表当前有哪些列
  const tableInfo = await all(db, 'PRAGMA table_info(prompt_templates)');
  const columnNames = new Set(tableInfo.map((col) => col.name));
  const hasModuleTag = columnNames.has('module_tag');
  const hasCategory = columnNames.has('category');
  const hasIsCurrent = columnNames.has('is_current');

  let existingRows;
  if (hasModuleTag) {
    existingRows = await all(
      db,
      `
        SELECT
          id,
          template_name,
          module_tag,
          description,
          system_prompt,
          user_prompt_template,
          variables_json,
          is_system,
          is_active,
          is_current,
          created_at,
          updated_at
        FROM prompt_templates
        ORDER BY id ASC
      `
    );
  } else if (hasCategory) {
    existingRows = await all(
      db,
      `
        SELECT
          id,
          template_name,
          category AS module_tag,
          description,
          system_prompt,
          user_prompt_template,
          variables_json,
          is_system,
          is_active,
          0 AS is_current,
          created_at,
          updated_at
        FROM prompt_templates
        ORDER BY id ASC
      `
    );
  } else {
    throw new Error('prompt_templates 表既没有 module_tag 也没有 category 列');
  }

  const normalizedRows = existingRows.map((row) => {
    // 直接映射：旧值 -> 新 module_tag；已是新值的直接使用
    const normalized_module_tag = LEGACY_CATEGORY_MAP[row.module_tag] || row.module_tag;
    return {
      ...row,
      normalized_module_tag,
    };
  });

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
            module_tag,
            description,
            system_prompt,
            user_prompt_template,
            variables_json,
            is_system,
            is_active,
            is_current,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          row.id,
          row.template_name,
          row.normalized_module_tag,
          row.description,
          row.system_prompt,
          row.user_prompt_template,
          row.variables_json,
          row.is_system,
          row.is_active,
          row.is_current || 0,
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
  console.log('开始执行提示词模板分类扩展迁移...');
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
    console.log('✅ prompt_templates 表已按最新分类约束重建');
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
