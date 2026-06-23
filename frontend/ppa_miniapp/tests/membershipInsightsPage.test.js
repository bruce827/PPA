const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const pagePath = path.resolve(__dirname, '../pages/membership-insights/index.js');
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

function loadInsightsPage({
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

test('membership-insights page should relaunch to login when cached user is missing', () => {
  const harness = loadInsightsPage({
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

test('membership-insights page should load and normalize insights summary', async () => {
  const harness = loadInsightsPage({
    callFunctionImpl: ({ name }) => {
      if (name !== 'getMembershipInsights') {
        throw new Error(`unexpected cloud function: ${name}`);
      }

      return {
        result: {
          success: true,
          data: {
            generated_at: '2026-03-30T09:00:00.000Z',
            activity_log_query_state: 'ready',
            activity_log_query_error: '',
            summary: {
              paid_orders: 2,
              renew_orders: 1,
              active_members: 3,
              expired_members: 1,
              full_detail_views: 5,
              active_viewer_count: 2,
              unique_viewed_tender_count: 3,
              paying_users_count: 2,
              latest_activity_at: '2026-03-30T08:50:00.000Z',
              top_source_platforms: [
                { label: '中国海油', view_count: 3 },
              ],
              top_issuers: [
                { label: '招标单位甲', view_count: 3 },
              ],
              top_content: [
                {
                  source_item_id: 'item-1',
                  title: '项目 A',
                  issuer: '招标单位甲',
                  source_platform: '中国海油',
                  view_count: 3,
                  latest_viewed_at: '2026-03-30T08:50:00.000Z',
                },
              ],
            },
          },
        },
      };
    },
  });

  try {
    harness.page.onLoad();
    await harness.page.onShow();

    assert.deepEqual(
      harness.callHistory.map((item) => item.name),
      ['getMembershipInsights'],
    );
    assert.equal(harness.page.data.loaded, true);
    assert.equal(harness.page.data.summary.paidOrders, 2);
    assert.equal(harness.page.data.summary.topContent[0].title, '项目 A');
    assert.equal(harness.page.data.activityLogState, 'ready');
  } finally {
    harness.cleanup();
  }
});

test('membership-insights page should navigate back to ops page', () => {
  const harness = loadInsightsPage({
    callFunctionImpl() {
      return {
        result: {
          success: true,
          data: {
            generated_at: '2026-03-30T09:00:00.000Z',
            activity_log_query_state: 'ready',
            activity_log_query_error: '',
            summary: {},
          },
        },
      };
    },
  });

  try {
    harness.page.handleBackToOps();

    assert.equal(harness.navigations.length, 1);
    assert.equal(harness.navigations[0].url, '/pages/ops-membership-diagnostics/index');
  } finally {
    harness.cleanup();
  }
});
