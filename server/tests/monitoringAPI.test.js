process.env.NODE_ENV = 'test';

const os = require('os');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const request = require('supertest');

const { app } = require('../index');
const db = require('../utils/db');

describe('Monitoring API - Integration Tests', () => {
  const TEST_DB_PATH = path.join(os.tmpdir(), `ppa.monitoring.${process.pid}.${Date.now()}.db`);
  const baseLogDir = path.join(os.tmpdir(), `ppa.ai_logs.${process.pid}.${Date.now()}`);
  const originalAiLogDir = process.env.AI_LOG_DIR;

  const hashA = 'a'.repeat(64);
  const hashB = 'b'.repeat(64);
  const hashC = 'c'.repeat(64);
  const hashD = 'd'.repeat(64);
  const hashE = 'e'.repeat(64);

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    await db.init(TEST_DB_PATH);

    await db.run(`
      CREATE TABLE IF NOT EXISTS ai_assessment_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_id TEXT,
        model_used TEXT,
        request_hash TEXT,
        duration_ms INTEGER,
        status TEXT,
        error_message TEXT,
        created_at DATETIME,
        step TEXT,
        route TEXT,
        project_id INTEGER,
        log_dir TEXT
      )
    `);

    await db.run(
      `INSERT INTO ai_assessment_logs (
        prompt_id, model_used, request_hash, duration_ms, status, error_message, created_at, step, route, project_id, log_dir
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['p1', 'gpt-4o-mini', hashA, 1200, 'success', null, '2025-01-03 10:00:00', 'risk', '/api/ai/assess-risk', 1, null]
    );

    await db.run(
      `INSERT INTO ai_assessment_logs (
        prompt_id, model_used, request_hash, duration_ms, status, error_message, created_at, step, route, project_id, log_dir
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['p2', 'gpt-4o-mini', hashB, 5000, 'timeout', 'ETIMEDOUT: network timeout', '2025-01-02 10:00:00', 'model-test', '/api/config/ai-models/test', null, null]
    );

    await db.run(
      `INSERT INTO ai_assessment_logs (
        prompt_id, model_used, request_hash, duration_ms, status, error_message, created_at, step, route, project_id, log_dir
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['p3', 'claude', hashC, 800, 'fail', 'JSON parse error', '2025-01-01 10:00:00', 'risk', '/api/ai/assess-risk', 2, null]
    );

    process.env.AI_LOG_DIR = baseLogDir;
    await fsp.mkdir(baseLogDir, { recursive: true });

    const runDir = path.join(baseLogDir, 'model-test', '2025-01-01', `000000_${hashD.slice(0, 12)}`);
    await fsp.mkdir(runDir, { recursive: true });

    await Promise.all([
      fsp.writeFile(
        path.join(runDir, 'index.json'),
        JSON.stringify({ request_hash: hashD, step: 'model-test' }, null, 2),
        'utf8'
      ),
      fsp.writeFile(path.join(runDir, 'request.json'), JSON.stringify({ foo: 'bar' }, null, 2), 'utf8'),
      fsp.writeFile(path.join(runDir, 'response.raw.txt'), 'RAW_RESPONSE', 'utf8'),
      fsp.writeFile(path.join(runDir, 'response.parsed.json'), JSON.stringify({ ok: true }, null, 2), 'utf8'),
      fsp.writeFile(path.join(runDir, 'notes.log'), 'NOTES', 'utf8'),
    ]);

    await db.run(
      `INSERT INTO ai_assessment_logs (
        prompt_id, model_used, request_hash, duration_ms, status, error_message, created_at, step, route, project_id, log_dir
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['p4', 'gpt-4o-mini', hashD, 100, 'success', null, '2025-01-01 00:00:00', 'model-test', '/api/config/ai-models/test', null, runDir]
    );

    const missingDir = path.join(baseLogDir, 'risk', '2025-01-02', `000001_${hashE.slice(0, 12)}`);
    await fsp.mkdir(missingDir, { recursive: true });
    await Promise.all([
      fsp.writeFile(
        path.join(missingDir, 'index.json'),
        JSON.stringify({ request_hash: hashE, step: 'risk' }, null, 2),
        'utf8'
      ),
      fsp.writeFile(path.join(missingDir, 'request.json'), JSON.stringify({ hello: 'world' }, null, 2), 'utf8'),
      fsp.writeFile(path.join(missingDir, 'response.raw.txt'), 'RAW_ONLY', 'utf8'),
    ]);

    await db.run(
      `INSERT INTO ai_assessment_logs (
        prompt_id, model_used, request_hash, duration_ms, status, error_message, created_at, step, route, project_id, log_dir
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['p5', 'gpt-4o-mini', hashE, 200, 'fail', 'some error', '2025-01-02 00:00:00', 'risk', '/api/ai/assess-risk', 1, missingDir]
    );
  });

  afterAll(async () => {
    await db.close();

    if (typeof originalAiLogDir === 'undefined') {
      delete process.env.AI_LOG_DIR;
    } else {
      process.env.AI_LOG_DIR = originalAiLogDir;
    }

    await fsp.rm(baseLogDir, { recursive: true, force: true });

    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  test('GET /api/monitoring/logs returns paginated list', async () => {
    const res = await request(app).get('/api/monitoring/logs').query({ page: 1, pageSize: 2 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total');
    expect(res.body.data).toHaveProperty('list');
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(2);
    expect(res.body.data.list).toHaveLength(2);
    expect(res.body.data.list[0].created_at).toBe('2025-01-03 10:00:00');
  });

  test('GET /api/monitoring/logs supports filters', async () => {
    const res = await request(app)
      .get('/api/monitoring/logs')
      .query({ steps: 'risk', models: 'claude', statuses: 'fail', searchHash: hashC.slice(0, 6) });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.list[0].request_hash).toBe(hashC);
  });

  test('GET /api/monitoring/logs returns empty list when no match', async () => {
    const res = await request(app).get('/api/monitoring/logs').query({ searchHash: 'no_such_hash' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.list).toHaveLength(0);
  });

  test('GET /api/monitoring/logs validates projectId', async () => {
    const res = await request(app).get('/api/monitoring/logs').query({ projectId: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/monitoring/stats aggregates data', async () => {
    const res = await request(app).get('/api/monitoring/stats').query({});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCalls).toBeGreaterThanOrEqual(4);
    expect(res.body.data.errorDistribution.timeout).toBeGreaterThanOrEqual(1);
    expect(res.body.data.errorDistribution.parse).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/monitoring/logs/:hash returns detail by log_dir', async () => {
    const res = await request(app).get(`/api/monitoring/logs/${hashD.slice(0, 12)}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data.meta).toBeTruthy();
    expect(res.body.data.meta.requestHash).toBe(hashD);
    expect(res.body.data.meta.step).toBe('model-test');
    expect(res.body.data.meta.logDir).toContain(baseLogDir);

    expect(res.body.data.index).toBeTruthy();
    expect(res.body.data.request).toBeTruthy();
    expect(res.body.data.responseRaw).toBe('RAW_RESPONSE');
    expect(res.body.data.responseParsed).toBeTruthy();
    expect(res.body.data.notes).toBe('NOTES');
  });

  test('GET /api/monitoring/logs/:hash handles missing files (returns null)', async () => {
    const res = await request(app).get(`/api/monitoring/logs/${hashE.slice(0, 12)}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data.meta).toBeTruthy();
    expect(res.body.data.meta.requestHash).toBe(hashE);
    expect(res.body.data.meta.step).toBe('risk');

    expect(res.body.data.index).toBeTruthy();
    expect(res.body.data.request).toBeTruthy();
    expect(res.body.data.responseRaw).toBe('RAW_ONLY');
    expect(res.body.data.responseParsed).toBeNull();
    expect(res.body.data.notes).toBeNull();
  });
});
