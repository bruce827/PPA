process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');

const db = require('../utils/db');
const aiModelService = require('../services/aiModelService');

describe('web search config validation', () => {
  const TEST_DB_PATH = path.join(
    os.tmpdir(),
    `ppa.web-search-config.${process.pid}.${Date.now()}.db`
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
        category TEXT NOT NULL,
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
    await db.run('DELETE FROM prompt_templates');
  });

  test('should reject models that do not support web search before provider call', async () => {
    await db.run(
      `INSERT INTO ai_model_configs (config_name, provider, api_key, api_host, model_name, is_active, supports_web_search)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'general-model',
        'openai-compatible',
        'secret-key',
        'https://example.com/v1/chat/completions',
        'gpt-general',
        1,
        0,
      ]
    );
    const promptInsert = await db.run(
      `INSERT INTO prompt_templates (template_name, category, system_prompt, user_prompt_template, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      ['联网搜索模板', 'web_search', '只返回 JSON', '项目：{{project_title}}', 1]
    );

    const providerCall = jest.fn();

    await expect(
      aiModelService.validateWebSearchRuntimeConfig({
        modelId: 1,
        promptTemplateId: promptInsert.id,
      })
    ).rejects.toThrow('所选模型不支持联网搜索');
    expect(providerCall).not.toHaveBeenCalled();
  });

  test('should reject missing models before provider call', async () => {
    const promptInsert = await db.run(
      `INSERT INTO prompt_templates (template_name, category, system_prompt, user_prompt_template, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      ['联网搜索模板', 'web_search', '只返回 JSON', '项目：{{project_title}}', 1]
    );

    const providerCall = jest.fn();

    await expect(
      aiModelService.validateWebSearchRuntimeConfig({
        modelId: 9999,
        promptTemplateId: promptInsert.id,
      })
    ).rejects.toThrow('未找到指定的 AI 模型配置');
    expect(providerCall).not.toHaveBeenCalled();
  });

  test('should reject disabled web search templates before provider call', async () => {
    const modelInsert = await db.run(
      `INSERT INTO ai_model_configs (config_name, provider, api_key, api_host, model_name, is_active, supports_web_search)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'web-search-model',
        'openai-compatible',
        'secret-key',
        'https://example.com/v1/chat/completions',
        'gpt-web',
        1,
        1,
      ]
    );
    const promptInsert = await db.run(
      `INSERT INTO prompt_templates (template_name, category, system_prompt, user_prompt_template, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      ['禁用模板', 'web_search', '只返回 JSON', '项目：{{project_title}}', 0]
    );

    const providerCall = jest.fn();

    await expect(
      aiModelService.validateWebSearchRuntimeConfig({
        modelId: modelInsert.id,
        promptTemplateId: promptInsert.id,
      })
    ).rejects.toThrow('所选提示词模板未启用，无法用于联网搜索');
    expect(providerCall).not.toHaveBeenCalled();
  });

  test('should reject non web_search templates before provider call', async () => {
    const modelInsert = await db.run(
      `INSERT INTO ai_model_configs (config_name, provider, api_key, api_host, model_name, is_active, supports_web_search)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'web-search-model',
        'openai-compatible',
        'secret-key',
        'https://example.com/v1/chat/completions',
        'gpt-web',
        1,
        1,
      ]
    );
    const promptInsert = await db.run(
      `INSERT INTO prompt_templates (template_name, category, system_prompt, user_prompt_template, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      ['风险模板', 'risk_analysis', '只返回 JSON', '项目：{{project_title}}', 1]
    );

    const providerCall = jest.fn();

    await expect(
      aiModelService.validateWebSearchRuntimeConfig({
        modelId: modelInsert.id,
        promptTemplateId: promptInsert.id,
      })
    ).rejects.toThrow('所选提示词模板不属于联网搜索分类');
    expect(providerCall).not.toHaveBeenCalled();
  });

  test('should reject missing templates before provider call', async () => {
    const modelInsert = await db.run(
      `INSERT INTO ai_model_configs (config_name, provider, api_key, api_host, model_name, is_active, supports_web_search)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'web-search-model',
        'openai-compatible',
        'secret-key',
        'https://example.com/v1/chat/completions',
        'gpt-web',
        1,
        1,
      ]
    );

    const providerCall = jest.fn();

    await expect(
      aiModelService.validateWebSearchRuntimeConfig({
        modelId: modelInsert.id,
        promptTemplateId: 9999,
      })
    ).rejects.toThrow('Template not found');
    expect(providerCall).not.toHaveBeenCalled();
  });

  test('should return validated model and template to the caller when both are legal', async () => {
    const modelInsert = await db.run(
      `INSERT INTO ai_model_configs (config_name, provider, api_key, api_host, model_name, is_active, supports_web_search)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'web-search-model',
        'openai-compatible',
        'secret-key',
        'https://example.com/v1/chat/completions',
        'gpt-web',
        1,
        1,
      ]
    );
    const promptInsert = await db.run(
      `INSERT INTO prompt_templates (template_name, category, system_prompt, user_prompt_template, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      ['联网搜索模板', 'web_search', '只返回 JSON', '项目：{{project_title}}', 1]
    );

    const result = await aiModelService.validateWebSearchRuntimeConfig({
      model_id: modelInsert.id,
      prompt_template_id: promptInsert.id,
    });

    expect(result.model.supports_web_search).toBe(1);
    expect(result.template.category).toBe('web_search');
  });
});
