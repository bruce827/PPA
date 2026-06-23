process.env.NODE_ENV = 'test';
process.env.AI_LOG_ENABLED = 'false';

const fs = require('fs');
const os = require('os');
const path = require('path');

const request = require('supertest');

const { app } = require('../index');
const openaiProvider = require('../providers/ai/openaiProvider');
const tenderStagingModel = require('../models/tenderStagingModel');
const db = require('../utils/db');

async function createTenderRecord(overrides = {}) {
  const timestamp = String(Date.now());

  return tenderStagingModel.createTenderStaging({
    source_item_id: overrides.source_item_id ?? `source-${timestamp}`,
    title: overrides.title ?? '智慧园区运营平台建设项目',
    published_at: overrides.published_at ?? null,
    published_date: overrides.published_date ?? '2026-03-18',
    deadline_at: overrides.deadline_at ?? null,
    deadline_date: overrides.deadline_date ?? null,
    issuer: overrides.issuer ?? null,
    budget_amount: overrides.budget_amount ?? null,
    region: overrides.region ?? '广东省',
    source_platform: overrides.source_platform ?? '中国政府采购网',
    source_url: overrides.source_url ?? 'https://example.com/tenders/1',
    summary: overrides.summary ?? '项目涉及平台建设、数据治理和可视化驾驶舱。',
    announcement_html: overrides.announcement_html ?? null,
    announcement_plain_text:
      overrides.announcement_plain_text ??
      '招标人为某市大数据中心。投标截止时间：2026年03月30日 09:30。',
    detail_payload_json: overrides.detail_payload_json ?? null,
    source_file: overrides.source_file ?? 'sample.json',
    raw_payload_json: overrides.raw_payload_json ?? null,
    push_status: overrides.push_status ?? 'pending',
    push_error: overrides.push_error ?? null,
    last_synced_at: overrides.last_synced_at ?? '2026-03-18 10:00:00',
    pushed_at: overrides.pushed_at ?? null,
    last_parsed_at: overrides.last_parsed_at ?? null,
    parse_status: overrides.parse_status ?? 'never_parsed',
    parse_error: overrides.parse_error ?? null,
    parse_meta_json: overrides.parse_meta_json ?? null,
    created_at: overrides.created_at ?? '2026-03-18 10:00:00',
    updated_at: overrides.updated_at ?? '2026-03-18 10:00:00',
  });
}

async function createCurrentModelConfig(overrides = {}) {
  const result = await db.run(
    `INSERT INTO ai_model_configs (
      config_name,
      description,
      provider,
      api_key,
      api_host,
      model_name,
      temperature,
      max_tokens,
      timeout,
      is_current,
      is_active,
      supports_web_search,
      supports_vision,
      is_current_vision
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      overrides.config_name || `字段解析模型-${Date.now()}`,
      overrides.description || null,
      overrides.provider || 'openai-compatible',
      overrides.api_key || 'secret-key',
      overrides.api_host || 'https://example.com/v1/chat/completions',
      overrides.model_name || 'gpt-4.1',
      overrides.temperature ?? 0.2,
      overrides.max_tokens ?? 1200,
      overrides.timeout ?? 30,
      overrides.is_current ?? 1,
      overrides.is_active ?? 1,
      overrides.supports_web_search ?? 0,
      overrides.supports_vision ?? 0,
      overrides.is_current_vision ?? 0,
    ]
  );

  return db.get('SELECT * FROM ai_model_configs WHERE id = ?', [result.id]);
}

async function createTenderFieldParseTemplate(overrides = {}) {
  const result = await db.run(
    `INSERT INTO prompt_templates (
      template_name,
      module_tag,
      description,
      system_prompt,
      user_prompt_template,
      variables_json,
      is_system,
      is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      overrides.template_name || `招标字段解析模板-${Date.now()}`,
      overrides.module_tag || 'tender',
      overrides.description || null,
      overrides.system_prompt ||
        '你是招标公告字段提取助手。只根据输入内容提取 issuer 和 deadline_date。无法确认就返回空字符串。只返回 JSON。',
      overrides.user_prompt_template ||
        '标题：{{title}}\n发布日期：{{published_date}}\n正文：{{content_excerpt}}\n返回：{"issuer":"","deadline_date":"","issuer_confidence":0,"deadline_date_confidence":0}',
      overrides.variables_json ||
        JSON.stringify([
          { name: 'title', required: true },
          { name: 'published_date', required: false },
          { name: 'content_excerpt', required: true },
        ]),
      overrides.is_system ?? 0,
      overrides.is_active ?? 1,
    ]
  );

  return db.get('SELECT * FROM prompt_templates WHERE id = ?', [result.id]);
}

describe('Tender Field Parse API', () => {
  const TEST_DB_PATH = path.join(
    os.tmpdir(),
    `ppa.tender.field.parse.${process.pid}.${Date.now()}.db`
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
        supports_vision INTEGER NOT NULL DEFAULT 0,
        is_current_vision INTEGER NOT NULL DEFAULT 0,
        last_test_time DATETIME,
        test_status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
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
    await db.run(`
      CREATE TABLE IF NOT EXISTS ai_assessment_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_id TEXT,
        model_used TEXT,
        request_hash TEXT,
        duration_ms INTEGER,
        status TEXT,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        step TEXT,
        route TEXT,
        project_id INTEGER,
        log_dir TEXT
      )
    `);
    await tenderStagingModel.ensureSchema();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await db.run('DELETE FROM opportunity_tender_staging');
    await db.run('DELETE FROM ai_model_configs');
    await db.run('DELETE FROM prompt_templates');
    await db.run('DELETE FROM ai_assessment_logs');
  });

  afterAll(async () => {
    await db.close();
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch (_error) {}
  });

  test('POST /api/opportunity/tender-staging/:id/parse-fields should parse and fill missing issuer and deadline date', async () => {
    const record = await createTenderRecord();
    await createCurrentModelConfig();
    const template = await createTenderFieldParseTemplate();

    jest.spyOn(openaiProvider, 'createRiskAssessment').mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                issuer: '某市大数据中心',
                deadline_date: '2026-03-30',
                issuer_confidence: 0.95,
                deadline_date_confidence: 0.89,
              }),
            },
          },
        ],
      },
      durationMs: 120,
      model: 'gpt-4.1',
    });

    const response = await request(app).post(
      `/api/opportunity/tender-staging/${record.id}/parse-fields`
    ).send({
      prompt_template_id: template.id,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.updated_fields).toEqual(['issuer', 'deadline_date']);
    expect(response.body.data.record.issuer).toBe('某市大数据中心');
    expect(response.body.data.record.deadline_date).toBe('2026-03-30');
    expect(response.body.data.record.parse_status).toBe('parsed_ok');
  });

  test('POST /api/opportunity/tender-staging/:id/parse-fields should skip when fields are already complete', async () => {
    const record = await createTenderRecord({
      issuer: '已有招标单位',
      deadline_date: '2026-03-31',
    });
    const template = await createTenderFieldParseTemplate();

    const response = await request(app).post(
      `/api/opportunity/tender-staging/${record.id}/parse-fields`
    ).send({
      prompt_template_id: template.id,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.updated_fields).toEqual([]);
    expect(response.body.data.skipped_fields).toEqual(['issuer', 'deadline_date']);
  });

  test('POST /api/opportunity/tender-staging/:id/parse-fields should avoid writing low-confidence values', async () => {
    const record = await createTenderRecord();
    await createCurrentModelConfig();
    const template = await createTenderFieldParseTemplate();

    jest.spyOn(openaiProvider, 'createRiskAssessment').mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                issuer: '某市大数据中心',
                deadline_date: '2026-03-30',
                issuer_confidence: 0.3,
                deadline_date_confidence: 0.4,
              }),
            },
          },
        ],
      },
      durationMs: 120,
      model: 'gpt-4.1',
    });

    const response = await request(app).post(
      `/api/opportunity/tender-staging/${record.id}/parse-fields`
    ).send({
      prompt_template_id: template.id,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.updated_fields).toEqual([]);
    expect(response.body.data.record.issuer).toBeNull();
    expect(response.body.data.record.deadline_date).toBeNull();
    expect(response.body.data.record.parse_status).toBe('parsed_empty');
  });

  test('POST /api/opportunity/tender-staging/:id/parse-fields should persist failed preflight attempts', async () => {
    const record = await createTenderRecord({
      announcement_plain_text: '',
      announcement_html: '',
    });
    const template = await createTenderFieldParseTemplate();

    const response = await request(app).post(
      `/api/opportunity/tender-staging/${record.id}/parse-fields`
    ).send({
      prompt_template_id: template.id,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    const updatedRecord = await tenderStagingModel.getTenderStagingById(record.id);
    expect(updatedRecord?.parse_status).toBe('parsed_failed');
    expect(updatedRecord?.parse_error).toBe('当前记录缺少可供解析的正文内容');

    const logs = await db.all(
      `SELECT step, route, status, error_message
       FROM ai_assessment_logs
       ORDER BY id DESC`
    );
    expect(logs[0]).toMatchObject({
      step: 'parse_tender_fields',
      route: '/api/opportunity/tender-staging/:id/parse-fields',
      status: 'fail',
      error_message: '当前记录缺少可供解析的正文内容',
    });
  });

  test('POST /api/opportunity/tender-staging/:id/parse-fields should require prompt template selection', async () => {
    const record = await createTenderRecord();
    await createCurrentModelConfig();

    const response = await request(app).post(
      `/api/opportunity/tender-staging/${record.id}/parse-fields`
    );

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('缺少必填参数：promptTemplateId');
  });

  test('POST /api/opportunity/tender-staging/:id/parse-fields should reject wrong prompt module_tag', async () => {
    const record = await createTenderRecord();
    await createCurrentModelConfig();
    const template = await createTenderFieldParseTemplate({
      module_tag: 'bidding_search',
    });

    const response = await request(app)
      .post(`/api/opportunity/tender-staging/${record.id}/parse-fields`)
      .send({
        prompt_template_id: template.id,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('所选提示词模板不属于招标字段解析分类（当前: bidding_search）');
  });
});
