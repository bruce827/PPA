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
      plan_code: '',
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
      has_membership_record: true,
    };
  }

  return {
    membership_status: MEMBERSHIP_STATUS.inactive,
    access_state: ACCESS_STATE.membership_required,
    expires_at: expiresAt,
    starts_at: startsAt,
    plan_code: toTrimmedString(record.plan_code),
    has_membership_record: true,
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

exports.main = async () => {
  try {
    const { OPENID } = cloud.getWXContext();

    if (!OPENID) {
      return fail('请先登录后再查看会员状态', 'UNAUTHORIZED');
    }

    const membership = await getLatestMembershipRecord(OPENID);
    const snapshot = resolveMembershipSnapshot(membership);

    return success({
      openid: OPENID,
      ...snapshot,
    });
  } catch (error) {
    return fail(error.message || '获取会员状态失败');
  }
};
