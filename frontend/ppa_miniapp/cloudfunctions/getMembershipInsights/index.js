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
  paid: 'paid',
  granted: 'granted',
  manual_fixed: 'manual_fixed',
};

const MEMBERSHIP_ACTIVITY_ACTION = {
  view_full_detail: 'view_full_detail',
};

const FETCH_LIMIT = 200;
const TOP_LIMIT = 5;

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
    normalizeTimestamp(record.accessed_at) ||
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

function resolveMembershipSnapshot(record, now = new Date()) {
  if (!record) {
    return MEMBERSHIP_STATUS.inactive;
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
    return MEMBERSHIP_STATUS.expired;
  }

  if (rawStatus === MEMBERSHIP_STATUS.active && isActiveByTime) {
    return MEMBERSHIP_STATUS.active;
  }

  return MEMBERSHIP_STATUS.inactive;
}

async function getCollectionRecords(name) {
  const response = await db.collection(name).limit(FETCH_LIMIT).get();
  return Array.isArray(response.data) ? response.data : [];
}

async function getActivityRecords() {
  try {
    const records = await getCollectionRecords('miniapp_membership_activity_logs');

    return {
      records,
      query_state: 'ready',
      query_error: '',
    };
  } catch (error) {
    return {
      records: [],
      query_state: 'unavailable',
      query_error: toTrimmedString(error && error.message) || 'ACTIVITY_LOG_QUERY_FAILED',
    };
  }
}

function buildContentRanking(records, field) {
  const grouped = new Map();

  records.forEach((record) => {
    const key = toTrimmedString(record[field]);

    if (!key) {
      return;
    }

    const current = grouped.get(key) || {
      label: key,
      view_count: 0,
      latest_viewed_at: '',
    };

    current.view_count += 1;

    const viewedAt = normalizeTimestamp(record.accessed_at) || normalizeTimestamp(record.created_at);
    if (viewedAt && String(viewedAt).localeCompare(String(current.latest_viewed_at)) > 0) {
      current.latest_viewed_at = viewedAt;
    }

    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .sort((left, right) => {
      if (right.view_count !== left.view_count) {
        return right.view_count - left.view_count;
      }

      return String(right.latest_viewed_at).localeCompare(String(left.latest_viewed_at));
    })
    .slice(0, TOP_LIMIT);
}

function buildTopContent(records) {
  const grouped = new Map();

  records.forEach((record) => {
    const sourceItemId = toTrimmedString(record.source_item_id);

    if (!sourceItemId) {
      return;
    }

    const current = grouped.get(sourceItemId) || {
      source_item_id: sourceItemId,
      title: toTrimmedString(record.title) || '未命名项目',
      issuer: toTrimmedString(record.issuer) || '未填写',
      source_platform: toTrimmedString(record.source_platform) || '未填写',
      view_count: 0,
      latest_viewed_at: '',
    };

    current.view_count += 1;

    const viewedAt = normalizeTimestamp(record.accessed_at) || normalizeTimestamp(record.created_at);
    if (viewedAt && String(viewedAt).localeCompare(String(current.latest_viewed_at)) > 0) {
      current.latest_viewed_at = viewedAt;
    }

    grouped.set(sourceItemId, current);
  });

  return Array.from(grouped.values())
    .sort((left, right) => {
      if (right.view_count !== left.view_count) {
        return right.view_count - left.view_count;
      }

      return String(right.latest_viewed_at).localeCompare(String(left.latest_viewed_at));
    })
    .slice(0, TOP_LIMIT);
}

function buildSummary({ orders, memberships, activityRecords }) {
  const successfulStatuses = new Set([
    ORDER_STATUS.paid,
    ORDER_STATUS.granted,
    ORDER_STATUS.manual_fixed,
  ]);

  const paidOrders = orders.filter((order) => successfulStatuses.has(toTrimmedString(order.status)));
  const renewOrders = paidOrders.filter((order) => toTrimmedString(order.order_type) === 'renew');
  const activeMembers = memberships.filter((record) => resolveMembershipSnapshot(record) === MEMBERSHIP_STATUS.active);
  const expiredMembers = memberships.filter((record) => resolveMembershipSnapshot(record) === MEMBERSHIP_STATUS.expired);
  const inactiveMembershipRecords = memberships.filter((record) => resolveMembershipSnapshot(record) === MEMBERSHIP_STATUS.inactive);
  const fullDetailViews = activityRecords.filter((record) => {
    return toTrimmedString(record.action) === MEMBERSHIP_ACTIVITY_ACTION.view_full_detail;
  });
  const sortedActivityRecords = sortRecords(fullDetailViews);

  return {
    total_orders: orders.length,
    paid_orders: paidOrders.length,
    renew_orders: renewOrders.length,
    paying_users_count: new Set(
      paidOrders
        .map((order) => toTrimmedString(order.openid))
        .filter(Boolean),
    ).size,
    active_members: activeMembers.length,
    expired_members: expiredMembers.length,
    inactive_membership_records: inactiveMembershipRecords.length,
    full_detail_views: fullDetailViews.length,
    active_viewer_count: new Set(
      fullDetailViews
        .map((record) => toTrimmedString(record.openid))
        .filter(Boolean),
    ).size,
    unique_viewed_tender_count: new Set(
      fullDetailViews
        .map((record) => toTrimmedString(record.source_item_id))
        .filter(Boolean),
    ).size,
    top_source_platforms: buildContentRanking(fullDetailViews, 'source_platform'),
    top_issuers: buildContentRanking(fullDetailViews, 'issuer'),
    top_content: buildTopContent(fullDetailViews),
    latest_activity_at: sortedActivityRecords[0]
      ? normalizeTimestamp(sortedActivityRecords[0].accessed_at) || normalizeTimestamp(sortedActivityRecords[0].created_at)
      : '',
  };
}

exports.main = async () => {
  try {
    const operatorOpenid = toTrimmedString(cloud.getWXContext().OPENID);

    if (!operatorOpenid) {
      return fail('请先登录后再查看会员经营分析', 'UNAUTHORIZED');
    }

    const allowedOpenids = parseAllowedOpsOpenids();

    if (!allowedOpenids.includes(operatorOpenid)) {
      return fail('当前账号没有会员经营分析权限', 'FORBIDDEN');
    }

    const [orders, memberships, activityResult] = await Promise.all([
      getCollectionRecords('miniapp_membership_orders'),
      getCollectionRecords('miniapp_memberships'),
      getActivityRecords(),
    ]);

    return success({
      generated_at: new Date().toISOString(),
      order_record_count: orders.length,
      membership_record_count: memberships.length,
      activity_log_query_state: activityResult.query_state,
      activity_log_query_error: activityResult.query_error,
      summary: buildSummary({
        orders,
        memberships,
        activityRecords: activityResult.records,
      }),
    });
  } catch (error) {
    return fail(error.message || '获取会员经营分析失败');
  }
};
