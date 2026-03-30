const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const pagePath = path.resolve(__dirname, '../pages/ops-membership-diagnostics/index.js');
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

function loadOpsPage({
  cachedUser = {
    openid: 'openid-ops-1',
    displayName: '内部运营',
  },
  callFunctionImpl,
} = {}) {
  const originalPage = global.Page;
  const originalWx = global.wx;
  let definition = null;

  const toasts = [];
  const relaunches = [];
  const navigations = [];
  const navigationTitles = [];
  const callHistory = [];

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
    reLaunch(options) {
      relaunches.push(options);
    },
    navigateTo(options) {
      navigations.push(options);
    },
    cloud: {
      callFunction({ name, data }) {
        callHistory.push({ name, data });
        return Promise.resolve(callFunctionImpl({ name, data }));
      },
    },
  };

  delete require.cache[pagePath];
  require(pagePath);

  const page = createPageInstance(definition);

  return {
    page,
    toasts,
    relaunches,
    navigations,
    navigationTitles,
    callHistory,
    cleanup() {
      delete require.cache[pagePath];
      global.Page = originalPage;
      global.wx = originalWx;
    },
  };
}

test('ops-membership-diagnostics page should relaunch to login when cached user is missing', () => {
  const harness = loadOpsPage({
    cachedUser: null,
    callFunctionImpl() {
      throw new Error('should not call cloud functions');
    },
  });

  try {
    harness.page.onShow();

    assert.equal(harness.relaunches.length, 1);
    assert.equal(harness.relaunches[0].url, '/pages/login/index');
  } finally {
    harness.cleanup();
  }
});

test('ops-membership-diagnostics page should navigate to membership insights page', () => {
  const harness = loadOpsPage({
    callFunctionImpl() {
      throw new Error('should not call cloud functions');
    },
  });

  try {
    harness.page.handleOpenInsights();

    assert.equal(harness.navigations.length, 1);
    assert.equal(harness.navigations[0].url, '/pages/membership-insights/index');
  } finally {
    harness.cleanup();
  }
});

test('ops-membership-diagnostics page should query diagnostics by openid and store result', async () => {
  const harness = loadOpsPage({
    callFunctionImpl: ({ name }) => {
      if (name !== 'queryMembershipDiagnostics') {
        throw new Error(`unexpected cloud function: ${name}`);
      }

      return {
        result: {
          success: true,
          data: {
            query_type: 'openid',
            query_openid: 'user-openid-1',
            query_out_trade_no: '',
            membership: {
              membership_status: 'active',
              expires_at: '2099-12-31T23:59:59.000Z',
              has_membership_record: true,
            },
            latest_order: {
              out_trade_no: 'order-1',
              status: 'granted',
            },
            latest_ops_log: null,
            ops_log_query_state: 'ready',
          },
        },
      };
    },
  });

  try {
    harness.page.onLoad({});
    harness.page.handleQueryOpenidInput({
      detail: {
        value: 'user-openid-1',
      },
    });

    await harness.page.handleRunQuery();

    assert.equal(harness.callHistory.length, 1);
    assert.equal(harness.callHistory[0].name, 'queryMembershipDiagnostics');
    assert.equal(harness.callHistory[0].data.openid, 'user-openid-1');
    assert.equal(harness.page.data.diagnostics.query_openid, 'user-openid-1');
    assert.equal(harness.page.data.queryMessage.includes('已返回当前会员'), true);
  } finally {
    harness.cleanup();
  }
});

test('ops-membership-diagnostics page should require query before manual fix', async () => {
  const harness = loadOpsPage({
    callFunctionImpl() {
      throw new Error('should not call cloud functions');
    },
  });

  try {
    await harness.page.handleSubmitFix();

    assert.equal(harness.toasts.length, 1);
    assert.equal(harness.toasts[0].title, '请先完成查询，再执行人工修正');
  } finally {
    harness.cleanup();
  }
});

test('ops-membership-diagnostics page should submit fix and re-query latest diagnostics', async () => {
  const harness = loadOpsPage({
    callFunctionImpl: ({ name }) => {
      if (name === 'queryMembershipDiagnostics') {
        return {
          result: {
            success: true,
            data: {
              query_type: 'order',
              query_openid: 'user-openid-2',
              query_out_trade_no: 'order-2',
              membership: {
                membership_status: 'expired',
                expires_at: '2026-02-28T23:59:59.000Z',
                has_membership_record: true,
              },
              latest_order: {
                out_trade_no: 'order-2',
                status: 'failed',
              },
              latest_ops_log: {
                action: 'grant_membership',
                created_at: '2026-03-29T13:00:00.000Z',
              },
              ops_log_query_state: 'ready',
            },
          },
        };
      }

      if (name === 'fixMembershipOrder') {
        return {
          result: {
            success: true,
            data: {
              result: 'membership_granted',
              message: '人工补开已完成，用户可重新访问会员内容',
              ops_log: {
                action: 'grant_membership',
                created_at: '2026-03-29T13:00:00.000Z',
              },
            },
          },
        };
      }

      throw new Error(`unexpected cloud function: ${name}`);
    },
  });

  try {
    harness.page.onLoad({
      queryType: 'order',
      queryOutTradeNo: 'order-2',
    });

    await harness.page.handleRunQuery();

    harness.page.handleReasonInput({
      detail: {
        value: '支付成功但未自动开通，人工补开',
      },
    });

    await harness.page.handleSubmitFix();

    assert.deepEqual(
      harness.callHistory.map((item) => item.name),
      ['queryMembershipDiagnostics', 'fixMembershipOrder', 'queryMembershipDiagnostics'],
    );
    assert.equal(harness.callHistory[1].data.queryType, 'order');
    assert.equal(harness.callHistory[1].data.queryOutTradeNo, 'order-2');
    assert.equal(harness.page.data.lastActionResult.result, 'membership_granted');
    assert.equal(harness.toasts[harness.toasts.length - 1].title, '人工修正已完成');
  } finally {
    harness.cleanup();
  }
});
