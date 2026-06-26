const {
  agent,
  cleanupTracked,
  closePostgresTestDb,
  expectOk,
  extractId,
  initPostgresTestDb,
  track,
  uniquePrefix,
} = require('./helpers');

describe('PostgreSQL regression - AI config and prompt database APIs', () => {
  let prefix;

  beforeAll(async () => {
    await initPostgresTestDb();
    prefix = uniquePrefix('ai');
  });

  afterAll(async () => {
    await cleanupTracked();
    await closePostgresTestDb();
  });

  test('AI model CRUD and filter endpoints work without external test calls', async () => {
    const createRes = await agent()
      .post('/api/config/ai-models')
      .send({
        config_name: `${prefix}_model`,
        description: 'PostgreSQL regression model',
        provider: 'openai',
        api_key: 'test-key',
        api_host: 'https://api.openai.com/v1/chat/completions',
        model_name: 'gpt-test',
        temperature: 0.2,
        max_tokens: 1000,
        timeout: 30,
        is_current: 0,
        is_current_vision: 0,
        is_active: 1,
        supports_web_search: 0,
        supports_vision: 0,
      });
    expectOk(createRes, [201]);
    const modelId = track('ai_model_configs', extractId(createRes));

    expectOk(await agent().get('/api/config/ai-models').query({ is_active: 1 }));
    expectOk(await agent().get(`/api/config/ai-models/${modelId}`));

    const updateRes = await agent()
      .put(`/api/config/ai-models/${modelId}`)
      .send({
        config_name: `${prefix}_model_updated`,
        description: 'Updated PostgreSQL regression model',
        provider: 'openai',
        api_key: 'test-key',
        api_host: 'https://api.openai.com/v1/chat/completions',
        model_name: 'gpt-test-updated',
        temperature: 0.3,
        max_tokens: 1200,
        timeout: 30,
        is_current: 0,
        is_current_vision: 0,
        is_active: 1,
        supports_web_search: 0,
        supports_vision: 0,
      });
    expectOk(updateRes);
    expect(updateRes.body.data.model_name).toBe('gpt-test-updated');

    const deleteRes = await agent().delete(`/api/config/ai-models/${modelId}`);
    expectOk(deleteRes);
  });

  test('vision model can be set as current vision model using DB-only endpoint', async () => {
    const createRes = await agent()
      .post('/api/config/ai-models')
      .send({
        config_name: `${prefix}_vision_model`,
        provider: 'gemini',
        api_key: 'test-key',
        api_host: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        model_name: 'gemini-pro-vision',
        temperature: 0.2,
        max_tokens: 1000,
        timeout: 30,
        is_current: 0,
        is_current_vision: 0,
        is_active: 1,
        supports_web_search: 0,
        supports_vision: 1,
      });
    expectOk(createRes, [201]);
    const modelId = track('ai_model_configs', extractId(createRes));

    const setRes = await agent().post(`/api/config/ai-models/${modelId}/set-current-vision`);
    expectOk(setRes);
    expect(setRes.body.data.is_current_vision).toBe(1);

    const currentRes = await agent().get('/api/config/ai-models/current-vision');
    expectOk(currentRes);
    expect(currentRes.body.data.id).toBe(modelId);
  });

  test('prompt template CRUD, copy and preview work in PostgreSQL', async () => {
    const createRes = await agent()
      .post('/api/config/prompts')
      .send({
        template_name: `${prefix}_prompt`,
        module_tag: 'assessment',
        description: 'PostgreSQL regression prompt',
        system_prompt: 'You are a risk assistant.',
        user_prompt_template: 'Project: {{project_name}}',
        variables_json: JSON.stringify([{ name: 'project_name', required: true }]),
        is_active: 1,
      });
    expectOk(createRes, [201]);
    const promptId = track('prompt_templates', extractId(createRes));

    expectOk(await agent().get('/api/config/prompts'));
    expectOk(await agent().get(`/api/config/prompts/${promptId}`));

    const previewRes = await agent()
      .post(`/api/config/prompts/${promptId}/preview`)
      .send({ variable_values: { project_name: `${prefix} project` } });
    expectOk(previewRes);
    expect(JSON.stringify(previewRes.body)).toContain(`${prefix} project`);

    const copyRes = await agent().post(`/api/config/prompts/${promptId}/copy`);
    expectOk(copyRes, [201]);
    track('prompt_templates', extractId(copyRes));

    const updateRes = await agent()
      .put(`/api/config/prompts/${promptId}`)
      .send({
        template_name: `${prefix}_prompt_updated`,
        module_tag: 'assessment',
        description: 'Updated prompt',
        system_prompt: 'You are an updated assistant.',
        user_prompt_template: 'Updated project: {{project_name}}',
        variables_json: JSON.stringify([{ name: 'project_name', required: true }]),
        is_active: 1,
      });
    expectOk(updateRes);

    const deleteRes = await agent().delete(`/api/config/prompts/${promptId}`);
    expectOk(deleteRes);
  });

  test('prompt module tags CRUD is isolated by generated value', async () => {
    const createRes = await agent()
      .post('/api/config/prompt-module-tags')
      .send({
        value: `${prefix}_module_tag`,
        label: `${prefix} module tag`,
        description: 'PostgreSQL regression tag',
        is_recommended: 0,
        sort_order: 999,
      });
    expectOk(createRes);
    const tagId = track('prompt_module_tags', extractId(createRes));

    expectOk(await agent().get('/api/config/prompt-module-tags'));
    const updateRes = await agent()
      .put(`/api/config/prompt-module-tags/${tagId}`)
      .send({ label: `${prefix} module tag updated`, sort_order: 1000 });
    expectOk(updateRes);

    const deleteRes = await agent().delete(`/api/config/prompt-module-tags/${tagId}`);
    expectOk(deleteRes);
  });

  test('AI read-only prompt endpoints do not call external providers', async () => {
    expectOk(await agent().get('/api/ai/prompts'));
    expectOk(await agent().get('/api/ai/module-prompts'));
    expectOk(await agent().get('/api/ai/workload-prompts'));
    expectOk(await agent().get('/api/ai/project-tag-prompts'));
  });
});
