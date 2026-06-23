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

const MEMBERSHIP_RECORD_FETCH_LIMIT = 20;
const ORDER_RECORD_FETCH_LIMIT = 20;
const OPS_LOG_FETCH_LIMIT = 20;

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
    normalizeTimestamp(record.created_at) ||
    normalizeTimestamp(record.expires_at) ||
    normalizeTimestamp(record.paid_at) ||
    normalizeTimestamp(record.notify_received_at) ||
    normalizeTimestamp(record.starts_at)
  );
}

function resolveMembershipSnapshot(record, now = new Date()) {
  if (!record) {
    return {
      membership_status: MEMBERSHIP_STATUS.inactive,
      access_state: ACCESS_STATE.membership_required,
      expires_at: '',
      starts_at: '',
      plan_code: '',
      latest_order_no: '',
      membership_record_id: '',
      has_membership_record: false,
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
      plan_code: toTrimmedString(record.plan_code),
      latest_order_no: toTrimmedString(record.latest_order_no),
      membership_record_id: toTrimmedString(record._id),
      has_membership_record: true,
    };
  }

  if (rawStatus === MEMBERSHIP_STATUS.active && isActiveByTime) {
    return {
      membership_status: MEMBERSHIP_STATUS.active,
      access_state: ACCESS_STATE.full,
      expires_at: expiresAt,
      starts_at: startsAt,
      plan_code: toTrimmedString(record.plan_code),
      latest_order_no: toTrimmedString(record.latest_order_no),
      membership_record_id: toTrimmedString(record._id),
      has_membership_record: true,
    };
  }

  return {
    membership_status: MEMBERSHIP_STATUS.inactive,
    access_state: ACCESS_STATE.membership_required,
    expires_at: expiresAt,
    starts_at: startsAt,
    plan_code: toTrimmedString(record.plan_code),
    latest_order_no: toTrimmedString(record.latest_order_no),
    membership_record_id: toTrimmedString(record._id),
    has_membership_record: true,
  };
}

function sortRecords(records) {
  const cloned = Array.isArray(records) ? records.slice() : [];

  cloned.sort((left, right) => {
    const leftValue = resolveSortTimestamp(left);
    const rightValue = resolveSortTimestamp(right);

    if (leftValue === rightValue) {
      return 0;
    }

    return String(rightValue).localeCompare(String(leftValue));
  });

  return cloned;
}

async function getLatestMembershipRecord(openid) {
  const response = await db
    .collection('miniapp_memberships')
    .where({ openid })
    .limit(MEMBERSHIP_RECORD_FETCH_LIMIT)
    .get();

  return sortRecords(response.data)[0] || null;
}

async function getLatestOrderRecord(openid) {
  const response = await db
    .collection('miniapp_membership_orders')
    .where({ openid })
    .limit(ORDER_RECORD_FETCH_LIMIT)
    .get();

  return sortRecords(response.data)[0] || null;
}

async function getOrderRecordByTradeNo(outTradeNo) {
  const response = await db
    .collection('miniapp_membership_orders')
    .where({ out_trade_no: outTradeNo })
    .limit(1)
    .get();

  return response.data[0] || null;
}

async function getLatestOpsLog(openid) {
  try {
    const response = await db
      .collection('miniapp_membership_ops_log')
      .where({ openid })
      .limit(OPS_LOG_FETCH_LIMIT)
      .get();

    return {
      record: sortRecords(response.data)[0] || null,
      query_state: 'ready',
      query_error: '',
    };
  } catch (error) {
    return {
      record: null,
      query_state: 'unavailable',
      query_error: toTrimmedString(error && error.message) || 'OPS_LOG_QUERY_FAILED',
    };
  }
}

function summarizeOrder(order) {
  if (!order) {
    return null;
  }

  return {
    out_trade_no: toTrimmedString(order.out_trade_no),
    order_type: toTrimmedString(order.order_type),
    status: toTrimmedString(order.status),
    amount_fen: Number(order.amount_fen || 0),
    currency: toTrimmedString(order.currency),
    source_item_id: toTrimmedString(order.source_item_id),
    membership_record_id: toTrimmedString(order.membership_record_id),
    membership_status_snapshot: toTrimmedString(order.membership_status_snapshot),
    paid_at: normalizeTimestamp(order.paid_at),
    effective_from: normalizeTimestamp(order.effective_from),
    effective_until: normalizeTimestamp(order.effective_until),
    raw_notify_summary: toTrimmedString(order.raw_notify_summary),
    status_history: Array.isArray(order.status_history)
      ? order.status_history.map((item) => ({
          status: toTrimmedString(item.status),
          timestamp: normalizeTimestamp(item.timestamp),
          note: toTrimmedString(item.note),
        }))
      : [],
    created_at: normalizeTimestamp(order.created_at),
    updated_at: normalizeTimestamp(order.updated_at),
  };
}

function summarizeOpsLog(record) {
  if (!record) {
    return null;
  }

  return {
    action: toTrimmedString(record.action),
    target_type: toTrimmedString(record.target_type),
    target_id: toTrimmedString(record.target_id),
    operator: toTrimmedString(record.operator),
    reason: toTrimmedString(record.reason),
    created_at: normalizeTimestamp(record.created_at),
  };
}

exports.main = async (event = {}) => {
  try {
    const operatorOpenid = toTrimmedString(cloud.getWXContext().OPENID);

    if (!operatorOpenid) {
      return fail('请先登录后再查询会员与订单状态', 'UNAUTHORIZED');
    }

    const allowedOpenids = parseAllowedOpsOpenids();

    if (!allowedOpenids.includes(operatorOpenid)) {
      return fail('当前账号没有内部诊断权限', 'FORBIDDEN');
    }

    const openid = toTrimmedString(event.openid);
    const outTradeNo = toTrimmedString(event.outTradeNo || event.out_trade_no);

    if (!openid && !outTradeNo) {
      return fail('请提供 openid 或订单号进行查询', 'INVALID_QUERY');
    }

    let resolvedOpenid = openid;
    let targetOrder = null;
    let queryType = 'openid';

    if (outTradeNo) {
      targetOrder = await getOrderRecordByTradeNo(outTradeNo);

      if (!targetOrder) {
        return fail('未找到对应的会员订单', 'ORDER_NOT_FOUND');
      }

      resolvedOpenid = toTrimmedString(targetOrder.openid);
      queryType = 'order';
    }

    if (!resolvedOpenid) {
      return fail('未找到可用于诊断的用户标识', 'INVALID_QUERY');
    }

    const [membership, latestOrder, latestOpsLogResult] = await Promise.all([
      getLatestMembershipRecord(resolvedOpenid),
      getLatestOrderRecord(resolvedOpenid),
      getLatestOpsLog(resolvedOpenid),
    ]);

    return success({
      query_type: queryType,
      query_openid: resolvedOpenid,
      query_out_trade_no: outTradeNo,
      membership: resolveMembershipSnapshot(membership),
      latest_order: summarizeOrder(latestOrder),
      target_order: outTradeNo ? summarizeOrder(targetOrder) : null,
      latest_ops_log: summarizeOpsLog(latestOpsLogResult.record),
      ops_log_query_state: latestOpsLogResult.query_state,
      ops_log_query_error: latestOpsLogResult.query_error,
      has_latest_order: Boolean(latestOrder),
      has_target_order: Boolean(targetOrder),
      has_ops_log: Boolean(latestOpsLogResult.record),
    });
  } catch (error) {
    return fail(error.message || '查询会员与订单状态失败');
  }
};
