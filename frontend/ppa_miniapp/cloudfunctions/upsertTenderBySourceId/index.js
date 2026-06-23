const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

const TENDER_FIELDS = [
  'title',
  'published_at',
  'published_date',
  'deadline_at',
  'deadline_date',
  'issuer',
  'budget_amount',
  'region',
  'source_platform',
  'source_url',
  'summary',
  'announcement_html',
  'announcement_plain_text',
  'detail_payload',
  'last_pushed_at',
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

function inferDate(dateTimeValue) {
  if (!dateTimeValue || typeof dateTimeValue !== 'string') {
    return '';
  }

  const matched = dateTimeValue.match(/^(\d{4}-\d{2}-\d{2})/);
  return matched ? matched[1] : '';
}

function normalizeBudgetAmount(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isNaN(parsedValue) ? value : parsedValue;
}

function normalizeTenderPayload(payload = {}) {
  const normalized = {};

  TENDER_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) {
      normalized[field] = payload[field];
    }
  });

  if (payload.source_platform === undefined && payload.sourcePlatform !== undefined) {
    normalized.source_platform = payload.sourcePlatform;
  }

  if (payload.source_url === undefined && payload.sourceUrl !== undefined) {
    normalized.source_url = payload.sourceUrl;
  }

  if (payload.detail_payload === undefined && payload.detailPayload !== undefined) {
    normalized.detail_payload = payload.detailPayload;
  }

  normalized.budget_amount = normalizeBudgetAmount(normalized.budget_amount);

  if (!normalized.published_date && normalized.published_at) {
    normalized.published_date = inferDate(normalized.published_at);
  }

  if (!normalized.deadline_date && normalized.deadline_at) {
    normalized.deadline_date = inferDate(normalized.deadline_at);
  }

  return normalized;
}

function mergeTenderData(existingTender = {}, incomingTender = {}, sourceItemId, now) {
  const merged = {
    source_item_id: sourceItemId,
    created_at: existingTender.created_at || incomingTender.created_at || now,
    updated_at: now,
    last_pushed_at: incomingTender.last_pushed_at || now,
    adopt_status: existingTender.adopt_status || 'unadopted',
    adopted_by_openid: existingTender.adopted_by_openid || '',
    adopted_by_name: existingTender.adopted_by_name || '',
    adopted_at: existingTender.adopted_at || '',
  };

  TENDER_FIELDS.forEach((field) => {
    if (incomingTender[field] !== undefined) {
      merged[field] = incomingTender[field];
      return;
    }

    if (existingTender[field] !== undefined) {
      merged[field] = existingTender[field];
    }
  });

  if (!merged.published_date && merged.published_at) {
    merged.published_date = inferDate(merged.published_at);
  }

  if (!merged.deadline_date && merged.deadline_at) {
    merged.deadline_date = inferDate(merged.deadline_at);
  }

  return merged;
}

function validatePushSecret(secretKey) {
  const configuredSecret = String(process.env.PUSH_SECRET_KEY || '').trim();

  if (!configuredSecret) {
    return fail('未配置 PUSH_SECRET_KEY，无法使用推送写入接口', 'PUSH_SECRET_NOT_CONFIGURED');
  }

  if (String(secretKey || '').trim() !== configuredSecret) {
    return fail('推送鉴权失败', 'UNAUTHORIZED');
  }

  return null;
}

exports.main = async (event = {}) => {
  try {
    const secretError = validatePushSecret(event.secretKey);

    if (secretError) {
      return secretError;
    }

    const payload = event.data && typeof event.data === 'object' ? event.data : event;
    const sourceItemId = String(payload.source_item_id || payload.sourceItemId || event.sourceItemId || '').trim();

    if (!sourceItemId) {
      return fail('缺少 source_item_id', 'INVALID_SOURCE_ITEM_ID');
    }

    const normalizedPayload = normalizeTenderPayload(payload);
    const now = new Date().toISOString();

    const transactionResult = await db.runTransaction(async (transaction) => {
      const queryResult = await transaction.collection('tenders').where({ source_item_id: sourceItemId }).limit(1).get();
      const existingTender = queryResult.data[0];
      const mergedTender = mergeTenderData(existingTender, normalizedPayload, sourceItemId, now);

      if (existingTender) {
        await transaction.collection('tenders').doc(existingTender._id).update({
          data: mergedTender,
        });

        return {
          action: 'updated',
          source_item_id: sourceItemId,
          adopt_status: mergedTender.adopt_status,
          updated_at: mergedTender.updated_at,
          last_pushed_at: mergedTender.last_pushed_at,
        };
      }

      await transaction.collection('tenders').add({
        data: mergedTender,
      });

      return {
        action: 'created',
        source_item_id: sourceItemId,
        adopt_status: mergedTender.adopt_status,
        updated_at: mergedTender.updated_at,
        last_pushed_at: mergedTender.last_pushed_at,
      };
    });

    return success(transactionResult);
  } catch (error) {
    return fail(error.message || '写入招标数据失败');
  }
};
