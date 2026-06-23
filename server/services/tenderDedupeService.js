const crypto = require('crypto');

const tenderStagingModel = require('../models/tenderStagingModel');
const tenderWebSearchResultModel = require('../models/tenderWebSearchResultModel');
const { validationError } = require('../utils/errors');

const URL_QUERY_PARAMS_TO_IGNORE = new Set(['token', 't', 'y']);
const TEXT_PREFIX_LENGTH = 300;
const CODE_PATTERNS = [
  /(项目编号)\s*[:：]?\s*([A-Za-z0-9][A-Za-z0-9\s._/-]{2,80})/i,
  /(招标编号)\s*[:：]?\s*([A-Za-z0-9][A-Za-z0-9\s._/-]{2,80})/i,
  /(采购编号)\s*[:：]?\s*([A-Za-z0-9][A-Za-z0-9\s._/-]{2,80})/i,
];
const CORE_FIELD_KEYS = [
  'published_date',
  'deadline_date',
  'issuer',
  'source_url',
  'budget_amount',
  'region',
  'announcement_plain_text',
];

function ensureString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function normalizeComparableText(value, maxLength = null) {
  const normalized = ensureString(value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return '';
  }

  const compact = normalized.replace(/[^\p{L}\p{N}]+/gu, '');
  return maxLength ? compact.slice(0, maxLength) : compact;
}

function normalizeDisplayText(value) {
  return ensureString(value).replace(/\s+/g, ' ').trim();
}

function normalizeUrl(value) {
  const raw = normalizeDisplayText(value);
  if (!raw) {
    return '';
  }

  try {
    const parsed = new URL(raw);
    parsed.hash = '';

    Array.from(parsed.searchParams.keys()).forEach((key) => {
      if (URL_QUERY_PARAMS_TO_IGNORE.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    });

    const stableParams = Array.from(parsed.searchParams.entries()).sort((left, right) =>
      `${left[0]}=${left[1]}`.localeCompare(`${right[0]}=${right[1]}`, 'zh-CN')
    );
    parsed.search = '';
    stableParams.forEach(([key, currentValue]) => {
      parsed.searchParams.append(key, currentValue);
    });

    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.origin.toLowerCase()}${pathname}${
      parsed.search ? `?${parsed.searchParams.toString()}` : ''
    }`;
  } catch (_error) {
    return raw.replace(/[?#].*$/, '').replace(/\/+$/, '');
  }
}

function buildComparableTextPrefix(record) {
  const sourceText =
    normalizeDisplayText(record.announcement_plain_text) ||
    normalizeDisplayText(record.detail_excerpt);

  if (!sourceText) {
    return '';
  }

  return normalizeComparableText(sourceText, TEXT_PREFIX_LENGTH);
}

function normalizeCode(value) {
  return normalizeDisplayText(value).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function extractCode(record) {
  const sourceText = [
    normalizeDisplayText(record.title),
    normalizeDisplayText(record.announcement_plain_text),
    normalizeDisplayText(record.detail_excerpt),
  ]
    .filter(Boolean)
    .join('\n');

  if (!sourceText) {
    return '';
  }

  for (const pattern of CODE_PATTERNS) {
    const matched = sourceText.match(pattern);
    if (!matched || !matched[2]) {
      continue;
    }

    const normalized = normalizeCode(matched[2]);
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function countFieldCompleteness(record) {
  return CORE_FIELD_KEYS.reduce((count, key) => {
    return normalizeDisplayText(record[key]) ? count + 1 : count;
  }, 0);
}

function enrichRecord(record, savedResultIdSet) {
  const hasPushTrace =
    record.push_status !== 'pending' ||
    Boolean(record.push_error) ||
    Boolean(record.pushed_at);
  const hasWebSearchTrace = savedResultIdSet.has(record.id);
  const hasParseTrace =
    normalizeDisplayText(record.parse_status) &&
    normalizeDisplayText(record.parse_status) !== 'never_parsed';
  const traceCount = [hasPushTrace, hasWebSearchTrace, hasParseTrace].filter(Boolean).length;
  const textLength = normalizeDisplayText(record.announcement_plain_text).length;
  const completenessScore = countFieldCompleteness(record);

  return {
    ...record,
    normalized_title: normalizeComparableText(record.title),
    normalized_url: normalizeUrl(record.source_url),
    normalized_text_prefix: buildComparableTextPrefix(record),
    extracted_code: extractCode(record),
    has_push_trace: hasPushTrace,
    has_web_search_trace: hasWebSearchTrace,
    has_parse_trace: hasParseTrace,
    trace_count: traceCount,
    has_any_trace: traceCount > 0,
    text_length: textLength,
    completeness_score: completenessScore,
  };
}

function buildUnionFind(records) {
  const parent = new Map();

  records.forEach((record) => {
    parent.set(record.id, record.id);
  });

  function find(id) {
    let current = parent.get(id);
    while (current !== parent.get(current)) {
      current = parent.get(current);
    }

    let node = id;
    while (parent.get(node) !== current) {
      const next = parent.get(node);
      parent.set(node, current);
      node = next;
    }

    return current;
  }

  function union(leftId, rightId) {
    const leftRoot = find(leftId);
    const rightRoot = find(rightId);
    if (leftRoot !== rightRoot) {
      parent.set(rightRoot, leftRoot);
    }
  }

  return {
    find,
    union,
  };
}

function buildGroups(records, relationMatcher) {
  if (!Array.isArray(records) || records.length === 0) {
    return [];
  }

  const unionFind = buildUnionFind(records);

  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
      if (relationMatcher(records[leftIndex], records[rightIndex]).matched) {
        unionFind.union(records[leftIndex].id, records[rightIndex].id);
      }
    }
  }

  const grouped = new Map();
  records.forEach((record) => {
    const root = unionFind.find(record.id);
    if (!grouped.has(root)) {
      grouped.set(root, []);
    }
    grouped.get(root).push(record);
  });

  return Array.from(grouped.values())
    .filter((group) => group.length > 1)
    .map((group) => group.sort((left, right) => left.id - right.id));
}

function buildCandidateRelation(left, right) {
  if (left.source_platform !== right.source_platform) {
    return { matched: false, reasons: [] };
  }

  if (
    !left.normalized_title ||
    !right.normalized_title ||
    left.normalized_title !== right.normalized_title
  ) {
    return { matched: false, reasons: [] };
  }

  const reasons = [];
  reasons.push('same_title');
  if (
    left.normalized_url &&
    right.normalized_url &&
    left.normalized_url === right.normalized_url
  ) {
    reasons.push('same_url');
  }

  return {
    matched: true,
    reasons,
  };
}

function buildStrongRelation(left, right) {
  if (left.source_platform !== right.source_platform) {
    return { matched: false, reasons: [] };
  }

  const sameTitle =
    left.normalized_title &&
    right.normalized_title &&
    left.normalized_title === right.normalized_title;
  const sameUrl =
    left.normalized_url &&
    right.normalized_url &&
    left.normalized_url === right.normalized_url;
  const sameTextPrefix =
    left.normalized_text_prefix &&
    left.normalized_text_prefix === right.normalized_text_prefix;
  const sameCode =
    left.extracted_code &&
    right.extracted_code &&
    left.extracted_code === right.extracted_code;
  let matchedFields = 0;
  if (
    normalizeDisplayText(left.published_date) &&
    normalizeDisplayText(left.published_date) === normalizeDisplayText(right.published_date)
  ) {
    matchedFields += 1;
  }
  if (
    normalizeDisplayText(left.deadline_date) &&
    normalizeDisplayText(left.deadline_date) === normalizeDisplayText(right.deadline_date)
  ) {
    matchedFields += 1;
  }
  if (
    normalizeDisplayText(left.issuer) &&
    normalizeComparableText(left.issuer) === normalizeComparableText(right.issuer)
  ) {
    matchedFields += 1;
  }

  if (
    sameCode &&
    sameTitle
  ) {
    return { matched: true, reasons: ['same_code', 'same_title'] };
  }

  if (
    sameUrl &&
    sameTitle &&
    (sameTextPrefix || sameCode || matchedFields >= 2)
  ) {
    const reasons = ['same_url', 'same_title'];
    if (sameTextPrefix) {
      reasons.push('same_text_prefix');
    }
    if (sameCode) {
      reasons.push('same_code');
    }
    if (matchedFields >= 2) {
      reasons.push('same_meta');
    }
    return { matched: true, reasons };
  }

  if (
    sameTitle &&
    sameTextPrefix
  ) {
    if (matchedFields >= 2) {
      return { matched: true, reasons: ['same_title', 'same_text_prefix', 'same_meta'] };
    }
  }

  return { matched: false, reasons: [] };
}

function collectGroupReasonKeys(group, relationMatcher) {
  const reasons = new Set();

  for (let leftIndex = 0; leftIndex < group.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < group.length; rightIndex += 1) {
      const relation = relationMatcher(group[leftIndex], group[rightIndex]);
      if (relation.matched) {
        relation.reasons.forEach((reason) => reasons.add(reason));
      }
    }
  }

  return Array.from(reasons);
}

function buildRecordScore(record) {
  const updatedAtScore = Date.parse(record.updated_at || '') || 0;

  return (
    (record.has_push_trace ? 1000000 : 0) +
    (record.has_web_search_trace ? 500000 : 0) +
    (record.has_parse_trace ? 300000 : 0) +
    record.completeness_score * 10000 +
    Math.min(record.text_length, 10000) +
    updatedAtScore / 100000
  );
}

function buildKeeperReason(record) {
  if (record.has_push_trace) {
    return '保留有推送痕迹的记录';
  }
  if (record.has_web_search_trace) {
    return '保留有全网检索痕迹的记录';
  }
  if (record.has_parse_trace) {
    return '保留有解析痕迹的记录';
  }
  if (record.text_length > 0) {
    return '保留正文更完整的记录';
  }
  if (record.completeness_score > 0) {
    return '保留字段更完整的记录';
  }
  return '保留更新时间较新的记录';
}

function pickKeeper(group) {
  const ranked = [...group].sort((left, right) => {
    const scoreGap = buildRecordScore(right) - buildRecordScore(left);
    if (scoreGap !== 0) {
      return scoreGap;
    }
    return left.id - right.id;
  });

  return ranked[0];
}

function buildGroupKey(group) {
  const ids = group.map((record) => record.id).sort((left, right) => left - right);
  return `dedupe_${crypto
    .createHash('sha1')
    .update(ids.join(','))
    .digest('hex')
    .slice(0, 16)}`;
}

function mapPreviewRecord(record, keeperId) {
  return {
    id: record.id,
    source_item_id: record.source_item_id,
    title: record.title,
    source_platform: record.source_platform,
    source_url: record.source_url,
    published_date: record.published_date || null,
    deadline_date: record.deadline_date || null,
    issuer: record.issuer || null,
    extracted_code: record.extracted_code || null,
    text_length: record.text_length,
    has_push_trace: record.has_push_trace,
    has_web_search_trace: record.has_web_search_trace,
    has_parse_trace: record.has_parse_trace,
    is_keeper: record.id === keeperId,
  };
}

function buildPreviewGroup(group, action, relationMatcher, options = {}) {
  const keeper = pickKeeper(group);
  const traceRecords = group.filter((record) => record.has_any_trace);

  return {
    group_key: buildGroupKey(group),
    action,
    reason_keys: collectGroupReasonKeys(group, relationMatcher),
    keeper_id: keeper.id,
    keeper_reason: buildKeeperReason(keeper),
    skipped_reason: options.skipped_reason || null,
    delete_ids:
      action === 'auto_delete'
        ? group
            .filter((record) => record.id !== keeper.id)
            .map((record) => record.id)
            .sort((left, right) => left - right)
        : [],
    records: group.map((record) => mapPreviewRecord(record, keeper.id)),
    traced_record_count: traceRecords.length,
  };
}

function buildReviewGroupForCandidate(group) {
  return buildPreviewGroup(group, 'review_only', buildCandidateRelation, {
    skipped_reason: 'candidate_only',
  });
}

function buildReviewGroupForStrong(group) {
  return buildPreviewGroup(group, 'review_only', buildStrongRelation, {
    skipped_reason: 'multiple_traced_records',
  });
}

async function buildDedupePreview() {
  await tenderStagingModel.ensureSchema();
  await tenderWebSearchResultModel.ensureSchema();

  const records = await tenderStagingModel.listActiveTenderStagingForDedupe();
  const savedResultIds = await tenderWebSearchResultModel.listTenderStagingIdsWithSavedResults(
    records.map((record) => record.id)
  );
  const savedResultIdSet = new Set(savedResultIds);
  const enrichedRecords = records.map((record) => enrichRecord(record, savedResultIdSet));

  const autoDeleteGroups = [];
  const reviewOnlyGroups = [];
  const coveredRecordIds = new Set();

  const strongGroups = buildGroups(enrichedRecords, buildStrongRelation);
  strongGroups.forEach((group) => {
    const tracedCount = group.filter((record) => record.has_any_trace).length;
    const previewGroup =
      tracedCount >= 2 ? buildReviewGroupForStrong(group) : buildPreviewGroup(group, 'auto_delete', buildStrongRelation);

    if (previewGroup.action === 'auto_delete' && previewGroup.delete_ids.length > 0) {
      autoDeleteGroups.push(previewGroup);
      group.forEach((record) => coveredRecordIds.add(record.id));
      return;
    }

    reviewOnlyGroups.push(previewGroup);
    group.forEach((record) => coveredRecordIds.add(record.id));
  });

  const candidateGroups = buildGroups(enrichedRecords, buildCandidateRelation);
  candidateGroups.forEach((group) => {
    const remainingRecords = group.filter((record) => !coveredRecordIds.has(record.id));
    if (remainingRecords.length <= 1) {
      return;
    }

    reviewOnlyGroups.push(buildReviewGroupForCandidate(remainingRecords));
    remainingRecords.forEach((record) => coveredRecordIds.add(record.id));
  });

  const sortedGroups = [...autoDeleteGroups, ...reviewOnlyGroups].sort((left, right) => {
    if (left.action !== right.action) {
      return left.action === 'auto_delete' ? -1 : 1;
    }

    const deleteGap = (right.delete_ids?.length || 0) - (left.delete_ids?.length || 0);
    if (deleteGap !== 0) {
      return deleteGap;
    }

    return left.group_key.localeCompare(right.group_key, 'zh-CN');
  });

  return {
    scanned_record_count: enrichedRecords.length,
    groups_total: sortedGroups.length,
    auto_deletable_groups: autoDeleteGroups.length,
    review_only_groups: reviewOnlyGroups.length,
    delete_candidate_count: autoDeleteGroups.reduce(
      (total, group) => total + group.delete_ids.length,
      0
    ),
    groups: sortedGroups,
  };
}

async function previewTenderDedupe() {
  return buildDedupePreview();
}

async function executeTenderDedupe(payload = {}) {
  const preview = await buildDedupePreview();
  const requestedGroupKeys = Array.isArray(payload.group_keys)
    ? payload.group_keys.filter((value) => typeof value === 'string' && value)
    : null;

  const autoGroups = preview.groups.filter((group) => group.action === 'auto_delete');
  const executableGroups = requestedGroupKeys
    ? autoGroups.filter((group) => requestedGroupKeys.includes(group.group_key))
    : autoGroups;

  if (requestedGroupKeys && executableGroups.length !== requestedGroupKeys.length) {
    throw validationError('存在无效或不可执行的整理分组');
  }

  const deleteIds = executableGroups
    .flatMap((group) => group.delete_ids)
    .filter((value) => Number.isInteger(value));

  if (deleteIds.length === 0) {
    return {
      deleted_staging_count: 0,
      deleted_web_search_count: 0,
      executed_group_count: 0,
      skipped_group_count: preview.review_only_groups,
    };
  }

  const deletedWebSearchCount =
    await tenderWebSearchResultModel.deleteByTenderStagingIds(deleteIds);
  const deletedStagingCount = await tenderStagingModel.deleteTenderStagingByIds(deleteIds);

  return {
    deleted_staging_count: deletedStagingCount,
    deleted_web_search_count: deletedWebSearchCount,
    executed_group_count: executableGroups.length,
    skipped_group_count: preview.review_only_groups,
  };
}

module.exports = {
  previewTenderDedupe,
  executeTenderDedupe,
};
