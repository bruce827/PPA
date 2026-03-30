const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const pagePath = path.resolve(__dirname, '../pages/tender-list/index.js');
const USER_STORAGE_KEY = 'ppaMiniappUser';
const REMINDER_STORAGE_KEY = 'ppaMiniappReminderPreferences';

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

function loadTenderListPage({
  cachedUser = {
    openid: 'openid-1',
    displayName: '测试用户',
  },
  reminderPreferences = {
    tenderSubscriptionEnabled: true,
  },
  callFunctionImpl,
} = {}) {
  const originalPage = global.Page;
  const originalWx = global.wx;
  let definition = null;

  const toasts = [];
  const relaunches = [];
  const navigations = [];
  const callHistory = [];

  global.Page = (config) => {
    definition = config;
  };

  global.wx = {
    getStorageSync(key) {
      if (key === USER_STORAGE_KEY) {
        return cachedUser;
      }

      if (key === REMINDER_STORAGE_KEY) {
        return reminderPreferences;
      }

      return null;
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
    stopPullDownRefresh() {},
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
    callHistory,
    cleanup() {
      delete require.cache[pagePath];
      global.Page = originalPage;
      global.wx = originalWx;
    },
  };
}

test('tender-list page should show reminder banner when tender subscription is enabled and list has results', async () => {
  const harness = loadTenderListPage({
    callFunctionImpl: ({ name }) => {
      if (name !== 'getTenderList') {
        throw new Error(`unexpected cloud function: ${name}`);
      }

      return {
        result: {
          success: true,
          data: {
            pageNo: 1,
            pageSize: 20,
            total: 2,
            list: [
              {
                source_item_id: 'item-1',
                title: '测试项目',
                published_at: '2026-03-29T08:00:00.000Z',
                deadline_at: '2026-03-30T08:00:00.000Z',
                issuer: '招标单位',
                budget_amount: 100000,
                adopt_status: 'unadopted',
              },
            ],
          },
        },
      };
    },
  });

  try {
    harness.page.onLoad({
      startDate: '2026-03-29',
      endDate: '2026-03-29',
      reminderType: 'new_tender_subscription',
    });
    await harness.page.onShow();

    assert.equal(harness.page.data.reminderBanner.type, 'new_tender_subscription');
    assert.match(harness.page.data.reminderBanner.description, /2 条/);
  } finally {
    harness.cleanup();
  }
});

test('tender-list page should not show reminder banner when tender subscription is disabled', async () => {
  const harness = loadTenderListPage({
    reminderPreferences: {
      tenderSubscriptionEnabled: false,
    },
    callFunctionImpl: ({ name }) => {
      if (name !== 'getTenderList') {
        throw new Error(`unexpected cloud function: ${name}`);
      }

      return {
        result: {
          success: true,
          data: {
            pageNo: 1,
            pageSize: 20,
            total: 2,
            list: [
              {
                source_item_id: 'item-1',
                title: '测试项目',
                published_at: '2026-03-29T08:00:00.000Z',
              },
            ],
          },
        },
      };
    },
  });

  try {
    harness.page.onLoad({
      startDate: '2026-03-29',
      endDate: '2026-03-29',
    });
    await harness.page.onShow();

    assert.equal(harness.page.data.reminderBanner, null);
  } finally {
    harness.cleanup();
  }
});
