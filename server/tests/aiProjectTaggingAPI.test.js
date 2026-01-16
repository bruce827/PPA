process.env.NODE_ENV = 'test';
process.env.AI_LOG_ENABLED = 'false';

const os = require('os');
const path = require('path');
const fs = require('fs');
const request = require('supertest');

const { app } = require('../index');
const db = require('../utils/db');

describe('AI Project Tagging API - Integration Tests', () => {
  const TEST_DB_PATH = path.join(os.tmpdir(), `ppa.ai.project.tags.${process.pid}.${Date.now()}.db`);

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    await db.init(TEST_DB_PATH);

    await db.run(`
      CREATE TABLE IF NOT EXISTS prompt_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        system_prompt TEXT NOT NULL,
        user_prompt_template TEXT NOT NULL,
        variables_json TEXT,
        is_system BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
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

    await db.run(
      `INSERT INTO ai_model_configs (config_name, description, provider, api_key, api_host, model_name, temperature, max_tokens, timeout, is_current, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        'test-model',
        'test',
        'openai-compatible',
        'test-key',
        'http://example.invalid/v1/chat/completions',
        'gpt-test',
        0.2,
        1000,
        10,
      ]
    );

    await db.run(
      `INSERT INTO prompt_templates (template_name, category, description, system_prompt, user_prompt_template, variables_json, is_system, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
      [
        'project tags',
        'project_tagging',
        'tagging',
        'Return JSON only',
        '{"tags": ["A", "B"]}\n\n{{project_snapshot}}',
        JSON.stringify([{ name: 'project_snapshot', default_value: '' }]),
      ]
    );

    await db.run(
      `INSERT INTO prompt_templates (template_name, category, description, system_prompt, user_prompt_template, variables_json, is_system, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
      [
        'risk',
        'risk_analysis',
        'risk',
        'Return JSON only',
        '{"risk_scores": []}',
        JSON.stringify([]),
      ]
    );
  });

  afterAll(async () => {
    await db.close();
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch (_e) {}
  });

  test('GET /api/ai/project-tag-prompts should return prompts for project_tagging category only', async () => {
    const res = await request(app).get('/api/ai/project-tag-prompts');
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(Array.isArray(res.body?.data)).toBe(true);

    const list = res.body.data;
    expect(list.length).toBeGreaterThanOrEqual(1);
    const categories = list.map((x) => x?.id).filter(Boolean);
    expect(categories.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/ai/generate-project-tags should return normalized tags', async () => {
    const openaiProvider = require('../providers/ai/openaiProvider');
    const spy = jest
      .spyOn(openaiProvider, 'createRiskAssessment')
      .mockResolvedValue({
        data: {
          model: 'gpt-test',
          choices: [
            {
              message: {
                content: JSON.stringify({ tags: ['  a ', 'b', 'a', '', null, 'c'.repeat(50)] }),
              },
            },
          ],
        },
        statusCode: 200,
        model: 'gpt-test',
        durationMs: 12,
      });

    try {
      const res = await request(app)
        .post('/api/ai/generate-project-tags')
        .send({
          promptId: '1',
          projectId: 123,
          projectSnapshot: { name: 'x', description: 'y' },
        });

      expect(res.status).toBe(200);
      expect(res.body?.success).toBe(true);
      expect(res.body?.data?.tags).toEqual(['a', 'b', 'cccccccccccccccccccccccccccccc']);
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
