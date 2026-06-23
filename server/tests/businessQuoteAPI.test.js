process.env.NODE_ENV = 'test';
process.env.EXPORT_LOG_ENABLED = 'false';

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const ExcelJS = require('exceljs');

const { app } = require('../index');
const db = require('../utils/db');

const binaryParser = (res, callback) => {
  const data = [];
  res.on('data', (chunk) => data.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(data)));
};

describe('Business Quote API - Integration Tests', () => {
  const TEST_DB_PATH = path.join(
    os.tmpdir(),
    `ppa.business-quote.${process.pid}.${Date.now()}.db`
  );

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    await db.init(TEST_DB_PATH);

    await db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        is_template BOOLEAN NOT NULL DEFAULT 0,
        project_type TEXT DEFAULT 'standard',
        final_total_cost REAL,
        final_risk_score INTEGER,
        final_workload_days REAL,
        assessment_details_json TEXT,
        tags_json TEXT,
        business_quote_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS config_risk_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        item_name TEXT NOT NULL,
        options_json TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1
      );
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS config_travel_costs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT NOT NULL UNIQUE,
        cost_per_month REAL NOT NULL,
        is_active BOOLEAN DEFAULT 1
      );
    `);

    const assessmentDetails = {
      risk_scores: {},
      ai_unmatched_risks: [],
      custom_risk_items: [],
      development_workload: [
        {
          id: 'dev-1',
          module1: '一级模块',
          module2: '二级模块',
          module3: '核心功能',
          delivery_factor: 1,
          开发工程师: 10,
        },
      ],
      integration_workload: [],
      travel_months: 0,
      travel_headcount: 0,
      maintenance_months: 0,
      maintenance_headcount: 0,
      maintenance_daily_cost: 1600,
      risk_cost_items: [],
      roles: [
        {
          id: 1,
          role_name: '开发工程师',
          unit_price: 1000,
        },
      ],
    };

    await db.run(
      `INSERT INTO projects
       (name, description, is_template, project_type, final_total_cost, final_risk_score, final_workload_days, assessment_details_json)
       VALUES (?, ?, 0, 'standard', ?, ?, ?, ?)`,
      [
        '商务报价测试项目',
        '用于测试商务报价接口与导出',
        1,
        0,
        10,
        JSON.stringify(assessmentDetails),
      ]
    );

    await db.run(
      `INSERT INTO projects
       (name, description, is_template, project_type, final_total_cost, final_risk_score, final_workload_days, assessment_details_json)
       VALUES (?, ?, 0, 'standard', ?, ?, ?, ?)`,
      [
        '未报价项目',
        '用于测试商务报价状态筛选',
        2,
        0,
        8,
        JSON.stringify(assessmentDetails),
      ]
    );
  });

  afterAll(async () => {
    await db.close();
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch (_error) {}
  });

  test('should get business quote context with default rates', async () => {
    const res = await request(app).get('/api/projects/1/business-quote');

    expect(res.status).toBe(200);
    expect(res.body?.data?.project_id).toBe(1);
    expect(res.body?.data?.base_cost_wan).toBeCloseTo(1, 2);
    expect(res.body?.data?.default_pricing_mode).toBe('custom_development');
    expect(res.body?.data?.default_rates).toEqual({
      tax_rate: 6,
      management_rate: 12,
      sales_rate: 12,
      profit_rate: 15,
    });
    expect(res.body?.data?.default_rates_by_mode).toEqual({
      custom_development: {
        tax_rate: 6,
        management_rate: 12,
        sales_rate: 12,
        profit_rate: 15,
      },
      enterprise_product: {
        rd_rate: 35,
        cac_rate: 40,
        cogs_rate: 15,
        csm_rate: 10,
      },
    });
    expect(res.body?.data?.business_quote).toBeNull();
  });

  test('should save business quote snapshot for project', async () => {
    const payload = {
      pricing_mode: 'custom_development',
      tax_rate: 6,
      management_rate: 10,
      sales_rate: 10,
      profit_rate: 12,
      remark: 'quote-note',
    };

    const res = await request(app)
      .post('/api/projects/1/business-quote')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body?.data?.project_id).toBe(1);
    expect(res.body?.data?.pricing_mode).toBe('custom_development');
    expect(res.body?.data?.base_cost_wan).toBeCloseTo(1, 2);
    expect(res.body?.data?.rates).toEqual({
      tax_rate: 6,
      management_rate: 10,
      sales_rate: 10,
      profit_rate: 12,
    });
    expect(res.body?.data?.amounts?.quote_total_wan).toBeCloseTo(1.4, 2);
    expect(res.body?.data?.remark).toBe('quote-note');

    const project = await db.get('SELECT business_quote_json FROM projects WHERE id = 1');
    expect(project?.business_quote_json).toBeTruthy();
  });

  test('should save enterprise product business quote snapshot for project', async () => {
    const payload = {
      pricing_mode: 'enterprise_product',
      rd_rate: 35,
      cac_rate: 40,
      cogs_rate: 15,
      csm_rate: 10,
      remark: 'enterprise-quote',
    };

    const res = await request(app)
      .post('/api/projects/2/business-quote')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body?.data?.project_id).toBe(2);
    expect(res.body?.data?.pricing_mode).toBe('enterprise_product');
    expect(res.body?.data?.rates).toEqual({
      rd_rate: 35,
      cac_rate: 40,
      cogs_rate: 15,
      csm_rate: 10,
    });
    expect(res.body?.data?.amounts?.rd_cost_wan).toBeCloseTo(1.4, 2);
    expect(res.body?.data?.amounts?.cogs_cost_wan).toBeCloseTo(0.6, 2);
    expect(res.body?.data?.amounts?.csm_cost_wan).toBeCloseTo(0.4, 2);
    expect(res.body?.data?.amounts?.variable_cost_share_rate).toBeCloseTo(25, 2);
    expect(res.body?.data?.amounts?.quote_total_wan).toBeCloseTo(4, 2);
    expect(res.body?.data?.remark).toBe('enterprise-quote');
  });

  test('should export business excel after quote is saved', async () => {
    const res = await request(app)
      .get('/api/projects/1/export/excel?version=business')
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.headers['content-disposition']).toContain('business');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);
    const overviewSheet = workbook.getWorksheet('商务报价概览');
    expect(overviewSheet.getCell('A4').value).toBe('报价模式');
    expect(overviewSheet.getCell('B4').value).toBe('B端定制项目');
  });

  test('should export enterprise product business excel with baseline module sheet', async () => {
    const res = await request(app)
      .get('/api/projects/2/export/excel?version=business')
      .buffer(true)
      .parse(binaryParser);

    expect(res.status).toBe(200);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body);

    const overviewSheet = workbook.getWorksheet('商务报价概览');
    expect(overviewSheet.getCell('A4').value).toBe('报价模式');
    expect(overviewSheet.getCell('B4').value).toBe('企业级产品');
    expect(overviewSheet.getCell('A5').value).toBe('单客户实施基线（万元）');
    expect(overviewSheet.getCell('A15').value).toBe('可变成本占比（COGS+CSM）（%）');

    const moduleSheet = workbook.getWorksheet('模块实施基线明细');
    expect(moduleSheet.getCell('F1').value).toBe('实施基线（万元）');
  });

  test('should filter project list by business quote status', async () => {
    const quoted = await request(app).get('/api/projects?has_business_quote=1');
    const unquoted = await request(app).get('/api/projects?has_business_quote=0');

    expect(quoted.status).toBe(200);
    expect(quoted.body?.data).toHaveLength(2);
    expect(quoted.body?.data?.[0]?.has_business_quote).toBe(1);
    expect(quoted.body?.data?.[1]?.has_business_quote).toBe(1);
    expect(quoted.body?.data?.map((item) => item.id).sort((a, b) => a - b)).toEqual([
      1, 2,
    ]);
    expect(quoted.body?.data?.[0]?.business_quote_json).toBeTruthy();

    expect(unquoted.status).toBe(200);
    expect(unquoted.body?.data).toHaveLength(0);
  });

  test('should reject enterprise product quote when rate total is not 100%', async () => {
    const res = await request(app)
      .post('/api/projects/2/business-quote')
      .send({
        pricing_mode: 'enterprise_product',
        rd_rate: 35,
        cac_rate: 35,
        cogs_rate: 15,
        csm_rate: 10,
      });

    expect(res.status).toBe(400);
    expect(res.body?.message).toContain('企业级产品成本结构合计必须为 100%');
  });
});
