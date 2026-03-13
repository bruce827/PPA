process.env.NODE_ENV = 'test';
process.env.AI_LOG_ENABLED = 'false';

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const request = require('supertest');

const { app } = require('../index');
const db = require('../utils/db');

function startServer(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('无法获取测试服务器端口'));
        return;
      }
      resolve({
        server,
        url: `http://127.0.0.1:${address.port}`,
      });
    });
    server.on('error', reject);
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
}

describe('Bidding Sites API', () => {
  const TEST_DB_PATH = path.join(os.tmpdir(), `ppa.bidding.sites.${process.pid}.${Date.now()}.db`);

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    await db.init(TEST_DB_PATH);

    await db.run(`
      CREATE TABLE IF NOT EXISTS opportunity_bidding_sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        alias_name TEXT,
        url TEXT NOT NULL,
        normalized_url TEXT NOT NULL UNIQUE,
        source_level TEXT,
        province TEXT,
        city TEXT,
        platform_type TEXT,
        is_official INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        notes TEXT,
        validation_status TEXT NOT NULL DEFAULT 'never_validated',
        validation_summary TEXT,
        auth_required INTEGER,
        is_bidding_site INTEGER,
        http_status INTEGER,
        final_url TEXT,
        redirect_chain_json TEXT,
        validation_confidence REAL,
        validation_payload_json TEXT,
        last_validated_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS ai_model_configs (
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
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS ai_assessment_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_id TEXT,
        model_used TEXT,
        request_hash TEXT,
        duration_ms INTEGER,
        status TEXT NOT NULL,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  afterAll(async () => {
    await db.close();
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch (_error) {}
  });

  test('should create, list and reject duplicate normalized URLs', async () => {
    const createResponse = await request(app)
      .post('/api/opportunity/bidding-sites')
      .send({
        name: '测试采购站',
        url: 'https://WWW.EXAMPLE.COM/path?x=1',
        source_level: '国家级',
        platform_type: '官方核心',
        is_official: true,
        enabled: true,
      });

    expect(createResponse.status).toBe(200);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.normalized_url).toBe('https://www.example.com/path?x=1');

    const listResponse = await request(app)
      .get('/api/opportunity/bidding-sites')
      .query({ keyword: '测试采购站' });

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.items).toHaveLength(1);

    const duplicateResponse = await request(app)
      .post('/api/opportunity/bidding-sites')
      .send({
        name: '重复站点',
        url: 'https://www.example.com/path?x=1',
      });

    expect(duplicateResponse.status).toBe(400);
    expect(duplicateResponse.body.success).toBe(false);
  });

  test('should reject URL without scheme', async () => {
    const response = await request(app)
      .post('/api/opportunity/bidding-sites')
      .send({
        name: '非法地址',
        url: 'example.com/no-scheme',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('http://');
  });

  test('should validate a site and persist heuristic_only result when AI is unavailable', async () => {
    const { server, url } = await startServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <head><title>某市公共资源交易中心</title></head>
          <body>
            <h1>招标公告</h1>
            <p>欢迎访问公共资源交易平台，查看采购与中标信息。</p>
          </body>
        </html>
      `);
    });

    try {
      const createResponse = await request(app)
        .post('/api/opportunity/bidding-sites')
        .send({
          name: '本地校验站点',
          url: `${url}/portal`,
          source_level: '地方省市',
          platform_type: '公共资源交易',
          is_official: true,
          enabled: true,
        });

      const siteId = createResponse.body.data.id;
      const validateResponse = await request(app)
        .post(`/api/opportunity/bidding-sites/${siteId}/validate`)
        .send({});

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.success).toBe(true);
      expect(validateResponse.body.data.validation.validation_status).toBe('heuristic_only');
      expect(validateResponse.body.data.validation.is_bidding_site).toBe(true);
      expect(validateResponse.body.data.validation.http_status).toBe(200);

      const detailResponse = await request(app).get(`/api/opportunity/bidding-sites/${siteId}`);
      expect(detailResponse.status).toBe(200);
      expect(detailResponse.body.data.validation_status).toBe('heuristic_only');
      expect(detailResponse.body.data.final_url).toBe(`${url}/portal`);
    } finally {
      await closeServer(server);
    }
  });
});
