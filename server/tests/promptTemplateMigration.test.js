process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const {
  runMigration,
} = require('../migrations/007_expand_prompt_template_categories');

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

describe('prompt template category migration', () => {
  test('should create prompt_templates with web_search support when table is missing', async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `ppa.prompt-template.migration.create.${process.pid}.${Date.now()}.db`
    );

    try {
      await runMigration(dbPath);

      const db = new sqlite3.Database(dbPath);
      const schema = await get(
        db,
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'prompt_templates'"
      );
      expect(schema?.sql).toContain('web_search');

      await run(
        db,
        `INSERT INTO prompt_templates (template_name, category, system_prompt, user_prompt_template)
         VALUES (?, ?, ?, ?)`,
        ['联网搜索模板', 'web_search', '只返回 JSON', '项目：{{project_title}}']
      );

      const row = await get(
        db,
        'SELECT category FROM prompt_templates WHERE template_name = ?',
        ['联网搜索模板']
      );
      expect(row?.category).toBe('web_search');

      await new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
      });
    } finally {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    }
  });

  test('should rebuild legacy prompt_templates and normalize historical aliases safely', async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `ppa.prompt-template.migration.rebuild.${process.pid}.${Date.now()}.db`
    );

    const db = new sqlite3.Database(dbPath);

    try {
      await run(
        db,
        `
          CREATE TABLE prompt_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            system_prompt TEXT NOT NULL,
            user_prompt_template TEXT NOT NULL,
            variables_json TEXT,
            is_system BOOLEAN NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      );
      await run(
        db,
        `INSERT INTO prompt_templates (template_name, category, description, system_prompt, user_prompt_template, variables_json, is_system, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
        [
          '标签模板',
          '标签生成',
          '旧标签模板',
          '只返回 JSON',
          '项目：{{project_snapshot}}',
          JSON.stringify([]),
        ]
      );
      await run(
        db,
        `INSERT INTO prompt_templates (template_name, category, description, system_prompt, user_prompt_template, variables_json, is_system, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
        [
          '工作量模板',
          '工作量评估',
          '旧工作量模板',
          '只返回 JSON',
          '角色：{{role_list}}',
          JSON.stringify([]),
        ]
      );
    } finally {
      await new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
      });
    }

    try {
      await runMigration(dbPath);

      const verifyDb = new sqlite3.Database(dbPath);
      const rows = await all(
        verifyDb,
        'SELECT template_name, category FROM prompt_templates ORDER BY template_name ASC'
      );

      expect(rows).toEqual([
        { template_name: '工作量模板', category: 'workload_evaluation' },
        { template_name: '标签模板', category: 'project_tagging' },
      ]);

      await run(
        verifyDb,
        `INSERT INTO prompt_templates (template_name, category, system_prompt, user_prompt_template)
         VALUES (?, ?, ?, ?)`,
        ['联网搜索模板', 'web_search', '只返回 JSON', '项目：{{project_title}}']
      );

      const inserted = await get(
        verifyDb,
        'SELECT category FROM prompt_templates WHERE template_name = ?',
        ['联网搜索模板']
      );
      expect(inserted?.category).toBe('web_search');

      await new Promise((resolve, reject) => {
        verifyDb.close((err) => (err ? reject(err) : resolve()));
      });
    } finally {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    }
  });

  test('should fail loudly when legacy prompt_templates contain unknown categories', async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `ppa.prompt-template.migration.invalid.${process.pid}.${Date.now()}.db`
    );

    const db = new sqlite3.Database(dbPath);

    try {
      await run(
        db,
        `
          CREATE TABLE prompt_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            system_prompt TEXT NOT NULL,
            user_prompt_template TEXT NOT NULL,
            variables_json TEXT,
            is_system BOOLEAN NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      );
      await run(
        db,
        `INSERT INTO prompt_templates (template_name, category, description, system_prompt, user_prompt_template, variables_json, is_system, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
        [
          '异常模板',
          'mystery_category',
          '未知分类模板',
          '只返回 JSON',
          '内容：{{value}}',
          JSON.stringify([]),
        ]
      );
    } finally {
      await new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
      });
    }

    try {
      await expect(runMigration(dbPath)).rejects.toThrow(
        '存在无法迁移的分类值：mystery_category'
      );

      const verifyDb = new sqlite3.Database(dbPath);
      const row = await get(
        verifyDb,
        'SELECT category FROM prompt_templates WHERE template_name = ?',
        ['异常模板']
      );
      expect(row?.category).toBe('mystery_category');

      await new Promise((resolve, reject) => {
        verifyDb.close((err) => (err ? reject(err) : resolve()));
      });
    } finally {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    }
  });
});
