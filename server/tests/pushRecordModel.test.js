process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');

const db = require('../utils/db');
const pushRecordModel = require('../models/pushRecordModel');

describe('pushRecordModel', () => {
  const TEST_DB_PATH = path.join(
    os.tmpdir(),
    `ppa.push-record.${process.pid}.${Date.now()}.db`
  );

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    await db.init(TEST_DB_PATH);
    await db.run(`
      CREATE TABLE IF NOT EXISTS project_push_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        project_name TEXT NOT NULL,
        project_description TEXT,
        our_quote REAL,
        customer_budget REAL,
        budget_difference REAL,
        cost_breakdown_json TEXT,
        risk_total_score REAL,
        risk_level TEXT,
        total_workload_days REAL,
        new_dev_workload_days REAL,
        travel_cost_total REAL,
        top3_risk_scores TEXT,
        attachment_file_ids TEXT,
        push_time TEXT NOT NULL,
        push_status TEXT NOT NULL DEFAULT 'success',
        push_error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  afterAll(async () => {
    await db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(async () => {
    await db.run('DELETE FROM project_push_records');
  });

  test('getProjectPushHistory should return persisted top3RiskScores', async () => {
    await pushRecordModel.createPushRecord({
      projectId: 101,
      projectName: '测试项目',
      projectDescription: 'desc',
      ourQuote: 88.8,
      customerBudget: 80,
      budgetDifference: 8.8,
      costBreakdownJson: '{}',
      riskTotalScore: 75,
      riskLevel: '高风险',
      totalWorkloadDays: 25,
      newDevWorkloadDays: 20,
      travelCostTotal: 2,
      top3RiskScores: [
        { name: '技术风险', score: 90 },
        { name: '需求风险', score: 80 },
      ],
      attachmentFileIds: [
        { fileID: 'cloud://file-1', originalname: 'proposal.pdf' },
      ],
      pushTime: '2026-04-17T10:00:00.000Z',
      pushStatus: 'success',
      pushError: null,
    });

    const history = await pushRecordModel.getProjectPushHistory(101);

    expect(history).toHaveLength(1);
    expect(history[0].top3RiskScores).toEqual([
      { name: '技术风险', score: 90 },
      { name: '需求风险', score: 80 },
    ]);
    expect(history[0].attachmentFileIds).toEqual([
      { fileID: 'cloud://file-1', originalname: 'proposal.pdf' },
    ]);
  });
});
