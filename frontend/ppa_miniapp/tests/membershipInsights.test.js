const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const insightsPath = path.resolve(__dirname, '../cloudfunctions/getMembershipInsights/index.js');

function createCloudMock({
  openid = 'openid-ops-1',
  memberships = [],
  orders = [],
  activityLogs = [],
  activityLogError = null,
  membershipError = null,
  orderError = null,
  allowedOpenids = 'openid-ops-1',
} = {}) {
  const collections = {
    miniapp_memberships: memberships.map((item) => ({ ...item })),
    miniapp_membership_orders: orders.map((item) => ({ ...item })),
    miniapp_membership_activity_logs: activityLogs.map((item) => ({ ...item })),
  };

  return {
    DYNAMIC_CURRENT_ENV: 'test-env',
    init() {},
    getWXContext() {
      return { OPENID: openid };
    },
    database() {
      return {
        collection(name) {
          const docs = collections[name];

          if (!docs) {
            throw new Error(`unknown collection: ${name}`);
          }

          return {
            limit() {
              return {
                async get() {
                  if (name === 'miniapp_memberships' && membershipError) {
                    throw membershipError;
                  }

                  if (name === 'miniapp_membership_orders' && orderError) {
                    throw orderError;
                  }

                  if (name === 'miniapp_membership_activity_logs' && activityLogError) {
                    throw activityLogError;
                  }

                  return {
                    data: docs.slice(),
                  };
                },
              };
            },
          };
        },
      };
    },
    __setEnv() {
      process.env.MEMBERSHIP_OPS_OPENIDS = allowedOpenids;
    },
  };
}

function loadCloudFunction(mockCloud) {
  const originalLoad = Module._load;

  mockCloud.__setEnv();

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'wx-server-sdk') {
      return mockCloud;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[insightsPath];

  try {
    return require(insightsPath);
  } finally {
    Module._load = originalLoad;
  }
}

test('getMembershipInsights should reject callers outside ops allowlist', async () => {
  const cloudFunction = loadCloudFunction(createCloudMock({
    openid: 'openid-user-1',
    allowedOpenids: 'openid-ops-1',
  }));

  const result = await cloudFunction.main();

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'FORBIDDEN');
});

test('getMembershipInsights should summarize paid, renew, usage and content preferences', async () => {
  const cloudFunction = loadCloudFunction(createCloudMock({
    memberships: [
      {
        _id: 'membership-1',
        openid: 'openid-user-1',
        status: 'active',
        starts_at: '2026-03-01T00:00:00.000Z',
        expires_at: '2099-03-31T00:00:00.000Z',
        updated_at: '2026-03-29T10:00:00.000Z',
      },
      {
        _id: 'membership-2',
        openid: 'openid-user-2',
        status: 'expired',
        starts_at: '2026-02-01T00:00:00.000Z',
        expires_at: '2026-02-28T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      },
    ],
    orders: [
      {
        out_trade_no: 'order-1',
        openid: 'openid-user-1',
        order_type: 'open',
        status: 'granted',
        created_at: '2026-03-29T08:00:00.000Z',
      },
      {
        out_trade_no: 'order-2',
        openid: 'openid-user-1',
        order_type: 'renew',
        status: 'paid',
        created_at: '2026-03-29T09:00:00.000Z',
      },
      {
        out_trade_no: 'order-3',
        openid: 'openid-user-2',
        order_type: 'open',
        status: 'failed',
        created_at: '2026-03-29T10:00:00.000Z',
      },
    ],
    activityLogs: [
      {
        openid: 'openid-user-1',
        source_item_id: 'item-1',
        title: '项目 A',
        issuer: '招标单位甲',
        source_platform: '中国海油',
        action: 'view_full_detail',
        accessed_at: '2026-03-29T11:00:00.000Z',
      },
      {
        openid: 'openid-user-1',
        source_item_id: 'item-1',
        title: '项目 A',
        issuer: '招标单位甲',
        source_platform: '中国海油',
        action: 'view_full_detail',
        accessed_at: '2026-03-29T11:10:00.000Z',
      },
      {
        openid: 'openid-user-2',
        source_item_id: 'item-2',
        title: '项目 B',
        issuer: '招标单位乙',
        source_platform: '中煤电子招投标平台',
        action: 'view_full_detail',
        accessed_at: '2026-03-29T11:20:00.000Z',
      },
    ],
  }));

  const result = await cloudFunction.main();

  assert.equal(result.success, true);
  assert.equal(result.data.summary.paid_orders, 2);
  assert.equal(result.data.summary.renew_orders, 1);
  assert.equal(result.data.summary.active_members, 1);
  assert.equal(result.data.summary.expired_members, 1);
  assert.equal(result.data.summary.full_detail_views, 3);
  assert.equal(result.data.summary.active_viewer_count, 2);
  assert.equal(result.data.summary.unique_viewed_tender_count, 2);
  assert.equal(result.data.summary.top_content[0].source_item_id, 'item-1');
  assert.equal(result.data.summary.top_content[0].view_count, 2);
  assert.equal(result.data.summary.top_source_platforms[0].label, '中国海油');
  assert.equal(result.data.activity_log_query_state, 'ready');
});

test('getMembershipInsights should degrade gracefully when activity log collection is unavailable', async () => {
  const cloudFunction = loadCloudFunction(createCloudMock({
    activityLogError: new Error('collection not found'),
  }));

  const result = await cloudFunction.main();

  assert.equal(result.success, true);
  assert.equal(result.data.activity_log_query_state, 'unavailable');
  assert.equal(result.data.summary.full_detail_views, 0);
  assert.equal(result.data.summary.top_content.length, 0);
});
