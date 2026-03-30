const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const pagePath = path.resolve(__dirname, '../pages/membership-status/index.js');
const USER_STORAGE_KEY = 'ppaMiniappUser';

function createPageInstance(definition) {
  const page = {
    data: JSON.parse(JSON.stringify(definition.data)),
    setData(update) {
      this.data = {
        ...this.data,
        ...update,
      };
    },
  };

  Object.keys(definition).forEach((key) => {
    if (key !== 'data') {
      page[key] = definition[key];
    }
  });

  return page;
}

function loadMembershipStatusPage({
  cachedUser = {
    openid: 'openid-1',
    displayName: '测试用户',
  },
  callFunctionImpl,
  requestPaymentImpl,
} = {}) {
  const originalPage = global.Page;
  const originalWx = global.wx;
  let definition = null;

  const redirects = [];
  const toasts = [];
  const relaunches = [];
  const navigationTitles = [];
  const callHistory = [];
  const paymentCalls = [];

  global.Page = (config) => {
    definition = config;
  };

  global.wx = {
    getStorageSync(key) {
      if (key === USER_STORAGE_KEY) {
        return cachedUser;
      }

      return null;
    },
    setNavigationBarTitle(options) {
      navigationTitles.push(options);
    },
    showToast(options) {
      toasts.push(options);
    },
    redirectTo(options) {
      redirects.push(options);
    },
    reLaunch(options) {
      relaunches.push(options);
    },
    navigateBack() {},
    cloud: {
      callFunction({ name, data }) {
        callHistory.push({ name, data });
        return Promise.resolve(callFunctionImpl({ name, data }));
      },
    },
    requestPayment(options) {
      paymentCalls.push(options);

      if (requestPaymentImpl) {
        return requestPaymentImpl(options);
      }

      if (typeof options.success === 'function') {
        options.success({});
      }
    },
  };

  delete require.cache[pagePath];
  require(pagePath);

  const page = createPageInstance(definition);

  return {
    page,
    redirects,
    toasts,
    relaunches,
    navigationTitles,
    callHistory,
    paymentCalls,
    cleanup() {
      delete require.cache[pagePath];
      global.Page = originalPage;
      global.wx = originalWx;
    },
  };
}

test('membership-status page should refresh membership after payment success and redirect back to detail', async () => {
  const harness = loadMembershipStatusPage({
    callFunctionImpl: ({ name }) => {
      if (name === 'createMembershipOrder') {
        return {
          result: {
            success: true,
            data: {
              out_trade_no: 'order-1',
              payment_ready: true,
              payment_params: {
                timeStamp: '1',
                nonceStr: 'nonce',
                package: 'prepay_id=1',
                signType: 'RSA',
                paySign: 'signature',
              },
            },
          },
        };
      }

      if (name === 'refreshMembershipOrder') {
        return {
          result: {
            success: true,
            data: {
              out_trade_no: 'order-1',
              order_status: 'granted',
              membership_status: 'active',
              access_state: 'full',
              sync_state: 'membership_granted',
              message: '会员已生效，可返回当前项目继续查看',
            },
          },
        };
      }

      throw new Error(`unexpected cloud function: ${name}`);
    },
  });

  try {
    harness.page.onLoad({
      mode: 'open',
      sourceItemId: 'item-1',
    });

    await harness.page.submitMembershipOrder();

    assert.deepEqual(
      harness.callHistory.map((item) => item.name),
      ['createMembershipOrder', 'refreshMembershipOrder'],
    );
    assert.equal(harness.page.data.awaitingSync, false);
    assert.equal(harness.page.data.latestSyncState, 'membership_granted');
    assert.equal(harness.redirects.length, 1);
    assert.equal(
      harness.redirects[0].url,
      '/pages/tender-detail/index?sourceItemId=item-1',
    );
  } finally {
    harness.cleanup();
  }
});

test('membership-status page should switch primary action to refresh when order is still syncing', async () => {
  const harness = loadMembershipStatusPage({
    callFunctionImpl: ({ name }) => {
      if (name === 'createMembershipOrder') {
        return {
          result: {
            success: true,
            data: {
              out_trade_no: 'order-2',
              payment_ready: true,
              payment_params: {
                timeStamp: '1',
                nonceStr: 'nonce',
                package: 'prepay_id=2',
                signType: 'RSA',
                paySign: 'signature',
              },
            },
          },
        };
      }

      if (name === 'refreshMembershipOrder') {
        return {
          result: {
            success: true,
            data: {
              out_trade_no: 'order-2',
              order_status: 'pay_pending',
              membership_status: 'inactive',
              access_state: 'membership_required',
              sync_state: 'pay_sync_pending',
              message: '支付结果仍在确认中，请稍后刷新会员状态',
            },
          },
        };
      }

      throw new Error(`unexpected cloud function: ${name}`);
    },
  });

  try {
    harness.page.onLoad({
      mode: 'open',
      sourceItemId: 'item-2',
    });

    await harness.page.submitMembershipOrder();

    assert.equal(harness.page.data.awaitingSync, true);
    assert.equal(harness.page.data.primaryText, '刷新会员状态');

    await harness.page.handlePrimaryAction();

    assert.deepEqual(
      harness.callHistory.map((item) => item.name),
      [
        'createMembershipOrder',
        'refreshMembershipOrder',
        'refreshMembershipOrder',
      ],
    );
  } finally {
    harness.cleanup();
  }
});

test('membership-status page should load active membership overview and expose renew action', async () => {
  const harness = loadMembershipStatusPage({
    callFunctionImpl: ({ name }) => {
      if (name !== 'getMembershipStatus') {
        throw new Error(`unexpected cloud function: ${name}`);
      }

      return {
        result: {
          success: true,
          data: {
            membership_status: 'active',
            access_state: 'full',
            expires_at: '2099-12-31T23:59:59.000Z',
            starts_at: '2026-03-01T00:00:00.000Z',
            has_membership_record: true,
          },
        },
      };
    },
  });

  try {
    harness.page.onLoad({});
    await harness.page.onShow();

    assert.deepEqual(
      harness.callHistory.map((item) => item.name),
      ['getMembershipStatus'],
    );
    assert.equal(harness.page.data.pageMode, 'overview');
    assert.equal(harness.page.data.membershipStatus, 'active');
    assert.equal(harness.page.data.statusLabel, '会员有效');
    assert.equal(harness.page.data.primaryText, '立即续费月会员');
    assert.equal(harness.page.data.secondaryText, '返回列表');
    assert.equal(harness.page.data.recordHint.includes('开通与续费记录'), true);
  } finally {
    harness.cleanup();
  }
});

test('membership-status page should refresh overview in place after membership is granted without source item', async () => {
  let getMembershipStatusCallCount = 0;

  const harness = loadMembershipStatusPage({
    callFunctionImpl: ({ name }) => {
      if (name === 'getMembershipStatus') {
        getMembershipStatusCallCount += 1;
        return {
          result: {
            success: true,
            data: {
              membership_status: 'active',
              access_state: 'full',
              expires_at: '2099-12-31T23:59:59.000Z',
              starts_at: '2026-03-01T00:00:00.000Z',
              has_membership_record: true,
            },
          },
        };
      }

      if (name === 'createMembershipOrder') {
        return {
          result: {
            success: true,
            data: {
              out_trade_no: 'order-overview-1',
              payment_ready: true,
              payment_params: {
                timeStamp: '1',
                nonceStr: 'nonce',
                package: 'prepay_id=overview-1',
                signType: 'RSA',
                paySign: 'signature',
              },
            },
          },
        };
      }

      if (name === 'refreshMembershipOrder') {
        return {
          result: {
            success: true,
            data: {
              out_trade_no: 'order-overview-1',
              order_status: 'granted',
              membership_status: 'active',
              access_state: 'full',
              sync_state: 'membership_granted',
              message: '会员已生效，可继续使用当前权益',
            },
          },
        };
      }

      throw new Error(`unexpected cloud function: ${name}`);
    },
  });

  try {
    harness.page.onLoad({});
    await harness.page.onShow();
    await harness.page.handlePrimaryAction();

    assert.equal(getMembershipStatusCallCount, 2);
    assert.equal(harness.redirects.length, 0);
    assert.equal(harness.page.data.pageMode, 'overview');
    assert.equal(harness.page.data.membershipStatus, 'active');
    assert.equal(harness.page.data.submitMessage, '会员已生效，可继续使用当前权益');
  } finally {
    harness.cleanup();
  }
});
