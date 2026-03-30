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

function normalizeMembershipStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(MEMBERSHIP_STATUS, normalized) ? normalized : MEMBERSHIP_STATUS.inactive;
}

function normalizeAccessState(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(ACCESS_STATE, normalized) ? normalized : ACCESS_STATE.membership_required;
}

function hasFullAccess(accessState) {
  return normalizeAccessState(accessState) === ACCESS_STATE.full;
}

function getMembershipEntryMode(accessState) {
  return normalizeAccessState(accessState) === ACCESS_STATE.membership_expired ? 'renew' : 'open';
}

function buildMembershipEntryPath({ accessState, sourceItemId = '', from = 'tender-detail' } = {}) {
  const mode = getMembershipEntryMode(accessState);
  const query = [`mode=${encodeURIComponent(mode)}`];

  if (sourceItemId) {
    query.push(`sourceItemId=${encodeURIComponent(sourceItemId)}`);
  }

  if (from) {
    query.push(`from=${encodeURIComponent(from)}`);
  }

  return `/pages/membership-status/index?${query.join('&')}`;
}

function getMembershipAccessCopy({ membershipStatus, accessState, expiresText = '' } = {}) {
  const normalizedStatus = normalizeMembershipStatus(membershipStatus);
  const normalizedAccessState = normalizeAccessState(accessState);

  if (normalizedAccessState === ACCESS_STATE.membership_expired || normalizedStatus === MEMBERSHIP_STATUS.expired) {
    return {
      membershipStatus: MEMBERSHIP_STATUS.expired,
      accessState: ACCESS_STATE.membership_expired,
      title: '会员已过期',
      description: expiresText
        ? `你的会员已于 ${expiresText} 到期，续费后可继续查看完整详情。`
        : '你的会员已过期，续费后可继续查看完整详情。',
      actionText: '立即续费月会员',
    };
  }

  if (normalizedAccessState === ACCESS_STATE.full) {
    return {
      membershipStatus: MEMBERSHIP_STATUS.active,
      accessState: ACCESS_STATE.full,
      title: '会员有效',
      description: expiresText ? `会员有效期至 ${expiresText}` : '你当前可以查看完整详情。',
      actionText: '',
    };
  }

  return {
    membershipStatus: MEMBERSHIP_STATUS.inactive,
    accessState: ACCESS_STATE.membership_required,
    title: '当前内容仅会员可见',
    description: '开通会员后可查看完整招标公告、更多信息和后续权益。',
    actionText: '立即开通月会员',
  };
}

module.exports = {
  ACCESS_STATE,
  MEMBERSHIP_STATUS,
  buildMembershipEntryPath,
  getMembershipEntryMode,
  getMembershipAccessCopy,
  hasFullAccess,
  normalizeAccessState,
  normalizeMembershipStatus,
};
