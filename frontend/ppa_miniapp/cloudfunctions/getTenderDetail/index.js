const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

const MEMBERSHIP_STATUS = {
  inactive: 'inactive',
  active: 'active',
  expired: 'expired',
};

const ACCESS_STATE = {
  full: 'full',
  membership_required: 'membership_required',
  membership_expired: 'membership_expired',
};

const EVALUATION_STATUS = {
  available: 'available',
  not_available: 'not_available',
};

const SERVICE_MODE = {
  web_assessment: 'web_assessment',
};

const MEMBERSHIP_ACTIVITY_ACTION = {
  view_full_detail: 'view_full_detail',
};

const MEMBERSHIP_RECORD_FETCH_LIMIT = 20;
const EVALUATION_RECORD_FETCH_LIMIT = 20;
const PUBLIC_TENDER_FIELDS = [
  'source_item_id',
  'title',
  'summary',
  'published_at',
  'published_date',
  'deadline_at',
  'deadline_date',
  'issuer',
  'budget_amount',
  'region',
  'source_platform',
  'adopt_status',
  'adopted_by_name',
  'adopted_at',
];

function success(data) {
  return {
    success: true,
    data,
    error: '',
    errorCode: '',
  };
}

function fail(message, errorCode = 'SYSTEM_ERROR') {
  return {
    success: false,
    data: null,
    error: message,
    errorCode,
  };
}

function toTrimmedString(value) {
  return String(value || '').trim();
}

function normalizeTimestamp(value) {
  const normalized = toTrimmedString(value);

  if (!normalized) {
    return '';
  }

  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString();
}

function resolveSortTimestamp(record) {
  return (
    normalizeTimestamp(record.updated_at) ||
    normalizeTimestamp(record.expires_at) ||
    normalizeTimestamp(record.starts_at) ||
    normalizeTimestamp(record.created_at)
  );
}

function resolveMembershipSnapshot(record, now = new Date()) {
  if (!record) {
    return {
      membership_status: MEMBERSHIP_STATUS.inactive,
      access_state: ACCESS_STATE.membership_required,
      expires_at: '',
      starts_at: '',
    };
  }

  const startsAt = normalizeTimestamp(record.starts_at);
  const expiresAt = normalizeTimestamp(record.expires_at);
  const rawStatus = toTrimmedString(record.status).toLowerCase();
  const nowMs = now.getTime();
  const startsAtMs = startsAt ? Date.parse(startsAt) : null;
  const expiresAtMs = expiresAt ? Date.parse(expiresAt) : null;
  const isStarted = !startsAtMs || startsAtMs <= nowMs;
  const isExpiredByTime = Boolean(expiresAtMs) && expiresAtMs <= nowMs;
  const isActiveByTime = Boolean(expiresAtMs) && expiresAtMs > nowMs && isStarted;

  if (rawStatus === MEMBERSHIP_STATUS.expired || isExpiredByTime) {
    return {
      membership_status: MEMBERSHIP_STATUS.expired,
      access_state: ACCESS_STATE.membership_expired,
      expires_at: expiresAt,
      starts_at: startsAt,
    };
  }

  if (rawStatus === MEMBERSHIP_STATUS.active && isActiveByTime) {
    return {
      membership_status: MEMBERSHIP_STATUS.active,
      access_state: ACCESS_STATE.full,
      expires_at: expiresAt,
      starts_at: startsAt,
    };
  }

  return {
    membership_status: MEMBERSHIP_STATUS.inactive,
    access_state: ACCESS_STATE.membership_required,
    expires_at: expiresAt,
    starts_at: startsAt,
  };
}

async function getLatestMembershipRecord(openid) {
  const response = await db
    .collection('miniapp_memberships')
    .where({ openid })
    .limit(MEMBERSHIP_RECORD_FETCH_LIMIT)
    .get();

  const records = Array.isArray(response.data) ? response.data.slice() : [];

  records.sort((left, right) => {
    const leftValue = resolveSortTimestamp(left);
    const rightValue = resolveSortTimestamp(right);

    if (leftValue === rightValue) {
      return 0;
    }

    return String(rightValue).localeCompare(String(leftValue));
  });

  return records[0] || null;
}

async function getLatestEvaluationRecord(sourceItemId) {
  try {
    const response = await db
      .collection('miniapp_tender_evaluations')
      .where({ source_item_id: sourceItemId })
      .limit(EVALUATION_RECORD_FETCH_LIMIT)
      .get();

    const records = Array.isArray(response.data) ? response.data.slice() : [];

    records.sort((left, right) => {
      const leftValue = resolveSortTimestamp(left);
      const rightValue = resolveSortTimestamp(right);

      if (leftValue === rightValue) {
        return Number(right.evaluation_version || 0) - Number(left.evaluation_version || 0);
      }

      return String(rightValue).localeCompare(String(leftValue));
    });

    return records[0] || null;
  } catch (error) {
    console.error('Failed to query tender evaluation link', {
      message: error && error.message,
      source_item_id: sourceItemId,
    });

    return null;
  }
}

function buildRestrictedTender(tender, snapshot, serviceEntry) {
  const restrictedTender = {};

  PUBLIC_TENDER_FIELDS.forEach((field) => {
    if (tender[field] !== undefined) {
      restrictedTender[field] = tender[field];
    }
  });

  return {
    ...restrictedTender,
    ...snapshot,
    service_entry: serviceEntry,
  };
}

async function logMembershipActivity({ openid, tender, snapshot }) {
  const nowIso = new Date().toISOString();

  await db.collection('miniapp_membership_activity_logs').add({
    data: {
      openid,
      source_item_id: toTrimmedString(tender.source_item_id),
      title: toTrimmedString(tender.title),
      issuer: toTrimmedString(tender.issuer),
      source_platform: toTrimmedString(tender.source_platform),
      action: MEMBERSHIP_ACTIVITY_ACTION.view_full_detail,
      membership_status_snapshot: toTrimmedString(snapshot.membership_status),
      accessed_at: nowIso,
      created_at: nowIso,
    },
  });
}

function buildEvaluationSummary(record) {
  if (!record) {
    return {
      has_evaluation: false,
      evaluation_status: EVALUATION_STATUS.not_available,
      evaluation_id: '',
      evaluation_version: 0,
      title: '',
      summary: '',
      result_excerpt: '',
      source_url: '',
      artifact_count: 0,
      updated_at: '',
    };
  }

  return {
    has_evaluation: true,
    evaluation_status: EVALUATION_STATUS.available,
    evaluation_id: toTrimmedString(record.evaluation_id),
    evaluation_version: Number(record.evaluation_version || 0),
    title: toTrimmedString(record.title),
    summary: toTrimmedString(record.summary),
    result_excerpt: toTrimmedString(record.result_excerpt),
    source_url: toTrimmedString(record.source_url),
    artifact_count: Number(record.artifact_count || 0),
    updated_at: normalizeTimestamp(record.updated_at) || normalizeTimestamp(record.created_at),
  };
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toTrimmedString(item))
    .filter(Boolean);
}

function normalizeArtifactList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      artifact_id: toTrimmedString(item.artifact_id),
      name: toTrimmedString(item.name),
      file_type: toTrimmedString(item.file_type).toLowerCase(),
      download_url: toTrimmedString(item.download_url),
      updated_at: normalizeTimestamp(item.updated_at),
    }))
    .filter((item) => item.name && item.download_url)
    .filter((item) => {
      return ['xlsx', 'xls', 'excel'].includes(item.file_type) || !item.file_type;
    });
}

function buildEvaluationResult(record) {
  if (!record) {
    return {
      decision_label: '',
      confidence_label: '',
      analysis_summary: '',
      strengths: [],
      risks: [],
      recommended_actions: [],
    };
  }

  return {
    decision_label: toTrimmedString(record.decision_label),
    confidence_label: toTrimmedString(record.confidence_label),
    analysis_summary: toTrimmedString(record.analysis_summary),
    strengths: normalizeStringList(record.strengths),
    risks: normalizeStringList(record.risks),
    recommended_actions: normalizeStringList(record.recommended_actions),
  };
}

function buildEvaluationArtifacts(record) {
  if (!record) {
    return [];
  }

  return normalizeArtifactList(record.artifacts);
}

function buildServiceEntry(record) {
  if (!record || !record.service_enabled) {
    return {
      has_service_entry: false,
      service_mode: SERVICE_MODE.web_assessment,
      title: '',
      description: '',
      service_url: '',
      cta_text: '',
      evaluation_id: '',
    };
  }

  return {
    has_service_entry: true,
    service_mode: SERVICE_MODE.web_assessment,
    title: toTrimmedString(record.service_title) || '需要更深人工评估？',
    description:
      toTrimmedString(record.service_description) ||
      '如果当前会员内容还不足以完成决策，可以继续转到 Web 端项目评估服务进行深度分析。',
    service_url: toTrimmedString(record.service_url),
    cta_text: toTrimmedString(record.service_cta_text) || '了解 Web 端深度评估',
    evaluation_id: toTrimmedString(record.evaluation_id),
  };
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext();

    if (!OPENID) {
      return fail('请先登录后再查看详情', 'UNAUTHORIZED');
    }

    const sourceItemId = String(event.sourceItemId || '').trim();

    if (!sourceItemId) {
      return fail('缺少项目标识', 'TENDER_NOT_FOUND');
    }

    const response = await db.collection('tenders').where({ source_item_id: sourceItemId }).limit(1).get();

    if (!response.data.length) {
      return fail('未找到该招标信息', 'TENDER_NOT_FOUND');
    }

    const tender = response.data[0];
    const membership = await getLatestMembershipRecord(OPENID);
    const snapshot = resolveMembershipSnapshot(membership);
    const evaluationRecord = await getLatestEvaluationRecord(sourceItemId);
    const serviceEntry = buildServiceEntry(evaluationRecord);

    if (snapshot.access_state !== ACCESS_STATE.full) {
      return success(buildRestrictedTender(tender, snapshot, serviceEntry));
    }

    try {
      await logMembershipActivity({
        openid: OPENID,
        tender,
        snapshot,
      });
    } catch (error) {
      console.error('Failed to log membership activity', {
        message: error && error.message,
        openid: OPENID,
        source_item_id: sourceItemId,
      });
    }

    return success({
      ...tender,
      ...snapshot,
      evaluation_summary: buildEvaluationSummary(evaluationRecord),
      evaluation_result: buildEvaluationResult(evaluationRecord),
      evaluation_artifacts: buildEvaluationArtifacts(evaluationRecord),
      service_entry: serviceEntry,
    });
  } catch (error) {
    return fail(error.message || '获取详情失败');
  }
};
