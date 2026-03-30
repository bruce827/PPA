const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MEMBERSHIP_PLAN_OPTIONS,
  MONTHLY_PLAN_CODE,
  QUARTERLY_PLAN_CODE,
  buildMembershipOrderPayload,
  buildPaymentError,
  findMembershipPlan,
  getDefaultMembershipPlan,
  getMembershipPlanOptions,
  requestMiniProgramPayment,
} = require('../utils/payment');

test('getMembershipPlanOptions should expose future plan config while keeping monthly enabled by default', () => {
  const options = getMembershipPlanOptions();
  const defaultPlan = getDefaultMembershipPlan();

  assert.equal(Array.isArray(options), true);
  assert.equal(options.length, MEMBERSHIP_PLAN_OPTIONS.length);
  assert.equal(defaultPlan.code, MONTHLY_PLAN_CODE);
  assert.equal(findMembershipPlan(QUARTERLY_PLAN_CODE).enabled, false);
});

test('buildMembershipOrderPayload should build open order payload by default', () => {
  const result = buildMembershipOrderPayload({
    mode: 'open',
    sourceItemId: 'item-1',
  });

  assert.deepEqual(result, {
    planCode: MONTHLY_PLAN_CODE,
    orderType: 'open',
    sourceItemId: 'item-1',
  });
});

test('buildMembershipOrderPayload should keep explicit plan code for future server-side validation', () => {
  const result = buildMembershipOrderPayload({
    mode: 'open',
    sourceItemId: 'item-3',
    planCode: QUARTERLY_PLAN_CODE,
  });

  assert.deepEqual(result, {
    planCode: QUARTERLY_PLAN_CODE,
    orderType: 'open',
    sourceItemId: 'item-3',
  });
});

test('buildMembershipOrderPayload should build renew order payload for renew mode', () => {
  const result = buildMembershipOrderPayload({
    mode: 'renew',
    sourceItemId: 'item-2',
  });

  assert.deepEqual(result, {
    planCode: MONTHLY_PLAN_CODE,
    orderType: 'renew',
    sourceItemId: 'item-2',
  });
});

test('buildPaymentError should normalize cancel error', () => {
  const error = buildPaymentError({
    errMsg: 'requestPayment:fail cancel',
  });

  assert.equal(error.code, 'PAYMENT_CANCELLED');
  assert.equal(error.cancelled, true);
  assert.match(error.message, /取消支付/);
});

test('requestMiniProgramPayment should resolve success result', async () => {
  const originalWx = global.wx;

  global.wx = {
    requestPayment(options) {
      options.success({ ok: true });
    },
  };

  try {
    const result = await requestMiniProgramPayment({
      timeStamp: '1',
      nonceStr: 'nonce',
      package: 'prepay_id=1',
      signType: 'RSA',
      paySign: 'sign',
    });

    assert.deepEqual(result, { ok: true });
  } finally {
    global.wx = originalWx;
  }
});

test('requestMiniProgramPayment should reject cancel result with normalized error', async () => {
  const originalWx = global.wx;

  global.wx = {
    requestPayment(options) {
      options.fail({
        errMsg: 'requestPayment:fail cancel',
      });
    },
  };

  try {
    await assert.rejects(
      () =>
        requestMiniProgramPayment({
          timeStamp: '1',
          nonceStr: 'nonce',
          package: 'prepay_id=1',
          signType: 'RSA',
          paySign: 'sign',
        }),
      (error) => error.code === 'PAYMENT_CANCELLED',
    );
  } finally {
    global.wx = originalWx;
  }
});
