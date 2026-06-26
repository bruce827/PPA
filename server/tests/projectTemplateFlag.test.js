process.env.NODE_ENV = 'test';

jest.mock('../utils/db', () => ({
  all: jest.fn(async () => [
    { name: 'tags_json' },
    { name: 'business_quote_json' },
  ]),
  getConnectionId: jest.fn(() => 1),
  run: jest.fn(async () => ({ id: 1 })),
}));

const db = require('../utils/db');
const projectModel = require('../models/projectModel');
const web3dProjectModel = require('../models/web3dProjectModel');

describe('project template flag persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('standard project create normalizes boolean is_template to integer', async () => {
    await projectModel.createProject({
      name: 'template',
      description: 'desc',
      is_template: true,
      final_total_cost: 1,
      final_risk_score: 2,
      final_workload_days: 3,
      assessment_details_json: '{}',
    });

    const insertCall = db.run.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO projects')
    );

    expect(insertCall?.[1]?.[2]).toBe(1);
  });

  test('standard project update normalizes boolean is_template to integer', async () => {
    await projectModel.updateProjectFields(7, { is_template: true });

    const updateCall = db.run.mock.calls.find(([sql]) =>
      String(sql).includes('UPDATE projects')
    );

    expect(updateCall?.[1]?.[0]).toBe(1);
  });

  test('web3d project create normalizes boolean is_template to integer', async () => {
    await web3dProjectModel.createProject({
      name: 'web3d template',
      description: 'desc',
      is_template: true,
      final_total_cost: 1,
      final_risk_score: 2,
      final_workload_days: 3,
      assessment_details_json: '{}',
    });

    const insertCall = db.run.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO projects')
    );

    expect(insertCall?.[1]?.[2]).toBe(1);
  });
});
