const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const https = require('node:https');
const EventEmitter = require('node:events');
const { generateKeyPairSync } = require('node:crypto');

const createMembershipOrderPath = path.resolve(__dirname, '../cloudfunctions/createMembershipOrder/index.js');

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const TEST_PRIVATE_KEY = privateKey.export({
  type: 'pkcs1',
  format: 'pem',
});

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

  delete require.cache[createMembershipOrderPath];

  try {
    return require(createMembershipOrderPath);
  } finally {
    Module._load = originalLoad;
  }
}

function withPaymentEnv(values, callback) {
  const previous = {
    WECHAT_PAY_APPID: process.env.WECHAT_PAY_APPID,
    WECHAT_PAY_MCHID: process.env.WECHAT_PAY_MCHID,
    WECHAT_PAY_NOTIFY_URL: process.env.WECHAT_PAY_NOTIFY_URL,
    WECHAT_PAY_PRIVATE_KEY: process.env.WECHAT_PAY_PRIVATE_KEY,
    WECHAT_PAY_SERIAL_NO: process.env.WECHAT_PAY_SERIAL_NO,
  };

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      delete process.env[key];
      return;
    }

    process.env[key] = value;
  });

  return Promise.resolve()
    .then(callback)
    .finally(() => {
      Object.entries(previous).forEach(([key, value]) => {
        if (value === undefined) {
          delete process.env[key];
          return;
        }

        process.env[key] = value;
      });
    });
}

function mockWechatPaySuccess(prepayId = 'wx-prepay-id-001') {
  const originalRequest = https.request;

  https.request = (options, callback) => {
    const response = new EventEmitter();
    response.statusCode = 200;

    process.nextTick(() => {
      callback(response);
      response.emit('data', JSON.stringify({ prepay_id: prepayId }));
      response.emit('end');
    });

    return {
      on() {},
      write() {},
      end() {},
    };
  };

  return () => {
    https.request = originalRequest;
  };
}

test('createMembershipOrder should create pay_pending open order with payment params for inactive users', async () => {
  const { cloud, collections } = createCloudMock();
  const cloudFunction = loadCloudFunction(cloud);
  const restoreRequest = mockWechatPaySuccess();

  await withPaymentEnv(
    {
      WECHAT_PAY_APPID: 'wx-test-appid',
      WECHAT_PAY_MCHID: 'mch-test-001',
      WECHAT_PAY_NOTIFY_URL: 'https://example.com/pay/notify',
      WECHAT_PAY_PRIVATE_KEY: TEST_PRIVATE_KEY,
      WECHAT_PAY_SERIAL_NO: 'serial-no-001',
    },
    async () => {
      const result = await cloudFunction.main({
        planCode: 'monthly_20',
        orderType: 'open',
        sourceItemId: 'item-1',
      });

      assert.equal(result.success, true);
      assert.equal(result.data.order_type, 'open');
      assert.equal(result.data.status, 'pay_pending');
      assert.equal(result.data.payment_ready, true);
      assert.equal(result.data.amount_fen, 2000);
      assert.equal(result.data.plan_code, 'monthly_20');
      assert.match(result.data.payment_params.package, /^prepay_id=/);
      assert.equal(collections.miniapp_membership_orders.length, 1);
      assert.equal(collections.miniapp_membership_orders[0].status, 'pay_pending');
      assert.equal(collections.miniapp_membership_orders[0].source_item_id, 'item-1');
      assert.deepEqual(
        collections.miniapp_membership_orders[0].status_history.map((item) => item.status),
        ['created', 'pay_pending'],
      );
    },
  );

  restoreRequest();
});

test('createMembershipOrder should keep membership linkage when creating renew order', async () => {
  const { cloud, collections } = createCloudMock({
    memberships: [
      {
        _id: 'membership-1',
        openid: 'openid-1',
        plan_code: 'monthly_20',
        status: 'active',
        starts_at: '2026-03-01T00:00:00.000Z',
        expires_at: '2099-03-30T00:00:00.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);
  const restoreRequest = mockWechatPaySuccess('wx-prepay-id-renew');

  await withPaymentEnv(
    {
      WECHAT_PAY_APPID: 'wx-test-appid',
      WECHAT_PAY_MCHID: 'mch-test-001',
      WECHAT_PAY_NOTIFY_URL: 'https://example.com/pay/notify',
      WECHAT_PAY_PRIVATE_KEY: TEST_PRIVATE_KEY,
      WECHAT_PAY_SERIAL_NO: 'serial-no-001',
    },
    async () => {
      const result = await cloudFunction.main({
        planCode: 'monthly_20',
        orderType: 'renew',
      });

      assert.equal(result.success, true);
      assert.equal(result.data.order_type, 'renew');
      assert.equal(result.data.status, 'pay_pending');
      assert.equal(collections.miniapp_membership_orders.length, 1);
      assert.equal(collections.miniapp_membership_orders[0].membership_record_id, 'membership-1');
      assert.equal(collections.miniapp_membership_orders[0].membership_status_snapshot, 'active');
      assert.deepEqual(
        collections.miniapp_membership_orders[0].status_history.map((item) => item.status),
        ['created', 'pay_pending'],
      );
    },
  );

  restoreRequest();
});

test('createMembershipOrder should allow renew order for expired membership users', async () => {
  const { cloud, collections } = createCloudMock({
    memberships: [
      {
        _id: 'membership-expired-1',
        openid: 'openid-1',
        plan_code: 'monthly_20',
        status: 'expired',
        starts_at: '2026-02-01T00:00:00.000Z',
        expires_at: '2026-02-28T23:59:59.000Z',
        updated_at: '2026-03-01T00:00:00.000Z',
      },
    ],
  });
  const cloudFunction = loadCloudFunction(cloud);
  const restoreRequest = mockWechatPaySuccess('wx-prepay-id-expired-renew');

  await withPaymentEnv(
    {
      WECHAT_PAY_APPID: 'wx-test-appid',
      WECHAT_PAY_MCHID: 'mch-test-001',
      WECHAT_PAY_NOTIFY_URL: 'https://example.com/pay/notify',
      WECHAT_PAY_PRIVATE_KEY: TEST_PRIVATE_KEY,
      WECHAT_PAY_SERIAL_NO: 'serial-no-001',
    },
    async () => {
      const result = await cloudFunction.main({
        planCode: 'monthly_20',
        orderType: 'renew',
      });

      assert.equal(result.success, true);
      assert.equal(result.data.order_type, 'renew');
      assert.equal(result.data.status, 'pay_pending');
      assert.equal(collections.miniapp_membership_orders.length, 1);
      assert.equal(collections.miniapp_membership_orders[0].membership_record_id, 'membership-expired-1');
      assert.equal(collections.miniapp_membership_orders[0].membership_status_snapshot, 'expired');
      assert.deepEqual(
        collections.miniapp_membership_orders[0].status_history.map((item) => item.status),
        ['created', 'pay_pending'],
      );
    },
  );

  restoreRequest();
});

test('createMembershipOrder should return payment_ready false and keep failed order when payment config is missing', async () => {
  const { cloud, collections } = createCloudMock();
  const cloudFunction = loadCloudFunction(cloud);

  await withPaymentEnv(
    {
      WECHAT_PAY_APPID: '',
      WECHAT_PAY_MCHID: '',
      WECHAT_PAY_NOTIFY_URL: '',
      WECHAT_PAY_PRIVATE_KEY: '',
      WECHAT_PAY_SERIAL_NO: '',
    },
    async () => {
      const result = await cloudFunction.main({
        planCode: 'monthly_20',
        orderType: 'open',
      });

      assert.equal(result.success, true);
      assert.equal(result.data.payment_ready, false);
      assert.equal(result.data.status, 'failed');
      assert.match(result.data.payment_message, /支付配置/);
      assert.equal(collections.miniapp_membership_orders.length, 1);
      assert.equal(collections.miniapp_membership_orders[0].status, 'failed');
      assert.deepEqual(
        collections.miniapp_membership_orders[0].status_history.map((item) => item.status),
        ['created', 'failed'],
      );
    },
  );
});

test('createMembershipOrder should reject renew requests for inactive users', async () => {
  const { cloud } = createCloudMock();
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    planCode: 'monthly_20',
    orderType: 'renew',
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'ORDER_TYPE_MISMATCH');
});

test('createMembershipOrder should reject invalid order type', async () => {
  const { cloud } = createCloudMock();
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    planCode: 'monthly_20',
    orderType: 'upgrade',
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'INVALID_ORDER_TYPE');
});

test('createMembershipOrder should reject unavailable future plans without touching order ledger', async () => {
  const { cloud, collections } = createCloudMock();
  const cloudFunction = loadCloudFunction(cloud);

  const result = await cloudFunction.main({
    planCode: 'quarterly_56',
    orderType: 'open',
    sourceItemId: 'item-4',
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'PLAN_UNAVAILABLE');
  assert.equal(collections.miniapp_membership_orders.length, 0);
});
