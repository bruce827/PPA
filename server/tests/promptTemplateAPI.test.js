process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { app } = require('../index');
const db = require('../utils/db');
const {
  runMigration,
} = require('../migrations/007_expand_prompt_template_categories');

describe('Prompt Template API', () => {
  const TEST_DB_PATH = path.join(
    os.tmpdir(),
    `ppa.prompt-template.${process.pid}.${Date.now()}.db`
  );

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    await db.init(TEST_DB_PATH);
    await db.run(`
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
      )
    `);
    await db.run(
      'CREATE INDEX IF NOT EXISTS idx_prompt_module_tag ON prompt_templates(module_tag)'
    );
    await db.run(
      'CREATE INDEX IF NOT EXISTS idx_prompt_active ON prompt_templates(is_active)'
    );
    await db.run(
      'CREATE INDEX IF NOT EXISTS idx_prompt_system ON prompt_templates(is_system)'
    );

    await runMigration(TEST_DB_PATH);
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
    await db.run('DELETE FROM prompt_templates');
  });

  test('POST /api/config/prompts should create a bidding_search template and persist variables_json', async () => {
    const variables = [
      {
        name: 'project_title',
        description: '项目名称',
        example: '某项目',
        required: true,
      },
    ];

    const response = await request(app).post('/api/config/prompts').send({
      template_name: '招标项目全网检索',
      module_tag: 'bidding_search',
      description: '联网搜索模板',
      system_prompt: '只返回 JSON',
      user_prompt_template: '项目：{{project_title}}',
      variables_json: JSON.stringify(variables),
      is_active: 1,
    });

    expect(response.status).toBe(201);
    expect(response.body.template_name).toBe('招标项目全网检索');
    expect(response.body.module_tag).toBe('bidding_search');

    const stored = await db.get(
      'SELECT module_tag, variables_json FROM prompt_templates WHERE template_name = ?',
      ['招标项目全网检索']
    );
    expect(stored.module_tag).toBe('bidding_search');
    expect(JSON.parse(stored.variables_json)).toEqual(variables);
  });

  test('PUT /api/config/prompts/:id should update a template to bidding_search', async () => {
    const created = await request(app).post('/api/config/prompts').send({
      template_name: '可升级模板',
      module_tag: 'assessment',
      description: '旧模块标签模板',
      system_prompt: '旧 system',
      user_prompt_template: '旧 user',
      variables_json: JSON.stringify([]),
      is_active: 1,
    });

    const response = await request(app)
      .put(`/api/config/prompts/${created.body.id}`)
      .send({
        template_name: '可升级模板',
        module_tag: 'bidding_search',
        description: '升级为联网搜索',
        system_prompt: '新 system',
        user_prompt_template: '新 user',
        variables_json: JSON.stringify([
          {
            name: 'issuer',
            description: '招标单位',
            example: '某单位',
            required: false,
          },
        ]),
        is_active: 1,
      });

    expect(response.status).toBe(200);
    expect(response.body.module_tag).toBe('bidding_search');

    const stored = await db.get(
      'SELECT module_tag FROM prompt_templates WHERE id = ?',
      [created.body.id]
    );
    expect(stored.module_tag).toBe('bidding_search');
  });

  test('GET /api/config/prompts should filter bidding_search templates only', async () => {
    await db.run(
      `INSERT INTO prompt_templates (template_name, module_tag, description, system_prompt, user_prompt_template, variables_json, is_system, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
      [
        '联网搜索模板',
        'bidding_search',
        '联网搜索',
        '只返回 JSON',
        '项目：{{project_title}}',
        JSON.stringify([]),
      ]
    );
    await db.run(
      `INSERT INTO prompt_templates (template_name, module_tag, description, system_prompt, user_prompt_template, variables_json, is_system, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
      [
        '风险模板',
        'assessment',
        '风险',
        '只返回 JSON',
        '{}',
        JSON.stringify([]),
      ]
    );

    const response = await request(app)
      .get('/api/config/prompts')
      .query({ module_tag: 'bidding_search', is_active: 1 });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].template_name).toBe('联网搜索模板');
    expect(response.body.data[0].module_tag).toBe('bidding_search');
  });

  test('GET /api/config/prompts should only return active bidding_search templates when is_active=1', async () => {
    await db.run(
      `INSERT INTO prompt_templates (template_name, module_tag, description, system_prompt, user_prompt_template, variables_json, is_system, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
      [
        '启用联网搜索模板',
        'bidding_search',
        '启用',
        '只返回 JSON',
        '项目：{{project_title}}',
        JSON.stringify([]),
      ]
    );
    await db.run(
      `INSERT INTO prompt_templates (template_name, module_tag, description, system_prompt, user_prompt_template, variables_json, is_system, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
      [
        '禁用联网搜索模板',
        'bidding_search',
        '禁用',
        '只返回 JSON',
        '项目：{{project_title}}',
        JSON.stringify([]),
      ]
    );

    const response = await request(app)
      .get('/api/config/prompts')
      .query({ module_tag: 'bidding_search', is_active: 1 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].template_name).toBe('启用联网搜索模板');
    expect(response.body.data[0].module_tag).toBe('bidding_search');
  });

  test('POST /api/config/prompts should accept arbitrary module_tag including non-recommended values', async () => {
    const response = await request(app).post('/api/config/prompts').send({
      template_name: '自定义标签模板',
      module_tag: 'custom_tag',
      description: '自由输入的模块标签',
      system_prompt: '只返回 JSON',
      user_prompt_template: '内容：{{value}}',
      variables_json: JSON.stringify([]),
      is_active: 1,
    });

    expect(response.status).toBe(201);
    expect(response.body.module_tag).toBe('custom_tag');

    const stored = await db.get(
      'SELECT module_tag FROM prompt_templates WHERE template_name = ?',
      ['自定义标签模板']
    );
    expect(stored.module_tag).toBe('custom_tag');
  });

  test('GET /api/config/prompts should filter by exact module_tag value', async () => {
    await db.run(
      `INSERT INTO prompt_templates (template_name, module_tag, description, system_prompt, user_prompt_template, variables_json, is_system, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
      [
        '工作量模板',
        'assessment',
        '工作量评估',
        '只返回 JSON',
        '角色：{{roles}}',
        JSON.stringify([]),
      ]
    );

    const response = await request(app)
      .get('/api/config/prompts')
      .query({ module_tag: 'assessment', is_active: 1 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].module_tag).toBe('assessment');
  });

  test('POST /api/config/prompts should reject empty module_tag', async () => {
    const response = await request(app).post('/api/config/prompts').send({
      template_name: '空标签模板',
      module_tag: '',
      description: '空模块标签',
      system_prompt: '只返回 JSON',
      user_prompt_template: '内容',
      variables_json: JSON.stringify([]),
      is_active: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('module_tag');
  });
});
