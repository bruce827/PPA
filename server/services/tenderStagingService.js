const fs = require('fs/promises');
const path = require('path');

const tenderStagingModel = require('../models/tenderStagingModel');
const { validationError, HttpError } = require('../utils/errors');

const KNOWN_FIELDS = new Set([
  'source_item_id',
  'sourceItemId',
  'id',
  'rowGuid',
  'goodsId',
  'title',
  'project_name',
  'projectName',
  'name',
  'goodsName',
  'published_at',
  'publishedAt',
  'published_date',
  'publishedDate',
  'publish_date',
  'publishDate',
  'publish_time',
  'publishTime',
  'infodate',
  'detail_publish_date',
  'detailPublishDate',
  'bidSaleStartDateTime',
  'createTime',
  'releaseTime',
  'startTime',
  'deadline_at',
  'deadlineAt',
  'deadline_date',
  'deadlineDate',
  'deadline',
  'end_date',
  'endDate',
  'bidSaleEndDateTime',
  'openBidDateTime',
  'issuer',
  'tender_unit',
  'tenderUnit',
  'purchaser',
  'tenantName',
  'budget_amount',
  'budgetAmount',
  'budget',
  'goodsPrice',
  'region',
  'area',
  'province',
  'city',
  'goodsAddress',
  'source_platform',
  'sourcePlatform',
  'platform',
  'site_name',
  'source_url',
  'sourceUrl',
  'url',
  'detail_url',
  'detailUrl',
  'list_href',
  'summary',
  'description',
  'strcomment',
  'announcement_html',
  'announcementHtml',
  'html',
  'content_html',
  'detail_html',
  'announcement_plain_text',
  'announcementPlainText',
  'plain_text',
  'content_text',
  'detail_text',
  'detail_payload',
  'detailPayload',
  'last_pushed_at',
  'lastPushedAt',
  'crawl_time',
]);

function getDefaultSpiderDataDir() {
  return path.resolve(__dirname, '../../spider/data');
}

function normalizeText(value, maxLength = null) {
  if (value === null || typeof value === 'undefined') return null;
  const text = String(value).trim();
  if (!text) return null;
  return maxLength ? text.slice(0, maxLength) : text;
}

function inferDate(value) {
  const text = normalizeText(value, 64);
  if (!text) return null;
  const matched = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return matched ? matched[1] : null;
}

function normalizeDateTime(value) {
  const text = normalizeText(value, 64);
  if (!text) return null;

  if (/^\d{10,13}$/.test(text)) {
    const timestamp = Number(text);
    if (!Number.isNaN(timestamp)) {
      const normalizedTimestamp = text.length === 10 ? timestamp * 1000 : timestamp;
      return new Date(normalizedTimestamp).toISOString();
    }
  }

  const chineseDate = text
    .replace(/年/g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
    .replace(/\//g, '-')
    .trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(chineseDate)) {
    return chineseDate;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = new Date(chineseDate);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }

  return parsed.toISOString();
}

function getNestedTimeValue(record, listKey, fieldKey) {
  if (!Array.isArray(record?.[listKey]) || record[listKey].length === 0) {
    return null;
  }

  const firstItem = record[listKey][0];
  if (!isPlainObject(firstItem)) {
    return null;
  }

  return firstItem[fieldKey];
}

function stripHtmlTags(value) {
  const text = normalizeText(value);
  if (!text) return null;
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBudgetAmount(value) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  const text = String(value).trim();
  if (!text) return null;

  const cleaned = text.replace(/,/g, '');
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return cleaned;
  }

  return text;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function pickFirst(...values) {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) return text;
  }
  return null;
}

function collectExtraDetailPayload(record) {
  if (!isPlainObject(record)) return null;

  const extra = {};
  Object.keys(record).forEach((key) => {
    if (!KNOWN_FIELDS.has(key)) {
      extra[key] = record[key];
    }
  });

  return Object.keys(extra).length ? extra : null;
}

function normalizeDetailPayload(record) {
  const directPayload = record.detail_payload || record.detailPayload;
  if (isPlainObject(directPayload)) {
    return directPayload;
  }

  const extraPayload = collectExtraDetailPayload(record);
  return extraPayload || null;
}

function normalizeSingleRecord(record, sourceFile, fileMeta = {}) {
  if (!isPlainObject(record)) {
    return null;
  }

  const sourceItemId = pickFirst(
    record.source_item_id,
    record.sourceItemId,
    record.rowGuid,
    record.goodsId,
    record.id
  );
  const title = pickFirst(
    record.title,
    record.project_name,
    record.projectName,
    record.goodsName,
    record.name
  );

  if (!sourceItemId || !title) {
    return null;
  }

  const publishedAt = normalizeDateTime(
    record.published_at ||
      record.publishedAt ||
      record.published_date ||
      record.publishedDate ||
      record.publish_date ||
      record.publishDate ||
      record.publish_time ||
      record.publishTime ||
      record.infodate ||
      record.detail_publish_date ||
      record.detailPublishDate ||
      record.bidSaleStartDateTime ||
      record.releaseTime ||
      record.createTime ||
      getNestedTimeValue(record, 'bidSectionList', 'releaseTime') ||
      record.startTime
  );
  const deadlineAt = normalizeDateTime(
    record.deadline_at ||
      record.deadlineAt ||
      record.deadline_date ||
      record.deadlineDate ||
      record.deadline ||
      record.end_date ||
      record.endDate ||
      record.bidSaleEndDateTime ||
      record.openBidDateTime
  );

  const announcementHtml = normalizeText(
    record.announcement_html ||
      record.announcementHtml ||
      record.html ||
      record.content_html ||
      record.detail_html
  );
  const announcementPlainText =
    normalizeText(
      record.announcement_plain_text ||
        record.announcementPlainText ||
        record.plain_text ||
        record.content_text ||
        record.detail_text
    ) || stripHtmlTags(announcementHtml);
  const summary =
    normalizeText(record.summary || record.description || record.strcomment, 500) ||
    (announcementPlainText ? announcementPlainText.slice(0, 120) : null);

  const detailPayload = normalizeDetailPayload(record);
  const region =
    pickFirst(record.region, record.area, record.goodsAddress) ||
    [normalizeText(record.province, 40), normalizeText(record.city, 40)]
      .filter(Boolean)
      .join('/') ||
    null;

  const rawPayloadJson = JSON.stringify(record);

  return {
    source_item_id: sourceItemId,
    title,
    published_at: publishedAt,
    published_date: inferDate(publishedAt) || inferDate(record.published_date || record.publish_date),
    deadline_at: deadlineAt,
    deadline_date: inferDate(deadlineAt) || inferDate(record.deadline_date || record.end_date),
    issuer: pickFirst(
      record.issuer,
      record.tender_unit,
      record.tenderUnit,
      record.purchaser,
      record.tenantName
    ),
    budget_amount: normalizeBudgetAmount(
      record.budget_amount || record.budgetAmount || record.budget || record.goodsPrice
    ),
    region,
    source_platform: pickFirst(
      record.source_platform,
      record.sourcePlatform,
      record.platform,
      record.site_name
    ),
    source_url: pickFirst(
      record.source_url,
      record.sourceUrl,
      record.url,
      record.detail_url,
      record.detailUrl,
      record.list_href
    ),
    summary,
    announcement_html: announcementHtml,
    announcement_plain_text: announcementPlainText,
    detail_payload_json: detailPayload ? JSON.stringify(detailPayload) : null,
    source_file: sourceFile,
    raw_payload_json: rawPayloadJson,
    raw_payload: record,
    last_pushed_at: normalizeDateTime(
      record.last_pushed_at || record.lastPushedAt || record.crawl_time
    ),
    _source_file_mtime_ms: Number(fileMeta.mtimeMs || 0),
  };
}

function flattenJsonPayload(rawPayload) {
  if (Array.isArray(rawPayload)) {
    return rawPayload;
  }

  if (isPlainObject(rawPayload)) {
    if (Array.isArray(rawPayload.items)) {
      return rawPayload.items;
    }

    if (Array.isArray(rawPayload.data)) {
      return rawPayload.data;
    }

    if (Array.isArray(rawPayload.records)) {
      return rawPayload.records;
    }

    return [rawPayload];
  }

  return [];
}

function resolveRecordRank(record) {
  const timeValue =
    Date.parse(record.last_pushed_at || '') ||
    Date.parse(record.published_at || '') ||
    Date.parse(record.deadline_at || '') ||
    0;

  return Math.max(timeValue, Number(record._source_file_mtime_ms || 0));
}

function pickPreferredRecord(existingRecord, nextRecord) {
  if (!existingRecord) return nextRecord;
  return resolveRecordRank(nextRecord) >= resolveRecordRank(existingRecord)
    ? nextRecord
    : existingRecord;
}

async function readTenderRecordsFromDirectory(directoryPath) {
  const targetDirectory = path.resolve(directoryPath || getDefaultSpiderDataDir());
  const entries = await fs.readdir(targetDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'zh-CN'));

  const dedupedMap = new Map();
  const errors = [];
  let rawRecordCount = 0;

  for (const fileName of files) {
    const absolutePath = path.join(targetDirectory, fileName);
    const fileMeta = await fs.stat(absolutePath);
    const rawText = await fs.readFile(absolutePath, 'utf8');

    let parsedJson;
    try {
      parsedJson = JSON.parse(rawText);
    } catch (error) {
      errors.push(`${fileName}: JSON 解析失败 - ${error.message}`);
      continue;
    }

    const records = flattenJsonPayload(parsedJson);
    rawRecordCount += records.length;

    records.forEach((record) => {
      const normalized = normalizeSingleRecord(record, fileName, fileMeta);
      if (!normalized) {
        errors.push(`${fileName}: 发现缺少 source_item_id 或 title 的记录，已跳过`);
        return;
      }

      const existing = dedupedMap.get(normalized.source_item_id);
      dedupedMap.set(
        normalized.source_item_id,
        pickPreferredRecord(existing, normalized)
      );
    });
  }

  return {
    directoryPath: targetDirectory,
    fileCount: files.length,
    rawRecordCount,
    normalizedRecords: Array.from(dedupedMap.values()),
    errors,
  };
}

async function syncTenderFiles(options = {}) {
  await tenderStagingModel.ensureSchema();

  const directoryPath = path.resolve(options.directoryPath || getDefaultSpiderDataDir());

  let directoryStat = null;
  try {
    directoryStat = await fs.stat(directoryPath);
  } catch (_error) {
    throw validationError(`未找到本地招标数据目录: ${directoryPath}`);
  }

  if (!directoryStat.isDirectory()) {
    throw validationError(`本地招标数据路径不是目录: ${directoryPath}`);
  }

  const { fileCount, rawRecordCount, normalizedRecords, errors } =
    await readTenderRecordsFromDirectory(directoryPath);

  if (fileCount === 0) {
    throw validationError(`目录中没有可同步的 JSON 文件: ${directoryPath}`);
  }

  const summary = {
    directoryPath,
    fileCount,
    rawRecordCount,
    deduplicatedCount: normalizedRecords.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    errors,
  };

  for (const record of normalizedRecords) {
    const existing = await tenderStagingModel.getTenderStagingBySourceItemId(
      record.source_item_id
    );
    const now = new Date().toISOString();
    const payloadChanged = existing
      ? existing.raw_payload_json !== record.raw_payload_json ||
        existing.source_file !== record.source_file
      : true;

    const nextRow = {
      source_item_id: record.source_item_id,
      title: record.title,
      published_at: record.published_at,
      published_date: record.published_date,
      deadline_at: record.deadline_at,
      deadline_date: record.deadline_date,
      issuer: record.issuer,
      budget_amount: record.budget_amount,
      region: record.region,
      source_platform: record.source_platform,
      source_url: record.source_url,
      summary: record.summary,
      announcement_html: record.announcement_html,
      announcement_plain_text: record.announcement_plain_text,
      detail_payload_json: record.detail_payload_json,
      source_file: record.source_file,
      raw_payload_json: record.raw_payload_json,
      push_status:
        existing && !payloadChanged ? existing.push_status : 'pending',
      push_error:
        existing && !payloadChanged ? existing.push_error : null,
      last_synced_at: now,
      pushed_at:
        existing && !payloadChanged ? existing.pushed_at : null,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    if (!existing) {
      await tenderStagingModel.createTenderStaging(nextRow);
      summary.created += 1;
      continue;
    }

    if (!payloadChanged) {
      await tenderStagingModel.updateTenderStaging(existing.id, nextRow);
      summary.unchanged += 1;
      continue;
    }

    await tenderStagingModel.updateTenderStaging(existing.id, nextRow);
    summary.updated += 1;
  }

  return summary;
}

function normalizeListQuery(query = {}) {
  const page = Math.max(parseInt(query.current || query.page || '1', 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(parseInt(query.pageSize || '20', 10) || 20, 1),
    200
  );

  return {
    page,
    pageSize,
    keyword: normalizeText(query.keyword, 120),
    title: normalizeText(query.title, 200),
    issuer: normalizeText(query.issuer, 200),
    push_status: normalizeText(query.push_status, 20),
    source_file: normalizeText(query.source_file, 200),
  };
}

async function listTenderStaging(query) {
  await tenderStagingModel.ensureSchema();
  const filters = normalizeListQuery(query);
  const [list, stats] = await Promise.all([
    tenderStagingModel.listTenderStaging(filters),
    tenderStagingModel.getTenderStagingStats(),
  ]);

  return {
    ...list,
    stats,
  };
}

async function getRequiredTenderStaging(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw validationError('id 必须是正整数');
  }

  const record = await tenderStagingModel.getTenderStagingById(numericId);
  if (!record) {
    throw new HttpError(404, '待推送招标不存在', 'NotFoundError');
  }

  return record;
}

module.exports = {
  getDefaultSpiderDataDir,
  listTenderStaging,
  getRequiredTenderStaging,
  syncTenderFiles,
};
