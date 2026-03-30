const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const queryMembershipDiagnosticsPath = path.resolve(
  __dirname,
  '../cloudfunctions/queryMembershipDiagnostics/index.js',
);

function matchesQuery(doc, query = {}) {
  return Object.entries(query).every(([key, value]) => doc[key] === value);
}

function createCloudMock({
  openid = 'operator-openid-1',
  memberships = [],
  orders = [],
  opsLogs = [],
  opsLogError = null,
} = {}) {
  const collections = {
    miniapp_memberships: memberships.map((item) => ({ ...item })),
    miniapp_membership_orders: orders.map((item) => ({ ...item })),
    miniapp_membership_ops_log: opsLogs.map((item) => ({ ...item })),
  };

  return {
    cloud: {
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
              where(query) {
                return {
                  limit(limitValue) {
                    return {
                      async get() {
                        if (name === 'miniapp_membership_ops_log' && opsLogError) {
                          throw opsLogError;
                        }

                        const data = docs.filter((item) => matchesQuery(item, query));

                        return {
                          data: typeof limitValue === 'number' ? data.slice(0, limitValue) : data,
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    },
    collections,
  };
}

function loadCloudFunction(mockCloud) {
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'wx-server-sdk') {
      return mockCloud;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[queryMembershipDiagnosticsPath];

  try {
    return require(queryMembershipDiagnosticsPath);
  } finally {
    Module._load = originalLoad;
  }
}

test('queryMembershipDiagnostics should return current membership, latest order and latest ops log for openid query', async () => {
  process.env.MEMBERSHIP_OPS_OPENIDS = 'operator-openid-1';
  const { cloud } = createCloudMock({
    memberships: [
      {
        _id: 'membership-1',
        openid: 'user-openid-1',
        plan_code: 'monthly_20',
        status: 'active',
        starts_at: '2026-03-01T00:00:00.000Z',
        expires_at: '2099-12-31T23:59:59.000Z',
        latest_order_no: 'order-2',
        updated_at: '2026-03-29T12:00:00.000Z',
      },
    ],
    orders: [
      {
        _id: 'order-1',
        out_trade_no: 'order-1',
        openid: 'user-openid-1',
        order_type: 'open',
        status: 'failed',
        amount_fen: 2000,
        currency: 'CNY',
        created_at: '2026-03-29T11:00:00.000Z',
        updated_at: '2026-03-29T11:01:00.000Z',
      },
      {
        _id: 'order-2-id',
        out_trade_no: 'order-2',
        openid: 'user-openid-1',
        order_type: 'renew',
        status: 'granted',
        amount_fen: 2000,
        currency: 'CNY',
        membership_record_id: 'membership-1',
        effective_from: '2026-03-01T00:00:00.000Z',
        effective_until: '2100-01-30T23:59:59.000Z',
        status_history: [
          { status: 'created', timestamp: '2026-03-29T12:00:00.000Z', note: '订单已创建' },
          { status: 'granted', timestamp: '2026-03-29T12:05:00.000Z', note: '会员已生效' },
        ],
        created_at: '2026-03-29T12:00:00.000Z',
        updated_at: '2026-03-29T12:05:00.000Z',
      },
    ],
    opsLogs: [
      {
        _id: 'ops-1',
        openid: 'user-openid-1',
        action: 'manual_fix',
        target_type: 'order',
        target_id: 'order-1',
        operator: 'bruce',
        reason: '人工核对补单',
        created_at: '2026-03-29T12:10:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    openid: 'user-openid-1',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.query_type, 'openid');
  assert.equal(result.data.query_openid, 'user-openid-1');
  assert.equal(result.data.membership.membership_status, 'active');
  assert.equal(result.data.latest_order.out_trade_no, 'order-2');
  assert.equal(result.data.latest_order.status, 'granted');
  assert.equal(result.data.latest_ops_log.action, 'manual_fix');
  assert.equal(result.data.ops_log_query_state, 'ready');
  assert.equal(result.data.has_latest_order, true);
  assert.equal(result.data.has_ops_log, true);
  delete process.env.MEMBERSHIP_OPS_OPENIDS;
});

test('queryMembershipDiagnostics should resolve target order and openid for order query', async () => {
  process.env.MEMBERSHIP_OPS_OPENIDS = 'operator-openid-1';
  const { cloud } = createCloudMock({
    memberships: [
      {
        _id: 'membership-2',
        openid: 'user-openid-2',
        plan_code: 'monthly_20',
        status: 'expired',
        starts_at: '2026-02-01T00:00:00.000Z',
        expires_at: '2026-02-28T23:59:59.000Z',
        latest_order_no: 'order-newest',
        updated_at: '2026-03-01T00:00:00.000Z',
      },
    ],
    orders: [
      {
        _id: 'order-old-id',
        out_trade_no: 'order-target',
        openid: 'user-openid-2',
        order_type: 'open',
        status: 'failed',
        amount_fen: 2000,
        currency: 'CNY',
        created_at: '2026-03-29T10:00:00.000Z',
        updated_at: '2026-03-29T10:01:00.000Z',
      },
      {
        _id: 'order-new-id',
        out_trade_no: 'order-newest',
        openid: 'user-openid-2',
        order_type: 'renew',
        status: 'pay_pending',
        amount_fen: 2000,
        currency: 'CNY',
        created_at: '2026-03-29T11:00:00.000Z',
        updated_at: '2026-03-29T11:05:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    outTradeNo: 'order-target',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.query_type, 'order');
  assert.equal(result.data.query_openid, 'user-openid-2');
  assert.equal(result.data.target_order.out_trade_no, 'order-target');
  assert.equal(result.data.target_order.status, 'failed');
  assert.equal(result.data.latest_order.out_trade_no, 'order-newest');
  assert.equal(result.data.membership.membership_status, 'expired');
  delete process.env.MEMBERSHIP_OPS_OPENIDS;
});

test('queryMembershipDiagnostics should return explicit empty results for users without history', async () => {
  process.env.MEMBERSHIP_OPS_OPENIDS = 'operator-openid-1';
  const { cloud } = createCloudMock();
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    openid: 'user-openid-empty',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.membership.membership_status, 'inactive');
  assert.equal(result.data.latest_order, null);
  assert.equal(result.data.latest_ops_log, null);
  assert.equal(result.data.ops_log_query_state, 'ready');
  assert.equal(result.data.has_latest_order, false);
  assert.equal(result.data.has_ops_log, false);
  delete process.env.MEMBERSHIP_OPS_OPENIDS;
});

test('queryMembershipDiagnostics should reject missing query parameters', async () => {
  process.env.MEMBERSHIP_OPS_OPENIDS = 'operator-openid-1';
  const { cloud } = createCloudMock();
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({});

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'INVALID_QUERY');
  delete process.env.MEMBERSHIP_OPS_OPENIDS;
});

test('queryMembershipDiagnostics should reject callers outside internal allowlist', async () => {
  process.env.MEMBERSHIP_OPS_OPENIDS = 'another-openid';
  const { cloud } = createCloudMock();
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    openid: 'user-openid-1',
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'FORBIDDEN');
  delete process.env.MEMBERSHIP_OPS_OPENIDS;
});

test('queryMembershipDiagnostics should surface ops log query availability instead of swallowing errors', async () => {
  process.env.MEMBERSHIP_OPS_OPENIDS = 'operator-openid-1';
  const { cloud } = createCloudMock({
    opsLogError: new Error('collection missing'),
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    openid: 'user-openid-1',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.latest_ops_log, null);
  assert.equal(result.data.ops_log_query_state, 'unavailable');
  assert.equal(result.data.ops_log_query_error, 'collection missing');
  delete process.env.MEMBERSHIP_OPS_OPENIDS;
});
