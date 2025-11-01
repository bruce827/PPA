process.env.NODE_ENV = 'test';

const path = require('path');
const fs = require('fs/promises');
const request = require('supertest');

const { app } = require('../index');
const dbUtil = require('../utils/db');

const results = [];

function getResponseSummary(res) {
  const contentType = res.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    return res.body;
  }
  const bodyLength = Buffer.isBuffer(res.body)
    ? res.body.length
    : typeof res.text === 'string'
      ? res.text.length
      : null;
  return {
    contentType,
    contentLength: res.headers['content-length'] || bodyLength,
  };
}

async function record(agent, name, method, url, exec, noteFn) {
  const startedAt = Date.now();
  try {
    const res = await exec(agent);
    const duration = Date.now() - startedAt;
    const entry = {
      name,
      method,
      url,
      status: res.status,
      ok: res.status >= 200 && res.status < 300,
      duration,
      response: getResponseSummary(res),
    };
    if (noteFn) {
      entry.note = noteFn(res);
    }
    results.push(entry);
    return res;
  } catch (error) {
    const duration = Date.now() - startedAt;
    const status = error?.status || error?.response?.status || null;
    results.push({
      name,
      method,
      url,
      status,
      ok: false,
      duration,
      error: error.message,
    });
    throw error;
  }
}

(async () => {
  const agent = request(app);
  const suffix = Date.now();

  const roleName = `auto-role-${suffix}`;
  const riskName = `auto-risk-${suffix}`;
  const travelItem = `auto-travel-${suffix}`;
  const aiModelName1 = `auto-model-a-${suffix}`;
  const aiModelName2 = `auto-model-b-${suffix}`;
  const promptName = `auto-prompt-${suffix}`;
  const projectName = `auto-project-${suffix}`;
  const templateName = `auto-template-${suffix}`;

  const assessmentPayload = {
    risk_scores: { security: 10, scalability: 20 },
    roles: [
      { role_name: `RoleA-${suffix}`, unit_price: 120000 },
      { role_name: `RoleB-${suffix}`, unit_price: 90000 },
    ],
    development_workload: [
      {
        module: 'Core Feature',
        delivery_factor: 1.2,
        scope_factor: 1.1,
        tech_factor: 1.0,
        [`RoleA-${suffix}`]: 3,
        [`RoleB-${suffix}`]: 10,
      },
    ],
    integration_workload: [
      {
        module: 'Integration',
        delivery_factor: 1.0,
        scope_factor: 1.0,
        tech_factor: 1.0,
        [`RoleA-${suffix}`]: 2,
        [`RoleB-${suffix}`]: 5,
      },
    ],
    travel_months: 1,
    travel_headcount: 2,
    maintenance_months: 2,
    maintenance_headcount: 1,
    maintenance_daily_cost: 1800,
    risk_items: [{ cost: 3 }],
  };

  let roleId;
  let riskItemId;
  let travelCostId;
  let aiModelId1;
  let aiModelId2;
  let promptId;
  let promptCopyId;
  let projectId;
  let templateId;

  try {
    await record(agent, 'Health Check', 'GET', '/api/health', ag => ag.get('/api/health'));

    const createRoleRes = await record(
      agent,
      'Create Role',
      'POST',
      '/api/config/roles',
      ag => ag.post('/api/config/roles').send({ role_name: roleName, unit_price: 150000 }),
      res => `id=${res.body.id}`
    );
    roleId = createRoleRes.body.id;

    await record(
      agent,
      'List Roles',
      'GET',
      '/api/config/roles',
      ag => ag.get('/api/config/roles'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    await record(
      agent,
      'Update Role',
      'PUT',
      `/api/config/roles/${roleId}`,
      ag => ag.put(`/api/config/roles/${roleId}`).send({ role_name: roleName, unit_price: 175000 })
    );

    await record(
      agent,
      'Delete Role',
      'DELETE',
      `/api/config/roles/${roleId}`,
      ag => ag.delete(`/api/config/roles/${roleId}`)
    );

    const createRiskRes = await record(
      agent,
      'Create Risk Item',
      'POST',
      '/api/config/risk-items',
      ag => ag.post('/api/config/risk-items').send({
        category: '交付风险',
        item_name: riskName,
        options_json: JSON.stringify([
          { label: '低', score: 5 },
          { label: '高', score: 15 },
        ]),
      }),
      res => `id=${res.body.id}`
    );
    riskItemId = createRiskRes.body.id;

    await record(
      agent,
      'List Risk Items',
      'GET',
      '/api/config/risk-items',
      ag => ag.get('/api/config/risk-items'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    await record(
      agent,
      'Update Risk Item',
      'PUT',
      `/api/config/risk-items/${riskItemId}`,
      ag => ag.put(`/api/config/risk-items/${riskItemId}`).send({
        category: '交付风险',
        item_name: `${riskName}-updated`,
        options_json: JSON.stringify([
          { label: '低', score: 5 },
          { label: '中', score: 10 },
          { label: '高', score: 20 },
        ]),
      })
    );

    await record(
      agent,
      'Delete Risk Item',
      'DELETE',
      `/api/config/risk-items/${riskItemId}`,
      ag => ag.delete(`/api/config/risk-items/${riskItemId}`)
    );

    const createTravelRes = await record(
      agent,
      'Create Travel Cost',
      'POST',
      '/api/config/travel-costs',
      ag => ag.post('/api/config/travel-costs').send({
        item_name: travelItem,
        cost_per_month: 6800,
      }),
      res => `id=${res.body.id}`
    );
    travelCostId = createTravelRes.body.id;

    await record(
      agent,
      'List Travel Costs',
      'GET',
      '/api/config/travel-costs',
      ag => ag.get('/api/config/travel-costs'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    await record(
      agent,
      'Update Travel Cost',
      'PUT',
      `/api/config/travel-costs/${travelCostId}`,
      ag => ag.put(`/api/config/travel-costs/${travelCostId}`).send({
        item_name: `${travelItem}-updated`,
        cost_per_month: 7200,
      })
    );

    await record(
      agent,
      'Delete Travel Cost',
      'DELETE',
      `/api/config/travel-costs/${travelCostId}`,
      ag => ag.delete(`/api/config/travel-costs/${travelCostId}`)
    );

    await record(
      agent,
      'Get Config Aggregate',
      'GET',
      '/api/config/all',
      ag => ag.get('/api/config/all'),
      res => {
        const roles = res.body?.data?.roles?.length || 0;
        const risks = res.body?.data?.risk_items?.length || 0;
        const travels = res.body?.data?.travel_costs?.length || 0;
        return `roles=${roles}, risks=${risks}, travel=${travels}`;
      }
    );

    await record(
      agent,
      'List AI Models (initial)',
      'GET',
      '/api/config/ai-models',
      ag => ag.get('/api/config/ai-models'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    const createModelRes1 = await record(
      agent,
      'Create AI Model A',
      'POST',
      '/api/config/ai-models',
      ag => ag.post('/api/config/ai-models').send({
        config_name: aiModelName1,
        description: 'Smoke test model A',
        provider: 'custom',
        api_key: 'dummy-key',
        api_host: 'https://example.com',
        model_name: 'test-model-a',
        temperature: 0.6,
        max_tokens: 512,
        timeout: 10,
        is_current: 0,
        is_active: 1,
      }),
      res => `id=${res.body?.data?.id || res.body?.data?.ID || res.body?.data?.id}`
    );
    aiModelId1 = createModelRes1.body?.data?.id;

    const createModelRes2 = await record(
      agent,
      'Create AI Model B',
      'POST',
      '/api/config/ai-models',
      ag => ag.post('/api/config/ai-models').send({
        config_name: aiModelName2,
        description: 'Smoke test model B',
        provider: 'custom',
        api_key: 'dummy-key',
        api_host: 'https://example.com',
        model_name: 'test-model-b',
        temperature: 0.7,
        max_tokens: 512,
        timeout: 10,
        is_current: 0,
        is_active: 1,
      }),
      res => `id=${res.body?.data?.id}`
    );
    aiModelId2 = createModelRes2.body?.data?.id;

    await record(
      agent,
      'Set Model A Current',
      'POST',
      `/api/config/ai-models/${aiModelId1}/set-current`,
      ag => ag.post(`/api/config/ai-models/${aiModelId1}/set-current`)
    );

    await record(
      agent,
      'Get Current Model',
      'GET',
      '/api/config/ai-models/current',
      ag => ag.get('/api/config/ai-models/current'),
      res => `current=${res.body?.data?.config_name}`
    );

    await record(
      agent,
      'Get Model A Detail',
      'GET',
      `/api/config/ai-models/${aiModelId1}`,
      ag => ag.get(`/api/config/ai-models/${aiModelId1}`),
      res => `name=${res.body?.data?.config_name}`
    );

    await record(
      agent,
      'Update Model A',
      'PUT',
      `/api/config/ai-models/${aiModelId1}`,
      ag => ag.put(`/api/config/ai-models/${aiModelId1}`).send({
        config_name: `${aiModelName1}-updated`,
        description: 'Smoke test model A updated',
        provider: 'custom',
        api_key: 'dummy-key',
        api_host: 'https://example.com',
        model_name: 'test-model-a',
        temperature: 0.65,
        max_tokens: 512,
        timeout: 12,
        is_current: 1,
        is_active: 1,
      })
    );

    await record(
      agent,
      'Test Model A Connection',
      'POST',
      `/api/config/ai-models/${aiModelId1}/test`,
      ag => ag.post(`/api/config/ai-models/${aiModelId1}/test`)
    );

    await record(
      agent,
      'Test Model Temp Connection',
      'POST',
      '/api/config/ai-models/test-temp',
      ag => ag.post('/api/config/ai-models/test-temp').send({
        provider: 'custom',
        api_key: 'dummy-key',
        api_host: 'https://example.com',
        model_name: 'temp-model',
        timeout: 10,
      })
    );

    await record(
      agent,
      'Set Model B Current',
      'POST',
      `/api/config/ai-models/${aiModelId2}/set-current`,
      ag => ag.post(`/api/config/ai-models/${aiModelId2}/set-current`)
    );

    await record(
      agent,
      'Unset Model B Current',
      'PUT',
      `/api/config/ai-models/${aiModelId2}`,
      ag => ag.put(`/api/config/ai-models/${aiModelId2}`).send({
        config_name: aiModelName2,
        description: 'Smoke test model B updated',
        provider: 'custom',
        api_key: 'dummy-key',
        api_host: 'https://example.com',
        model_name: 'test-model-b',
        temperature: 0.7,
        max_tokens: 512,
        timeout: 10,
        is_current: 0,
        is_active: 1,
      })
    );

    await record(
      agent,
      'Delete Model A',
      'DELETE',
      `/api/config/ai-models/${aiModelId1}`,
      ag => ag.delete(`/api/config/ai-models/${aiModelId1}`)
    );

    await record(
      agent,
      'Delete Model B',
      'DELETE',
      `/api/config/ai-models/${aiModelId2}`,
      ag => ag.delete(`/api/config/ai-models/${aiModelId2}`)
    );

    await record(
      agent,
      'List Prompt Templates',
      'GET',
      '/api/config/prompts',
      ag => ag.get('/api/config/prompts'),
      res => `total=${res.body?.total ?? 0}`
    );

    const createPromptRes = await record(
      agent,
      'Create Prompt Template',
      'POST',
      '/api/config/prompts',
      ag => ag.post('/api/config/prompts').send({
        template_name: promptName,
        category: 'test',
        description: 'Smoke prompt template',
        system_prompt: 'You are a helpful assistant.',
        user_prompt_template: 'Hello {{name}}',
        variables_json: JSON.stringify([{ key: 'name', label: 'Name' }]),
      }),
      res => `id=${res.body?.id}`
    );
    promptId = createPromptRes.body?.id;

    await record(
      agent,
      'Get Prompt By Id',
      'GET',
      `/api/config/prompts/${promptId}`,
      ag => ag.get(`/api/config/prompts/${promptId}`),
      res => `name=${res.body?.template_name}`
    );

    await record(
      agent,
      'Update Prompt Template',
      'PUT',
      `/api/config/prompts/${promptId}`,
      ag => ag.put(`/api/config/prompts/${promptId}`).send({
        template_name: `${promptName}-updated`,
        category: 'test',
        description: 'Smoke prompt template updated',
        system_prompt: 'You are an updated assistant.',
        user_prompt_template: 'Hi {{name}}',
        variables_json: JSON.stringify([{ key: 'name', label: 'Name' }]),
        is_active: 1,
      })
    );

    const copyPromptRes = await record(
      agent,
      'Copy Prompt Template',
      'POST',
      `/api/config/prompts/${promptId}/copy`,
      ag => ag.post(`/api/config/prompts/${promptId}/copy`),
      res => `copyId=${res.body?.id}`
    );
    promptCopyId = copyPromptRes.body?.id;

    await record(
      agent,
      'Delete Prompt Copy',
      'DELETE',
      `/api/config/prompts/${promptCopyId}`,
      ag => ag.delete(`/api/config/prompts/${promptCopyId}`)
    );

    await record(
      agent,
      'Delete Prompt Template',
      'DELETE',
      `/api/config/prompts/${promptId}`,
      ag => ag.delete(`/api/config/prompts/${promptId}`)
    );

    const calcRes = await record(
      agent,
      'Run Calculation',
      'POST',
      '/api/calculate',
      ag => ag.post('/api/calculate').send(assessmentPayload)
    );

    const projectRes = await record(
      agent,
      'Create Project',
      'POST',
      '/api/projects',
      ag => ag.post('/api/projects').send({
        name: projectName,
        description: 'Smoke project',
        is_template: 0,
        assessmentData: assessmentPayload,
      }),
      res => `id=${res.body?.id}`
    );
    projectId = projectRes.body?.id;

    await record(
      agent,
      'Get Project Detail',
      'GET',
      `/api/projects/${projectId}`,
      ag => ag.get(`/api/projects/${projectId}`),
      res => `name=${res.body?.data?.name}`
    );

    await record(
      agent,
      'Update Project',
      'PUT',
      `/api/projects/${projectId}`,
      ag => ag.put(`/api/projects/${projectId}`).send({
        name: `${projectName}-updated`,
        description: 'Smoke project updated',
        is_template: 0,
        assessmentData: assessmentPayload,
      })
    );

    await record(
      agent,
      'List Projects',
      'GET',
      '/api/projects',
      ag => ag.get('/api/projects'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    const templateRes = await record(
      agent,
      'Create Template Project',
      'POST',
      '/api/projects',
      ag => ag.post('/api/projects').send({
        name: templateName,
        description: 'Smoke template project',
        is_template: 1,
        assessmentData: assessmentPayload,
      }),
      res => `id=${res.body?.id}`
    );
    templateId = templateRes.body?.id;

    await record(
      agent,
      'List Templates via /projects/templates',
      'GET',
      '/api/projects/templates',
      ag => ag.get('/api/projects/templates'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    await record(
      agent,
      'List Templates via query',
      'GET',
      '/api/projects?is_template=1',
      ag => ag.get('/api/projects').query({ is_template: 1 }),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    await record(
      agent,
      'List via /api/templates',
      'GET',
      '/api/templates',
      ag => ag.get('/api/templates'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    await record(
      agent,
      'List Templates via /api/templates/templates',
      'GET',
      '/api/templates/templates',
      ag => ag.get('/api/templates/templates'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    await record(
      agent,
      'Export Project PDF',
      'GET',
      `/api/projects/${projectId}/export/pdf`,
      ag => ag.get(`/api/projects/${projectId}/export/pdf`)
    );

    await record(
      agent,
      'Export Project Excel',
      'GET',
      `/api/projects/${projectId}/export/excel`,
      ag => ag.get(`/api/projects/${projectId}/export/excel`)
    );

    await record(
      agent,
      'Dashboard Summary',
      'GET',
      '/api/dashboard/summary',
      ag => ag.get('/api/dashboard/summary')
    );

    await record(
      agent,
      'Dashboard Risk Distribution',
      'GET',
      '/api/dashboard/risk-distribution',
      ag => ag.get('/api/dashboard/risk-distribution')
    );

    await record(
      agent,
      'Dashboard Cost Composition',
      'GET',
      '/api/dashboard/cost-composition',
      ag => ag.get('/api/dashboard/cost-composition')
    );

    await record(
      agent,
      'Dashboard Role Cost Distribution',
      'GET',
      '/api/dashboard/role-cost-distribution',
      ag => ag.get('/api/dashboard/role-cost-distribution')
    );

    await record(
      agent,
      'Dashboard Cost Trend',
      'GET',
      '/api/dashboard/cost-trend',
      ag => ag.get('/api/dashboard/cost-trend')
    );

    await record(
      agent,
      'Dashboard Risk-Cost Correlation',
      'GET',
      '/api/dashboard/risk-cost-correlation',
      ag => ag.get('/api/dashboard/risk-cost-correlation')
    );

    await record(
      agent,
      'Delete Project',
      'DELETE',
      `/api/projects/${projectId}`,
      ag => ag.delete(`/api/projects/${projectId}`)
    );

    await record(
      agent,
      'Delete Template Project',
      'DELETE',
      `/api/projects/${templateId}`,
      ag => ag.delete(`/api/projects/${templateId}`)
    );

    const outputPath = path.join(__dirname, '../../docs/test/api-test-results.json');
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf8');

    console.log(`\nSaved detailed results to ${outputPath}`);
    console.table(
      results.map(({ name, method, url, status, ok, duration }) => ({
        name,
        method,
        url,
        status,
        ok,
        duration,
      }))
    );
  } catch (error) {
    console.error('Smoke test run failed:', error);
    process.exitCode = 1;
  } finally {
    await dbUtil.close();
  }
})();
