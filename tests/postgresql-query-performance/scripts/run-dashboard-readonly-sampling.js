#!/usr/bin/env node

const path = require('path');

process.env.NODE_ENV = 'test';

const repoRoot = path.resolve(__dirname, '../../..');
const serverRoot = path.join(repoRoot, 'server');
const requireFromServer = (moduleName) => require(require.resolve(moduleName, { paths: [serverRoot] }));
const requireServerFile = (relativePath) => require(path.join(serverRoot, relativePath));

requireServerFile('config/loadEnv')();

const request = requireFromServer('supertest');
const db = requireServerFile('utils/db');
const schemaWarmupService = requireServerFile('services/schemaWarmupService');
const { app } = requireServerFile('index');

const paths = [
  '/api/dashboard/keywords',
  '/api/dashboard/dna',
  '/api/dashboard/top-roles',
  '/api/dashboard/top-risks',
  '/api/dashboard/overview',
  '/api/dashboard/trend',
  '/api/dashboard/cost-range',
];

async function main() {
  await db.init();
  await schemaWarmupService.warmupSchemas();

  const startedAt = Date.now();
  const results = await Promise.all(paths.map(async (routePath) => {
    const routeStartedAt = Date.now();
    const response = await request(app).get(routePath);
    return {
      path: routePath,
      status: response.status,
      durationMs: Date.now() - routeStartedAt,
    };
  }));

  const totalMs = Date.now() - startedAt;
  console.log(`Dashboard read-only concurrent sampling total: ${totalMs}ms`);
  results.forEach((result) => {
    console.log(`${result.status} ${String(result.durationMs).padStart(5, ' ')}ms ${result.path}`);
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close().catch(() => {});
  });
