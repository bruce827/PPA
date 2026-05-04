process.env.NODE_ENV = 'test';
process.env.AI_LOG_ENABLED = 'false';

const fs = require('fs');
const os = require('os');
const path = require('path');

const request = require('supertest');

const { app } = require('../index');
const openaiProvider = require('../providers/ai/openaiProvider');
const tavilyProvider = require('../providers/ai/tavilyProvider');
const tenderStagingModel = require('../models/tenderStagingModel');
const db = require('../utils/db');
const { timeoutError } = require('../utils/errors');

async function createTenderRecord(overrides = {}) {
  const timestamp = String(Date.now());

  return tenderStagingModel.createTenderStaging({
    source_item_id: overrides.source_item_id || `source-${timestamp}`,
    title: overrides.title || '智慧园区运营平台建设项目',
    published_at: overrides.published_at || null,
    published_date: overrides.published_date || '2026-03-18',
    deadline_at: overrides.deadline_at || null,
    deadline_date: overrides.deadline_date || '2026-03-30',
    issuer: overrides.issuer || '某市政务服务中心',
    budget_amount: overrides.budget_amount || null,
    region: overrides.region || '广东省',
    source_platform: overrides.source_platform || '中国政府采购网',
    source_url: overrides.source_url || 'https://example.com/tenders/1',
    summary: overrides.summary || '项目涉及平台建设、数据治理和可视化驾驶舱。',
    announcement_html: overrides.announcement_html || null,
    announcement_plain_text: overrides.announcement_plain_text || null,
    detail_payload_json: overrides.detail_payload_json || null,
    source_file: overrides.source_file || 'sample.json',
    raw_payload_json: overrides.raw_payload_json || null,
    push_status: overrides.push_status || 'pending',
    push_error: overrides.push_error || null,
    last_synced_at: overrides.last_synced_at || '2026-03-18 10:00:00',
    pushed_at: overrides.pushed_at || null,
    created_at: overrides.created_at || '2026-03-18 10:00:00',
    updated_at: overrides.updated_at || '2026-03-18 10:00:00',
  });
}

async function createModelConfig(overrides = {}) {
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
      supports_web_search
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      overrides.config_name || `联网搜索模型-${Date.now()}`,
      overrides.description || null,
      overrides.provider || 'openai-compatible',
      overrides.api_key || 'secret-key',
      overrides.api_host || 'https://example.com/v1/chat/completions',
      overrides.model_name || 'gpt-web-search',
      overrides.temperature ?? 0.2,
      overrides.max_tokens ?? 1200,
      overrides.timeout ?? 30,
      overrides.is_current ?? 0,
      overrides.is_active ?? 1,
      overrides.supports_web_search ?? 1,
    ]
  );

  return db.get('SELECT * FROM ai_model_configs WHERE id = ?', [result.id]);
}

async function createPromptTemplate(overrides = {}) {
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
      overrides.template_name || `联网搜索模板-${Date.now()}`,
      overrides.module_tag || overrides.category || 'bidding_search',
      overrides.description || null,
      overrides.system_prompt || '你是一个联网搜索助手，请返回 JSON。',
      overrides.user_prompt_template ||
        '项目名称：{{project_title}}\n招标单位：{{issuer}}\n补充关键词：{{focus_keywords}}',
      overrides.variables_json ||
        JSON.stringify([
          { name: 'project_title', required: true },
          { name: 'issuer', required: false },
          { name: 'focus_keywords', required: false },
        ]),
      overrides.is_system ?? 0,
      overrides.is_active ?? 1,
    ]
  );

  return db.get('SELECT * FROM prompt_templates WHERE id = ?', [result.id]);
}

describe('Tender Web Search API', () => {
  const TEST_DB_PATH = path.join(
    os.tmpdir(),
    `ppa.tender.web.search.${process.pid}.${Date.now()}.db`
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
      CREATE TABLE IF NOT EXISTS prompt_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_name TEXT NOT NULL,
        module_tag TEXT NOT NULL,
        description TEXT,
        system_prompt TEXT NOT NULL,
        user_prompt_template TEXT NOT NULL,
        variables_json TEXT,
        is_system BOOLEAN NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await tenderStagingModel.ensureSchema();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await db.run('DELETE FROM opportunity_tender_staging');
    await db.run('DELETE FROM ai_model_configs');
    await db.run('DELETE FROM prompt_templates');
  });

  afterAll(async () => {
    await db.close();
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch (_error) {}
  });

  test('GET /api/opportunity/tender-staging/:id/web-search should return tender context and empty saved result state', async () => {
    const record = await createTenderRecord();

    const response = await request(app).get(
      `/api/opportunity/tender-staging/${record.id}/web-search`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.record.id).toBe(record.id);
    expect(response.body.data.record.title).toBe('智慧园区运营平台建设项目');
    expect(response.body.data.record.issuer).toBe('某市政务服务中心');
    expect(response.body.data.record.source_platform).toBe('中国政府采购网');
    expect(response.body.data.record.source_url).toBe('https://example.com/tenders/1');
    expect(response.body.data.has_saved_result).toBe(false);
    expect(response.body.data.saved_result).toBeNull();
    expect(response.body.data.state).toBe('empty');
  });

  test('GET /api/opportunity/tender-staging/:id/web-search should return 404 when record does not exist', async () => {
    const response = await request(app).get(
      '/api/opportunity/tender-staging/999999/web-search'
    );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('待推送招标不存在');
  });

  test('GET /api/opportunity/tender-staging/:id/web-search should reject invalid id', async () => {
    const response = await request(app).get(
      '/api/opportunity/tender-staging/invalid-id/web-search'
    );

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('id 必须是正整数');
  });

  test('POST /api/opportunity/tender-staging/:id/web-search should execute provider call and return structured results', async () => {
    const record = await createTenderRecord({
      title: '智慧园区运营平台建设项目',
      issuer: '某市政务服务中心',
    });
    const model = await createModelConfig();
    const template = await createPromptTemplate();
    const providerSpy = jest
      .spyOn(openaiProvider, 'createRiskAssessment')
      .mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: '共找到 2 条高相关结果，官方来源 1 条。',
                  results: [
                    {
                      site_name: '行业媒体',
                      site_url: 'https://news.example.com/detail/1',
                      page_title: '智慧园区运营平台建设相关新闻',
                      content_type: '项目新闻',
                      published_at: '2026-03-17 09:30',
                      snippet: '报道提到该项目将建设智慧园区平台。',
                      relevance_reason: '项目名称与建设内容高度一致',
                      confidence: 0.76,
                    },
                    {
                      site_name: '中国政府采购网',
                      site_url: 'https://www.ccgp.gov.cn/notice/123',
                      page_title: '智慧园区运营平台建设项目采购公告',
                      content_type: '采购公告',
                      published_at: '2026-03-18 10:00',
                      snippet: '公告明确列出采购单位和建设内容。',
                      relevance_reason: '项目名称、招标单位与当前记录高度一致',
                      confidence: 0.71,
                    },
                    {
                      site_name: '低相关站点',
                      site_url: 'https://noise.example.com/post/1',
                      page_title: '不相关信息',
                      content_type: '其他',
                      published_at: '2026-03-18',
                      snippet: '噪音内容',
                      relevance_reason: '仅关键词偶然命中',
                      confidence: 0.12,
                    },
                  ],
                }),
              },
            },
          ],
        },
        statusCode: 200,
        model: 'gpt-web-search',
        durationMs: 18,
      });

    const response = await request(app)
      .post(`/api/opportunity/tender-staging/${record.id}/web-search`)
      .send({
        model_id: model.id,
        prompt_template_id: template.id,
        max_results: 5,
        focus_keywords: '数据治理, 可视化平台',
        exclude_keywords: '培训',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.state).toBe('fresh_result');
    expect(response.body.data.result_count).toBe(2);
    expect(response.body.data.results[0].site_name).toBe('中国政府采购网');
    expect(response.body.data.results[1].site_name).toBe('行业媒体');
    expect(response.body.data.results.every((item) => item.confidence === null || item.confidence >= 0.35)).toBe(true);
    expect(providerSpy).toHaveBeenCalledTimes(1);
    expect(providerSpy.mock.calls[0][0].timeoutMs).toBe(180000);
    expect(providerSpy.mock.calls[0][0].prompt).toContain('智慧园区运营平台建设项目');
    expect(providerSpy.mock.calls[0][0].prompt).toContain('某市政务服务中心');
    expect(providerSpy.mock.calls[0][0].prompt).toContain('数据治理, 可视化平台');

    const savedRow = await db.get(
      'SELECT * FROM tender_staging_web_search_results WHERE tender_staging_id = ?',
      [record.id]
    );
    expect(savedRow?.tender_staging_id).toBe(record.id);
    expect(savedRow?.model_config_id).toBe(model.id);
    expect(savedRow?.prompt_template_id).toBe(template.id);
    expect(savedRow?.summary).toBe('共找到 2 条高相关结果，官方来源 1 条。');
    expect(JSON.parse(savedRow?.results_json || '[]')).toHaveLength(2);
    expect(JSON.parse(savedRow?.meta_json || '{}')).toEqual({
      state: 'fresh_result',
      result_count: 2,
    });

    const schemaColumns = await db.all(
      "SELECT name FROM pragma_table_info('tender_staging_web_search_results')"
    );
    const schemaColumnNames = schemaColumns.map((item) => item.name);
    expect(schemaColumnNames).not.toEqual(
      expect.arrayContaining(['raw_text', 'response_raw', 'provider_response'])
    );

    const getResponse = await request(app).get(
      `/api/opportunity/tender-staging/${record.id}/web-search`
    );

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data.has_saved_result).toBe(true);
    expect(getResponse.body.data.state).toBe('has_saved_result');
    expect(getResponse.body.data.saved_result.summary).toBe(
      '共找到 2 条高相关结果，官方来源 1 条。'
    );
    expect(getResponse.body.data.saved_result.result_count).toBe(2);
    expect(getResponse.body.data.saved_result.results[0].site_name).toBe('中国政府采购网');
  });

  test('POST /api/opportunity/tender-staging/:id/web-search should return explicit empty_result when no high relevance result exists', async () => {
    const record = await createTenderRecord();
    const model = await createModelConfig();
    const template = await createPromptTemplate();

    jest.spyOn(openaiProvider, 'createRiskAssessment').mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: '未检索到高相关结果。',
                results: [],
              }),
            },
          },
        ],
      },
      statusCode: 200,
      model: 'gpt-web-search',
      durationMs: 10,
    });

    const response = await request(app)
      .post(`/api/opportunity/tender-staging/${record.id}/web-search`)
      .send({
        model_id: model.id,
        prompt_template_id: template.id,
        max_results: 5,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.state).toBe('empty_result');
    expect(response.body.data.results).toEqual([]);
    expect(response.body.data.summary).toBe('未检索到高相关结果。');
  });

  test('POST /api/opportunity/tender-staging/:id/web-search should reject invalid structured response before returning to UI', async () => {
    const record = await createTenderRecord();
    const model = await createModelConfig();
    const template = await createPromptTemplate();

    jest.spyOn(openaiProvider, 'createRiskAssessment').mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: 'not-json-response',
            },
          },
        ],
      },
      statusCode: 200,
      model: 'gpt-web-search',
      durationMs: 10,
    });

    const response = await request(app)
      .post(`/api/opportunity/tender-staging/${record.id}/web-search`)
      .send({
        model_id: model.id,
        prompt_template_id: template.id,
        max_results: 5,
      });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('联网搜索响应不是合法 JSON');
  });

  test('POST /api/opportunity/tender-staging/:id/web-search should reject unsupported model before provider call', async () => {
    const record = await createTenderRecord();
    const model = await createModelConfig({ supports_web_search: 0 });
    const template = await createPromptTemplate();
    const providerSpy = jest.spyOn(openaiProvider, 'createRiskAssessment');

    const response = await request(app)
      .post(`/api/opportunity/tender-staging/${record.id}/web-search`)
      .send({
        model_id: model.id,
        prompt_template_id: template.id,
        max_results: 5,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('所选模型不支持联网搜索');
    expect(providerSpy).not.toHaveBeenCalled();
  });

  test('POST /api/opportunity/tender-staging/:id/web-search should map provider timeout to gateway timeout', async () => {
    const record = await createTenderRecord();
    const model = await createModelConfig();
    const template = await createPromptTemplate();

    jest
      .spyOn(openaiProvider, 'createRiskAssessment')
      .mockRejectedValue(timeoutError('AI Provider 超时 (180000ms)'));

    const response = await request(app)
      .post(`/api/opportunity/tender-staging/${record.id}/web-search`)
      .send({
        model_id: model.id,
        prompt_template_id: template.id,
        max_results: 5,
      });

    expect(response.status).toBe(504);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('AI Provider 超时 (180000ms)');
  });

  test('POST /api/opportunity/tender-staging/:id/web-search should select Tavily provider for web search capable search models', async () => {
    const record = await createTenderRecord({
      title: '智慧园区运营平台建设项目',
      issuer: '某市政务服务中心',
    });
    const model = await createModelConfig({
      provider: 'tavily',
      api_host: 'https://api.tavily.com/search',
      model_name: 'advanced',
    });
    const template = await createPromptTemplate();
    const tavilySpy = jest
      .spyOn(tavilyProvider, 'createRiskAssessment')
      .mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: 'Tavily 共找到 1 条高相关结果。',
                  results: [
                    {
                      site_name: 'www.ccgp.gov.cn',
                      site_url: 'https://www.ccgp.gov.cn/notice/tavily',
                      page_title: '智慧园区运营平台建设项目采购公告',
                      content_type: '采购公告',
                      published_at: '2026-03-18 09:30',
                      snippet: 'Tavily 命中了政府采购公告。',
                      relevance_reason: 'Tavily 返回的高相关政府采购结果',
                      confidence: 0.84,
                    },
                  ],
                }),
              },
            },
          ],
          raw_tavily: {
            answer: 'Tavily 汇总结果',
          },
        },
        statusCode: 200,
        model: 'advanced',
        durationMs: 20,
      });
    const openaiSpy = jest.spyOn(openaiProvider, 'createRiskAssessment');

    const response = await request(app)
      .post(`/api/opportunity/tender-staging/${record.id}/web-search`)
      .send({
        model_id: model.id,
        prompt_template_id: template.id,
        max_results: 3,
        focus_keywords: '数据治理 可视化平台',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.result_count).toBe(1);
    expect(response.body.data.results[0].site_name).toBe('www.ccgp.gov.cn');
    expect(tavilySpy).toHaveBeenCalledTimes(1);
    expect(openaiSpy).not.toHaveBeenCalled();
    expect(tavilySpy.mock.calls[0][0].query).toContain('智慧园区运营平台建设项目');
    expect(tavilySpy.mock.calls[0][0].query).toContain('某市政务服务中心');
    expect(tavilySpy.mock.calls[0][0].query).toContain('数据治理 可视化平台');
    expect(tavilySpy.mock.calls[0][0].maxResults).toBe(3);
  });

  test('POST /api/opportunity/tender-staging/:id/web-search should overwrite previous saved result on next successful re-search', async () => {
    const record = await createTenderRecord();
    const model = await createModelConfig();
    const template = await createPromptTemplate();
    const providerSpy = jest.spyOn(openaiProvider, 'createRiskAssessment');

    providerSpy
      .mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: '第一次检索结果',
                  results: [
                    {
                      site_name: '中国政府采购网',
                      site_url: 'https://www.ccgp.gov.cn/notice/first',
                      page_title: '第一次公告',
                      content_type: '采购公告',
                      published_at: '2026-03-18 09:00',
                      snippet: '第一次结果摘要',
                      relevance_reason: '第一次命中',
                      confidence: 0.81,
                    },
                  ],
                }),
              },
            },
          ],
        },
        statusCode: 200,
        model: 'gpt-web-search',
        durationMs: 12,
      })
      .mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: '第二次检索结果',
                  results: [
                    {
                      site_name: '某市公共资源交易中心',
                      site_url: 'https://ggzy.example.com/notice/second',
                      page_title: '第二次公告',
                      content_type: '招标公告',
                      published_at: '2026-03-19 10:30',
                      snippet: '第二次结果摘要',
                      relevance_reason: '第二次命中更准确',
                      confidence: 0.9,
                    },
                  ],
                }),
              },
            },
          ],
        },
        statusCode: 200,
        model: 'gpt-web-search',
        durationMs: 18,
      });

    const firstResponse = await request(app)
      .post(`/api/opportunity/tender-staging/${record.id}/web-search`)
      .send({
        model_id: model.id,
        prompt_template_id: template.id,
        max_results: 5,
      });

    expect(firstResponse.status).toBe(200);
    const firstSearchedAt = firstResponse.body.data.searched_at;

    const secondResponse = await request(app)
      .post(`/api/opportunity/tender-staging/${record.id}/web-search`)
      .send({
        model_id: model.id,
        prompt_template_id: template.id,
        max_results: 5,
        focus_keywords: '刷新结果',
      });

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.data.summary).toBe('第二次检索结果');
    expect(secondResponse.body.data.results[0].site_name).toBe('某市公共资源交易中心');
    expect(secondResponse.body.data.searched_at).not.toBe(firstSearchedAt);

    const countRow = await db.get(
      'SELECT COUNT(1) AS total FROM tender_staging_web_search_results WHERE tender_staging_id = ?',
      [record.id]
    );
    expect(countRow?.total).toBe(1);

    const savedRow = await db.get(
      'SELECT summary, searched_at, results_json, meta_json FROM tender_staging_web_search_results WHERE tender_staging_id = ?',
      [record.id]
    );
    expect(savedRow?.summary).toBe('第二次检索结果');
    expect(savedRow?.searched_at).toBe(secondResponse.body.data.searched_at);
    expect(JSON.parse(savedRow?.results_json || '[]')[0].site_name).toBe('某市公共资源交易中心');
    expect(JSON.parse(savedRow?.meta_json || '{}')).toEqual({
      state: 'fresh_result',
      result_count: 1,
    });

    const getResponse = await request(app).get(
      `/api/opportunity/tender-staging/${record.id}/web-search`
    );
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.saved_result.summary).toBe('第二次检索结果');
    expect(getResponse.body.data.saved_result.results[0].site_name).toBe(
      '某市公共资源交易中心'
    );
  });

  test('POST /api/opportunity/tender-staging/:id/web-search should preserve previous saved result when re-search fails', async () => {
    const record = await createTenderRecord();
    const model = await createModelConfig();
    const template = await createPromptTemplate();
    const providerSpy = jest.spyOn(openaiProvider, 'createRiskAssessment');

    providerSpy.mockResolvedValueOnce({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: '稳定旧结果',
                results: [
                  {
                    site_name: '中国政府采购网',
                    site_url: 'https://www.ccgp.gov.cn/notice/stable',
                    page_title: '稳定公告',
                    content_type: '采购公告',
                    published_at: '2026-03-18 11:00',
                    snippet: '旧结果摘要',
                    relevance_reason: '旧结果有效',
                    confidence: 0.77,
                  },
                ],
              }),
            },
          },
        ],
      },
      statusCode: 200,
      model: 'gpt-web-search',
      durationMs: 14,
    });

    const firstResponse = await request(app)
      .post(`/api/opportunity/tender-staging/${record.id}/web-search`)
      .send({
        model_id: model.id,
        prompt_template_id: template.id,
        max_results: 5,
      });
    expect(firstResponse.status).toBe(200);
    const stableSearchedAt = firstResponse.body.data.searched_at;

    providerSpy.mockResolvedValueOnce({
      data: {
        choices: [
          {
            message: {
              content: 'not-json-response',
            },
          },
        ],
      },
      statusCode: 200,
      model: 'gpt-web-search',
      durationMs: 9,
    });

    const failedResponse = await request(app)
      .post(`/api/opportunity/tender-staging/${record.id}/web-search`)
      .send({
        model_id: model.id,
        prompt_template_id: template.id,
        max_results: 5,
        focus_keywords: '失败重检索',
      });

    expect(failedResponse.status).toBe(422);
    expect(failedResponse.body.success).toBe(false);
    expect(failedResponse.body.message).toBe('联网搜索响应不是合法 JSON');

    const countRow = await db.get(
      'SELECT COUNT(1) AS total FROM tender_staging_web_search_results WHERE tender_staging_id = ?',
      [record.id]
    );
    expect(countRow?.total).toBe(1);

    const savedRow = await db.get(
      'SELECT summary, searched_at, results_json FROM tender_staging_web_search_results WHERE tender_staging_id = ?',
      [record.id]
    );
    expect(savedRow?.summary).toBe('稳定旧结果');
    expect(savedRow?.searched_at).toBe(stableSearchedAt);
    expect(JSON.parse(savedRow?.results_json || '[]')[0].site_name).toBe('中国政府采购网');

    const getResponse = await request(app).get(
      `/api/opportunity/tender-staging/${record.id}/web-search`
    );
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.has_saved_result).toBe(true);
    expect(getResponse.body.data.saved_result.summary).toBe('稳定旧结果');
    expect(getResponse.body.data.saved_result.searched_at).toBe(stableSearchedAt);
  });
});
