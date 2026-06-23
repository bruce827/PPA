const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

const EVALUATION_RECORD_FETCH_LIMIT = 20;

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

function parseAllowedOpsOpenids() {
  return String(process.env.MEMBERSHIP_OPS_OPENIDS || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toTrimmedString(value) {
  return String(value || '').trim();
}

function pickFirstDefined(...values) {
  return values.find((value) => value !== undefined);
}

function normalizeTimestamp(value) {
  const normalized = toTrimmedString(value);

  if (!normalized) {
    return '';
  }

  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString();
}

function normalizePositiveInteger(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = toTrimmedString(value).toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) {
    return false;
  }

  return fallback;
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
      artifact_id: toTrimmedString(item.artifactId || item.artifact_id),
      name: toTrimmedString(item.name),
      file_type: toTrimmedString(item.fileType || item.file_type).toLowerCase() || 'xlsx',
      download_url: toTrimmedString(item.downloadUrl || item.download_url),
      updated_at: normalizeTimestamp(item.updatedAt || item.updated_at) || new Date().toISOString(),
    }))
    .filter((item) => item.name && item.download_url);
}

function buildServiceEntryPayload(event = {}) {
  const serviceTitle = toTrimmedString(pickFirstDefined(event.serviceTitle, event.service_title));
  const serviceDescription = toTrimmedString(
    pickFirstDefined(event.serviceDescription, event.service_description),
  );
  const serviceUrl = toTrimmedString(pickFirstDefined(event.serviceUrl, event.service_url));
  const serviceCtaText =
    toTrimmedString(pickFirstDefined(event.serviceCtaText, event.service_cta_text)) ||
    '了解 Web 端深度评估';
  const shouldEnableByContent = Boolean(serviceTitle || serviceDescription || serviceUrl);

  return {
    service_enabled: normalizeBoolean(
      pickFirstDefined(event.serviceEnabled, event.service_enabled),
      shouldEnableByContent,
    ),
    service_title: serviceTitle,
    service_description: serviceDescription,
    service_url: serviceUrl,
    service_cta_text: serviceCtaText,
  };
}

async function getExistingLink(sourceItemId, evaluationId, evaluationVersion) {
  const response = await db
    .collection('miniapp_tender_evaluations')
    .where({
      source_item_id: sourceItemId,
      evaluation_id: evaluationId,
    })
    .limit(EVALUATION_RECORD_FETCH_LIMIT)
    .get();

  const records = Array.isArray(response.data) ? response.data : [];

  return (
    records.find((item) => Number(item.evaluation_version || 0) === evaluationVersion) ||
    null
  );
}

exports.main = async (event = {}) => {
  try {
    const operatorOpenid = toTrimmedString(cloud.getWXContext().OPENID);

    if (!operatorOpenid) {
      return fail('请先登录后再关联人工评估结果', 'UNAUTHORIZED');
    }

    const allowedOpenids = parseAllowedOpsOpenids();

    if (!allowedOpenids.includes(operatorOpenid)) {
      return fail('当前账号没有人工评估关联权限', 'FORBIDDEN');
    }

    const sourceItemId = toTrimmedString(event.sourceItemId || event.source_item_id);
    const evaluationId = toTrimmedString(event.evaluationId || event.evaluation_id);
    const evaluationVersion = normalizePositiveInteger(event.evaluationVersion || event.evaluation_version || 1, 1);

    if (!sourceItemId) {
      return fail('缺少招标项目标识', 'INVALID_SOURCE_ITEM_ID');
    }

    if (!evaluationId) {
      return fail('缺少人工评估结果标识', 'INVALID_EVALUATION_ID');
    }

    const nowIso = new Date().toISOString();
    const payload = {
      source_item_id: sourceItemId,
      evaluation_id: evaluationId,
      evaluation_version: evaluationVersion,
      title: toTrimmedString(event.title),
      summary: toTrimmedString(event.summary),
      result_excerpt: toTrimmedString(event.resultExcerpt || event.result_excerpt),
      decision_label: toTrimmedString(event.decisionLabel || event.decision_label),
      confidence_label: toTrimmedString(event.confidenceLabel || event.confidence_label),
      analysis_summary: toTrimmedString(event.analysisSummary || event.analysis_summary),
      strengths: normalizeStringList(event.strengths),
      risks: normalizeStringList(event.risks),
      recommended_actions: normalizeStringList(event.recommendedActions || event.recommended_actions),
      source_url: toTrimmedString(event.sourceUrl || event.source_url),
      artifacts: normalizeArtifactList(event.artifacts),
      artifact_count: normalizePositiveInteger(
        event.artifactCount || event.artifact_count,
        normalizeArtifactList(event.artifacts).length,
      ),
      ...buildServiceEntryPayload(event),
      updated_at: nowIso,
      linked_by: operatorOpenid,
    };

    const existingRecord = await getExistingLink(sourceItemId, evaluationId, evaluationVersion);

    if (existingRecord && existingRecord._id) {
      await db.collection('miniapp_tender_evaluations').doc(existingRecord._id).update({
        data: payload,
      });

      return success({
        action: 'updated',
        source_item_id: sourceItemId,
        evaluation_id: evaluationId,
        evaluation_version: evaluationVersion,
        record_id: existingRecord._id,
        updated_at: nowIso,
      });
    }

    const addResult = await db.collection('miniapp_tender_evaluations').add({
      data: {
        ...payload,
        created_at: nowIso,
      },
    });

    return success({
      action: 'created',
      source_item_id: sourceItemId,
      evaluation_id: evaluationId,
      evaluation_version: evaluationVersion,
      record_id: addResult._id,
      updated_at: nowIso,
    });
  } catch (error) {
    return fail(error.message || '关联人工评估结果失败');
  }
};
