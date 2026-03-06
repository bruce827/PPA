process.env.NODE_ENV = 'test';

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { app } = require('../index');
const db = require('../utils/db');

describe('Dashboard API - Integration Tests', () => {
  const TEST_DB_PATH = path.join(__dirname, '../ppa.test.db');

  beforeAll(async () => {
    // Initialize test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    await db.init(TEST_DB_PATH);

    // Create test schema
    await db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        project_type TEXT,
        final_total_cost REAL,
        final_risk_score INTEGER,
        final_workload_days REAL,
        assessment_details_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_template INTEGER DEFAULT 0
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS config_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_name TEXT NOT NULL UNIQUE,
        unit_price REAL NOT NULL
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS config_risk_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        item_name TEXT NOT NULL,
        options_json TEXT,
        is_active INTEGER DEFAULT 1
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS web3d_risk_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        step_order INTEGER,
        step_name TEXT,
        item_name TEXT,
        options_json TEXT,
        weight REAL
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS web3d_workload_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        item_name TEXT,
        base_days REAL,
        unit TEXT
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS ai_model_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_name TEXT,
        model_name TEXT,
        is_current INTEGER DEFAULT 0
      )
    `);

    // Insert test data - roles
    await db.run('INSERT INTO config_roles (role_name, unit_price) VALUES (?, ?)', ['项目经理', 2000]);
    await db.run('INSERT INTO config_roles (role_name, unit_price) VALUES (?, ?)', ['高级开发', 1500]);
    await db.run('INSERT INTO config_roles (role_name, unit_price) VALUES (?, ?)', ['测试工程师', 1200]);

    // Insert test data - minimal config tables for dashboard refactor
    await db.run(
      'INSERT INTO config_risk_items (category, item_name, options_json, is_active) VALUES (?, ?, ?, ?)',
      ['通用', '需求频繁变更', '[]', 1]
    );
    await db.run(
      'INSERT INTO web3d_risk_items (step_order, step_name, item_name, options_json, weight) VALUES (?, ?, ?, ?, ?)',
      [1, '基础', '模型质量风险', '[]', 1]
    );
    await db.run(
      'INSERT INTO web3d_workload_templates (category, item_name, base_days, unit) VALUES (?, ?, ?, ?)',
      ['data_processing', '数据清洗', 5, '天']
    );
    await db.run(
      'INSERT INTO ai_model_configs (config_name, model_name, is_current) VALUES (?, ?, ?)',
      ['default', 'gpt-4o-mini', 1]
    );

    const formatDateTime = (date) => {
      const pad = (n) => String(n).padStart(2, '0');
      const d = new Date(date);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
        d.getMinutes()
      )}:${pad(d.getSeconds())}`;
    };

    const daysAgo = (days) => formatDateTime(Date.now() - days * 24 * 60 * 60 * 1000);

    // Insert test data - projects with various scenarios
    const testProjects = [
      {
        name: 'Project Alpha',
        description: 'Test project 1',
        project_type: 'standard',
        final_total_cost: 100000,
        final_risk_score: 15,
        final_workload_days: 30,
        assessment_details_json: JSON.stringify({
          softwareDevelopmentCost: 50000,
          systemIntegrationCost: 20000,
          operationsCost: 15000,
          travelCost: 10000,
          riskCost: 5000,
          workload: {
            newFeatures: [
              {
                module: 'Core Module',
                roles: {
                  '项目经理': 5,
                  '高级开发': 10,
                  '测试工程师': 8,
                },
              },
            ],
            systemIntegration: [
              {
                module: 'API Integration',
                roles: {
                  '高级开发': 6,
                },
              },
            ],
          },
          risk_scores: {
            '需求频繁变更': 10,
          },
        }),
        created_at: daysAgo(90),
      },
      {
        name: 'Project Beta',
        description: 'Test project 2',
        project_type: null,
        final_total_cost: 150000,
        final_risk_score: 30,
        final_workload_days: 45,
        assessment_details_json: JSON.stringify({
          softwareDevelopmentCost: 80000,
          systemIntegrationCost: 30000,
          operationsCost: 20000,
          travelCost: 15000,
          riskCost: 5000,
          workload: {
            newFeatures: [
              {
                module: 'Advanced Features',
                roles: {
                  '项目经理': 8,
                  '高级开发': 15,
                  '测试工程师': 12,
                },
              },
            ],
          },
          risk_scores: {
            '需求频繁变更': 15,
          },
        }),
        created_at: daysAgo(60),
      },
      {
        name: 'Project Gamma',
        description: 'Test project 3',
        project_type: 'standard',
        final_total_cost: 80000,
        final_risk_score: 10,
        final_workload_days: 20,
        assessment_details_json: JSON.stringify({
          softwareDevelopmentCost: 40000,
          systemIntegrationCost: 15000,
          operationsCost: 12000,
          travelCost: 8000,
          riskCost: 5000,
          workload: {
            newFeatures: [
              {
                module: 'Basic Features',
                roles: {
                  '高级开发': 12,
                  '测试工程师': 6,
                },
              },
            ],
          },
        }),
        created_at: daysAgo(30),
      },
    ];

    for (const project of testProjects) {
      await db.run(
        'INSERT INTO projects (name, description, project_type, final_total_cost, final_risk_score, final_workload_days, assessment_details_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          project.name,
          project.description,
          project.project_type,
          project.final_total_cost,
          project.final_risk_score,
          project.final_workload_days,
          project.assessment_details_json,
          project.created_at,
          project.created_at,
        ]
      );
    }
  });

  afterAll(async () => {
    await db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  // ------------------------------
  // [Dashboard Refactor] New Dashboard (新接口) - Smoke Tests
  // ------------------------------

  describe('GET /api/dashboard/overview', () => {
    it('should return overview payload with required fields', async () => {
      const response = await request(app).get('/api/dashboard/overview');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('recent_30d');
      expect(response.body.data).toHaveProperty('saas_count');
      expect(response.body.data).toHaveProperty('web3d_count');
      expect(response.body.data).toHaveProperty('contracts_count');
      expect(response.body.data).toHaveProperty('knowledge_assets');
      expect(response.body.data).toHaveProperty('ai_models');
    });
  });

  describe('GET /api/dashboard/trend', () => {
    it('should return trend array', async () => {
      const response = await request(app).get('/api/dashboard/trend');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/dashboard/cost-range', () => {
    it('should return fixed cost range buckets', async () => {
      const response = await request(app).get('/api/dashboard/cost-range');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(4);
      response.body.data.forEach((item) => {
        expect(item).toHaveProperty('range');
        expect(item).toHaveProperty('count');
      });
    });
  });

  describe('GET /api/dashboard/keywords', () => {
    it('should return keyword list', async () => {
      const response = await request(app).get('/api/dashboard/keywords');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.slice(0, 5).forEach((item) => {
        expect(item).toHaveProperty('word');
        expect(item).toHaveProperty('weight');
      });
    });
  });

  describe('GET /api/dashboard/dna', () => {
    it('should return dna payload with required fields', async () => {
      const response = await request(app).get('/api/dashboard/dna');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('avg_total_cost_wan');
      expect(response.body.data).toHaveProperty('avg_risk_score');
      expect(response.body.data).toHaveProperty('avg_workload_days');
      expect(response.body.data).toHaveProperty('avg_tech_factor');
      expect(response.body.data).toHaveProperty('avg_delivery_factor');
    });
  });

  describe('GET /api/dashboard/top-roles', () => {
    it('should return top roles array', async () => {
      const response = await request(app).get('/api/dashboard/top-roles');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/dashboard/top-risks', () => {
    it('should return top risks array', async () => {
      const response = await request(app).get('/api/dashboard/top-risks');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 with error message when database fails', async () => {
      // Close the database to simulate failure
      await db.close();

      const response = await request(app).get('/api/dashboard/overview');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');

      // Reconnect for other tests
      await db.init(TEST_DB_PATH);
    });
  });

  describe('Response Time Performance (AC7)', () => {
    it('all endpoints should respond within 1000ms', async () => {
      const endpoints = [
        '/api/dashboard/overview',
        '/api/dashboard/trend',
        '/api/dashboard/cost-range',
        '/api/dashboard/keywords',
        '/api/dashboard/dna',
        '/api/dashboard/top-roles',
        '/api/dashboard/top-risks',
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        const response = await request(app).get(endpoint);
        const duration = Date.now() - startTime;

        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(1000);
      }
    });
  });
});
