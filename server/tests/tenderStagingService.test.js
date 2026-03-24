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
  });

  afterEach(async () => {
    await db.run('DELETE FROM opportunity_tender_staging');
  });

  afterAll(async () => {
    await db.close();
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch (_error) {}
  });

  async function seedListRecords() {
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
  }

  function createTempSyncDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  }

  function writeJsonFile(directoryPath, fileName, payload) {
    fs.writeFileSync(
      path.join(directoryPath, fileName),
      JSON.stringify(payload, null, 2),
      'utf8'
    );
  }

  test('should support fuzzy matching for title, issuer and source_file', async () => {
    await seedListRecords();

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

  test('should normalize aggregate records and keep stable source ids', async () => {
    const directoryPath = createTempSyncDir('ppa.tender.sync.aggregate');

    try {
      writeJsonFile(directoryPath, 'legacy-cnpc.json', [
        {
          site_name: '中国石油招标投标网',
          goodsId: 'cnpc-001',
          goodsName: '旧版 CNPC 招标',
          bidSaleStartDateTime: '2026-03-18 08:00:00',
          tenantName: '中国石油招标中心',
          detail_url:
            'https://www2.cnpcbidding.com/#/wel/commodityDetails?goodsId=cnpc-001&type=list',
        },
      ]);

      writeJsonFile(directoryPath, 'legacy-pipechina.json', [
        {
          site_name: '国家管网电子招标平台',
          id: null,
          businessId: 'pipe-biz-001',
          title: '国家管网项目',
          createTime: '2026-03-19 15:11:53',
          releaseTime: '2026-03-19 15:11:53',
          detail_url:
            'https://iscm.pipechina.com.cn:8443/detail.html?pageType=5&tab=1&index=pipe-biz-001',
        },
      ]);

      writeJsonFile(directoryPath, 'all_notices.json', [
        {
          id: 1,
          source: 'cnpc',
          source_id: 'cnpc-001',
          title: '聚合 CNPC 招标',
          publish_time: '2026-03-20 09:00:00',
          detail_url:
            'https://www2.cnpcbidding.com/#/wel/commodityDetails?goodsId=cnpc-001&type=list',
          raw_payload_json: JSON.stringify({
            site_name: '中国石油招标投标网',
            goodsId: 'cnpc-001',
            goodsName: '聚合 CNPC 招标',
            bidSaleStartDateTime: '2026-03-20 09:00:00',
            tenantName: '中国石油招标中心',
            detail_url:
              'https://www2.cnpcbidding.com/#/wel/commodityDetails?goodsId=cnpc-001&type=list',
          }),
        },
        {
          id: 2,
          source: 'eavic',
          source_id: '1',
          title: '大型平板热压机 招标公告',
          publish_time: '2026-03-24 12:00:00',
          detail_url: 'https://www.eavic.com/rest/article/getTenderInfo?id=85341',
          detail_text: '招标公告正文',
          raw_payload_json: JSON.stringify({
            site_name: '中航工业电子采购平台',
            detail_url: 'https://www.eavic.com/rest/article/getTenderInfo?id=85341',
          }),
        },
      ]);

      const result = await tenderStagingService.syncTenderFiles({
        directoryPath,
      });

      expect(result.fileCount).toBe(3);
      expect(result.rawRecordCount).toBe(4);
      expect(result.deduplicatedCount).toBe(3);
      expect(result.errors).toHaveLength(0);

      const list = await tenderStagingService.listTenderStaging({
        pageSize: 20,
      });
      const sourceItemIds = list.items.map((item) => item.source_item_id).sort();
      expect(sourceItemIds).toEqual(['cnpc-001', 'eavic:1', 'pipe-biz-001']);

      const eavicRecord = list.items.find((item) => item.source_item_id === 'eavic:1');
      expect(eavicRecord?.source_platform).toBe('中航工业电子采购平台');
      expect(eavicRecord?.announcement_plain_text).toBe('招标公告正文');
    } finally {
      fs.rmSync(directoryPath, { recursive: true, force: true });
    }
  });

  test('should prune stale staging rows based on current sync directory', async () => {
    const firstDirectory = createTempSyncDir('ppa.tender.sync.first');
    const secondDirectory = createTempSyncDir('ppa.tender.sync.second');

    try {
      writeJsonFile(firstDirectory, 'first.json', [
        {
          source_item_id: 'alpha',
          title: 'Alpha 项目',
          published_at: '2026-03-20T10:00:00.000Z',
        },
        {
          source_item_id: 'beta',
          title: 'Beta 项目',
          published_at: '2026-03-21T10:00:00.000Z',
        },
      ]);

      writeJsonFile(secondDirectory, 'second.json', [
        {
          source_item_id: 'alpha',
          title: 'Alpha 项目',
          published_at: '2026-03-22T10:00:00.000Z',
        },
      ]);

      const firstResult = await tenderStagingService.syncTenderFiles({
        directoryPath: firstDirectory,
      });
      expect(firstResult.created).toBe(2);
      expect(firstResult.pruned).toBe(0);

      const secondResult = await tenderStagingService.syncTenderFiles({
        directoryPath: secondDirectory,
      });
      expect(secondResult.created).toBe(0);
      expect(secondResult.updated).toBe(1);
      expect(secondResult.pruned).toBe(1);

      const list = await tenderStagingService.listTenderStaging({ pageSize: 20 });
      expect(list.total).toBe(1);
      expect(list.items[0].source_item_id).toBe('alpha');
    } finally {
      fs.rmSync(firstDirectory, { recursive: true, force: true });
      fs.rmSync(secondDirectory, { recursive: true, force: true });
    }
  });
});
