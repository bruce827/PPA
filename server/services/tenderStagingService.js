const fs = require('fs/promises');
const path = require('path');

const tenderStagingModel = require('../models/tenderStagingModel');
const tenderWebSearchResultModel = require('../models/tenderWebSearchResultModel');
const { validationError, HttpError } = require('../utils/errors');

const KNOWN_FIELDS = new Set([
  'source_item_id',
  'sourceItemId',
  'source',
  'source_id',
  'sourceId',
  'id',
  'rowGuid',
  'goodsId',
  'tender_id',
  'tenderId',
  'noticeId',
  'businessId',
  'list_id',
  'listId',
  'list_uuid',
  'listUuid',
  'detail_query_publishId',
  'detailQueryPublishId',
  'detail_query_publishUuid',
  'detailQueryPublishUuid',
  'list_notice_id',
  'listNoticeId',
  'detail_notice_id',
  'detailNoticeId',
  'ggGuid',
  'gcGuid',
  'title',
  '标题',
  'project_name',
  'projectName',
  'project_code',
  'projectCode',
  'name',
  'goodsName',
  'info_class',
  'infoClass',
  'info_class_name',
  'infoClassName',
  'notice_type',
  'noticeType',
  'list_notice_type',
  'listNoticeType',
  'publish_type',
  'publishType',
  'publish_one_type',
  'publishOneType',
  'publish_one_type_text',
  'publishOneTypeText',
  'procurement_method',
  'procurementMethod',
  'tender_method',
  'tenderMethod',
  'published_at',
  'publishedAt',
  'published_date',
  'publishedDate',
  'publish_date',
  'publishDate',
  'publish_time',
  'publishTime',
  '发布时间',
  'infodate',
  'detail_publish_date',
  'detailPublishDate',
  'bidSaleStartDateTime',
  'createTime',
  'releaseTime',
  'startTime',
  'file_start_time',
  'fileStartTime',
  'deadline_at',
  'deadlineAt',
  'deadline_date',
  'deadlineDate',
  'deadline',
  'end_date',
  'endDate',
  'bidSaleEndDateTime',
  'tender_sale_deadline',
  'tenderSaleDeadline',
  'publicity_end_time',
  'publicityEndTime',
  'file_end_time',
  'fileEndTime',
  'bid_deadline',
  'bidDeadline',
  'bid_open_time',
  'bidOpenTime',
  'openBidDateTime',
  '投标截止时间',
  'issuer',
  '招标人',
  'tender_unit',
  'tenderUnit',
  'tenderer',
  'purchaser',
  'tenantName',
  'publish_org_name',
  'publishOrgName',
  'budget_amount',
  'budgetAmount',
  'budget',
  'goodsPrice',
  'region',
  'area',
  '项目地点',
  'province',
  'city',
  'goodsAddress',
  'source_platform',
  'sourcePlatform',
  'platform',
  'site_name',
  '来源',
  'source_url',
  'sourceUrl',
  'url',
  'detail_url',
  'detailUrl',
  '详情链接',
  'entry_url',
  'entryUrl',
  'list_href',
  'summary',
  'description',
  'strcomment',
  '招标范围',
  'scope',
  'requirements',
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
  'content',
  '内容',
  'detail_excerpt',
  'detailExcerpt',
  'detail_payload',
  'detailPayload',
  'raw_payload',
  'rawPayload',
  'raw_payload_json',
  'rawPayloadJson',
  'last_pushed_at',
  'lastPushedAt',
  'crawl_time',
  'attachments',
  'attachment_urls',
  'attachmentUrls',
  'attachment_contents',
  'attachmentContents',
  'content_type',
  'contentType',
  'content_parse_method',
  'contentParseMethod',
  'content_base64_prefix',
  'contentBase64Prefix',
  'content_base64_len',
  'contentBase64Len',
  'content_pdf_size',
  'contentPdfSize',
  'content_pdf_file',
  'contentPdfFile',
]);

const SOURCE_ID_AS_PRIMARY_SOURCES = new Set(['cnpc', 'cnooc', 'pipechina']);

function getDefaultSpiderDataDir() {
  return path.resolve(__dirname, '../../spider/data');
}

function formatArchiveTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
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
  const matched = text.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/);
  if (!matched) return null;

  const [, year, month, day] = matched;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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

function parseJsonObject(value) {
  if (isPlainObject(value)) {
    return value;
  }

  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text);
    return isPlainObject(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
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

function normalizeDetailPayload(record, embeddedRawPayload) {
  const directPayload = record.detail_payload || record.detailPayload;
  if (isPlainObject(directPayload)) {
    return directPayload;
  }

  if (embeddedRawPayload) {
    return embeddedRawPayload;
  }

  const extraPayload = collectExtraDetailPayload(record);
  return extraPayload || null;
}

function normalizeSourceCode(value) {
  const text = normalizeText(value, 120);
  if (!text) return null;

  if (/cnpc|中国石油招标投标网/i.test(text)) {
    return 'cnpc';
  }

  if (/cnooc|中国海洋石油|采办业务管理与交易系统/i.test(text)) {
    return 'cnooc';
  }

  if (/pipechina|国家管网/i.test(text)) {
    return 'pipechina';
  }

  if (/eavic|中航工业电子采购平台/i.test(text)) {
    return 'eavic';
  }

  if (/chnenergy|中国能源建设|国家能源|能源建设集团/i.test(text)) {
    return 'chnenergy';
  }

  if (/cmcc|中国移动采购与招标网|中国移动/i.test(text)) {
    return 'cmcc';
  }

  if (/snbid|山东能源集团电子招标投标交易平台/i.test(text)) {
    return 'snbid';
  }

  if (/ykjtzb|山东能源集团电子招标采购平台/i.test(text)) {
    return 'ykjtzb';
  }

  if (/sdicc/i.test(text)) {
    return 'sdicc';
  }

  if (/^sdi$/i.test(text) || /国投集团电子采购平台|国投集团/i.test(text)) {
    return 'sdi';
  }

  if (/liaoning|辽宁政府采购网/i.test(text)) {
    return 'liaoning';
  }

  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || null;
}

function getEmbeddedRawPayload(record) {
  return (
    parseJsonObject(record.raw_payload || record.rawPayload) ||
    parseJsonObject(record.raw_payload_json || record.rawPayloadJson)
  );
}

function inferSourceCode(record, embeddedRawPayload, sourceFile) {
  const candidates = [
    record.source,
    embeddedRawPayload?.source,
    record.source_platform,
    record.sourcePlatform,
    record.platform,
    record.site_name,
    embeddedRawPayload?.source_platform,
    embeddedRawPayload?.sourcePlatform,
    embeddedRawPayload?.platform,
    embeddedRawPayload?.site_name,
    sourceFile,
  ];

  for (const candidate of candidates) {
    const sourceCode = normalizeSourceCode(candidate);
    if (sourceCode) {
      return sourceCode;
    }
  }

  return null;
}

function buildScopedIdentifier(sourceCode, identifier) {
  const normalizedIdentifier = normalizeText(identifier, 240);
  if (!sourceCode || !normalizedIdentifier) {
    return null;
  }

  return `${sourceCode}:${normalizedIdentifier}`;
}

function resolveSourceItemId(record, embeddedRawPayload, sourceCode) {
  const explicitSourceItemId = pickFirst(
    record.source_item_id,
    record.sourceItemId,
    embeddedRawPayload?.source_item_id,
    embeddedRawPayload?.sourceItemId
  );
  if (explicitSourceItemId) {
    return explicitSourceItemId;
  }

  const siteSpecificId = pickFirst(
    record['招标编号'],
    embeddedRawPayload?.['招标编号'],
    record.tender_id,
    record.tenderId,
    record.noticeId,
    embeddedRawPayload?.tender_id,
    embeddedRawPayload?.tenderId,
    embeddedRawPayload?.noticeId,
    record.list_id,
    record.listId,
    record.list_uuid,
    record.listUuid,
    record.detail_query_publishId,
    record.detailQueryPublishId,
    record.detail_query_publishUuid,
    record.detailQueryPublishUuid,
    embeddedRawPayload?.list_id,
    embeddedRawPayload?.listId,
    embeddedRawPayload?.list_uuid,
    embeddedRawPayload?.listUuid,
    embeddedRawPayload?.detail_query_publishId,
    embeddedRawPayload?.detailQueryPublishId,
    embeddedRawPayload?.detail_query_publishUuid,
    embeddedRawPayload?.detailQueryPublishUuid,
    record.list_notice_id,
    record.listNoticeId,
    record.detail_notice_id,
    record.detailNoticeId,
    embeddedRawPayload?.list_notice_id,
    embeddedRawPayload?.listNoticeId,
    embeddedRawPayload?.detail_notice_id,
    embeddedRawPayload?.detailNoticeId,
    record.ggGuid,
    record.gcGuid,
    embeddedRawPayload?.ggGuid,
    embeddedRawPayload?.gcGuid,
    record.project_code,
    record.projectCode,
    embeddedRawPayload?.project_code,
    embeddedRawPayload?.projectCode
  );
  if (siteSpecificId) {
    return buildScopedIdentifier(sourceCode, siteSpecificId) || siteSpecificId;
  }

  const directLegacyId = pickFirst(record.rowGuid, record.goodsId);
  if (directLegacyId) {
    return directLegacyId;
  }

  const embeddedLegacyId = pickFirst(
    embeddedRawPayload?.rowGuid,
    embeddedRawPayload?.goodsId
  );
  if (embeddedLegacyId) {
    return embeddedLegacyId;
  }

  const plainIdFallback = record.source ? null : record.id;
  const embeddedIdFallback = embeddedRawPayload?.id;

  if (sourceCode === 'pipechina') {
    return pickFirst(
      plainIdFallback,
      embeddedIdFallback,
      record.businessId,
      embeddedRawPayload?.businessId,
      record.source_id,
      record.sourceId,
      embeddedRawPayload?.source_id,
      embeddedRawPayload?.sourceId
    );
  }

  if (sourceCode && SOURCE_ID_AS_PRIMARY_SOURCES.has(sourceCode)) {
    return pickFirst(
      record.source_id,
      record.sourceId,
      embeddedRawPayload?.source_id,
      embeddedRawPayload?.sourceId,
      embeddedIdFallback,
      plainIdFallback
    );
  }

  const aggregateSourceId = pickFirst(
    record.source_id,
    record.sourceId,
    embeddedRawPayload?.source_id,
    embeddedRawPayload?.sourceId
  );
  if (aggregateSourceId) {
    return buildScopedIdentifier(sourceCode, aggregateSourceId);
  }

  const businessId = pickFirst(record.businessId, embeddedRawPayload?.businessId);
  if (businessId) {
    return buildScopedIdentifier(sourceCode, businessId) || businessId;
  }

  const fallbackId = pickFirst(plainIdFallback, embeddedIdFallback);
  if (!fallbackId) {
    return null;
  }

  if (record.source && sourceCode) {
    return buildScopedIdentifier(sourceCode, fallbackId);
  }

  return fallbackId;
}

function normalizeSingleRecord(record, sourceFile, fileMeta = {}) {
  if (!isPlainObject(record)) {
    return null;
  }

  const embeddedRawPayload = getEmbeddedRawPayload(record);
  const sourceCode = inferSourceCode(record, embeddedRawPayload, sourceFile);
  const sourceItemId = resolveSourceItemId(record, embeddedRawPayload, sourceCode);
  const sourceOriginId = pickFirst(
    record.source_id,
    record.sourceId,
    embeddedRawPayload?.source_id,
    embeddedRawPayload?.sourceId,
    record['招标编号'],
    embeddedRawPayload?.['招标编号'],
    record.tender_id,
    record.tenderId,
    embeddedRawPayload?.tender_id,
    embeddedRawPayload?.tenderId,
    record.list_id,
    record.listId,
    record.list_notice_id,
    record.listNoticeId,
    record.detail_notice_id,
    record.detailNoticeId,
    embeddedRawPayload?.list_id,
    embeddedRawPayload?.listId,
    embeddedRawPayload?.list_notice_id,
    embeddedRawPayload?.listNoticeId,
    embeddedRawPayload?.detail_notice_id,
    embeddedRawPayload?.detailNoticeId,
    record.ggGuid,
    record.gcGuid,
    embeddedRawPayload?.ggGuid,
    embeddedRawPayload?.gcGuid
  );
  const sourceRecordId = pickFirst(
    record.id,
    embeddedRawPayload?.id,
    record.businessId,
    embeddedRawPayload?.businessId,
    record.goodsId,
    embeddedRawPayload?.goodsId,
    record.rowGuid,
    embeddedRawPayload?.rowGuid,
    record.tender_id,
    record.tenderId,
    embeddedRawPayload?.tender_id,
    embeddedRawPayload?.tenderId,
    record.list_id,
    record.listId,
    record.list_notice_id,
    record.listNoticeId,
    record.detail_notice_id,
    record.detailNoticeId,
    embeddedRawPayload?.list_id,
    embeddedRawPayload?.listId,
    embeddedRawPayload?.list_notice_id,
    embeddedRawPayload?.listNoticeId,
    embeddedRawPayload?.detail_notice_id,
    embeddedRawPayload?.detailNoticeId,
    record.ggGuid,
    record.gcGuid,
    embeddedRawPayload?.ggGuid,
    embeddedRawPayload?.gcGuid
  );
  const title = pickFirst(
    record.title,
    record['标题'],
    record.project_name,
    record.projectName,
    record.goodsName,
    record.name,
    embeddedRawPayload?.title,
    embeddedRawPayload?.['标题'],
    embeddedRawPayload?.project_name,
    embeddedRawPayload?.projectName,
    embeddedRawPayload?.goodsName,
    embeddedRawPayload?.name
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
      record['发布时间'] ||
      record.infodate ||
      record.detail_publish_date ||
      record.detailPublishDate ||
      record.bidSaleStartDateTime ||
      record.releaseTime ||
      record.createTime ||
      getNestedTimeValue(record, 'bidSectionList', 'releaseTime') ||
      record.startTime ||
      record.file_start_time ||
      record.fileStartTime ||
      embeddedRawPayload?.published_at ||
      embeddedRawPayload?.publishedAt ||
      embeddedRawPayload?.published_date ||
      embeddedRawPayload?.publishedDate ||
      embeddedRawPayload?.publish_date ||
      embeddedRawPayload?.publishDate ||
      embeddedRawPayload?.publish_time ||
      embeddedRawPayload?.publishTime ||
      embeddedRawPayload?.['发布时间'] ||
      embeddedRawPayload?.infodate ||
      embeddedRawPayload?.detail_publish_date ||
      embeddedRawPayload?.detailPublishDate ||
      embeddedRawPayload?.bidSaleStartDateTime ||
      embeddedRawPayload?.releaseTime ||
      embeddedRawPayload?.createTime ||
      getNestedTimeValue(embeddedRawPayload, 'bidSectionList', 'releaseTime') ||
      embeddedRawPayload?.startTime ||
      embeddedRawPayload?.file_start_time ||
      embeddedRawPayload?.fileStartTime
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
      record.openBidDateTime ||
      record.tender_sale_deadline ||
      record.tenderSaleDeadline ||
      record.publicity_end_time ||
      record.publicityEndTime ||
      record.file_end_time ||
      record.fileEndTime ||
      record.bid_deadline ||
      record.bidDeadline ||
      record.bid_open_time ||
      record.bidOpenTime ||
      record['投标截止时间'] ||
      embeddedRawPayload?.deadline_at ||
      embeddedRawPayload?.deadlineAt ||
      embeddedRawPayload?.deadline_date ||
      embeddedRawPayload?.deadlineDate ||
      embeddedRawPayload?.deadline ||
      embeddedRawPayload?.end_date ||
      embeddedRawPayload?.endDate ||
      embeddedRawPayload?.bidSaleEndDateTime ||
      embeddedRawPayload?.openBidDateTime ||
      embeddedRawPayload?.tender_sale_deadline ||
      embeddedRawPayload?.tenderSaleDeadline ||
      embeddedRawPayload?.publicity_end_time ||
      embeddedRawPayload?.publicityEndTime ||
      embeddedRawPayload?.file_end_time ||
      embeddedRawPayload?.fileEndTime ||
      embeddedRawPayload?.bid_deadline ||
      embeddedRawPayload?.bidDeadline ||
      embeddedRawPayload?.bid_open_time ||
      embeddedRawPayload?.bidOpenTime ||
      embeddedRawPayload?.['投标截止时间']
  );

  const announcementHtml = normalizeText(
    record.announcement_html ||
      record.announcementHtml ||
      record.html ||
      record.content_html ||
      record.detail_html ||
      embeddedRawPayload?.announcement_html ||
      embeddedRawPayload?.announcementHtml ||
      embeddedRawPayload?.html ||
      embeddedRawPayload?.content_html ||
      embeddedRawPayload?.detail_html
  );
  const detailExcerpt = normalizeText(
    record.detail_excerpt ||
      record.detailExcerpt ||
      embeddedRawPayload?.detail_excerpt ||
      embeddedRawPayload?.detailExcerpt
  );
  const announcementPlainText =
    normalizeText(
      record.announcement_plain_text ||
        record.announcementPlainText ||
        record.plain_text ||
        record.content_text ||
        record.detail_text ||
        record.content ||
        record['内容'] ||
        detailExcerpt ||
        embeddedRawPayload?.announcement_plain_text ||
        embeddedRawPayload?.announcementPlainText ||
        embeddedRawPayload?.plain_text ||
        embeddedRawPayload?.content_text ||
        embeddedRawPayload?.detail_text ||
        embeddedRawPayload?.content ||
        embeddedRawPayload?.['内容']
    ) || stripHtmlTags(announcementHtml);
  const summary =
    normalizeText(
      record.summary ||
        record.description ||
        record.strcomment ||
        record['招标范围'] ||
        record.scope ||
        record.requirements ||
        embeddedRawPayload?.summary ||
        embeddedRawPayload?.description ||
        embeddedRawPayload?.strcomment ||
        embeddedRawPayload?.['招标范围'] ||
        embeddedRawPayload?.scope ||
        embeddedRawPayload?.requirements,
      500
    ) ||
    (announcementPlainText ? announcementPlainText.slice(0, 120) : null);

  const detailPayload = normalizeDetailPayload(record, embeddedRawPayload);
  const region =
    pickFirst(
      record.region,
      record.area,
      record['项目地点'],
      record.goodsAddress,
      embeddedRawPayload?.region,
      embeddedRawPayload?.area,
      embeddedRawPayload?.['项目地点'],
      embeddedRawPayload?.goodsAddress
    ) ||
    [
      normalizeText(record.province, 40),
      normalizeText(record.city, 40),
      normalizeText(embeddedRawPayload?.province, 40),
      normalizeText(embeddedRawPayload?.city, 40),
    ]
      .filter(Boolean)
      .join('/') ||
    null;

  const rawPayloadJson = JSON.stringify(record);

  return {
    source_item_id: sourceItemId,
    source_origin_id: sourceOriginId,
    source_record_id: sourceRecordId,
    title,
    notice_type: pickFirst(
      record.notice_type,
      record.noticeType,
      record.list_notice_type,
      record.listNoticeType,
      record.info_class_name,
      record.infoClassName,
      record.info_class,
      record.infoClass,
      record.publish_one_type_text,
      record.publishOneTypeText,
      record.procurement_method,
      record.procurementMethod,
      record.tender_method,
      record.tenderMethod,
      embeddedRawPayload?.notice_type,
      embeddedRawPayload?.noticeType,
      embeddedRawPayload?.list_notice_type,
      embeddedRawPayload?.listNoticeType,
      embeddedRawPayload?.info_class_name,
      embeddedRawPayload?.infoClassName,
      embeddedRawPayload?.info_class,
      embeddedRawPayload?.infoClass,
      embeddedRawPayload?.publish_one_type_text,
      embeddedRawPayload?.publishOneTypeText,
      embeddedRawPayload?.procurement_method,
      embeddedRawPayload?.procurementMethod,
      embeddedRawPayload?.tender_method,
      embeddedRawPayload?.tenderMethod
    ),
    published_at: publishedAt,
    published_date:
      inferDate(publishedAt) ||
      inferDate(
        record.published_date ||
          record.publish_date ||
          record.publish_time ||
          record['发布时间'] ||
          record.file_start_time ||
          embeddedRawPayload?.published_date ||
          embeddedRawPayload?.publish_date ||
          embeddedRawPayload?.publish_time ||
          embeddedRawPayload?.['发布时间'] ||
          embeddedRawPayload?.file_start_time
      ),
    deadline_at: deadlineAt,
    deadline_date:
      inferDate(deadlineAt) ||
      inferDate(
        record.deadline_date ||
          record.end_date ||
          record.tender_sale_deadline ||
          record.file_end_time ||
          record.bid_deadline ||
          record.bid_open_time ||
          record['投标截止时间'] ||
          embeddedRawPayload?.deadline_date ||
          embeddedRawPayload?.end_date ||
          embeddedRawPayload?.tender_sale_deadline ||
          embeddedRawPayload?.file_end_time ||
          embeddedRawPayload?.bid_deadline ||
          embeddedRawPayload?.bid_open_time ||
          embeddedRawPayload?.['投标截止时间']
      ),
    issuer: pickFirst(
      record.issuer,
      record['招标人'],
      record.tender_unit,
      record.tenderUnit,
      record.tenderer,
      record.purchaser,
      record.tenantName,
      record.publish_org_name,
      record.publishOrgName,
      embeddedRawPayload?.issuer,
      embeddedRawPayload?.['招标人'],
      embeddedRawPayload?.tender_unit,
      embeddedRawPayload?.tenderUnit,
      embeddedRawPayload?.tenderer,
      embeddedRawPayload?.purchaser,
      embeddedRawPayload?.tenantName,
      embeddedRawPayload?.publish_org_name,
      embeddedRawPayload?.publishOrgName
    ),
    budget_amount: normalizeBudgetAmount(
      record.budget_amount ||
        record.budgetAmount ||
        record.budget ||
        record.goodsPrice ||
        embeddedRawPayload?.budget_amount ||
        embeddedRawPayload?.budgetAmount ||
        embeddedRawPayload?.budget ||
        embeddedRawPayload?.goodsPrice
    ),
    region,
    source_platform: pickFirst(
      record.source_platform,
      record.sourcePlatform,
      record.platform,
      record.site_name,
      record['来源'],
      embeddedRawPayload?.source_platform,
      embeddedRawPayload?.sourcePlatform,
      embeddedRawPayload?.platform,
      embeddedRawPayload?.site_name,
      embeddedRawPayload?.['来源'],
      sourceCode
    ),
    source_url: pickFirst(
      record.source_url,
      record.sourceUrl,
      record.url,
      record.detail_url,
      record.detailUrl,
      record['详情链接'],
      record.list_href,
      record.entry_url,
      record.entryUrl,
      embeddedRawPayload?.source_url,
      embeddedRawPayload?.sourceUrl,
      embeddedRawPayload?.url,
      embeddedRawPayload?.detail_url,
      embeddedRawPayload?.detailUrl,
      embeddedRawPayload?.['详情链接'],
      embeddedRawPayload?.list_href,
      embeddedRawPayload?.entry_url,
      embeddedRawPayload?.entryUrl
    ),
    summary,
    detail_excerpt: detailExcerpt,
    announcement_html: announcementHtml,
    announcement_plain_text: announcementPlainText,
    detail_payload_json: detailPayload ? JSON.stringify(detailPayload) : null,
    source_file: sourceFile,
    raw_payload_json: rawPayloadJson,
    raw_payload: record,
    last_pushed_at: normalizeDateTime(
      record.last_pushed_at ||
        record.lastPushedAt ||
        record.crawl_time ||
        embeddedRawPayload?.last_pushed_at ||
        embeddedRawPayload?.lastPushedAt ||
        embeddedRawPayload?.crawl_time
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

function preserveExistingValue(nextValue, existingValue) {
  return nextValue === null || typeof nextValue === 'undefined' ? existingValue ?? null : nextValue;
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

async function archiveTenderSourceFiles(options = {}) {
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

  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'zh-CN'));

  if (jsonFiles.length === 0) {
    return {
      directoryPath,
      archiveDirectoryPath: null,
      fileCount: 0,
      archivedFiles: [],
    };
  }

  const archiveDirectoryPath = path.join(
    directoryPath,
    `_backup_${formatArchiveTimestamp()}`
  );
  await fs.mkdir(archiveDirectoryPath, { recursive: true });

  const archivedFiles = [];
  for (const fileName of jsonFiles) {
    const sourcePath = path.join(directoryPath, fileName);
    const targetPath = path.join(archiveDirectoryPath, fileName);
    await fs.rename(sourcePath, targetPath);
    archivedFiles.push(fileName);
  }

  return {
    directoryPath,
    archiveDirectoryPath,
    fileCount: archivedFiles.length,
    archivedFiles,
  };
}

async function syncTenderFiles(options = {}) {
  await tenderStagingModel.ensureSchema();
  await tenderWebSearchResultModel.ensureSchema();

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
    pruned: 0,
    preservedWithTrace: 0,
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
    const wasSoftDeleted = Boolean(existing?.deleted_at);

    const nextRow = {
      source_item_id: record.source_item_id,
      source_origin_id: record.source_origin_id,
      source_record_id: record.source_record_id,
      title: record.title,
      notice_type: record.notice_type,
      published_at: record.published_at,
      published_date: record.published_date,
      deadline_at: preserveExistingValue(record.deadline_at, existing?.deadline_at),
      deadline_date: preserveExistingValue(record.deadline_date, existing?.deadline_date),
      issuer: preserveExistingValue(record.issuer, existing?.issuer),
      budget_amount: record.budget_amount,
      region: record.region,
      source_platform: record.source_platform,
      source_url: record.source_url,
      summary: record.summary,
      detail_excerpt: record.detail_excerpt,
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
      last_parsed_at: existing?.last_parsed_at || null,
      parse_status: existing?.parse_status || 'never_parsed',
      parse_error: existing?.parse_error || null,
      parse_meta_json: existing?.parse_meta_json || null,
      deleted_at: null,
      delete_reason: null,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    if (!existing) {
      await tenderStagingModel.createTenderStaging(nextRow);
      summary.created += 1;
      continue;
    }

    if (!payloadChanged && !wasSoftDeleted) {
      await tenderStagingModel.updateTenderStaging(existing.id, nextRow);
      summary.unchanged += 1;
      continue;
    }

    await tenderStagingModel.updateTenderStaging(existing.id, nextRow);
    summary.updated += 1;
  }

  if (options.pruneMissing !== false) {
    const syncedSourceItemIds = new Set(
      normalizedRecords.map((record) => record.source_item_id)
    );
    const activeRows = await tenderStagingModel.listActiveTenderStagingForPrune();
    const staleRows = activeRows.filter(
      (record) => !syncedSourceItemIds.has(record.source_item_id)
    );

    if (staleRows.length > 0) {
      const staleIdsToSoftDelete = [];

      for (const staleRow of staleRows) {
        const hasPushTrace =
          staleRow.push_status !== 'pending' ||
          Boolean(staleRow.push_error) ||
          Boolean(staleRow.pushed_at);
        const hasParseTrace =
          staleRow.parse_status && staleRow.parse_status !== 'never_parsed';
        const hasWebSearchTrace =
          await tenderWebSearchResultModel.hasSavedResultByTenderStagingId(staleRow.id);

        if (hasPushTrace || hasWebSearchTrace || hasParseTrace) {
          summary.preservedWithTrace += 1;
          continue;
        }

        staleIdsToSoftDelete.push(staleRow.id);
      }

      if (staleIdsToSoftDelete.length > 0) {
        summary.pruned = await tenderStagingModel.softDeleteTenderStagingByIds(
          staleIdsToSoftDelete
        );
      }
    }
  }

  return summary;
}

function normalizeListQuery(query = {}) {
  const page = Math.max(parseInt(query.current || query.page || '1', 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(parseInt(query.pageSize || '20', 10) || 20, 1),
    200
  );
  const allowedDataQualityFilters = new Set([
    'missing_issuer',
    'missing_deadline',
    'missing_content',
  ]);
  const allowedSortFields = new Set([
    'published_date',
    'deadline_date',
    'updated_at',
    'push_status',
  ]);
  const rawDataQuality = Array.isArray(query.data_quality)
    ? query.data_quality
    : String(query.data_quality || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
  const dataQuality = rawDataQuality.filter((item) =>
    allowedDataQualityFilters.has(item)
  );
  const sortBy =
    typeof query.sort_by === 'string' && allowedSortFields.has(query.sort_by)
      ? query.sort_by
      : null;
  const normalizedSortOrder = normalizeText(query.sort_order, 20)?.toLowerCase();
  const sortOrder =
    normalizedSortOrder === 'asc' || normalizedSortOrder === 'ascend'
      ? 'asc'
      : normalizedSortOrder === 'desc' || normalizedSortOrder === 'descend'
        ? 'desc'
        : null;

  return {
    page,
    pageSize,
    keyword: normalizeText(query.keyword, 120),
    title: normalizeText(query.title, 200),
    issuer: normalizeText(query.issuer, 200),
    push_status: normalizeText(query.push_status, 20),
    source_file: normalizeText(query.source_file, 200),
    data_quality: dataQuality,
    sort_by: sortBy,
    sort_order: sortOrder,
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
  if (!record || record.deleted_at) {
    throw new HttpError(404, '待推送招标不存在', 'NotFoundError');
  }

  return record;
}

async function cleanupTenderStaging(payload) {
  const { publishedDateBefore, createdAtBefore, statusFilter } = payload;
  if (!publishedDateBefore && !createdAtBefore) {
    throw validationError('请至少指定一种时间清理条件');
  }

  const deletedCount = await tenderStagingModel.cleanupTenderStaging({
    publishedDateBefore,
    createdAtBefore,
    statusFilter,
  });

  return { deletedCount };
}

module.exports = {
  getDefaultSpiderDataDir,
  archiveTenderSourceFiles,
  listTenderStaging,
  getRequiredTenderStaging,
  syncTenderFiles,
  cleanupTenderStaging,
};
