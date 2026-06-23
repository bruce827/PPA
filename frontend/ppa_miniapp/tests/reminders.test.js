const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getMembershipReminder,
  getTenderReminder,
  normalizeReminderPreferences,
} = require('../utils/reminders');

test('normalizeReminderPreferences should default tender subscription to false', () => {
  assert.deepEqual(normalizeReminderPreferences(), {
    tenderSubscriptionEnabled: false,
  });
});

test('getMembershipReminder should return expiry reminder for active membership near expiration', () => {
  const reminder = getMembershipReminder(
    {
      membership_status: 'active',
      expires_at: '2026-03-31T00:00:00.000Z',
    },
    {
      now: new Date('2026-03-29T00:00:00.000Z'),
    },
  );

  assert.equal(reminder.type, 'membership_expiring');
  assert.equal(reminder.title, '到期提醒');
  assert.equal(reminder.actionText, '立即续费月会员');
});

test('getMembershipReminder should return renew reminder for expired membership', () => {
  const reminder = getMembershipReminder({
    membership_status: 'expired',
    expires_at: '2026-03-01T00:00:00.000Z',
  });

  assert.equal(reminder.type, 'membership_expired');
  assert.equal(reminder.title, '续费提醒');
});

test('getTenderReminder should only return banner when tender subscription is enabled', () => {
  const banner = getTenderReminder({
    preferences: {
      tenderSubscriptionEnabled: true,
    },
    total: 3,
    startDate: '2026-03-29',
    endDate: '2026-03-29',
  });

  assert.equal(banner.type, 'new_tender_subscription');
  assert.match(banner.description, /3 条/);
  assert.equal(
    getTenderReminder({
      preferences: {
        tenderSubscriptionEnabled: false,
      },
      total: 3,
    }),
    null,
  );
});
