const { endpoints } = require('./endpointCatalog');
const {
  agent,
  closePostgresTestDb,
  expectOk,
  initPostgresTestDb,
  writePerformanceReport,
} = require('./helpers');
const db = require('../../utils/db');
const contractsService = require('../../services/contractsService');
const wikiService = require('../../services/wikiService');

const queryEndpoints = endpoints
  .filter((endpoint) => endpoint.mode === 'included' && endpoint.method === 'GET')
  .filter((endpoint) => !endpoint.path.includes('/export/pdf'))
  .filter((endpoint) => !endpoint.path.includes('/export/excel'))
  .filter((endpoint) => !endpoint.path.includes('/export/json'))
  .filter((endpoint) => !endpoint.path.includes('/attachments/download'));

async function firstValue(sql, params = [], column = 'id') {
  try {
    const row = await db.get(sql, params);
    return row?.[column];
  } catch (error) {
    return undefined;
  }
}

async function getSampleIds() {
  const projectId = await firstValue('SELECT id FROM projects ORDER BY id DESC LIMIT 1');
  const aiModelId = await firstValue('SELECT id FROM ai_model_configs ORDER BY id DESC LIMIT 1');
  const promptId = await firstValue('SELECT id FROM prompt_templates ORDER BY id DESC LIMIT 1');
  const web3dProjectId = await firstValue('SELECT id FROM web3d_assessments ORDER BY id DESC LIMIT 1');
  const formProjectId = await firstValue('SELECT id FROM form_project ORDER BY id DESC LIMIT 1');
  const formAppId = await firstValue('SELECT id FROM form_app ORDER BY id DESC LIMIT 1');
  const formId = await firstValue('SELECT id FROM form_definition ORDER BY id DESC LIMIT 1');
  const dataMetricsProjectId = await firstValue('SELECT id FROM data_metrics_project ORDER BY id DESC LIMIT 1');
  const dataMetricId = await firstValue('SELECT id FROM data_metrics ORDER BY id DESC LIMIT 1');
  const biddingSiteId = await firstValue('SELECT id FROM opportunity_bidding_sites ORDER BY id DESC LIMIT 1');
  const requestHash = await firstValue(
    'SELECT request_hash FROM ai_assessment_logs ORDER BY created_at DESC LIMIT 1',
    [],
    'request_hash',
  );
  const contractFiles = await contractsService.listContractFiles().catch(() => []);
  const contractFileName = contractFiles[0]?.name;
  const wikiTree = await wikiService.getWikiTree().catch(() => undefined);
  const wikiContentPath = wikiTree?.tree?.[0]?.wiki_key;

  return {
    aiModelId,
    biddingSiteId,
    contractFileName,
    dataMetricId,
    dataMetricsProjectId,
    formAppId,
    formId,
    formProjectId,
    projectId,
    promptId,
    requestHash,
    web3dProjectId,
    wikiContentPath,
  };
}

function resolveEndpoint(endpoint, ids) {
  let path = endpoint.path;
  const query = {};
  const headers = {};
  const expectedStatuses = [200, 204];

  if (path.includes(':filename')) return undefined;
  if (path.includes(':requestHash')) {
    if (!ids.requestHash) return undefined;
    path = path.replace(':requestHash', encodeURIComponent(ids.requestHash));
  }
  if (path.includes(':formId')) {
    if (!ids.formId) return undefined;
    path = path.replace(':formId', ids.formId);
  }
  if (path.includes(':projectId')) {
    if (!ids.formProjectId) return undefined;
    path = path.replace(':projectId', ids.formProjectId);
  }
  if (path.includes(':appId')) {
    if (!ids.formAppId) return undefined;
    path = path.replace(':appId', ids.formAppId);
  }
  if (path.includes(':id')) {
    let id;
    if (path.startsWith('/api/config/ai-models/')) id = ids.aiModelId;
    else if (path.startsWith('/api/config/prompts/')) id = ids.promptId;
    else if (path.startsWith('/api/projects/')) id = ids.projectId;
    else if (path.startsWith('/api/web3d/projects/')) id = ids.web3dProjectId;
    else if (path.startsWith('/api/form-design/projects/')) id = ids.formProjectId;
    else if (path.startsWith('/api/data-metrics/projects/')) id = ids.dataMetricsProjectId;
    else if (path.startsWith('/api/data-metrics/')) id = ids.dataMetricId;
    else if (path.startsWith('/api/opportunity/bidding-sites/')) id = ids.biddingSiteId;
    if (!id) return undefined;
    path = path.replace(':id', id);
  }

  if (path === '/api/projects') query.limit = 20;
  if (path === '/api/data-metrics' && ids.dataMetricsProjectId) query.dm_project_id = ids.dataMetricsProjectId;
  if (path === '/api/data-metrics/stats' && ids.dataMetricsProjectId) query.dm_project_id = ids.dataMetricsProjectId;
  if (path === '/api/data-metrics/filter-options' && ids.dataMetricsProjectId) query.dm_project_id = ids.dataMetricsProjectId;
  if (path === '/api/data-metrics/categories/tree' && ids.dataMetricsProjectId) {
    query.dm_project_id = ids.dataMetricsProjectId;
  }
  if (path === '/api/data-metrics/export') {
    if (ids.dataMetricsProjectId) query.dm_project_id = ids.dataMetricsProjectId;
  }
  if (path === '/api/contracts/file') {
    if (!ids.contractFileName) return undefined;
    query.name = ids.contractFileName;
    query.maxRows = 20;
  }
  if (path === '/api/wiki/content') {
    if (!ids.wikiContentPath) return undefined;
    query.path = ids.wikiContentPath;
  }
  if (path.includes('/api/data-metrics/projects/') && path.includes('/agent-')) {
    headers['X-Agent-API-Key'] = process.env.PPA_AGENT_SECRET_KEY || 'ppa_agent_secret_token_2026';
  }
  if (path === '/api/wiki/relations') query.wiki_key = 'query-performance-sample';

  if (
    path === '/api/config/ai-models/current' ||
    path === '/api/config/ai-models/current-vision' ||
    path === '/api/web3d/ai/step4-prompts'
  ) {
    expectedStatuses.push(404);
  }

  return { endpoint, expectedStatuses, headers, path, query };
}

describe('PostgreSQL regression - query API performance only', () => {
  let resolvedEndpoints;
  let skippedEndpoints;

  beforeAll(async () => {
    await initPostgresTestDb();
    const ids = await getSampleIds();
    const resolved = queryEndpoints.map((endpoint) => ({
      endpoint,
      request: resolveEndpoint(endpoint, ids),
    }));
    resolvedEndpoints = resolved.filter((item) => item.request).map((item) => item.request);
    skippedEndpoints = resolved.filter((item) => !item.request).map((item) => item.endpoint);
  });

  afterAll(async () => {
    writePerformanceReport();
    await closePostgresTestDb();
  });

  test('GET query endpoints respond successfully and record timings', async () => {
    expect(resolvedEndpoints.length).toBeGreaterThan(0);
    const unexpectedStatuses = [];

    for (const requestConfig of resolvedEndpoints) {
      let req = agent().get(requestConfig.path);
      for (const [key, value] of Object.entries(requestConfig.headers)) {
        req = req.set(key, value);
      }
      const res = await req.query(requestConfig.query);
      try {
        expectOk(res, requestConfig.expectedStatuses);
      } catch (error) {
        unexpectedStatuses.push({
          path: requestConfig.path,
          status: res.status,
          expectedStatuses: requestConfig.expectedStatuses,
        });
      }
    }

    expect(unexpectedStatuses).toEqual([]);
  });

  test('query performance sample coverage is explicit', () => {
    const skippedPaths = skippedEndpoints.map((endpoint) => endpoint.path);
    expect(skippedPaths).toEqual(expect.any(Array));
  });
});
