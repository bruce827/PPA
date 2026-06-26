process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const { app } = require('../index');
const db = require('../utils/db');
const { initDatabase } = require('../init-db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');

describe('Calculation API - core regression', () => {
  let testContext;

  beforeAll(async () => {
    testContext = await initTestDatabase();
    await setupTransactionProtection();
  });

  afterAll(async () => {
    if (testContext) {
      await cleanupTestDatabase(testContext.dbPath, testContext.isPostgres);
    }
  });

  test('POST /api/calculate should return standard cost breakdown', async () => {
    const startedAt = Date.now();
    const res = await request(app)
      .post('/api/calculate')
      .send({
        risk_scores: { '需求不确定': 20 },
        ai_unmatched_risks: [],
        custom_risk_items: [{ description: '第三方接口依赖', score: 20 }],
        roles: [{ role_name: '前端工程师', unit_price: 1800 }],
        development_workload: [
          {
            module_name: '项目基础功能',
            delivery_factor: 1,
            scope_factor: 1,
            tech_factor: 1,
            前端工程师: 10,
          },
        ],
        integration_workload: [],
        travel_months: 0,
        travel_headcount: 0,
        maintenance_months: 0,
        maintenance_headcount: 0,
        maintenance_daily_cost: 1600,
        risk_cost_items: [{ description: '安全评审预留', cost: 1.2 }],
      });

    const durationMs = Date.now() - startedAt;

    expect(res.status).toBe(200);
    expect(res.body?.data).toMatchObject({
      software_dev_cost: expect.any(Number),
      total_cost: expect.any(Number),
      total_workload_days: expect.any(Number),
      risk_score: 40,
    });
    expect(res.body.data.software_dev_cost).toBeGreaterThan(0);
    expect(res.body.data.total_cost).toBeGreaterThan(0);
    expect(durationMs).toBeLessThan(500);
  });

  test('POST /api/calculate should reject invalid custom risk scores', async () => {
    const res = await request(app)
      .post('/api/calculate')
      .send({
        risk_scores: {},
        custom_risk_items: [{ description: '分值过低', score: 5 }],
        development_workload: [],
        integration_workload: [],
      });

    expect(res.status).toBe(400);
    expect(res.body?.message || res.body?.error).toContain('自定义风险项');
  });
});
