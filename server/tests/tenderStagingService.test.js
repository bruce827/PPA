process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');

const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;
const tenderStagingModel = require('../models/tenderStagingModel');
const tenderWebSearchResultModel = require('../models/tenderWebSearchResultModel');
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
    await tenderWebSearchResultModel.ensureSchema();
  });

  afterEach(async () => {
    await db.run('DELETE FROM tender_staging_web_search_results');
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

  test('should filter staging records by data quality issues', async () => {
    await tenderStagingModel.createTenderStaging({
      source_item_id: 'MISSING-ISSUER',
      title: '缺招标单位项目',
      issuer: null,
      deadline_date: '2026-05-20',
      announcement_plain_text: '公告正文',
      push_status: 'pending',
    });
    await tenderStagingModel.createTenderStaging({
      source_item_id: 'MISSING-DEADLINE',
      title: '缺截止日期项目',
      issuer: '采购单位',
      deadline_date: null,
      announcement_plain_text: '公告正文',
      push_status: 'pending',
    });
    await tenderStagingModel.createTenderStaging({
      source_item_id: 'MISSING-CONTENT',
      title: '缺正文项目',
      issuer: '采购单位',
      deadline_date: '2026-05-21',
      announcement_plain_text: null,
      announcement_html: null,
      detail_excerpt: null,
      push_status: 'pending',
    });
    await tenderStagingModel.createTenderStaging({
      source_item_id: 'COMPLETE',
      title: '完整项目',
      issuer: '采购单位',
      deadline_date: '2026-05-22',
      announcement_plain_text: '公告正文',
      push_status: 'pending',
    });
    await tenderStagingModel.createTenderStaging({
      source_item_id: 'HTML-EMPTY',
      title: '空 HTML 正文项目',
      issuer: '采购单位',
      deadline_date: '2026-05-23',
      announcement_plain_text: null,
      announcement_html: '<p>&nbsp;</p>',
      detail_excerpt: null,
      push_status: 'pending',
    });
    await tenderStagingModel.createTenderStaging({
      source_item_id: 'HTML-CONTENT',
      title: 'HTML 正文项目',
      issuer: '采购单位',
      deadline_date: '2026-05-24',
      announcement_plain_text: null,
      announcement_html: '<div><p>公告正文</p></div>',
      detail_excerpt: null,
      push_status: 'pending',
    });

    const missingIssuer = await tenderStagingService.listTenderStaging({
      data_quality: 'missing_issuer',
      pageSize: 20,
    });
    expect(missingIssuer.items.map((item) => item.source_item_id)).toEqual([
      'MISSING-ISSUER',
    ]);

    const missingDeadlineOrContent = await tenderStagingService.listTenderStaging({
      data_quality: ['missing_deadline', 'missing_content'],
      pageSize: 20,
    });
    expect(
      missingDeadlineOrContent.items.map((item) => item.source_item_id).sort()
    ).toEqual(['HTML-EMPTY', 'MISSING-CONTENT', 'MISSING-DEADLINE']);
  });

  test('should apply default status sorting and explicit date sorting', async () => {
    await tenderStagingModel.createTenderStaging({
      source_item_id: 'PENDING-EARLY',
      title: '待推送早期项目',
      issuer: '采购单位',
      published_date: '2026-05-01',
      deadline_date: '2026-05-20',
      announcement_plain_text: '公告正文',
      push_status: 'pending',
    });
    await tenderStagingModel.createTenderStaging({
      source_item_id: 'FAILED-LATEST',
      title: '失败最新项目',
      issuer: '采购单位',
      published_date: '2026-05-10',
      deadline_date: '2026-05-20',
      announcement_plain_text: '公告正文',
      push_status: 'failed',
    });
    await tenderStagingModel.createTenderStaging({
      source_item_id: 'PUSHED-LATEST',
      title: '已推送最新项目',
      issuer: '采购单位',
      published_date: '2026-05-11',
      deadline_date: '2026-05-20',
      announcement_plain_text: '公告正文',
      push_status: 'pushed',
    });
    await tenderStagingModel.createTenderStaging({
      source_item_id: 'PENDING-LATE',
      title: '待推送较新项目',
      issuer: '采购单位',
      published_date: '2026-05-03',
      deadline_date: '2026-05-20',
      announcement_plain_text: '公告正文',
      push_status: 'pending',
    });

    const defaultSorted = await tenderStagingService.listTenderStaging({
      pageSize: 20,
    });
    expect(defaultSorted.items.map((item) => item.source_item_id)).toEqual([
      'PENDING-LATE',
      'PENDING-EARLY',
      'FAILED-LATEST',
      'PUSHED-LATEST',
    ]);

    const publishedAsc = await tenderStagingService.listTenderStaging({
      sort_by: 'published_date',
      sort_order: 'asc',
      pageSize: 20,
    });
    expect(publishedAsc.items.map((item) => item.source_item_id)).toEqual([
      'PENDING-EARLY',
      'PENDING-LATE',
      'FAILED-LATEST',
      'PUSHED-LATEST',
    ]);
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

  test('should normalize site-specific spider output fields', async () => {
    const directoryPath = createTempSyncDir('ppa.tender.sync.site-fields');

    try {
      writeJsonFile(directoryPath, '2026-05-05_chnenergy.json', [
        {
          招标编号: 'CEZB260300016',
          标题: '煤制油公司高压加热器采购公开招标项目招标公告',
          发布时间: '2026-05-02 12:29:17',
          招标人: '国家能源集团',
          项目地点: '内蒙古鄂尔多斯',
          投标截止时间: '2026-05-22 09:00:00',
          详情链接: 'https://www.chnenergybidding.com.cn/example.html',
          来源: '中国能源建设集团招标网',
          内容: '招标公告正文',
        },
      ]);

      writeJsonFile(directoryPath, '2026-05-05_cmcc.json', [
        {
          site_name: '中国移动采购与招标网',
          list_id: '2051217773225414658',
          list_uuid: '09143af4a9c54440b740f7cc310de2f8',
          title: '2026年山西移动中部RDC库房租赁的采购项目_谈判采购公告',
          publish_date: '2026-05-04 16:25:28',
          tender_sale_deadline: '2026-05-09 20:00:00',
          detail_url: 'https://b2b.10086.cn/#/noticeDetail?publishId=2051217773225414658',
          content_text: '中国移动采购公告正文',
        },
      ]);

      writeJsonFile(directoryPath, '2026-05-05_eavic.json', [
        {
          tender_id: '87431',
          title: '引信调制组件招标公告',
          info_class_name: '招标公告',
          publish_date: '2026-05-01',
          content: '中航工业电子采购平台公告正文',
          detail_url: 'https://www.eavic.com/rest/article/getTenderInfo?id=87431',
        },
      ]);

      writeJsonFile(directoryPath, '2026-05-05_sdi.json', [
        {
          source_platform: '国投集团电子采购平台',
          ggGuid: 'c8f674cb-469b-4d35-81a5-3925d04f7087',
          gcGuid: '36aa66f9-17e6-4ddd-9a4f-37599bc2838a',
          title: '四川雅砻江盐源抽水蓄能电站模型研发公开招标公告',
          publish_date: '(发布时间：2026-04-30)',
          bid_deadline: '2026-05-31 09:30',
          tenderer: '雅砻江流域水电开发有限公司',
          detail_url: 'https://www.sdicc.com.cn/cgxx/ggDetail?ggGuid=c8f674cb',
          detail_text: '国投集团电子采购平台公告正文',
        },
      ]);

      writeJsonFile(directoryPath, '2026-05-05_snbid.json', [
        {
          site_name: '山东能源集团电子招标投标交易平台',
          list_notice_id: '10257',
          detail_notice_id: '10257',
          title: '山东端信供应链车辆营运中心运输业务公开招标公告',
          publish_time: '2026-05-03T06:59:54.665+0000',
          tender_unit: '山东端信供应链管理有限公司车辆营运中心',
          detail_url: 'https://snbid.minegoods.com/bulletinDetail?id=10257',
          content_text: '山东能源招标公告正文',
        },
      ]);

      writeJsonFile(directoryPath, '2026-05-05_sdicc.json', [
        {
          source: 'sdicc',
          source_id: 'legacy-sdicc-001',
          title: '国投历史脚本来源项目',
          detail_text: '国投历史脚本公告正文',
        },
      ]);

      const result = await tenderStagingService.syncTenderFiles({
        directoryPath,
      });

      expect(result.rawRecordCount).toBe(6);
      expect(result.deduplicatedCount).toBe(6);
      expect(result.created).toBe(6);
      expect(result.errors).toHaveLength(0);

      const list = await tenderStagingService.listTenderStaging({
        pageSize: 10,
      });
      const bySourceItemId = new Map(
        list.items.map((item) => [item.source_item_id, item])
      );

      expect(Array.from(bySourceItemId.keys()).sort()).toEqual([
        'chnenergy:CEZB260300016',
        'cmcc:2051217773225414658',
        'eavic:87431',
        'sdi:c8f674cb-469b-4d35-81a5-3925d04f7087',
        'sdicc:legacy-sdicc-001',
        'snbid:10257',
      ]);
      expect(bySourceItemId.get('chnenergy:CEZB260300016')?.title).toContain(
        '高压加热器'
      );
      expect(bySourceItemId.get('cmcc:2051217773225414658')?.deadline_date).toBe(
        '2026-05-09'
      );
      const sdiRecord = bySourceItemId.get(
        'sdi:c8f674cb-469b-4d35-81a5-3925d04f7087'
      );
      expect(sdiRecord?.published_date).toBe('2026-04-30');
      expect(bySourceItemId.get('snbid:10257')?.issuer).toBe(
        '山东端信供应链管理有限公司车辆营运中心'
      );
    } finally {
      fs.rmSync(directoryPath, { recursive: true, force: true });
    }
  });

  test('should map detail_excerpt into announcement_plain_text for parsing', async () => {
    const directoryPath = createTempSyncDir('ppa.tender.sync.detail-excerpt');

    try {
      writeJsonFile(directoryPath, 'liaoning.json', [
        {
          id: 2006,
          source: 'liaoning',
          source_id: '-79749f919d4e41b4c0-697b',
          title: '浑南区机关食堂食材配送服务工作项目招标公告',
          notice_type: '公开招标公告',
          publish_time: '2026-04-06',
          detail_url:
            'http://218.60.151.59:9004/lnnew5/M03/0A/DF/oYYBAGnTadOAM5JLAADA8gv58y846.html',
          detail_excerpt:
            '项目概况 浑南区机关食堂食材配送服务工作项目招标项目的潜在供应商应在线上获取招标文件,并于2026年04月27日 09时00分前递交投标文件。',
          summary: '火山模型返回不可解析 JSON，已降级人工复核。',
        },
      ]);

      const result = await tenderStagingService.syncTenderFiles({
        directoryPath,
      });

      expect(result.created).toBe(1);

      const list = await tenderStagingService.listTenderStaging({
        pageSize: 20,
      });
      expect(list.items).toHaveLength(1);
      expect(list.items[0].source_item_id).toBe('liaoning:-79749f919d4e41b4c0-697b');
      expect(list.items[0].source_origin_id).toBe('-79749f919d4e41b4c0-697b');
      expect(list.items[0].source_record_id).toBe('2006');
      expect(list.items[0].notice_type).toBe('公开招标公告');
      expect(list.items[0].published_date).toBe('2026-04-06');
      expect(list.items[0].source_url).toBe(
        'http://218.60.151.59:9004/lnnew5/M03/0A/DF/oYYBAGnTadOAM5JLAADA8gv58y846.html'
      );
      expect(list.items[0].detail_excerpt).toContain('项目概况 浑南区机关食堂食材配送服务工作项目');
      expect(list.items[0].announcement_plain_text).toContain('并于2026年04月27日 09时00分前递交投标文件');
    } finally {
      fs.rmSync(directoryPath, { recursive: true, force: true });
    }
  });

  test('should archive root json source files into a backup directory', async () => {
    const directoryPath = createTempSyncDir('ppa.tender.archive');
    const nestedDirectoryPath = path.join(directoryPath, '_backup_existing');

    try {
      fs.mkdirSync(nestedDirectoryPath, { recursive: true });
      writeJsonFile(directoryPath, 'a.json', [{ source_item_id: 'a', title: 'A 项目' }]);
      writeJsonFile(directoryPath, 'b.json', [{ source_item_id: 'b', title: 'B 项目' }]);
      writeJsonFile(nestedDirectoryPath, 'nested.json', [{ source_item_id: 'c', title: 'C 项目' }]);

      const result = await tenderStagingService.archiveTenderSourceFiles({
        directoryPath,
      });

      expect(result.fileCount).toBe(2);
      expect(result.archivedFiles).toEqual(['a.json', 'b.json']);
      expect(result.archiveDirectoryPath).toContain('_backup_');
      expect(fs.existsSync(path.join(directoryPath, 'a.json'))).toBe(false);
      expect(fs.existsSync(path.join(directoryPath, 'b.json'))).toBe(false);
      expect(fs.existsSync(path.join(result.archiveDirectoryPath, 'a.json'))).toBe(true);
      expect(fs.existsSync(path.join(result.archiveDirectoryPath, 'b.json'))).toBe(true);
      expect(fs.existsSync(path.join(nestedDirectoryPath, 'nested.json'))).toBe(true);
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

      const softDeleted = await tenderStagingModel.getTenderStagingBySourceItemId('beta');
      expect(softDeleted).toBeTruthy();
      expect(softDeleted?.deleted_at).toBeTruthy();
      expect(softDeleted?.delete_reason).toBe('missing_from_sync_source');
    } finally {
      fs.rmSync(firstDirectory, { recursive: true, force: true });
      fs.rmSync(secondDirectory, { recursive: true, force: true });
    }
  });

  test('should preserve stale rows with operation traces during sync pruning', async () => {
    const firstDirectory = createTempSyncDir('ppa.tender.sync.trace.first');
    const secondDirectory = createTempSyncDir('ppa.tender.sync.trace.second');

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
        {
          source_item_id: 'gamma',
          title: 'Gamma 项目',
          published_at: '2026-03-22T10:00:00.000Z',
        },
      ]);

      writeJsonFile(secondDirectory, 'second.json', [
        {
          source_item_id: 'alpha',
          title: 'Alpha 项目',
          published_at: '2026-03-23T10:00:00.000Z',
        },
      ]);

      await tenderStagingService.syncTenderFiles({
        directoryPath: firstDirectory,
      });

      const beta = await tenderStagingModel.getTenderStagingBySourceItemId('beta');
      const gamma = await tenderStagingModel.getTenderStagingBySourceItemId('gamma');

      await tenderStagingModel.updateTenderPushState(beta.id, {
        push_status: 'pushed',
        push_error: null,
        pushed_at: '2026-03-24T08:00:00.000Z',
      });

      await tenderWebSearchResultModel.saveLatestResult({
        tender_staging_id: gamma.id,
        model_config_id: 1,
        prompt_template_id: 1,
        searched_at: '2026-03-24T09:00:00.000Z',
        summary: '已找到相关线索',
        results: [
          {
            site_name: '中国政府采购网',
            site_url: 'https://www.ccgp.gov.cn',
            page_title: 'Gamma 项目公告',
            content_type: '招标公告',
            snippet: 'Gamma 项目招标公告片段',
            relevance_reason: '标题与招标单位高度匹配',
            confidence: 0.92,
          },
        ],
      });

      const secondResult = await tenderStagingService.syncTenderFiles({
        directoryPath: secondDirectory,
      });
      expect(secondResult.created).toBe(0);
      expect(secondResult.updated).toBe(1);
      expect(secondResult.pruned).toBe(0);
      expect(secondResult.preservedWithTrace).toBe(2);

      const list = await tenderStagingService.listTenderStaging({ pageSize: 20 });
      const sourceItemIds = list.items.map((item) => item.source_item_id).sort();
      expect(sourceItemIds).toEqual(['alpha', 'beta', 'gamma']);

      const preservedBeta = await tenderStagingModel.getTenderStagingBySourceItemId('beta');
      const preservedGamma = await tenderStagingModel.getTenderStagingBySourceItemId('gamma');
      expect(preservedBeta?.deleted_at || null).toBeNull();
      expect(preservedGamma?.deleted_at || null).toBeNull();
    } finally {
      fs.rmSync(firstDirectory, { recursive: true, force: true });
      fs.rmSync(secondDirectory, { recursive: true, force: true });
    }
  });

  test('should preserve stale rows with parse traces during sync pruning', async () => {
    const firstDirectory = createTempSyncDir('ppa.tender.sync.parse.first');
    const secondDirectory = createTempSyncDir('ppa.tender.sync.parse.second');

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

      await tenderStagingService.syncTenderFiles({
        directoryPath: firstDirectory,
      });

      const beta = await tenderStagingModel.getTenderStagingBySourceItemId('beta');
      await tenderStagingModel.updateTenderParseState(beta.id, {
        issuer: '某招标单位',
        deadline_at: '2026-03-30T00:00:00.000Z',
        deadline_date: '2026-03-30',
        last_parsed_at: '2026-03-24T09:00:00.000Z',
        parse_status: 'parsed_ok',
        parse_error: null,
        parse_meta_json: JSON.stringify({
          updated_fields: ['issuer', 'deadline_date'],
        }),
      });

      const secondResult = await tenderStagingService.syncTenderFiles({
        directoryPath: secondDirectory,
      });
      expect(secondResult.pruned).toBe(0);
      expect(secondResult.preservedWithTrace).toBe(1);

      const list = await tenderStagingService.listTenderStaging({ pageSize: 20 });
      const sourceItemIds = list.items.map((item) => item.source_item_id).sort();
      expect(sourceItemIds).toEqual(['alpha', 'beta']);

      const preservedBeta = await tenderStagingModel.getTenderStagingBySourceItemId('beta');
      expect(preservedBeta?.deleted_at || null).toBeNull();
      expect(preservedBeta?.parse_status).toBe('parsed_ok');
    } finally {
      fs.rmSync(firstDirectory, { recursive: true, force: true });
      fs.rmSync(secondDirectory, { recursive: true, force: true });
    }
  });

  test('should preserve parsed issuer, deadline and parse traces on re-sync', async () => {
    const directoryPath = createTempSyncDir('ppa.tender.sync.parse-preserve');

    try {
      writeJsonFile(directoryPath, 'liaoning.json', [
        {
          id: 2006,
          source: 'liaoning',
          source_id: '-79749f919d4e41b4c0-697b',
          title: '浑南区机关食堂食材配送服务工作项目招标公告',
          notice_type: '公开招标公告',
          publish_time: '2026-04-06',
          detail_url:
            'http://218.60.151.59:9004/lnnew5/M03/0A/DF/oYYBAGnTadOAM5JLAADA8gv58y846.html',
          detail_excerpt:
            '项目概况 浑南区机关食堂食材配送服务工作项目招标项目的潜在供应商应在线上获取招标文件。',
          summary: '火山模型返回不可解析 JSON，已降级人工复核。',
        },
      ]);

      await tenderStagingService.syncTenderFiles({ directoryPath });

      const created = await tenderStagingModel.getTenderStagingBySourceItemId(
        'liaoning:-79749f919d4e41b4c0-697b'
      );
      await tenderStagingModel.updateTenderParseState(created.id, {
        issuer: '沈阳市浑南区机关事务保障中心',
        deadline_at: '2026-04-27T00:00:00.000Z',
        deadline_date: '2026-04-27',
        last_parsed_at: '2026-04-10T03:00:00.000Z',
        parse_status: 'parsed_ok',
        parse_error: null,
        parse_meta_json: JSON.stringify({
          updated_fields: ['issuer', 'deadline_date'],
        }),
      });

      const secondResult = await tenderStagingService.syncTenderFiles({ directoryPath });
      expect(secondResult.unchanged).toBe(1);

      const synced = await tenderStagingModel.getTenderStagingBySourceItemId(
        'liaoning:-79749f919d4e41b4c0-697b'
      );
      expect(synced?.issuer).toBe('沈阳市浑南区机关事务保障中心');
      expect(synced?.deadline_date).toBe('2026-04-27');
      expect(synced?.parse_status).toBe('parsed_ok');
      expect(synced?.parse_meta?.updated_fields).toEqual(['issuer', 'deadline_date']);
    } finally {
      fs.rmSync(directoryPath, { recursive: true, force: true });
    }
  });
});
