const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMembershipEntryPath,
  getMembershipAccessCopy,
  getMembershipEntryMode,
} = require('../utils/membership');

test('getMembershipAccessCopy should return open CTA for inactive users', () => {
  const result = getMembershipAccessCopy({
    membershipStatus: 'inactive',
    accessState: 'membership_required',
  });

  assert.equal(result.membershipStatus, 'inactive');
  assert.equal(result.accessState, 'membership_required');
  assert.equal(result.actionText, '立即开通月会员');
});

test('getMembershipAccessCopy should return renew CTA for expired users', () => {
  const result = getMembershipAccessCopy({
    membershipStatus: 'expired',
    accessState: 'membership_expired',
    expiresText: '2026-03-01 08:00',
  });

  assert.equal(result.membershipStatus, 'expired');
  assert.equal(result.accessState, 'membership_expired');
  assert.equal(result.actionText, '立即续费月会员');
  assert.match(result.description, /2026-03-01 08:00/);
});

test('getMembershipEntryMode should map access state to correct entry mode', () => {
  assert.equal(getMembershipEntryMode('membership_required'), 'open');
  assert.equal(getMembershipEntryMode('membership_expired'), 'renew');
  assert.equal(getMembershipEntryMode('full'), 'open');
});

test('buildMembershipEntryPath should build open path for inactive users', () => {
  const path = buildMembershipEntryPath({
    accessState: 'membership_required',
    sourceItemId: 'item-1',
  });

  assert.equal(path, '/pages/membership-status/index?mode=open&sourceItemId=item-1&from=tender-detail');
});

test('buildMembershipEntryPath should build renew path for expired users', () => {
  const path = buildMembershipEntryPath({
    accessState: 'membership_expired',
    sourceItemId: 'item-2',
  });

  assert.equal(path, '/pages/membership-status/index?mode=renew&sourceItemId=item-2&from=tender-detail');
});
