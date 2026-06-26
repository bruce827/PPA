process.env.NODE_ENV = 'test';

const fs = require('fs');
const os = require('os');
const path = require('path');

const db = require('../utils/db');
const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');;
const tenderDedupeService = require('../services/tenderDedupeService');
const tenderStagingModel = require('../models/tenderStagingModel');
const tenderWebSearchResultModel = require('../models/tenderWebSearchResultModel');

describe('tenderDedupeService', () => {
  const TEST_DB_PATH = path.join(
    os.tmpdir(),
    `ppa.tender.dedupe.${process.pid}.${Date.now()}.db`
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

  async function createStagingRecord(overrides = {}) {
    return tenderStagingModel.createTenderStaging({
      source_item_id: overrides.source_item_id || `source-${Date.now()}-${Math.random()}`,
      title: overrides.title || '默认招标项目',
      source_platform: overrides.source_platform || 'liaoning',
      source_url:
        overrides.source_url ||
        `https://example.com/detail?id=${Math.random().toString(36).slice(2)}`,
      announcement_plain_text:
        overrides.announcement_plain_text ||
        '项目编号：JH26-000000-00001 招标公告正文，递交截止时间为2026-04-30。',
      summary: overrides.summary || '默认摘要',
      published_date: overrides.published_date || '2026-04-10',
      deadline_date: overrides.deadline_date || '2026-04-30',
      issuer: overrides.issuer || '测试单位',
      source_file: overrides.source_file || 'test.json',
      push_status: overrides.push_status || 'pending',
      push_error: overrides.push_error || null,
      pushed_at: overrides.pushed_at || null,
      parse_status: overrides.parse_status || 'never_parsed',
      parse_error: overrides.parse_error || null,
      last_parsed_at: overrides.last_parsed_at || null,
      parse_meta_json: overrides.parse_meta_json || null,
    });
  }

  test('should keep title-only duplicates as review_only when codes differ', async () => {
    await createStagingRecord({
      source_item_id: 'liaoning-a',
      title: '同名项目招标公告',
      source_url: 'https://example.com/detail?a=1',
      announcement_plain_text:
        '项目编号：JH26-210112-00247 同名项目公告正文，截止时间2026-04-27。',
    });
    await createStagingRecord({
      source_item_id: 'liaoning-b',
      title: '同名项目招标公告',
      source_url: 'https://example.com/detail?a=2',
      announcement_plain_text:
        '项目编号：JH26-210112-00252 同名项目公告正文，截止时间2026-04-28。',
    });

    const preview = await tenderDedupeService.previewTenderDedupe();

    expect(preview.auto_deletable_groups).toBe(0);
    expect(preview.review_only_groups).toBe(1);
    expect(preview.delete_candidate_count).toBe(0);
    expect(preview.groups[0].action).toBe('review_only');
    expect(preview.groups[0].reason_keys).toContain('same_title');
  });

  test('should auto delete high-confidence duplicates and keep the traced record', async () => {
    const keeper = await createStagingRecord({
      source_item_id: 'liaoning-keeper',
      title: '可自动清理项目',
      source_url: 'https://example.com/detail?id=1&token=abc',
      announcement_plain_text:
        '项目编号：JH26-210112-00999 可自动清理项目公告正文，截止时间2026-04-27。',
      parse_status: 'parsed_ok',
      last_parsed_at: '2026-04-10T08:00:00.000Z',
      parse_meta_json: JSON.stringify({ updated_fields: ['issuer'] }),
    });
    await createStagingRecord({
      source_item_id: 'liaoning-duplicate-a',
      title: '可自动清理项目',
      source_url: 'https://example.com/detail?id=1&token=def&t=123',
      announcement_plain_text:
        '项目编号：JH26-210112-00999 可自动清理项目公告正文，截止时间2026-04-27。',
    });
    await createStagingRecord({
      source_item_id: 'liaoning-duplicate-b',
      title: '可自动清理项目',
      source_url: 'https://example.com/detail?id=1&token=ghi&t=456',
      announcement_plain_text:
        '项目编号：JH26-210112-00999 可自动清理项目公告正文，截止时间2026-04-27。',
    });

    const preview = await tenderDedupeService.previewTenderDedupe();

    expect(preview.auto_deletable_groups).toBe(1);
    expect(preview.delete_candidate_count).toBe(2);
    expect(preview.groups[0].action).toBe('auto_delete');
    expect(preview.groups[0].keeper_id).toBe(keeper.id);

    const executeResult = await tenderDedupeService.executeTenderDedupe({
      group_keys: [preview.groups[0].group_key],
    });

    expect(executeResult.deleted_staging_count).toBe(2);
    expect(executeResult.executed_group_count).toBe(1);

    const list = await tenderStagingModel.listActiveTenderStagingForDedupe();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(keeper.id);
  });

  test('should skip strong duplicate groups when multiple records have traces', async () => {
    const pushed = await createStagingRecord({
      source_item_id: 'liaoning-pushed',
      title: '需要跳过的重复组',
      source_url: 'https://example.com/detail?id=skip&token=1',
      announcement_plain_text:
        '项目编号：JH26-210112-00888 需要跳过的重复组公告正文，截止时间2026-04-27。',
      push_status: 'pushed',
      pushed_at: '2026-04-10T08:30:00.000Z',
    });
    const parsed = await createStagingRecord({
      source_item_id: 'liaoning-parsed',
      title: '需要跳过的重复组',
      source_url: 'https://example.com/detail?id=skip&token=2',
      announcement_plain_text:
        '项目编号：JH26-210112-00888 需要跳过的重复组公告正文，截止时间2026-04-27。',
      parse_status: 'parsed_ok',
      last_parsed_at: '2026-04-10T08:00:00.000Z',
      parse_meta_json: JSON.stringify({ updated_fields: ['issuer'] }),
    });

    const preview = await tenderDedupeService.previewTenderDedupe();

    expect(preview.auto_deletable_groups).toBe(0);
    expect(preview.review_only_groups).toBe(1);
    expect(preview.groups[0].skipped_reason).toBe('multiple_traced_records');
    expect(preview.groups[0].records.map((record) => record.id).sort()).toEqual(
      [parsed.id, pushed.id].sort()
    );
  });
});
