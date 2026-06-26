process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');

describe('database adapter', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(async () => {
    try {
      const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;
      await db.close();
    } catch (_error) {}
    jest.dontMock('pg');
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  test('defaults to PostgreSQL when DB_TYPE is unset', async () => {
    delete process.env.DB_TYPE;
    process.env.DATABASE_URL = 'postgresql://example.invalid:5432/db';

    const poolQuery = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 });
    const poolEnd = jest.fn().mockResolvedValue(undefined);
    const poolOn = jest.fn();

    jest.doMock('pg', () => ({
      Pool: jest.fn().mockImplementation(() => ({
        query: poolQuery,
        end: poolEnd,
        on: poolOn,
      })),
    }));

    const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;
    await db.init();

    expect(poolQuery).toHaveBeenCalledWith('SELECT 1');
    expect(db.getDbType()).toBe('postgres');

    await db.close();
  });

  test('postgres init reuses an existing pool for the same configuration', async () => {
    process.env.DB_TYPE = 'postgres';
    process.env.DATABASE_URL = 'postgresql://example.invalid:5432/db';

    const poolQuery = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 });
    const poolEnd = jest.fn().mockResolvedValue(undefined);
    const poolOn = jest.fn();
    const Pool = jest.fn().mockImplementation(() => ({
      query: poolQuery,
      end: poolEnd,
      on: poolOn,
    }));

    jest.doMock('pg', () => ({ Pool }));

    const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;
    await db.init();
    const firstConnectionId = db.getConnectionId();
    await db.init();

    expect(Pool).toHaveBeenCalledTimes(1);
    expect(poolQuery).toHaveBeenCalledTimes(1);
    expect(poolEnd).not.toHaveBeenCalled();
    expect(db.getConnectionId()).toBe(firstConnectionId);

    await db.close();
  });

  test('postgres init rejects concurrent initialization for a different configuration', async () => {
    process.env.DB_TYPE = 'postgres';
    process.env.DATABASE_URL = 'postgresql://example.invalid:5432/db';

    let resolveInitialQuery;
    const initialQuery = new Promise((resolve) => {
      resolveInitialQuery = () => resolve({ rows: [{ '?column?': 1 }], rowCount: 1 });
    });
    const poolQuery = jest.fn().mockReturnValue(initialQuery);
    const poolEnd = jest.fn().mockResolvedValue(undefined);
    const Pool = jest.fn().mockImplementation(() => ({
      query: poolQuery,
      end: poolEnd,
      on: jest.fn(),
    }));

    jest.doMock('pg', () => ({ Pool }));

    const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;
    const firstInit = db.init();

    process.env.DATABASE_URL = 'postgresql://example.invalid:5432/other-db';
    await expect(db.init()).rejects.toThrow(
      'Database initialization already in progress for a different configuration'
    );

    resolveInitialQuery();
    await firstInit;

    expect(Pool).toHaveBeenCalledTimes(1);
    expect(poolEnd).not.toHaveBeenCalled();

    await db.close();
  });

  test('explicit SQLite mode preserves get/all/run API shape', async () => {
    const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;
    const testDbPath = path.join(
      os.tmpdir(),
      `ppa.db-adapter.${process.pid}.${Date.now()}.db`
    );

    try {
      process.env.DB_TYPE = 'sqlite';
      await db.init(testDbPath);
      await db.run('CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)');
      const result = await db.run('INSERT INTO items (name) VALUES (?)', ['alpha']);
      const row = await db.get('SELECT * FROM items WHERE id = ?', [result.id]);
      const rows = await db.all('SELECT * FROM items');

      expect(result).toMatchObject({
        id: expect.any(Number),
        lastID: expect.any(Number),
        changes: 1,
      });
      expect(row.name).toBe('alpha');
      expect(rows).toHaveLength(1);
      expect(db.getDbType()).toBe('sqlite');
    } finally {
      await db.close();
      fs.rmSync(testDbPath, { force: true });
    }
  });

  test('postgres mode fails fast when DATABASE_URL is missing', async () => {
    process.env.DB_TYPE = 'postgres';
    delete process.env.DATABASE_URL;

    const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;
    await expect(db.init()).rejects.toThrow('DATABASE_URL is required');
  });

  test('unsupported DB_TYPE fails instead of falling back to SQLite', async () => {
    process.env.DB_TYPE = 'postgre';

    const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;
    await expect(db.init()).rejects.toThrow('Unsupported DB_TYPE');
  });

  test('postgres placeholder conversion preserves quoted question marks', () => {
    const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;
    const sql = "SELECT * FROM projects WHERE id = ? AND note = '?' AND is_template = ?";

    expect(db._private.convertSqlPlaceholders(sql)).toBe(
      "SELECT * FROM projects WHERE id = $1 AND note = '?' AND is_template = $2"
    );
  });

  test('postgres SQL conversion handles common SQLite syntax', () => {
    const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;

    expect(
      db._private.convertSqlForPostgres(`
        CREATE TABLE IF NOT EXISTS items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
    ).toContain('id SERIAL PRIMARY KEY');

    expect(db._private.convertSqlForPostgres('BEGIN IMMEDIATE')).toBe('BEGIN');

    expect(
      db._private.convertSqlForPostgres(
        'INSERT OR IGNORE INTO wiki_project_relations (wiki_key, project_id) VALUES (?, ?)',
        ['wiki/a.md', 1]
      )
    ).toBe(
      'INSERT INTO wiki_project_relations (wiki_key, project_id) VALUES ($1, $2) ON CONFLICT DO NOTHING'
    );
  });

  test('postgres SQL conversion handles SQLite datetime helpers', () => {
    const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;

    expect(
      db._private.convertSqlForPostgres(
        "SELECT * FROM projects WHERE datetime(updated_at) >= datetime('now', ?) AND created_at >= datetime(?)",
        ['-12 months', '2026-06-24']
      )
    ).toBe(
      'SELECT * FROM projects WHERE updated_at::timestamp >= (CURRENT_TIMESTAMP + ($1)::interval) AND created_at >= ($2)::timestamp'
    );

    expect(
      db._private.convertSqlForPostgres(
        "INSERT INTO ai_assessment_logs (created_at) VALUES (datetime('now'))"
      )
    ).toBe('INSERT INTO ai_assessment_logs (created_at) VALUES (CURRENT_TIMESTAMP)');

    expect(
      db._private.convertSqlForPostgres(
        "SELECT * FROM projects WHERE datetime(updated_at) >= datetime('now', '-12 months')"
      )
    ).toBe(
      "SELECT * FROM projects WHERE updated_at::timestamp >= (CURRENT_TIMESTAMP + INTERVAL '-12 months')"
    );
  });

  test('postgres conversion leaves question mark operators without matching params', () => {
    const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;

    expect(
      db._private.convertSqlForPostgres("SELECT meta_json::jsonb ? 'source' FROM logs", [])
    ).toBe("SELECT meta_json::jsonb ? 'source' FROM logs");

    expect(
      db._private.convertSqlForPostgres(
        "SELECT meta_json::jsonb ? 'source' FROM logs WHERE id = ?",
        [1]
      )
    ).toBe("SELECT meta_json::jsonb ? 'source' FROM logs WHERE id = $1");
  });

  test('postgres transactions use a pinned client', async () => {
    process.env.DB_TYPE = 'postgres';
    process.env.DATABASE_URL = 'postgresql://example.invalid:5432/db';

    const poolQuery = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 });
    const clientQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const release = jest.fn();
    const connect = jest.fn().mockResolvedValue({ query: clientQuery, release });

    jest.doMock('pg', () => ({
      Pool: jest.fn().mockImplementation(() => ({
        query: poolQuery,
        connect,
        on: jest.fn(),
        end: jest.fn().mockResolvedValue(undefined),
      })),
    }));

    const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;
    await db.init();
    await db.run('BEGIN IMMEDIATE');
    await db.run('INSERT INTO wiki_project_relations (wiki_key, project_id) VALUES (?, ?)', [
      'wiki/a.md',
      1,
    ]);
    await db.run('ROLLBACK');

    expect(connect).toHaveBeenCalledTimes(1);
    expect(clientQuery).toHaveBeenCalledWith('BEGIN');
    expect(clientQuery).toHaveBeenCalledWith(
      'INSERT INTO wiki_project_relations (wiki_key, project_id) VALUES ($1, $2)',
      ['wiki/a.md', 1]
    );
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
