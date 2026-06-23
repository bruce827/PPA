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

const ORDER_STATUS = {
  created: 'created',
  pay_pending: 'pay_pending',
  paid: 'paid',
  granted: 'granted',
  failed: 'failed',
  cancelled: 'cancelled',
  manual_fixed: 'manual_fixed',
};

const SYNC_STATE = {
  membership_granted: 'membership_granted',
  pay_sync_pending: 'pay_sync_pending',
  payment_failed: 'payment_failed',
  payment_cancelled: 'payment_cancelled',
};

const PLAN_DURATION_DAYS = 30;
const MEMBERSHIP_RECORD_FETCH_LIMIT = 20;

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

function resolveSortTimestamp(record) {
  return (
    normalizeTimestamp(record.updated_at) ||
    normalizeTimestamp(record.expires_at) ||
    normalizeTimestamp(record.starts_at) ||
    normalizeTimestamp(record.created_at)
  );
}

function addDays(timestamp, days) {
  const normalized = normalizeTimestamp(timestamp);

  if (!normalized) {
    return '';
  }

  return new Date(Date.parse(normalized) + days * 24 * 60 * 60 * 1000).toISOString();
}

function resolveMembershipSnapshot(record, now = new Date()) {
  if (!record) {
    return {
      membership_status: MEMBERSHIP_STATUS.inactive,
      access_state: ACCESS_STATE.membership_required,
      expires_at: '',
      starts_at: '',
      membership_record_id: '',
      plan_code: '',
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
      membership_record_id: toTrimmedString(record._id),
      plan_code: toTrimmedString(record.plan_code),
    };
  }

  if (rawStatus === MEMBERSHIP_STATUS.active && isActiveByTime) {
    return {
      membership_status: MEMBERSHIP_STATUS.active,
      access_state: ACCESS_STATE.full,
      expires_at: expiresAt,
      starts_at: startsAt,
      membership_record_id: toTrimmedString(record._id),
      plan_code: toTrimmedString(record.plan_code),
    };
  }

  return {
    membership_status: MEMBERSHIP_STATUS.inactive,
    access_state: ACCESS_STATE.membership_required,
    expires_at: expiresAt,
    starts_at: startsAt,
    membership_record_id: toTrimmedString(record._id),
    plan_code: toTrimmedString(record.plan_code),
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

async function getMembershipOrder(openid, outTradeNo) {
  const response = await db
    .collection('miniapp_membership_orders')
    .where({
      openid,
      out_trade_no: outTradeNo,
    })
    .limit(1)
    .get();

  return response.data[0] || null;
}

function resolvePaymentTime(order, fallbackIso) {
  return (
    normalizeTimestamp(order.paid_at) ||
    normalizeTimestamp(order.notify_received_at) ||
    normalizeTimestamp(order.updated_at) ||
    normalizeTimestamp(order.created_at) ||
    fallbackIso
  );
}

function calculateMembershipWindow({ orderType, currentMembership, currentSnapshot, paidAt }) {
  if (orderType === 'renew' && currentSnapshot.membership_status === MEMBERSHIP_STATUS.active) {
    const currentExpiresAt = normalizeTimestamp(currentMembership.expires_at);
    const currentStartsAt = normalizeTimestamp(currentMembership.starts_at) || paidAt;

    if (currentExpiresAt && Date.parse(currentExpiresAt) > Date.parse(paidAt)) {
      return {
        startsAt: currentStartsAt,
        expiresAt: addDays(currentExpiresAt, PLAN_DURATION_DAYS),
      };
    }
  }

  return {
    startsAt: paidAt,
    expiresAt: addDays(paidAt, PLAN_DURATION_DAYS),
  };
}

async function updateOrderRecord(orderId, data) {
  await db.collection('miniapp_membership_orders').doc(orderId).update({
    data,
  });
}

async function upsertMembershipRecord({
  openid,
  planCode,
  currentMembership,
  latestOrderNo,
  startsAt,
  expiresAt,
  updatedAt,
}) {
  const membershipData = {
    openid,
    plan_code: planCode,
    status: MEMBERSHIP_STATUS.active,
    starts_at: startsAt,
    expires_at: expiresAt,
    latest_order_no: latestOrderNo,
    updated_at: updatedAt,
  };

  if (currentMembership && currentMembership._id) {
    await db.collection('miniapp_memberships').doc(currentMembership._id).update({
      data: membershipData,
    });

    return currentMembership._id;
  }

  const addResult = await db.collection('miniapp_memberships').add({
    data: {
      ...membershipData,
      created_at: updatedAt,
    },
  });

  return addResult._id;
}

function buildResultPayload({ order, snapshot, syncState, message }) {
  return {
    out_trade_no: toTrimmedString(order.out_trade_no),
    order_type: toTrimmedString(order.order_type),
    order_status: toTrimmedString(order.status),
    source_item_id: toTrimmedString(order.source_item_id),
    membership_status: snapshot.membership_status,
    access_state: snapshot.access_state,
    starts_at: snapshot.starts_at,
    expires_at: snapshot.expires_at,
    effective_from: normalizeTimestamp(order.effective_from),
    effective_until: normalizeTimestamp(order.effective_until),
    sync_state: syncState,
    message,
  };
}

async function grantMembershipFromOrder({ order, currentMembership, currentSnapshot }) {
  const updatedAt = new Date().toISOString();
  const paidAt = resolvePaymentTime(order, updatedAt);
  const orderType = toTrimmedString(order.order_type).toLowerCase();
  const grantedMessage = '会员已生效，可返回当前项目继续查看';
  const window = calculateMembershipWindow({
    orderType,
    currentMembership,
    currentSnapshot,
    paidAt,
  });
  const planCode = toTrimmedString(order.plan_code) || currentSnapshot.plan_code || 'monthly_20';
  const membershipRecordId = await upsertMembershipRecord({
    openid: toTrimmedString(order.openid),
    planCode,
    currentMembership,
    latestOrderNo: toTrimmedString(order.out_trade_no),
    startsAt: window.startsAt,
    expiresAt: window.expiresAt,
    updatedAt,
  });

  await updateOrderRecord(order._id, {
    status: ORDER_STATUS.granted,
    paid_at: normalizeTimestamp(order.paid_at) || paidAt,
    effective_from: window.startsAt,
    effective_until: window.expiresAt,
    membership_record_id: membershipRecordId,
    raw_notify_summary: grantedMessage,
    status_history: appendOrderHistory(
      order.status_history,
      buildOrderHistoryEntry({
        status: ORDER_STATUS.granted,
        timestamp: updatedAt,
        note: grantedMessage,
      }),
    ),
    updated_at: updatedAt,
  });

  const refreshedMembership = {
    ...(currentMembership || {}),
    _id: membershipRecordId,
    openid: toTrimmedString(order.openid),
    plan_code: planCode,
    status: MEMBERSHIP_STATUS.active,
    starts_at: window.startsAt,
    expires_at: window.expiresAt,
    latest_order_no: toTrimmedString(order.out_trade_no),
    updated_at: updatedAt,
  };
  const refreshedOrder = {
    ...order,
    status: ORDER_STATUS.granted,
    paid_at: normalizeTimestamp(order.paid_at) || paidAt,
    effective_from: window.startsAt,
    effective_until: window.expiresAt,
  };

  return buildResultPayload({
    order: refreshedOrder,
    snapshot: resolveMembershipSnapshot(refreshedMembership),
    syncState: SYNC_STATE.membership_granted,
    message: grantedMessage,
  });
}

async function repairGrantedMembership({ order, currentMembership }) {
  const updatedAt = new Date().toISOString();
  const startsAt = normalizeTimestamp(order.effective_from) || resolvePaymentTime(order, updatedAt);
  const expiresAt = normalizeTimestamp(order.effective_until) || addDays(startsAt, PLAN_DURATION_DAYS);
  const planCode = toTrimmedString(order.plan_code) || toTrimmedString(currentMembership && currentMembership.plan_code) || 'monthly_20';
  const membershipRecordId = await upsertMembershipRecord({
    openid: toTrimmedString(order.openid),
    planCode,
    currentMembership,
    latestOrderNo: toTrimmedString(order.out_trade_no),
    startsAt,
    expiresAt,
    updatedAt,
  });

  await updateOrderRecord(order._id, {
    membership_record_id: membershipRecordId,
    effective_from: startsAt,
    effective_until: expiresAt,
    updated_at: updatedAt,
  });

  const repairedMembership = {
    ...(currentMembership || {}),
    _id: membershipRecordId,
    openid: toTrimmedString(order.openid),
    plan_code: planCode,
    status: MEMBERSHIP_STATUS.active,
    starts_at: startsAt,
    expires_at: expiresAt,
    latest_order_no: toTrimmedString(order.out_trade_no),
    updated_at: updatedAt,
  };

  return buildResultPayload({
    order,
    snapshot: resolveMembershipSnapshot(repairedMembership),
    syncState: SYNC_STATE.membership_granted,
    message: '会员已生效，可返回当前项目继续查看',
  });
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext();

    if (!OPENID) {
      return fail('请先登录后再确认会员状态', 'UNAUTHORIZED');
    }

    const outTradeNo = toTrimmedString(event.outTradeNo || event.out_trade_no);

    if (!outTradeNo) {
      return fail('缺少订单号，无法刷新会员状态', 'ORDER_NOT_FOUND');
    }

    const order = await getMembershipOrder(OPENID, outTradeNo);

    if (!order) {
      return fail('未找到对应的会员订单', 'ORDER_NOT_FOUND');
    }

    const currentMembership = await getLatestMembershipRecord(OPENID);
    const currentSnapshot = resolveMembershipSnapshot(currentMembership);
    const orderStatus = toTrimmedString(order.status).toLowerCase();

    if (orderStatus === ORDER_STATUS.paid) {
      return success(
        await grantMembershipFromOrder({
          order,
          currentMembership,
          currentSnapshot,
        }),
      );
    }

    if (orderStatus === ORDER_STATUS.granted || orderStatus === ORDER_STATUS.manual_fixed) {
      if (
        currentSnapshot.access_state === ACCESS_STATE.full &&
        toTrimmedString(currentMembership && currentMembership.latest_order_no) === outTradeNo
      ) {
        return success(
          buildResultPayload({
            order,
            snapshot: currentSnapshot,
            syncState: SYNC_STATE.membership_granted,
            message: '会员已生效，可返回当前项目继续查看',
          }),
        );
      }

      return success(
        await repairGrantedMembership({
          order,
          currentMembership,
        }),
      );
    }

    if (orderStatus === ORDER_STATUS.failed) {
      return success(
        buildResultPayload({
          order,
          snapshot: currentSnapshot,
          syncState: SYNC_STATE.payment_failed,
          message: '本次支付未成功，订单已保留，可稍后重新发起',
        }),
      );
    }

    if (orderStatus === ORDER_STATUS.cancelled) {
      return success(
        buildResultPayload({
          order,
          snapshot: currentSnapshot,
          syncState: SYNC_STATE.payment_cancelled,
          message: '你已取消支付，本次订单已保留，可稍后重新发起',
        }),
      );
    }

    return success(
      buildResultPayload({
        order,
        snapshot: currentSnapshot,
        syncState: SYNC_STATE.pay_sync_pending,
        message: '支付结果仍在确认中，请稍后刷新会员状态',
      }),
    );
  } catch (error) {
    return fail(error.message || '刷新会员状态失败');
  }
};
