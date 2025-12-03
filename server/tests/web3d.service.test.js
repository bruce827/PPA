const fs = require('fs');
const path = require('path');

const db = require('../utils/db');
const web3dProjectService = require('../services/web3dProjectService');

const TEST_DB = path.join(__dirname, '..', 'ppa.test.db');

const createTables = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      is_template BOOLEAN NOT NULL DEFAULT 0,
      project_type TEXT DEFAULT 'standard',
      final_total_cost REAL,
      final_risk_score INTEGER,
      final_workload_days REAL,
      assessment_details_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);`,
    `CREATE INDEX IF NOT EXISTS idx_projects_type_created_at ON projects(project_type, created_at);`,
    `CREATE TABLE IF NOT EXISTS config_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT NOT NULL UNIQUE,
      unit_price REAL NOT NULL,
      is_active BOOLEAN DEFAULT 1
    );`,
    `CREATE TABLE IF NOT EXISTS web3d_risk_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      step_order INTEGER NOT NULL,
      step_name TEXT NOT NULL,
      item_name TEXT NOT NULL UNIQUE,
      description TEXT,
      weight REAL DEFAULT 1.0,
      options_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS web3d_workload_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      item_name TEXT NOT NULL,
      description TEXT,
      base_days REAL NOT NULL,
      unit TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  for (const sql of statements) {
    await db.run(sql);
  }
};

const seedData = async () => {
  const riskItems = [
    {
      step_order: 1,
      step_name: '项目背景与技术选型',
      item_name: '技术路线',
      weight: 2.0,
      options_json: JSON.stringify([
        { label: 'Three.js（推荐）', value: 1 },
        { label: 'Cesium', value: 3 }
      ])
    },
    {
      step_order: 2,
      step_name: '数据资产现状',
      item_name: '数据质量',
      weight: 2.5,
      options_json: JSON.stringify([
        { label: '已做过轻量化', value: 1 },
        { label: '原始设计稿 (未处理)', value: 5 }
      ])
    }
  ];

  const workloadTemplates = [
    { category: 'data_processing', item_name: 'BIM 清洗与轻量化', base_days: 4.0, unit: '栋' },
    { category: 'data_processing', item_name: '贴图与材质修复', base_days: 1.5, unit: '栋' },
    { category: 'core_dev', item_name: '场景搭建与基础交互', base_days: 3.0, unit: '套' },
    { category: 'core_dev', item_name: 'UI 联调', base_days: 2.0, unit: '套' },
    { category: 'core_dev', item_name: 'Shader/特效', base_days: 2.0, unit: '个' },
    { category: 'business_logic', item_name: '点击弹窗', base_days: 1.0, unit: '套' },
    { category: 'business_logic', item_name: '数据联动与图表', base_days: 4.0, unit: '套' }
  ];

  await db.run('DELETE FROM web3d_risk_items');
  for (const item of riskItems) {
    await db.run(
      `INSERT INTO web3d_risk_items (step_order, step_name, item_name, description, weight, options_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        item.step_order,
        item.step_name,
        item.item_name,
        item.description || '',
        item.weight,
        item.options_json
      ]
    );
  }

  await db.run('DELETE FROM web3d_workload_templates');
  for (const tpl of workloadTemplates) {
    await db.run(
      `INSERT INTO web3d_workload_templates (category, item_name, description, base_days, unit)
       VALUES (?, ?, ?, ?, ?)`,
      [tpl.category, tpl.item_name, tpl.description || '', tpl.base_days, tpl.unit]
    );
  }

  await db.run('DELETE FROM config_roles');
  await db.run(
    `INSERT INTO config_roles (role_name, unit_price, is_active) VALUES ('前端开发', 1400, 1)`
  );
};

const sampleAssessment = {
  risk_selections: [
    { item_name: '技术路线', selected_value: 3 },
    { item_name: '数据质量', selected_value: 5 }
  ],
  workload_items: [
    { category: 'data_processing', item_name: 'BIM 清洗与轻量化', quantity: 1, role_name: '前端开发' },
    { category: 'data_processing', item_name: '贴图与材质修复', quantity: 1, role_name: '前端开发' },
    { category: 'core_dev', item_name: '场景搭建与基础交互', quantity: 1, role_name: '前端开发' },
    { category: 'core_dev', item_name: 'UI 联调', quantity: 1, role_name: '前端开发' },
    { category: 'core_dev', item_name: 'Shader/特效', quantity: 1, role_name: '前端开发' },
    { category: 'business_logic', item_name: '点击弹窗', quantity: 1, role_name: '前端开发' },
    { category: 'business_logic', item_name: '数据联动与图表', quantity: 1, role_name: '前端开发' }
  ],
  mix_tech: false
};

beforeAll(async () => {
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
  await db.init(TEST_DB);
  await createTables();
  await seedData();
});

afterAll(async () => {
  await db.close();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
});

describe('Web3D project service', () => {
  test('calculate returns workload and cost with risk factor applied', async () => {
    const result = await web3dProjectService.calculate(sampleAssessment);
    expect(result.risk_factor).toBeCloseTo(1.5, 2);
    expect(result.workload.total_days).toBeCloseTo(26.25, 2); // 17.5 base days * 1.5
    expect(result.cost.base_cost_wan).toBeCloseTo(2.45, 2); // 17.5 * 1400 / 10000
    expect(result.cost.total_cost_wan).toBeCloseTo(3.68, 2); // base_cost * risk_factor
  });

  test('create project persists web3d type and calculation results', async () => {
    const created = await web3dProjectService.createProject({
      name: 'Web3D API Demo (test)',
      description: 'auto test',
      assessment: sampleAssessment
    });
    expect(created).toHaveProperty('id');

    const project = await web3dProjectService.getProjectById(created.id);
    expect(project.project_type).toBe('web3d');
    expect(Number(project.final_total_cost)).toBeGreaterThan(0);
    expect(Number(project.final_workload_days)).toBeGreaterThan(0);
  });
});
