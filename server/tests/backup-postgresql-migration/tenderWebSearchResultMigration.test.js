process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const {
  runMigration,
} = require('../migrations/008_create_tender_web_search_results');

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

describe('tender web search result migration', () => {
  test('should create tender_staging_web_search_results table with expected columns', async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `ppa.tender-web-search-result.migration.create.${process.pid}.${Date.now()}.db`
    );

    try {
      await runMigration(dbPath);

      const db = new sqlite3.Database(dbPath);
      const table = await get(
        db,
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        ['tender_staging_web_search_results']
      );
      expect(table?.name).toBe('tender_staging_web_search_results');

      const columns = await all(db, "SELECT name FROM pragma_table_info('tender_staging_web_search_results')");
      const columnNames = columns.map((item) => item.name);
      expect(columnNames).toEqual(
        expect.arrayContaining([
          'tender_staging_id',
          'model_config_id',
          'prompt_template_id',
          'searched_at',
          'summary',
          'results_json',
          'meta_json',
        ])
      );
      expect(columnNames).not.toEqual(
        expect.arrayContaining(['raw_text', 'response_raw', 'provider_response'])
      );

      await new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
      });
    } finally {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    }
  });

  test('should enforce unique tender_staging_id and allow structured json storage', async () => {
    const dbPath = path.join(
      os.tmpdir(),
      `ppa.tender-web-search-result.migration.unique.${process.pid}.${Date.now()}.db`
    );

    try {
      await runMigration(dbPath);

      const db = new sqlite3.Database(dbPath);
      await run(
        db,
        'CREATE TABLE IF NOT EXISTS opportunity_tender_staging (id INTEGER PRIMARY KEY AUTOINCREMENT)'
      );
      await run(
        db,
        'CREATE TABLE IF NOT EXISTS ai_model_configs (id INTEGER PRIMARY KEY AUTOINCREMENT)'
      );
      await run(
        db,
        'CREATE TABLE IF NOT EXISTS prompt_templates (id INTEGER PRIMARY KEY AUTOINCREMENT)'
      );
      await run(db, 'INSERT INTO opportunity_tender_staging (id) VALUES (1)');
      await run(db, 'INSERT INTO ai_model_configs (id) VALUES (1)');
      await run(db, 'INSERT INTO prompt_templates (id) VALUES (1)');

      await run(
        db,
        `INSERT INTO tender_staging_web_search_results (
          tender_staging_id,
          model_config_id,
          prompt_template_id,
          searched_at,
          summary,
          results_json,
          meta_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          1,
          1,
          1,
          '2026-03-19T10:00:00.000Z',
          '共找到 1 条高相关结果。',
          JSON.stringify([
            {
              site_name: '中国政府采购网',
              site_url: 'https://www.ccgp.gov.cn/notice/123',
            },
          ]),
          JSON.stringify({ state: 'fresh_result', result_count: 1 }),
        ]
      );

      await expect(
        run(
          db,
          `INSERT INTO tender_staging_web_search_results (
            tender_staging_id,
            model_config_id,
            prompt_template_id,
            searched_at,
            summary,
            results_json,
            meta_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            1,
            1,
            1,
            '2026-03-19T11:00:00.000Z',
            '重复记录',
            JSON.stringify([]),
            JSON.stringify({ state: 'empty_result', result_count: 0 }),
          ]
        )
      ).rejects.toThrow(/UNIQUE constraint failed/);

      const row = await get(
        db,
        `SELECT searched_at, summary, results_json, meta_json
         FROM tender_staging_web_search_results
         WHERE tender_staging_id = ?`,
        [1]
      );
      expect(JSON.parse(row.results_json)).toHaveLength(1);
      expect(JSON.parse(row.meta_json)).toEqual({
        state: 'fresh_result',
        result_count: 1,
      });

      await new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
      });
    } finally {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    }
  });
});
