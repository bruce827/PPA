process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { app } = require('../index');
const db = require('../utils/db');

describe('AI Model API', () => {
  const TEST_DB_PATH = path.join(
    os.tmpdir(),
    `ppa.ai-model.${process.pid}.${Date.now()}.db`
  );

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    await db.init(TEST_DB_PATH);
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
        supports_web_search INTEGER NOT NULL DEFAULT 0,
        last_test_time DATETIME,
        test_status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_model_configs_is_current
      ON ai_model_configs(is_current)
      WHERE is_current = 1
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

  beforeEach(async () => {
    await db.run('DELETE FROM ai_model_configs');
  });

  test('POST /api/config/ai-models should persist supports_web_search when explicitly enabled', async () => {
    const response = await request(app).post('/api/config/ai-models').send({
      config_name: 'web-search-model',
      provider: 'openai-compatible',
      api_key: 'secret-key',
      api_host: 'https://example.com/v1/chat/completions',
      model_name: 'gpt-test',
      supports_web_search: 1,
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.supports_web_search).toBe(1);

    const stored = await db.get(
      'SELECT supports_web_search FROM ai_model_configs WHERE config_name = ?',
      ['web-search-model']
    );
    expect(stored.supports_web_search).toBe(1);
  });

  test('POST /api/config/ai-models should default supports_web_search to 0 when omitted', async () => {
    const response = await request(app).post('/api/config/ai-models').send({
      config_name: 'general-model',
      provider: 'openai-compatible',
      api_key: 'secret-key',
      api_host: 'https://example.com/v1/chat/completions',
      model_name: 'gpt-test',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.supports_web_search).toBe(0);
  });

  test('POST /api/config/ai-models should reject root host for OpenAI compatible providers', async () => {
    const response = await request(app).post('/api/config/ai-models').send({
      config_name: 'invalid-openai-host',
      provider: 'OpenAI',
      api_key: 'secret-key',
      api_host: 'https://open.cherryin.cc/',
      model_name: 'gpt-test',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('OpenAI 兼容服务的 API Host 需填写完整接口 URL');
  });

  test('POST /api/config/ai-models should normalize Cherry Studio root host', async () => {
    const response = await request(app).post('/api/config/ai-models').send({
      config_name: 'cherry-root-host',
      provider: 'Cherry Studio',
      api_key: 'secret-key',
      api_host: 'https://open.cherryin.cc/',
      model_name: 'agent/qwen',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.api_host).toBe('https://open.cherryin.cc/v1/chat/completions');
  });

  test('POST /api/config/ai-models should force Tavily models to enable supports_web_search', async () => {
    const response = await request(app).post('/api/config/ai-models').send({
      config_name: 'tavily-search-model',
      provider: 'tavily',
      api_key: 'secret-key',
      api_host: 'https://api.tavily.com/search',
      model_name: 'advanced',
      supports_web_search: 0,
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.supports_web_search).toBe(1);
  });

  test('PUT /api/config/ai-models/:id should update supports_web_search and expose it in get/list responses', async () => {
    const createRes = await request(app).post('/api/config/ai-models').send({
      config_name: 'updatable-model',
      provider: 'openai-compatible',
      api_key: 'secret-key',
      api_host: 'https://example.com/v1/chat/completions',
      model_name: 'gpt-test',
      supports_web_search: 0,
    });

    const modelId = createRes.body.data.id;

    const updateRes = await request(app)
      .put(`/api/config/ai-models/${modelId}`)
      .send({
        supports_web_search: 1,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.supports_web_search).toBe(1);

    const getRes = await request(app).get(`/api/config/ai-models/${modelId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.supports_web_search).toBe(1);

    const listRes = await request(app).get('/api/config/ai-models');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data[0].supports_web_search).toBe(1);
  });

  test('PUT /api/config/ai-models/:id should force supports_web_search when provider is Tavily', async () => {
    const createRes = await request(app).post('/api/config/ai-models').send({
      config_name: 'switch-to-tavily',
      provider: 'openai-compatible',
      api_key: 'secret-key',
      api_host: 'https://example.com/v1/chat/completions',
      model_name: 'gpt-test',
      supports_web_search: 0,
    });

    const modelId = createRes.body.data.id;

    const updateRes = await request(app)
      .put(`/api/config/ai-models/${modelId}`)
      .send({
        provider: 'tavily',
        api_host: 'https://api.tavily.com/search',
        model_name: 'basic',
        supports_web_search: 0,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.provider).toBe('tavily');
    expect(updateRes.body.data.supports_web_search).toBe(1);
  });

  test('GET /api/config/ai-models should filter web search capable models only', async () => {
    await request(app).post('/api/config/ai-models').send({
      config_name: 'web-search-enabled',
      provider: 'openai-compatible',
      api_key: 'secret-key',
      api_host: 'https://example.com/v1/chat/completions',
      model_name: 'gpt-web',
      supports_web_search: 1,
      is_active: 1,
    });

    await request(app).post('/api/config/ai-models').send({
      config_name: 'general-only',
      provider: 'openai-compatible',
      api_key: 'secret-key',
      api_host: 'https://example.com/v1/chat/completions',
      model_name: 'gpt-general',
      supports_web_search: 0,
      is_active: 1,
    });

    const response = await request(app)
      .get('/api/config/ai-models')
      .query({ supports_web_search: 1 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].config_name).toBe('web-search-enabled');
    expect(response.body.data[0].supports_web_search).toBe(1);
  });

  test('GET /api/config/ai-models should combine supports_web_search and is_active filters', async () => {
    await request(app).post('/api/config/ai-models').send({
      config_name: 'web-search-active',
      provider: 'openai-compatible',
      api_key: 'secret-key',
      api_host: 'https://example.com/v1/chat/completions',
      model_name: 'gpt-web-active',
      supports_web_search: 1,
      is_active: 1,
    });

    await request(app).post('/api/config/ai-models').send({
      config_name: 'web-search-disabled',
      provider: 'openai-compatible',
      api_key: 'secret-key',
      api_host: 'https://example.com/v1/chat/completions',
      model_name: 'gpt-web-disabled',
      supports_web_search: 1,
      is_active: 0,
    });

    const response = await request(app)
      .get('/api/config/ai-models')
      .query({ supports_web_search: 1, is_active: 1 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].config_name).toBe('web-search-active');
  });

  test('GET /api/config/ai-models should reject invalid filter values', async () => {
    const response = await request(app)
      .get('/api/config/ai-models')
      .query({ supports_web_search: 'yes' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Invalid value');
  });

  test('supports_web_search should not break existing is_current semantics', async () => {
    await request(app).post('/api/config/ai-models').send({
      config_name: 'current-model-a',
      provider: 'openai-compatible',
      api_key: 'secret-key',
      api_host: 'https://example.com/v1/chat/completions',
      model_name: 'gpt-test-a',
      is_current: 1,
      supports_web_search: 0,
    });

    await request(app).post('/api/config/ai-models').send({
      config_name: 'current-model-b',
      provider: 'openai-compatible',
      api_key: 'secret-key',
      api_host: 'https://example.com/v1/chat/completions',
      model_name: 'gpt-test-b',
      is_current: 1,
      supports_web_search: 1,
    });

    const rows = await db.all(
      'SELECT config_name, is_current, supports_web_search FROM ai_model_configs ORDER BY config_name ASC'
    );

    expect(rows).toHaveLength(2);
    expect(rows.filter((row) => row.is_current === 1)).toHaveLength(1);
    expect(rows.find((row) => row.config_name === 'current-model-b')?.is_current).toBe(1);
    expect(rows.find((row) => row.config_name === 'current-model-b')?.supports_web_search).toBe(1);
  });

  test('POST /api/config/ai-models should reject Tavily models as current model', async () => {
    const response = await request(app).post('/api/config/ai-models').send({
      config_name: 'tavily-current',
      provider: 'tavily',
      api_key: 'secret-key',
      api_host: 'https://api.tavily.com/search',
      model_name: 'advanced',
      is_current: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Tavily 仅可用于联网搜索，不能设为当前使用模型');
  });

  test('POST /api/config/ai-models/:id/set-current should reject Tavily models', async () => {
    const createRes = await request(app).post('/api/config/ai-models').send({
      config_name: 'tavily-set-current',
      provider: 'tavily',
      api_key: 'secret-key',
      api_host: 'https://api.tavily.com/search',
      model_name: 'advanced',
    });

    const response = await request(app).post(
      `/api/config/ai-models/${createRes.body.data.id}/set-current`
    );

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Tavily 仅可用于联网搜索，不能设为当前使用模型');
  });

  test('POST /api/config/ai-models should reject invalid supports_web_search values', async () => {
    const response = await request(app).post('/api/config/ai-models').send({
      config_name: 'invalid-flag-model',
      provider: 'openai-compatible',
      api_key: 'secret-key',
      api_host: 'https://example.com/v1/chat/completions',
      model_name: 'gpt-test',
      supports_web_search: 2,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('supports_web_search 必须为 0 或 1');
  });
});
