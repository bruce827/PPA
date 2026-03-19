process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');

const db = require('../utils/db');
const tenderStagingModel = require('../models/tenderStagingModel');
const tenderStagingService = require('../services/tenderStagingService');

describe('tenderStagingService', () => {
  const TEST_DB_PATH = path.join(
    os.tmpdir(),
    `ppa.tender.staging.${process.pid}.${Date.now()}.db`
  );

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    await db.init(TEST_DB_PATH);
    await tenderStagingModel.ensureSchema();

    await tenderStagingModel.createTenderStaging({
      source_item_id: 'A-001',
      title: '广东省智慧园区平台建设项目',
      issuer: '广东省政务服务中心',
      source_file: 'guangdong_projects_20260317.json',
      push_status: 'pending',
    });

    await tenderStagingModel.createTenderStaging({
      source_item_id: 'B-001',
      title: '深圳市公共资源交易云平台升级',
      issuer: '深圳市公共资源交易中心',
      source_file: 'shenzhen_trade_20260317.json',
      push_status: 'pushed',
    });
  });

  afterAll(async () => {
    await db.close();
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch (_error) {}
  });

  test('should support fuzzy matching for title, issuer and source_file', async () => {
    const byTitle = await tenderStagingService.listTenderStaging({
      title: '智慧园区',
    });
    expect(byTitle.items).toHaveLength(1);
    expect(byTitle.items[0].source_item_id).toBe('A-001');

    const byIssuer = await tenderStagingService.listTenderStaging({
      issuer: '交易中心',
    });
    expect(byIssuer.items).toHaveLength(1);
    expect(byIssuer.items[0].source_item_id).toBe('B-001');

    const bySourceFile = await tenderStagingService.listTenderStaging({
      source_file: 'shenzhen_trade',
    });
    expect(bySourceFile.items).toHaveLength(1);
    expect(bySourceFile.items[0].source_item_id).toBe('B-001');
  });
});
