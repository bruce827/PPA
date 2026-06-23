const { formatDateTime } = require('./date');

const REMINDER_PREFERENCES_STORAGE_KEY = 'ppaMiniappReminderPreferences';
const MEMBERSHIP_EXPIRING_REMINDER_DAYS = 7;

function normalizeReminderPreferences(value = {}) {
  return {
    tenderSubscriptionEnabled: Boolean(value.tenderSubscriptionEnabled),
  };
}

function getReminderPreferences() {
  const rawValue = wx.getStorageSync(REMINDER_PREFERENCES_STORAGE_KEY);

  if (!rawValue || typeof rawValue !== 'object') {
    return normalizeReminderPreferences();
  }

  return normalizeReminderPreferences(rawValue);
}

function setReminderPreferences(value = {}) {
  const normalized = normalizeReminderPreferences(value);
  wx.setStorageSync(REMINDER_PREFERENCES_STORAGE_KEY, normalized);
  return normalized;
}

function getMembershipReminder(snapshot = {}, options = {}) {
  const reminderType = String(options.reminderType || '').trim();
  const now = options.now instanceof Date ? options.now : new Date();
  const membershipStatus = String(snapshot.membership_status || '').trim().toLowerCase();
  const expiresAt = String(snapshot.expires_at || '').trim();

  if (membershipStatus === 'expired') {
    const expiresText = expiresAt ? formatDateTime(expiresAt) : '';

    return {
      type: 'membership_expired',
      title: '续费提醒',
      description: expiresText
        ? `你的会员已于 ${expiresText} 到期，续费后可继续查看完整详情。`
        : '你的会员已过期，续费后可继续查看完整详情。',
      actionText: '立即续费月会员',
    };
  }

  if (membershipStatus !== 'active' || !expiresAt) {
    return reminderType === 'membership_expiring'
      ? {
          type: 'membership_expiring',
          title: '到期提醒',
          description: '当前会员状态已变化，请以页面最新状态为准。',
          actionText: '',
        }
      : null;
  }

  const expiresAtDate = new Date(expiresAt);

  if (Number.isNaN(expiresAtDate.getTime())) {
    return null;
  }

  const diffMs = expiresAtDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays > MEMBERSHIP_EXPIRING_REMINDER_DAYS && reminderType !== 'membership_expiring') {
    return null;
  }

  return {
    type: 'membership_expiring',
    title: '到期提醒',
    description:
      diffDays > 0
        ? `你的会员将在 ${formatDateTime(expiresAt)} 到期，建议提前续费，避免影响查看完整详情。`
        : `你的会员将于 ${formatDateTime(expiresAt)} 到期，建议及时续费。`,
    actionText: '立即续费月会员',
  };
}

function getTenderReminder({ preferences, total = 0, startDate = '', endDate = '', reminderType = '' } = {}) {
  const normalizedPreferences = normalizeReminderPreferences(preferences);

  if (!normalizedPreferences.tenderSubscriptionEnabled) {
    return null;
  }

  if (!total && reminderType !== 'new_tender_subscription') {
    return null;
  }

  const rangeText =
    startDate && endDate
      ? startDate === endDate
        ? `${startDate}`
        : `${startDate} 至 ${endDate}`
      : '当前范围';

  if (total > 0) {
    return {
      type: 'new_tender_subscription',
      title: '新招标提醒已开启',
      description: `${rangeText}共有 ${total} 条可浏览招标，可直接查看最新机会。`,
      actionText: '管理提醒',
    };
  }

  return {
    type: 'new_tender_subscription',
    title: '新招标提醒已开启',
    description: `${rangeText}暂无新的招标结果，提醒入口仍然保留。`,
    actionText: '管理提醒',
  };
}

module.exports = {
  MEMBERSHIP_EXPIRING_REMINDER_DAYS,
  REMINDER_PREFERENCES_STORAGE_KEY,
  getMembershipReminder,
  getReminderPreferences,
  getTenderReminder,
  normalizeReminderPreferences,
  setReminderPreferences,
};
