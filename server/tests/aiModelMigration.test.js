process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const {
  runMigration,
} = require('../migrations/006_add_supports_web_search_to_ai_model_configs');

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

describe('ai model supports_web_search migration', () => {
  test('should create ai_model_configs table with supports_web_search when table is missing', async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `ppa.ai-model.migration.create.${process.pid}.${Date.now()}.db`
    );

    try {
      await runMigration(dbPath);

      const db = new sqlite3.Database(dbPath);
      const column = await get(
        db,
        "SELECT name FROM pragma_table_info('ai_model_configs') WHERE name = ?",
        ['supports_web_search']
      );
      expect(column?.name).toBe('supports_web_search');

      await new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
      });
    } finally {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    }
  });

  test('should add supports_web_search column with default 0 for existing ai_model_configs table', async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `ppa.ai-model.migration.alter.${process.pid}.${Date.now()}.db`
    );

    const db = new sqlite3.Database(dbPath);

    try {
      await run(
        db,
        `
          CREATE TABLE ai_model_configs (
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
            last_test_time DATETIME,
            test_status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
      );
      await run(
        db,
        `INSERT INTO ai_model_configs (config_name, provider, api_key, api_host, model_name)
         VALUES (?, ?, ?, ?, ?)`,
        ['legacy-model', 'openai-compatible', 'secret-key', 'https://example.com', 'gpt-test']
      );
    } finally {
      await new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
      });
    }

    try {
      await runMigration(dbPath);

      const verifyDb = new sqlite3.Database(dbPath);
      const column = await get(
        verifyDb,
        "SELECT name FROM pragma_table_info('ai_model_configs') WHERE name = ?",
        ['supports_web_search']
      );
      expect(column?.name).toBe('supports_web_search');

      const row = await get(
        verifyDb,
        'SELECT supports_web_search FROM ai_model_configs WHERE config_name = ?',
        ['legacy-model']
      );
      expect(row?.supports_web_search).toBe(0);

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
