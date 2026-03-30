const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const refreshMembershipOrderPath = path.resolve(
  __dirname,
  '../cloudfunctions/refreshMembershipOrder/index.js',
);

function matchesQuery(doc, query = {}) {
  return Object.entries(query).every(([key, value]) => doc[key] === value);
}

function createCloudMock({ openid = 'openid-1', memberships = [], orders = [] } = {}) {
  const collections = {
    miniapp_memberships: memberships.map((item) => ({ ...item })),
    miniapp_membership_orders: orders.map((item) => ({ ...item })),
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
                const nextDoc = {
                  _id: `doc-${docs.length + 1}`,
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

  delete require.cache[refreshMembershipOrderPath];

  try {
    return require(refreshMembershipOrderPath);
  } finally {
    Module._load = originalLoad;
  }
}

test('refreshMembershipOrder should activate membership and mark order granted for paid first-open order', async () => {
  const { cloud, collections } = createCloudMock({
    orders: [
      {
        _id: 'order-1',
        out_trade_no: 'manual-order-paid-001',
        openid: 'openid-1',
        plan_code: 'monthly_20',
        order_type: 'open',
        amount_fen: 2000,
        currency: 'CNY',
        status: 'paid',
        wx_prepay_id: 'mock-prepay-id',
        wx_transaction_id: 'mock-tx-id',
        notify_received_at: '2026-03-29T12:10:00.000Z',
        paid_at: '2026-03-29T12:10:00.000Z',
        effective_from: null,
        effective_until: null,
        source_item_id: 'item-1',
        membership_record_id: '',
        membership_status_snapshot: 'inactive',
        raw_notify_summary: 'manual mock payment success',
        status_history: [
          { status: 'created', timestamp: '2026-03-29T12:08:00.000Z', note: '订单已创建' },
          { status: 'pay_pending', timestamp: '2026-03-29T12:09:00.000Z', note: '已向微信支付发起下单' },
          { status: 'paid', timestamp: '2026-03-29T12:10:00.000Z', note: 'manual mock payment success' },
        ],
        created_at: '2026-03-29T12:08:00.000Z',
        updated_at: '2026-03-29T12:10:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    outTradeNo: 'manual-order-paid-001',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.sync_state, 'membership_granted');
  assert.equal(result.data.order_status, 'granted');
  assert.equal(result.data.membership_status, 'active');
  assert.equal(result.data.access_state, 'full');
  assert.equal(collections.miniapp_membership_orders[0].status, 'granted');
  assert.equal(collections.miniapp_memberships.length, 1);
  assert.equal(collections.miniapp_memberships[0].status, 'active');
  assert.equal(collections.miniapp_memberships[0].latest_order_no, 'manual-order-paid-001');
  assert.deepEqual(
    collections.miniapp_membership_orders[0].status_history.map((item) => item.status),
    ['created', 'pay_pending', 'paid', 'granted'],
  );
});

test('refreshMembershipOrder should return pay_sync_pending for pending order without granting membership', async () => {
  const { cloud, collections } = createCloudMock({
    orders: [
      {
        _id: 'order-2',
        out_trade_no: 'manual-order-pending-001',
        openid: 'openid-1',
        plan_code: 'monthly_20',
        order_type: 'open',
        status: 'pay_pending',
        source_item_id: 'item-2',
        created_at: '2026-03-29T12:00:00.000Z',
        updated_at: '2026-03-29T12:00:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    outTradeNo: 'manual-order-pending-001',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.sync_state, 'pay_sync_pending');
  assert.equal(result.data.membership_status, 'inactive');
  assert.equal(collections.miniapp_memberships.length, 0);
});

test('refreshMembershipOrder should return payment_failed for failed order', async () => {
  const { cloud, collections } = createCloudMock({
    orders: [
      {
        _id: 'order-3',
        out_trade_no: 'manual-order-failed-001',
        openid: 'openid-1',
        plan_code: 'monthly_20',
        order_type: 'open',
        status: 'failed',
        source_item_id: 'item-3',
        created_at: '2026-03-29T12:20:00.000Z',
        updated_at: '2026-03-29T12:21:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    outTradeNo: 'manual-order-failed-001',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.sync_state, 'payment_failed');
  assert.equal(collections.miniapp_memberships.length, 0);
});

test('refreshMembershipOrder should return payment_cancelled for cancelled order', async () => {
  const { cloud, collections } = createCloudMock({
    orders: [
      {
        _id: 'order-4',
        out_trade_no: 'manual-order-cancelled-001',
        openid: 'openid-1',
        plan_code: 'monthly_20',
        order_type: 'open',
        status: 'cancelled',
        source_item_id: 'item-4',
        created_at: '2026-03-29T12:22:00.000Z',
        updated_at: '2026-03-29T12:23:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    outTradeNo: 'manual-order-cancelled-001',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.sync_state, 'payment_cancelled');
  assert.equal(collections.miniapp_memberships.length, 0);
});

test('refreshMembershipOrder should repair missing membership record for granted order', async () => {
  const { cloud, collections } = createCloudMock({
    orders: [
      {
        _id: 'order-5',
        out_trade_no: 'manual-order-granted-001',
        openid: 'openid-1',
        plan_code: 'monthly_20',
        order_type: 'open',
        status: 'granted',
        source_item_id: 'item-5',
        effective_from: '2026-03-29T13:00:00.000Z',
        effective_until: '2026-04-28T13:00:00.000Z',
        created_at: '2026-03-29T13:00:00.000Z',
        updated_at: '2026-03-29T13:05:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    outTradeNo: 'manual-order-granted-001',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.sync_state, 'membership_granted');
  assert.equal(result.data.access_state, 'full');
  assert.equal(collections.miniapp_memberships.length, 1);
  assert.equal(collections.miniapp_memberships[0].latest_order_no, 'manual-order-granted-001');
});

test('refreshMembershipOrder should extend expiry from current end date for active renew orders', async () => {
  const { cloud, collections } = createCloudMock({
    memberships: [
      {
        _id: 'membership-active-1',
        openid: 'openid-1',
        plan_code: 'monthly_20',
        status: 'active',
        starts_at: '2026-03-01T00:00:00.000Z',
        expires_at: '2099-03-30T00:00:00.000Z',
        latest_order_no: 'old-order-1',
        updated_at: '2026-03-01T00:00:00.000Z',
      },
    ],
    orders: [
      {
        _id: 'order-renew-active-1',
        out_trade_no: 'manual-order-renew-active-001',
        openid: 'openid-1',
        plan_code: 'monthly_20',
        order_type: 'renew',
        status: 'paid',
        paid_at: '2026-03-29T12:10:00.000Z',
        source_item_id: 'item-renew-active',
        membership_record_id: 'membership-active-1',
        membership_status_snapshot: 'active',
        status_history: [
          { status: 'created', timestamp: '2026-03-29T12:08:00.000Z', note: '订单已创建' },
          { status: 'paid', timestamp: '2026-03-29T12:10:00.000Z', note: 'manual mock renew success' },
        ],
        created_at: '2026-03-29T12:08:00.000Z',
        updated_at: '2026-03-29T12:10:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    outTradeNo: 'manual-order-renew-active-001',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.sync_state, 'membership_granted');
  assert.equal(result.data.membership_status, 'active');
  assert.equal(result.data.starts_at, '2026-03-01T00:00:00.000Z');
  assert.equal(result.data.expires_at, '2099-04-29T00:00:00.000Z');
  assert.equal(collections.miniapp_memberships[0].latest_order_no, 'manual-order-renew-active-001');
  assert.equal(collections.miniapp_membership_orders[0].effective_from, '2026-03-01T00:00:00.000Z');
  assert.equal(collections.miniapp_membership_orders[0].effective_until, '2099-04-29T00:00:00.000Z');
  assert.deepEqual(
    collections.miniapp_membership_orders[0].status_history.map((item) => item.status),
    ['created', 'paid', 'granted'],
  );
});

test('refreshMembershipOrder should restart membership window from paid_at for expired renew orders', async () => {
  const { cloud, collections } = createCloudMock({
    memberships: [
      {
        _id: 'membership-expired-1',
        openid: 'openid-1',
        plan_code: 'monthly_20',
        status: 'expired',
        starts_at: '2026-02-01T00:00:00.000Z',
        expires_at: '2026-02-28T23:59:59.000Z',
        latest_order_no: 'old-order-expired-1',
        updated_at: '2026-03-01T00:00:00.000Z',
      },
    ],
    orders: [
      {
        _id: 'order-renew-expired-1',
        out_trade_no: 'manual-order-renew-expired-001',
        openid: 'openid-1',
        plan_code: 'monthly_20',
        order_type: 'renew',
        status: 'paid',
        paid_at: '2026-03-29T13:00:00.000Z',
        source_item_id: 'item-renew-expired',
        membership_record_id: 'membership-expired-1',
        membership_status_snapshot: 'expired',
        status_history: [
          { status: 'created', timestamp: '2026-03-29T12:58:00.000Z', note: '订单已创建' },
          { status: 'paid', timestamp: '2026-03-29T13:00:00.000Z', note: 'manual mock renew success' },
        ],
        created_at: '2026-03-29T12:58:00.000Z',
        updated_at: '2026-03-29T13:00:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    outTradeNo: 'manual-order-renew-expired-001',
  });

  assert.equal(result.success, true);
  assert.equal(result.data.sync_state, 'membership_granted');
  assert.equal(result.data.membership_status, 'active');
  assert.equal(result.data.starts_at, '2026-03-29T13:00:00.000Z');
  assert.equal(result.data.expires_at, '2026-04-28T13:00:00.000Z');
  assert.equal(collections.miniapp_memberships[0].latest_order_no, 'manual-order-renew-expired-001');
  assert.equal(collections.miniapp_membership_orders[0].effective_from, '2026-03-29T13:00:00.000Z');
  assert.equal(collections.miniapp_membership_orders[0].effective_until, '2026-04-28T13:00:00.000Z');
  assert.deepEqual(
    collections.miniapp_membership_orders[0].status_history.map((item) => item.status),
    ['created', 'paid', 'granted'],
  );
});
