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

const ORDER_STATUS = {
  created: 'created',
  pay_pending: 'pay_pending',
  paid: 'paid',
  granted: 'granted',
  failed: 'failed',
  cancelled: 'cancelled',
  manual_fixed: 'manual_fixed',
};

const ACTION = {
  grant_membership: 'grant_membership',
  update_membership_status: 'update_membership_status',
  update_order_status: 'update_order_status',
};

const QUERY_TYPE = {
  openid: 'openid',
  order: 'order',
};

const PLAN_DURATION_DAYS = 30;
const MEMBERSHIP_RECORD_FETCH_LIMIT = 20;
const ORDER_RECORD_FETCH_LIMIT = 20;

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

function addDays(timestamp, days) {
  const normalized = normalizeTimestamp(timestamp);

  if (!normalized) {
    return '';
  }

  return new Date(Date.parse(normalized) + days * 24 * 60 * 60 * 1000).toISOString();
}

function buildOrderHistoryEntry({ status, timestamp, note = '' }) {
  return {
    status: toTrimmedString(status),
    timestamp: normalizeTimestamp(timestamp) || new Date().toISOString(),
    note: toTrimmedString(note),
  };
}

function appendOrderHistory(existingHistory, entry) {
  const history = Array.isArray(existingHistory) ? existingHistory.slice() : [];

  history.push(entry);
  return history;
}

function resolveMembershipSnapshot(record, now = new Date()) {
  if (!record) {
    return {
      membership_status: MEMBERSHIP_STATUS.inactive,
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
    expires_at: expiresAt,
    starts_at: startsAt,
    plan_code: toTrimmedString(record.plan_code),
    latest_order_no: toTrimmedString(record.latest_order_no),
    membership_record_id: toTrimmedString(record._id),
    has_membership_record: true,
  };
}

function summarizeMembership(record) {
  const snapshot = resolveMembershipSnapshot(record);

  return {
    membership_status: snapshot.membership_status,
    starts_at: snapshot.starts_at,
    expires_at: snapshot.expires_at,
    plan_code: snapshot.plan_code,
    latest_order_no: snapshot.latest_order_no,
    membership_record_id: snapshot.membership_record_id,
    has_membership_record: snapshot.has_membership_record,
  };
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

async function getLatestMembershipRecord(openid) {
  const response = await db
    .collection('miniapp_memberships')
    .where({ openid })
    .limit(MEMBERSHIP_RECORD_FETCH_LIMIT)
    .get();

  return sortRecords(response.data)[0] || null;
}

async function getOrderByTradeNo(outTradeNo) {
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
      .limit(ORDER_RECORD_FETCH_LIMIT)
      .get();

    return sortRecords(response.data)[0] || null;
  } catch (error) {
    return null;
  }
}

async function updateOrderRecord(databaseApi, orderId, data) {
  await databaseApi.collection('miniapp_membership_orders').doc(orderId).update({
    data,
  });
}

async function upsertMembershipRecord({
  databaseApi,
  openid,
  currentMembership,
  planCode,
  status,
  startsAt,
  expiresAt,
  latestOrderNo,
  updatedAt,
}) {
  const membershipData = {
    openid,
    plan_code: planCode,
    status,
    starts_at: startsAt,
    expires_at: expiresAt,
    latest_order_no: latestOrderNo,
    updated_at: updatedAt,
  };

  if (currentMembership && currentMembership._id) {
    await databaseApi.collection('miniapp_memberships').doc(currentMembership._id).update({
      data: membershipData,
    });

    return currentMembership._id;
  }

  const addResult = await databaseApi.collection('miniapp_memberships').add({
    data: {
      ...membershipData,
      created_at: updatedAt,
    },
  });

  return addResult._id;
}

async function createOpsLog({
  databaseApi,
  targetType,
  targetId,
  openid,
  action,
  reason,
  operator,
  createdAt,
}) {
  const result = await databaseApi.collection('miniapp_membership_ops_log').add({
    data: {
      target_type: targetType,
      target_id: targetId,
      openid,
      action,
      reason,
      operator,
      created_at: createdAt,
    },
  });

  return {
    _id: result._id,
    target_type: targetType,
    target_id: targetId,
    openid,
    action,
    reason,
    operator,
    created_at: createdAt,
  };
}

function normalizeAction(value) {
  const normalized = toTrimmedString(value).toLowerCase();

  if (Object.prototype.hasOwnProperty.call(ACTION, normalized)) {
    return normalized;
  }

  return '';
}

function normalizeQueryType(value) {
  const normalized = toTrimmedString(value).toLowerCase();

  if (normalized === QUERY_TYPE.openid || normalized === QUERY_TYPE.order) {
    return normalized;
  }

  return '';
}

function normalizeMembershipStatus(value) {
  const normalized = toTrimmedString(value).toLowerCase();

  if (Object.prototype.hasOwnProperty.call(MEMBERSHIP_STATUS, normalized)) {
    return normalized;
  }

  return '';
}

function normalizeOrderStatus(value) {
  const normalized = toTrimmedString(value).toLowerCase();

  if (Object.prototype.hasOwnProperty.call(ORDER_STATUS, normalized)) {
    return normalized;
  }

  return '';
}

function validateQueryContext({ queryType, queryOpenid, queryOutTradeNo }) {
  if (!queryType) {
    return '缺少查询上下文类型，无法执行人工修正';
  }

  if (queryType === QUERY_TYPE.openid && !queryOpenid) {
    return '缺少查询得到的用户标识，无法执行人工修正';
  }

  if (queryType === QUERY_TYPE.order && !queryOutTradeNo) {
    return '缺少查询得到的订单号，无法执行人工修正';
  }

  return '';
}

async function resolveOperationTarget({ queryType, queryOpenid, queryOutTradeNo }) {
  let targetOrder = null;
  let resolvedOpenid = queryOpenid;

  if (queryType === QUERY_TYPE.order) {
    targetOrder = await getOrderByTradeNo(queryOutTradeNo);

    if (!targetOrder) {
      throw new Error('未找到需要修正的会员订单');
    }

    resolvedOpenid = toTrimmedString(targetOrder.openid);
  }

  if (!resolvedOpenid) {
    throw new Error('未找到需要修正的用户标识');
  }

  const membership = await getLatestMembershipRecord(resolvedOpenid);

  return {
    targetOrder,
    resolvedOpenid,
    membership,
  };
}

async function handleGrantMembership({
  transaction,
  resolvedOpenid,
  currentMembership,
  targetOrder,
  reason,
  operator,
}) {
  const updatedAt = new Date().toISOString();
  const currentSnapshot = resolveMembershipSnapshot(currentMembership);
  const startsAt =
    normalizeTimestamp(targetOrder && (targetOrder.paid_at || targetOrder.notify_received_at)) ||
    updatedAt;
  const expiresAt = addDays(startsAt, PLAN_DURATION_DAYS);
  const latestOrderNo =
    toTrimmedString(targetOrder && targetOrder.out_trade_no) ||
    currentSnapshot.latest_order_no ||
    '';
  const planCode =
    toTrimmedString(targetOrder && targetOrder.plan_code) ||
    currentSnapshot.plan_code ||
    'monthly_20';
  const nextStatusHistory =
    targetOrder && targetOrder._id
      ? appendOrderHistory(
          targetOrder.status_history,
          buildOrderHistoryEntry({
            status: ORDER_STATUS.manual_fixed,
            timestamp: updatedAt,
            note: '人工补开会员并修正订单状态',
          }),
        )
      : [];
  const membershipRecordId = await upsertMembershipRecord({
    databaseApi: transaction,
    openid: resolvedOpenid,
    currentMembership,
    planCode,
    status: MEMBERSHIP_STATUS.active,
    startsAt,
    expiresAt,
    latestOrderNo,
    updatedAt,
  });

  let refreshedOrder = targetOrder || null;

  if (targetOrder && targetOrder._id) {
    await updateOrderRecord(transaction, targetOrder._id, {
      status: ORDER_STATUS.manual_fixed,
      effective_from: startsAt,
      effective_until: expiresAt,
      membership_record_id: membershipRecordId,
      membership_status_snapshot: MEMBERSHIP_STATUS.active,
      raw_notify_summary: reason,
      status_history: nextStatusHistory,
      updated_at: updatedAt,
    });

    refreshedOrder = {
      ...targetOrder,
      status: ORDER_STATUS.manual_fixed,
      effective_from: startsAt,
      effective_until: expiresAt,
      membership_record_id: membershipRecordId,
      membership_status_snapshot: MEMBERSHIP_STATUS.active,
      raw_notify_summary: reason,
      status_history: nextStatusHistory,
      updated_at: updatedAt,
    };
  }

  const refreshedMembership = {
    ...(currentMembership || {}),
    _id: membershipRecordId,
    openid: resolvedOpenid,
    plan_code: planCode,
    status: MEMBERSHIP_STATUS.active,
    starts_at: startsAt,
    expires_at: expiresAt,
    latest_order_no: latestOrderNo,
    updated_at: updatedAt,
  };

  const opsLog = await createOpsLog({
    databaseApi: transaction,
    targetType: targetOrder ? 'order' : 'membership',
    targetId: targetOrder ? toTrimmedString(targetOrder.out_trade_no) : membershipRecordId,
    openid: resolvedOpenid,
    action: ACTION.grant_membership,
    reason,
    operator,
    createdAt: updatedAt,
  });

  return {
    membership: summarizeMembership(refreshedMembership),
    order: summarizeOrder(refreshedOrder),
    ops_log: summarizeOpsLog(opsLog),
    result: 'membership_granted',
    message: '人工补开已完成，用户可重新访问会员内容',
  };
}

async function handleUpdateMembershipStatus({
  transaction,
  resolvedOpenid,
  currentMembership,
  targetOrder,
  membershipStatus,
  reason,
  operator,
}) {
  const updatedAt = new Date().toISOString();
  const currentSnapshot = resolveMembershipSnapshot(currentMembership);
  const nextStatus = normalizeMembershipStatus(membershipStatus);

  if (!nextStatus) {
    throw new Error('缺少有效的会员状态，无法执行人工修正');
  }

  const startsAt =
    normalizeTimestamp(currentMembership && currentMembership.starts_at) || updatedAt;
  let expiresAt = normalizeTimestamp(currentMembership && currentMembership.expires_at);

  if (nextStatus === MEMBERSHIP_STATUS.active) {
    expiresAt = expiresAt && Date.parse(expiresAt) > Date.parse(updatedAt) ? expiresAt : addDays(updatedAt, PLAN_DURATION_DAYS);
  } else if (nextStatus === MEMBERSHIP_STATUS.expired) {
    expiresAt = expiresAt || updatedAt;
  } else {
    expiresAt = expiresAt || '';
  }

  const latestOrderNo =
    toTrimmedString(targetOrder && targetOrder.out_trade_no) ||
    currentSnapshot.latest_order_no ||
    '';
  const planCode =
    toTrimmedString(targetOrder && targetOrder.plan_code) ||
    currentSnapshot.plan_code ||
    'monthly_20';
  const membershipRecordId = await upsertMembershipRecord({
    databaseApi: transaction,
    openid: resolvedOpenid,
    currentMembership,
    planCode,
    status: nextStatus,
    startsAt,
    expiresAt,
    latestOrderNo,
    updatedAt,
  });

  const refreshedMembership = {
    ...(currentMembership || {}),
    _id: membershipRecordId,
    openid: resolvedOpenid,
    plan_code: planCode,
    status: nextStatus,
    starts_at: startsAt,
    expires_at: expiresAt,
    latest_order_no: latestOrderNo,
    updated_at: updatedAt,
  };

  const opsLog = await createOpsLog({
    databaseApi: transaction,
    targetType: 'membership',
    targetId: membershipRecordId,
    openid: resolvedOpenid,
    action: ACTION.update_membership_status,
    reason,
    operator,
    createdAt: updatedAt,
  });

  return {
    membership: summarizeMembership(refreshedMembership),
    order: summarizeOrder(targetOrder),
    ops_log: summarizeOpsLog(opsLog),
    result: 'membership_status_updated',
    message: '人工会员状态修正已完成',
  };
}

async function handleUpdateOrderStatus({
  transaction,
  targetOrder,
  resolvedOpenid,
  orderStatus,
  reason,
  operator,
}) {
  if (!targetOrder || !targetOrder._id) {
    throw new Error('缺少可修正的订单，无法更新订单状态');
  }

  const nextStatus = normalizeOrderStatus(orderStatus);

  if (
    !nextStatus ||
    (nextStatus !== ORDER_STATUS.failed &&
      nextStatus !== ORDER_STATUS.cancelled &&
      nextStatus !== ORDER_STATUS.paid)
  ) {
    throw new Error('缺少有效的订单状态，无法执行人工修正');
  }

  const updatedAt = new Date().toISOString();
  const note = `人工修正订单状态为 ${nextStatus}`;
  const updatedOrder = {
    ...targetOrder,
    status: nextStatus,
    raw_notify_summary: reason,
    status_history: appendOrderHistory(
      targetOrder.status_history,
      buildOrderHistoryEntry({
        status: nextStatus,
        timestamp: updatedAt,
        note,
      }),
    ),
    updated_at: updatedAt,
  };

  await updateOrderRecord(transaction, targetOrder._id, {
    status: nextStatus,
    raw_notify_summary: reason,
    status_history: updatedOrder.status_history,
    updated_at: updatedAt,
  });

  const opsLog = await createOpsLog({
    databaseApi: transaction,
    targetType: 'order',
    targetId: toTrimmedString(targetOrder.out_trade_no),
    openid: resolvedOpenid,
    action: ACTION.update_order_status,
    reason,
    operator,
    createdAt: updatedAt,
  });

  return {
    membership: summarizeMembership(await getLatestMembershipRecord(resolvedOpenid)),
    order: summarizeOrder(updatedOrder),
    ops_log: summarizeOpsLog(opsLog),
    result: 'order_status_updated',
    message: '人工订单状态修正已完成',
  };
}

exports.main = async (event = {}) => {
  try {
    const operator = toTrimmedString(cloud.getWXContext().OPENID);

    if (!operator) {
      return fail('请先登录后再执行人工修正', 'UNAUTHORIZED');
    }

    const allowedOpenids = parseAllowedOpsOpenids();

    if (!allowedOpenids.includes(operator)) {
      return fail('当前账号没有内部修正权限', 'FORBIDDEN');
    }

    const action = normalizeAction(event.action);
    const reason = toTrimmedString(event.reason);
    const queryType = normalizeQueryType(event.queryType || event.query_type);
    const queryOpenid = toTrimmedString(event.queryOpenid || event.query_openid || event.openid);
    const queryOutTradeNo = toTrimmedString(
      event.queryOutTradeNo || event.query_out_trade_no || event.outTradeNo || event.out_trade_no,
    );
    const membershipStatus = event.membershipStatus || event.membership_status;
    const orderStatus = event.orderStatus || event.order_status;

    if (!action) {
      return fail('缺少人工修正动作，无法继续', 'INVALID_ACTION');
    }

    if (!reason) {
      return fail('请填写人工修正原因后再提交', 'INVALID_REASON');
    }

    const queryError = validateQueryContext({
      queryType,
      queryOpenid,
      queryOutTradeNo,
    });

    if (queryError) {
      return fail(queryError, 'INVALID_QUERY_CONTEXT');
    }

    const { targetOrder, resolvedOpenid, membership } = await resolveOperationTarget({
      queryType,
      queryOpenid,
      queryOutTradeNo,
    });

    if (action === ACTION.grant_membership) {
      return success(await db.runTransaction(async (transaction) => handleGrantMembership({
        transaction,
        resolvedOpenid,
        currentMembership: membership,
        targetOrder,
        reason,
        operator,
      })));
    }

    if (action === ACTION.update_membership_status) {
      return success(await db.runTransaction(async (transaction) => handleUpdateMembershipStatus({
        transaction,
        resolvedOpenid,
        currentMembership: membership,
        targetOrder,
        membershipStatus,
        reason,
        operator,
      })));
    }

    return success(await db.runTransaction(async (transaction) => handleUpdateOrderStatus({
      transaction,
      targetOrder,
      resolvedOpenid,
      orderStatus,
      reason,
      operator,
    })));
  } catch (error) {
    return fail(error.message || '执行人工修正失败');
  }
};
