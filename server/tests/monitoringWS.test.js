process.env.NODE_ENV = 'test';

const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const { app } = require('../index');
const db = require('../utils/db');
const aiAssessmentLogModel = require('../models/aiAssessmentLogModel');
const monitoringWsService = require('../services/monitoringWsService');

describe('Monitoring WS - Integration Tests', () => {
  const TEST_DB_PATH = path.join(os.tmpdir(), `ppa.monitoring.ws.${process.pid}.${Date.now()}.db`);

  let server;
  let port;

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

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    port = server.address().port;

    monitoringWsService.init(server);
  });

  afterAll(async () => {
    await monitoringWsService.close();

    if (server) {
      await new Promise((resolve) => server.close(() => resolve()));
    }

    await db.close();

    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  function connectClient() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/api/monitoring/ws`);

      const timer = setTimeout(() => {
        try {
          ws.terminate();
        } catch (e) {}
        reject(new Error('ws connect timeout'));
      }, 2000);

      ws.on('open', () => {
        clearTimeout(timer);
        resolve(ws);
      });

      ws.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  test('subscribe then receive ai_log_created for matching step', async () => {
    const ws = await connectClient();

    try {
      const received = [];
      ws.on('message', (buf) => {
        const text = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf);
        try {
          received.push(JSON.parse(text));
        } catch (e) {}
      });

      ws.send(JSON.stringify({ type: 'subscribe', steps: ['model-test'] }));

      await new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const check = () => {
          if (received.some((m) => m && m.type === 'subscribed')) return resolve();
          if (Date.now() - startedAt > 2000) return reject(new Error('no subscribed ack'));
          setTimeout(check, 10);
        };
        check();
      });

      const requestHash = `ws_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      await aiAssessmentLogModel.insertLog({
        promptId: 'test',
        modelUsed: 'gpt-4o-mini',
        requestHash,
        durationMs: 123,
        status: 'success',
        step: 'model-test',
        route: '/api/config/ai-models/test',
      });

      const msg = await new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const check = () => {
          const found = received.find((m) => m && m.type === 'ai_log_created' && m.data && m.data.request_hash === requestHash);
          if (found) return resolve(found);
          if (Date.now() - startedAt > 2000) return reject(new Error('no ai_log_created'));
          setTimeout(check, 10);
        };
        check();
      });

      expect(msg.data.step).toBe('model-test');
      expect(msg.data.request_hash).toBe(requestHash);
    } finally {
      try {
        ws.close();
      } catch (e) {}
    }
  });

  test('does not receive ai_log_created for non-subscribed step', async () => {
    const ws = await connectClient();

    try {
      const received = [];
      ws.on('message', (buf) => {
        const text = Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf);
        try {
          received.push(JSON.parse(text));
        } catch (e) {}
      });

      ws.send(JSON.stringify({ type: 'subscribe', steps: ['risk'] }));

      await new Promise((resolve, reject) => {
        const startedAt = Date.now();
        const check = () => {
          if (received.some((m) => m && m.type === 'subscribed')) return resolve();
          if (Date.now() - startedAt > 2000) return reject(new Error('no subscribed ack'));
          setTimeout(check, 10);
        };
        check();
      });

      const requestHash = `ws_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      await aiAssessmentLogModel.insertLog({
        promptId: 'test',
        modelUsed: 'gpt-4o-mini',
        requestHash,
        durationMs: 123,
        status: 'success',
        step: 'model-test',
        route: '/api/config/ai-models/test',
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      const pushed = received.some((m) => m && m.type === 'ai_log_created' && m.data && m.data.request_hash === requestHash);
      expect(pushed).toBe(false);
    } finally {
      try {
        ws.close();
      } catch (e) {}
    }
  });
});
