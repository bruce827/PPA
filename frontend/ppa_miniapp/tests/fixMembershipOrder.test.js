const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const fixMembershipOrderPath = path.resolve(
  __dirname,
  '../cloudfunctions/fixMembershipOrder/index.js',
);

function matchesQuery(doc, query = {}) {
  return Object.entries(query).every(([key, value]) => doc[key] === value);
}

function createCloudMock({
  openid = 'operator-openid-1',
  memberships = [],
  orders = [],
  opsLogs = [],
  opsLogAddError = null,
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
        const buildCollectionApi = (docs, name) => ({
          where(query) {
            return {
              limit(limitValue) {
                return {
                  async get() {
                    const data = docs.filter((item) => matchesQuery(item, query));

                    return {
                      data: typeof limitValue === 'number' ? data.slice(0, limitValue) : data,
                    };
                  },
                };
              },
            };
          },
          async add({ data }) {
            if (name === 'miniapp_membership_ops_log' && opsLogAddError) {
              throw opsLogAddError;
            }

            const nextDoc = {
              _id: data._id || `${name}-doc-${docs.length + 1}`,
              ...data,
            };

            docs.push(nextDoc);

            return {
              _id: nextDoc._id,
            };
          },
          doc(id) {
            return {
              async update({ data }) {
                const index = docs.findIndex((item) => item._id === id);

                if (index === -1) {
                  throw new Error(`document not found: ${id}`);
                }

                docs[index] = {
                  ...docs[index],
                  ...data,
                };

                return {
                  updated: 1,
                };
              },
            };
          },
        });

        const databaseApi = {
          collection(name) {
            const docs = collections[name];

            if (!docs) {
              throw new Error(`unknown collection: ${name}`);
            }

            return buildCollectionApi(docs, name);
          },
          async runTransaction(handler) {
            const snapshot = Object.fromEntries(
              Object.entries(collections).map(([name, docs]) => [name, docs.map((item) => ({ ...item }))]),
            );
            const transactionApi = {
              collection(name) {
                const docs = collections[name];

                if (!docs) {
                  throw new Error(`unknown collection: ${name}`);
                }

                return buildCollectionApi(docs, name);
              },
            };

            try {
              return await handler(transactionApi);
            } catch (error) {
              Object.keys(collections).forEach((name) => {
                collections[name].length = 0;
                snapshot[name].forEach((item) => collections[name].push({ ...item }));
              });
              throw error;
            }
          },
        };

        return databaseApi;
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

  delete require.cache[fixMembershipOrderPath];

  try {
    return require(fixMembershipOrderPath);
  } finally {
    Module._load = originalLoad;
  }
}

test('fixMembershipOrder should manually grant membership and record ops log for order context', async () => {
  process.env.MEMBERSHIP_OPS_OPENIDS = 'operator-openid-1';
  const { cloud, collections } = createCloudMock({
    orders: [
      {
        _id: 'order-1',
        out_trade_no: 'manual-order-paid-002',
        openid: 'user-openid-1',
        plan_code: 'monthly_20',
        order_type: 'open',
        status: 'paid',
        amount_fen: 2000,
        currency: 'CNY',
        paid_at: '2026-03-29T12:10:00.000Z',
        source_item_id: 'item-1',
        membership_record_id: '',
        membership_status_snapshot: 'inactive',
        status_history: [
          { status: 'created', timestamp: '2026-03-29T12:08:00.000Z', note: '订单已创建' },
          { status: 'paid', timestamp: '2026-03-29T12:10:00.000Z', note: 'manual mock payment success' },
        ],
        created_at: '2026-03-29T12:08:00.000Z',
        updated_at: '2026-03-29T12:10:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    action: 'grant_membership',
    reason: '支付成功但未自动开通，人工补开',
    queryType: 'order',
    queryOutTradeNo: 'manual-order-paid-002',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.result, 'membership_granted');
  assert.equal(result.data.membership.membership_status, 'active');
  assert.equal(result.data.order.status, 'manual_fixed');
  assert.equal(collections.miniapp_memberships.length, 1);
  assert.equal(collections.miniapp_memberships[0].status, 'active');
  assert.equal(collections.miniapp_membership_orders[0].status, 'manual_fixed');
  assert.deepEqual(
    collections.miniapp_membership_orders[0].status_history.map((item) => item.status),
    ['created', 'paid', 'manual_fixed'],
  );
  assert.equal(collections.miniapp_membership_ops_log.length, 1);
  assert.equal(collections.miniapp_membership_ops_log[0].action, 'grant_membership');
  delete process.env.MEMBERSHIP_OPS_OPENIDS;
});

test('fixMembershipOrder should manually update membership status and keep ops log', async () => {
  process.env.MEMBERSHIP_OPS_OPENIDS = 'operator-openid-1';
  const { cloud, collections } = createCloudMock({
    memberships: [
      {
        _id: 'membership-1',
        openid: 'user-openid-2',
        plan_code: 'monthly_20',
        status: 'active',
        starts_at: '2026-03-01T00:00:00.000Z',
        expires_at: '2099-12-31T23:59:59.000Z',
        latest_order_no: 'order-123',
        updated_at: '2026-03-29T10:00:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    action: 'update_membership_status',
    reason: '用户已过期，人工修正会员状态',
    membershipStatus: 'expired',
    queryType: 'openid',
    queryOpenid: 'user-openid-2',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.result, 'membership_status_updated');
  assert.equal(result.data.membership.membership_status, 'expired');
  assert.equal(collections.miniapp_memberships[0].status, 'expired');
  assert.equal(collections.miniapp_membership_ops_log.length, 1);
  assert.equal(collections.miniapp_membership_ops_log[0].action, 'update_membership_status');
  delete process.env.MEMBERSHIP_OPS_OPENIDS;
});

test('fixMembershipOrder should manually update order status and append status history', async () => {
  process.env.MEMBERSHIP_OPS_OPENIDS = 'operator-openid-1';
  const { cloud, collections } = createCloudMock({
    memberships: [
      {
        _id: 'membership-2',
        openid: 'user-openid-3',
        plan_code: 'monthly_20',
        status: 'inactive',
        starts_at: '',
        expires_at: '',
        latest_order_no: 'order-failed-1',
        updated_at: '2026-03-29T10:00:00.000Z',
      },
    ],
    orders: [
      {
        _id: 'order-2',
        out_trade_no: 'order-failed-1',
        openid: 'user-openid-3',
        plan_code: 'monthly_20',
        order_type: 'open',
        status: 'pay_pending',
        amount_fen: 2000,
        currency: 'CNY',
        status_history: [
          { status: 'created', timestamp: '2026-03-29T12:00:00.000Z', note: '订单已创建' },
        ],
        created_at: '2026-03-29T12:00:00.000Z',
        updated_at: '2026-03-29T12:01:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    action: 'update_order_status',
    reason: '用户确认未支付，人工改为失败',
    orderStatus: 'failed',
    queryType: 'order',
    queryOutTradeNo: 'order-failed-1',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.result, 'order_status_updated');
  assert.equal(result.data.order.status, 'failed');
  assert.equal(collections.miniapp_membership_orders[0].status, 'failed');
  assert.deepEqual(
    collections.miniapp_membership_orders[0].status_history.map((item) => item.status),
    ['created', 'failed'],
  );
  assert.equal(collections.miniapp_membership_ops_log[0].action, 'update_order_status');
  delete process.env.MEMBERSHIP_OPS_OPENIDS;
});

test('fixMembershipOrder should reject operations without query context or reason', async () => {
  process.env.MEMBERSHIP_OPS_OPENIDS = 'operator-openid-1';
  const { cloud } = createCloudMock();
  const cloudFunction = loadCloudFunction(cloud);

  const missingReason = await cloudFunction.main({
    action: 'grant_membership',
    queryType: 'openid',
    queryOpenid: 'user-openid-4',
  });
  const missingContext = await cloudFunction.main({
    action: 'grant_membership',
    reason: '人工补开',
  });

  assert.equal(missingReason.success, false);
  assert.equal(missingReason.errorCode, 'INVALID_REASON');
  assert.equal(missingContext.success, false);
  assert.equal(missingContext.errorCode, 'INVALID_QUERY_CONTEXT');
  delete process.env.MEMBERSHIP_OPS_OPENIDS;
});

test('fixMembershipOrder should reject callers outside internal allowlist', async () => {
  process.env.MEMBERSHIP_OPS_OPENIDS = 'another-openid';
  const { cloud } = createCloudMock();
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    action: 'grant_membership',
    reason: '人工补开',
    queryType: 'openid',
    queryOpenid: 'user-openid-1',
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'FORBIDDEN');
  delete process.env.MEMBERSHIP_OPS_OPENIDS;
});

test('fixMembershipOrder should roll back membership and order updates when ops log creation fails', async () => {
  process.env.MEMBERSHIP_OPS_OPENIDS = 'operator-openid-1';
  const { cloud, collections } = createCloudMock({
    opsLogAddError: new Error('ops log insert failed'),
    orders: [
      {
        _id: 'order-rollback-1',
        out_trade_no: 'manual-order-paid-rollback',
        openid: 'user-openid-rollback',
        plan_code: 'monthly_20',
        order_type: 'open',
        status: 'paid',
        amount_fen: 2000,
        currency: 'CNY',
        paid_at: '2026-03-29T12:10:00.000Z',
        membership_record_id: '',
        membership_status_snapshot: 'inactive',
        status_history: [
          { status: 'created', timestamp: '2026-03-29T12:08:00.000Z', note: '订单已创建' },
          { status: 'paid', timestamp: '2026-03-29T12:10:00.000Z', note: 'manual mock payment success' },
        ],
        created_at: '2026-03-29T12:08:00.000Z',
        updated_at: '2026-03-29T12:10:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    action: 'grant_membership',
    reason: '支付成功但未自动开通，人工补开',
    queryType: 'order',
    queryOutTradeNo: 'manual-order-paid-rollback',
  });

  assert.equal(result.success, false);
  assert.equal(collections.miniapp_memberships.length, 0);
  assert.equal(collections.miniapp_membership_orders[0].status, 'paid');
  assert.deepEqual(
    collections.miniapp_membership_orders[0].status_history.map((item) => item.status),
    ['created', 'paid'],
  );
  assert.equal(collections.miniapp_membership_ops_log.length, 0);
  delete process.env.MEMBERSHIP_OPS_OPENIDS;
});
