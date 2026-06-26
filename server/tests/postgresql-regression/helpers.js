process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'postgres';
process.env.AI_LOG_ENABLED = process.env.AI_LOG_ENABLED || 'false';
process.env.EXPORT_LOG_ENABLED = process.env.EXPORT_LOG_ENABLED || 'false';
process.env.PG_POOL_MAX = process.env.PG_POOL_MAX || '1';
process.env.PG_CONNECT_TIMEOUT = process.env.PG_CONNECT_TIMEOUT || '30000';

const fs = require('fs');
const path = require('path');
const request = require('supertest');

const { app } = require('../../index');
const db = require('../../utils/db');

if (typeof jest !== 'undefined') {
  jest.setTimeout(Number(process.env.PPA_REGRESSION_TEST_TIMEOUT_MS || 180000));
}

const createdIds = new Map();
const performanceRecords = [];

function getPerformanceRunId() {
  return process.env.PPA_REGRESSION_RUN_ID || 'local';
}

function getPerformanceDir() {
  return path.resolve(
    __dirname,
    '../../../_bmad-output/test-artifacts/postgresql-regression-performance',
    getPerformanceRunId(),
  );
}

function normalizeRoute(routePath) {
  return String(routePath)
    .split('?')[0]
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/[0-9a-f]{24,}(?=\/|$)/gi, '/:hash');
}

function getTestContext() {
  if (typeof expect === 'undefined' || typeof expect.getState !== 'function') {
    return {};
  }
  const state = expect.getState();
  return {
    testFile: state.testPath ? path.basename(state.testPath) : undefined,
    testName: state.currentTestName,
  };
}

function recordRequestPerformance({ method, routePath, startedAt, res, error }) {
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
  const context = getTestContext();
  performanceRecords.push({
    method: method.toUpperCase(),
    path: String(routePath),
    normalizedPath: normalizeRoute(routePath),
    status: res?.status,
    ok: !error && (!res || res.status < 400),
    durationMs: Number(durationMs.toFixed(3)),
    testFile: context.testFile,
    testName: context.testName,
    error: error?.message,
    timestamp: new Date().toISOString(),
  });
}

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentileValue / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

function summarizePerformance(records) {
  const grouped = new Map();
  for (const record of records) {
    const key = `${record.method} ${record.normalizedPath}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        method: record.method,
        normalizedPath: record.normalizedPath,
        count: 0,
        statuses: new Set(),
        durations: [],
      });
    }
    const group = grouped.get(key);
    group.count += 1;
    if (record.status) group.statuses.add(record.status);
    group.durations.push(record.durationMs);
  }

  return [...grouped.values()]
    .map((group) => {
      const durations = [...group.durations].sort((a, b) => a - b);
      const total = durations.reduce((sum, value) => sum + value, 0);
      return {
        method: group.method,
        normalizedPath: group.normalizedPath,
        count: group.count,
        statuses: [...group.statuses].sort((a, b) => a - b),
        minMs: Number(durations[0].toFixed(3)),
        avgMs: Number((total / durations.length).toFixed(3)),
        p50Ms: Number(percentile(durations, 50).toFixed(3)),
        p95Ms: Number(percentile(durations, 95).toFixed(3)),
        maxMs: Number(durations[durations.length - 1].toFixed(3)),
      };
    })
    .sort((a, b) => b.maxMs - a.maxMs);
}

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    const cells = columns.map((column) => {
      const value = column.value(row);
      return String(value ?? '').replace(/\|/g, '\\|');
    });
    return `| ${cells.join(' | ')} |`;
  });
  return [header, separator, ...body].join('\n');
}

function writePerformanceReport() {
  if (performanceRecords.length === 0) return;

  const outputDir = getPerformanceDir();
  fs.mkdirSync(outputDir, { recursive: true });

  const context = getTestContext();
  const testFile = context.testFile || `worker-${process.env.JEST_WORKER_ID || process.pid}`;
  const rawFile = path.join(outputDir, `${testFile}-${process.pid}.json`);
  fs.writeFileSync(rawFile, `${JSON.stringify(performanceRecords, null, 2)}\n`);

  const rawRecords = fs
    .readdirSync(outputDir)
    .filter((fileName) => fileName.endsWith('.json') && fileName !== 'summary.json')
    .flatMap((fileName) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(outputDir, fileName), 'utf8'));
      } catch (error) {
        return [];
      }
    });

  const summary = summarizePerformance(rawRecords);
  const slowCalls = [...rawRecords].sort((a, b) => b.durationMs - a.durationMs).slice(0, 30);
  const report = {
    runId: getPerformanceRunId(),
    generatedAt: new Date().toISOString(),
    totalRequests: rawRecords.length,
    routes: summary,
    slowCalls,
  };

  fs.writeFileSync(path.join(outputDir, 'summary.json'), `${JSON.stringify(report, null, 2)}\n`);

  const summaryTable = markdownTable(summary, [
    { label: 'Method', value: (row) => row.method },
    { label: 'Route', value: (row) => row.normalizedPath },
    { label: 'Count', value: (row) => row.count },
    { label: 'Status', value: (row) => row.statuses.join(',') },
    { label: 'Avg ms', value: (row) => row.avgMs },
    { label: 'P95 ms', value: (row) => row.p95Ms },
    { label: 'Max ms', value: (row) => row.maxMs },
  ]);
  const slowTable = markdownTable(slowCalls, [
    { label: 'Method', value: (row) => row.method },
    { label: 'Path', value: (row) => row.path },
    { label: 'Status', value: (row) => row.status },
    { label: 'Duration ms', value: (row) => row.durationMs },
    { label: 'Test file', value: (row) => row.testFile },
    { label: 'Test', value: (row) => row.testName },
  ]);

  const markdown = [
    '# PostgreSQL Regression Performance Report',
    '',
    `- Run ID: \`${getPerformanceRunId()}\``,
    `- Generated at: ${report.generatedAt}`,
    `- Total requests: ${report.totalRequests}`,
    '',
    '## Route Summary',
    '',
    summaryTable,
    '',
    '## Slowest Calls',
    '',
    slowTable,
    '',
  ].join('\n');

  fs.writeFileSync(path.join(outputDir, 'summary.md'), markdown);
}

function instrumentTest(method, routePath, test) {
  let proxy;
  const wrapCompletion = (onFulfilled, onRejected) => {
    const startedAt = process.hrtime.bigint();
    return test.then(
      (res) => {
        recordRequestPerformance({ method, routePath, startedAt, res });
        return onFulfilled ? onFulfilled(res) : res;
      },
      (error) => {
        recordRequestPerformance({ method, routePath, startedAt, error });
        if (onRejected) return onRejected(error);
        throw error;
      },
    );
  };

  proxy = new Proxy(test, {
    get(target, property) {
      if (property === 'then') return wrapCompletion;
      if (property === 'catch') {
        return (onRejected) => wrapCompletion(undefined, onRejected);
      }
      if (property === 'end') {
        return (callback) => {
          const startedAt = process.hrtime.bigint();
          return target.end((error, res) => {
            recordRequestPerformance({ method, routePath, startedAt, res, error });
            if (callback) callback(error, res);
          });
        };
      }

      const value = target[property];
      if (typeof value !== 'function') return value;
      return (...args) => {
        const result = value.apply(target, args);
        return result === target ? proxy : result;
      };
    },
  });
  return proxy;
}

function requirePostgresEnv() {
  if (process.env.DB_TYPE !== 'postgres') {
    throw new Error('PostgreSQL regression tests require DB_TYPE=postgres');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('PostgreSQL regression tests require DATABASE_URL');
  }
}

async function initPostgresTestDb() {
  requirePostgresEnv();
  const maxAttempts = Number(process.env.PPA_REGRESSION_DB_INIT_ATTEMPTS || 3);
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await db.init();
      const row = await db.get('SELECT 1 AS ok');
      if (!row || Number(row.ok) !== 1) {
        throw new Error('PostgreSQL health query failed');
      }
      return;
    } catch (error) {
      lastError = error;
      await db.close().catch(() => {});
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }
  }

  throw lastError;
}

async function closePostgresTestDb() {
  writePerformanceReport();
  await db.close();
}

function agent() {
  const baseAgent = request(app);
  return new Proxy(baseAgent, {
    get(target, property) {
      const value = target[property];
      if (typeof value !== 'function') return value;
      return (routePath, ...args) => {
        const test = value.call(target, routePath, ...args);
        return instrumentTest(String(property), routePath, test);
      };
    },
  });
}

function uniquePrefix(scope) {
  const worker = process.env.JEST_WORKER_ID || '0';
  return `pgreg_${scope}_${worker}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function track(tableName, id) {
  if (!id) return id;
  if (!createdIds.has(tableName)) {
    createdIds.set(tableName, new Set());
  }
  createdIds.get(tableName).add(Number(id));
  return id;
}

async function cleanupTracked() {
  const cleanupOrder = [
    'data_metrics',
    'data_metric_categories',
    'data_metrics_project',
    'form_field',
    'form_definition',
    'form_app',
    'form_project',
    'web3d_assessments',
    'web3d_workload_templates',
    'web3d_risk_items',
    'project_push_records',
    'projects',
    'config_roles',
    'config_risk_items',
    'config_travel_costs',
    'prompt_module_tags',
    'prompt_templates',
    'ai_model_configs',
    'opportunity_bidding_sites',
  ];

  for (const tableName of cleanupOrder) {
    const ids = [...(createdIds.get(tableName) || [])].filter(Number.isFinite);
    if (ids.length === 0) continue;
    const placeholders = ids.map(() => '?').join(', ');
    try {
      await db.run(`DELETE FROM ${tableName} WHERE id IN (${placeholders})`, ids);
    } catch (error) {
      console.warn(`[postgres-regression] cleanup skipped for ${tableName}: ${error.message}`);
    }
  }
  createdIds.clear();
}

function expectOk(res, expectedStatuses = [200]) {
  expect(expectedStatuses).toContain(res.status);
  if (res.headers['content-type']?.includes('application/json')) {
    expect(res.body).toEqual(expect.any(Object));
  }
}

function extractId(res) {
  return res.body?.data?.id || res.body?.id || res.body?.lastID || res.body?.result?.id;
}

function standardAssessment(prefix) {
  return {
    risk_scores: {
      [`${prefix}_risk`]: 20,
    },
    ai_unmatched_risks: [],
    custom_risk_items: [{ description: `${prefix} custom risk`, score: 20 }],
    roles: [
      { role_name: `${prefix}_frontend`, unit_price: 1800 },
      { role_name: `${prefix}_backend`, unit_price: 2200 },
    ],
    development_workload: [
      {
        module_name: `${prefix} core`,
        delivery_factor: 1,
        scope_factor: 1,
        tech_factor: 1,
        [`${prefix}_frontend`]: 5,
        [`${prefix}_backend`]: 6,
      },
    ],
    integration_workload: [],
    travel_months: 0,
    travel_headcount: 0,
    maintenance_months: 1,
    maintenance_headcount: 1,
    maintenance_daily_cost: 1600,
    risk_cost_items: [{ description: `${prefix} reserved`, cost: 1 }],
  };
}

async function createStandardProject(prefix, overrides = {}) {
  const payload = {
    name: `${prefix}_project`,
    description: 'PostgreSQL regression project',
    is_template: 0,
    assessmentData: standardAssessment(prefix),
    ...overrides,
  };
  const res = await agent().post('/api/projects').send(payload);
  expectOk(res, [200, 201]);
  const id = track('projects', extractId(res));
  return { id, res, payload };
}

module.exports = {
  agent,
  cleanupTracked,
  closePostgresTestDb,
  createStandardProject,
  expectOk,
  extractId,
  initPostgresTestDb,
  writePerformanceReport,
  standardAssessment,
  track,
  uniquePrefix,
};
