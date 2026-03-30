const crypto = require('node:crypto');
const https = require('node:https');

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

const PLAN_CATALOG = {
  monthly_20: {
    code: 'monthly_20',
    title: 'PPA 招标快报月会员',
    amount_fen: 2000,
    duration_days: 30,
    currency: 'CNY',
    enabled: true,
  },
  quarterly_56: {
    code: 'quarterly_56',
    title: 'PPA 招标快报季会员',
    amount_fen: 5600,
    duration_days: 90,
    currency: 'CNY',
    enabled: false,
  },
  yearly_199: {
    code: 'yearly_199',
    title: 'PPA 招标快报年会员',
    amount_fen: 19900,
    duration_days: 365,
    currency: 'CNY',
    enabled: false,
  },
};

const ORDER_TYPE = {
  open: 'open',
  renew: 'renew',
};

const ORDER_STATUS = {
  created: 'created',
  pay_pending: 'pay_pending',
  failed: 'failed',
};

const MEMBERSHIP_STATUS = {
  inactive: 'inactive',
  active: 'active',
  expired: 'expired',
};

const MEMBERSHIP_RECORD_FETCH_LIMIT = 20;

function success(data) {
  return {
    success: true,
    data,
    error: '',
    errorCode: '',
  };
}

function fail(message, errorCode = 'SYSTEM_ERROR') {
  return {
    success: false,
    data: null,
    error: message,
    errorCode,
  };
}

function toTrimmedString(value) {
  return String(value || '').trim();
}

function normalizeTimestamp(value) {
  const normalized = toTrimmedString(value);

  if (!normalized) {
    return '';
  }

  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString();
}

function buildOrderHistoryEntry({ status, timestamp, note = '' }) {
  return {
    status: toTrimmedString(status),
    timestamp: normalizeTimestamp(timestamp) || new Date().toISOString(),
    note: toTrimmedString(note),
  };
}

function appendOrderHistory(existingHistory, entry) {
  const history = Array.isArray(existingHistory) ? existingHistory.slice() : [];

  history.push(entry);
  return history;
}

function resolveSortTimestamp(record) {
  return (
    normalizeTimestamp(record.updated_at) ||
    normalizeTimestamp(record.expires_at) ||
    normalizeTimestamp(record.starts_at) ||
    normalizeTimestamp(record.created_at)
  );
}

function resolveMembershipSnapshot(record, now = new Date()) {
  if (!record) {
    return {
      membership_status: MEMBERSHIP_STATUS.inactive,
      expires_at: '',
      starts_at: '',
      membership_record_id: '',
      plan_code: '',
    };
  }

  const startsAt = normalizeTimestamp(record.starts_at);
  const expiresAt = normalizeTimestamp(record.expires_at);
  const rawStatus = toTrimmedString(record.status).toLowerCase();
  const nowMs = now.getTime();
  const startsAtMs = startsAt ? Date.parse(startsAt) : null;
  const expiresAtMs = expiresAt ? Date.parse(expiresAt) : null;
  const isStarted = !startsAtMs || startsAtMs <= nowMs;
  const isExpiredByTime = Boolean(expiresAtMs) && expiresAtMs <= nowMs;
  const isActiveByTime = Boolean(expiresAtMs) && expiresAtMs > nowMs && isStarted;

  if (rawStatus === MEMBERSHIP_STATUS.expired || isExpiredByTime) {
    return {
      membership_status: MEMBERSHIP_STATUS.expired,
      expires_at: expiresAt,
      starts_at: startsAt,
      membership_record_id: toTrimmedString(record._id),
      plan_code: toTrimmedString(record.plan_code),
    };
  }

  if (rawStatus === MEMBERSHIP_STATUS.active && isActiveByTime) {
    return {
      membership_status: MEMBERSHIP_STATUS.active,
      expires_at: expiresAt,
      starts_at: startsAt,
      membership_record_id: toTrimmedString(record._id),
      plan_code: toTrimmedString(record.plan_code),
    };
  }

  return {
    membership_status: MEMBERSHIP_STATUS.inactive,
    expires_at: expiresAt,
    starts_at: startsAt,
    membership_record_id: toTrimmedString(record._id),
    plan_code: toTrimmedString(record.plan_code),
  };
}

async function getLatestMembershipRecord(openid) {
  const response = await db
    .collection('miniapp_memberships')
    .where({ openid })
    .limit(MEMBERSHIP_RECORD_FETCH_LIMIT)
    .get();

  const records = Array.isArray(response.data) ? response.data.slice() : [];

  records.sort((left, right) => {
    const leftValue = resolveSortTimestamp(left);
    const rightValue = resolveSortTimestamp(right);

    if (leftValue === rightValue) {
      return 0;
    }

    return String(rightValue).localeCompare(String(leftValue));
  });

  return records[0] || null;
}

function normalizeOrderType(value) {
  const normalized = toTrimmedString(value).toLowerCase();

  if (normalized === ORDER_TYPE.open || normalized === ORDER_TYPE.renew) {
    return normalized;
  }

  return '';
}

function resolvePlan(planCode) {
  const normalizedPlanCode = toTrimmedString(planCode);

  if (!normalizedPlanCode) {
    return {
      plan: PLAN_CATALOG.monthly_20,
      error: null,
    };
  }

  const plan = PLAN_CATALOG[normalizedPlanCode];

  if (!plan) {
    return {
      plan: null,
      error: {
        message: '当前套餐不存在，请重新进入会员入口',
        errorCode: 'INVALID_PLAN_CODE',
      },
    };
  }

  if (!plan.enabled) {
    return {
      plan: null,
      error: {
        message: '当前套餐暂未开放，请选择已开放方案',
        errorCode: 'PLAN_UNAVAILABLE',
      },
    };
  }

  return {
    plan,
    error: null,
  };
}

function isPaymentConfigReady(config) {
  return Boolean(
    config.appid &&
      config.mchid &&
      config.notify_url &&
      config.private_key &&
      config.serial_no,
  );
}

function loadPaymentConfig() {
  return {
    appid: toTrimmedString(process.env.WECHAT_PAY_APPID),
    mchid: toTrimmedString(process.env.WECHAT_PAY_MCHID),
    notify_url: toTrimmedString(process.env.WECHAT_PAY_NOTIFY_URL),
    private_key: process.env.WECHAT_PAY_PRIVATE_KEY || '',
    serial_no: toTrimmedString(process.env.WECHAT_PAY_SERIAL_NO),
  };
}

function validateOrderRequest({ orderType, membershipStatus }) {
  if (orderType === ORDER_TYPE.open && membershipStatus === MEMBERSHIP_STATUS.active) {
    return {
      valid: false,
      message: '当前会员仍有效，请使用续费入口',
      errorCode: 'ORDER_TYPE_MISMATCH',
    };
  }

  if (orderType === ORDER_TYPE.renew && membershipStatus === MEMBERSHIP_STATUS.inactive) {
    return {
      valid: false,
      message: '当前尚未开通会员，请使用开通入口',
      errorCode: 'ORDER_TYPE_MISMATCH',
    };
  }

  return { valid: true };
}

function generateOrderNo(orderType) {
  const prefix = orderType === ORDER_TYPE.renew ? 'MR' : 'MO';
  const timestamp = Date.now().toString();
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}${timestamp}${randomSuffix}`.slice(0, 32);
}

function signMessage(privateKey, message) {
  return crypto.createSign('RSA-SHA256').update(message).sign(privateKey, 'base64');
}

function buildAuthorizationHeader({ mchid, serialNo, nonceStr, timestamp, method, canonicalUrl, body, privateKey }) {
  const message = `${method}\n${canonicalUrl}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = signMessage(privateKey, message);

  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`;
}

function requestWechatPay(config, body) {
  const canonicalUrl = '/v3/pay/transactions/jsapi';
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: 'api.mch.weixin.qq.com',
        path: canonicalUrl,
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: buildAuthorizationHeader({
            mchid: config.mchid,
            serialNo: config.serial_no,
            nonceStr,
            timestamp,
            method: 'POST',
            canonicalUrl,
            body: payload,
            privateKey: config.private_key,
          }),
        },
      },
      (response) => {
        let rawBody = '';

        response.on('data', (chunk) => {
          rawBody += chunk;
        });

        response.on('end', () => {
          let parsedBody = {};

          try {
            parsedBody = rawBody ? JSON.parse(rawBody) : {};
          } catch (error) {
            reject(new Error('微信支付返回了无法解析的响应'));
            return;
          }

          if (response.statusCode >= 200 && response.statusCode < 300 && parsedBody.prepay_id) {
            resolve(parsedBody);
            return;
          }

          reject(new Error(parsedBody.message || parsedBody.code || '微信支付下单失败'));
        });
      },
    );

    request.on('error', (error) => {
      reject(error);
    });

    request.write(payload);
    request.end();
  });
}

function buildMiniProgramPaymentParams({ appid, privateKey, prepayId }) {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const packageValue = `prepay_id=${prepayId}`;
  const signType = 'RSA';
  const paySign = signMessage(privateKey, `${appid}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`);

  return {
    timeStamp,
    nonceStr,
    package: packageValue,
    signType,
    paySign,
  };
}

async function updateOrderRecord(orderId, data) {
  await db.collection('miniapp_membership_orders').doc(orderId).update({
    data,
  });
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext();

    if (!OPENID) {
      return fail('请先登录后再开通会员', 'UNAUTHORIZED');
    }

    const requestedPlanCode = toTrimmedString(event.planCode);
    const orderType = normalizeOrderType(event.orderType);
    const sourceItemId = toTrimmedString(event.sourceItemId);
    const resolvedPlan = resolvePlan(requestedPlanCode);

    if (resolvedPlan.error) {
      return fail(resolvedPlan.error.message, resolvedPlan.error.errorCode);
    }

    const plan = resolvedPlan.plan;

    if (!orderType) {
      return fail('下单类型不正确，请重新进入会员入口', 'INVALID_ORDER_TYPE');
    }

    const membership = await getLatestMembershipRecord(OPENID);
    const membershipSnapshot = resolveMembershipSnapshot(membership);
    const validation = validateOrderRequest({
      orderType,
      membershipStatus: membershipSnapshot.membership_status,
    });

    if (!validation.valid) {
      return fail(validation.message, validation.errorCode);
    }

    const createdAt = new Date().toISOString();
    const outTradeNo = generateOrderNo(orderType);
    const statusHistory = [
      buildOrderHistoryEntry({
        status: ORDER_STATUS.created,
        timestamp: createdAt,
        note: '订单已创建',
      }),
    ];
    const addResult = await db.collection('miniapp_membership_orders').add({
      data: {
        out_trade_no: outTradeNo,
        openid: OPENID,
        plan_code: plan.code,
        order_type: orderType,
        amount_fen: plan.amount_fen,
        currency: plan.currency,
        status: ORDER_STATUS.created,
        wx_prepay_id: '',
        wx_transaction_id: '',
        notify_received_at: null,
        paid_at: null,
        effective_from: null,
        effective_until: null,
        source_item_id: sourceItemId,
        membership_record_id: membershipSnapshot.membership_record_id || '',
        membership_status_snapshot: membershipSnapshot.membership_status,
        raw_notify_summary: '',
        status_history: statusHistory,
        created_at: createdAt,
        updated_at: createdAt,
      },
    });

    const orderId = addResult._id;
    const paymentConfig = loadPaymentConfig();

    if (!isPaymentConfigReady(paymentConfig)) {
      const failedAt = new Date().toISOString();
      const failureMessage = '当前环境未完成微信支付配置，请补齐云函数环境变量后再试';

      await updateOrderRecord(orderId, {
        status: ORDER_STATUS.failed,
        raw_notify_summary: failureMessage,
        status_history: appendOrderHistory(
          statusHistory,
          buildOrderHistoryEntry({
            status: ORDER_STATUS.failed,
            timestamp: failedAt,
            note: failureMessage,
          }),
        ),
        updated_at: failedAt,
      });

      return success({
        out_trade_no: outTradeNo,
        plan_code: plan.code,
        order_type: orderType,
        amount_fen: plan.amount_fen,
        currency: plan.currency,
        status: ORDER_STATUS.failed,
        payment_ready: false,
        payment_message: failureMessage,
        payment_params: null,
      });
    }

    try {
      const payResult = await requestWechatPay(paymentConfig, {
        appid: paymentConfig.appid,
        mchid: paymentConfig.mchid,
        description: plan.title,
        out_trade_no: outTradeNo,
        notify_url: paymentConfig.notify_url,
        amount: {
          total: plan.amount_fen,
          currency: plan.currency,
        },
        payer: {
          openid: OPENID,
        },
      });
      const paymentParams = buildMiniProgramPaymentParams({
        appid: paymentConfig.appid,
        privateKey: paymentConfig.private_key,
        prepayId: payResult.prepay_id,
      });
      const pendingAt = new Date().toISOString();
      const pendingMessage = '已向微信支付发起下单';

      await updateOrderRecord(orderId, {
        status: ORDER_STATUS.pay_pending,
        wx_prepay_id: payResult.prepay_id,
        raw_notify_summary: pendingMessage,
        status_history: appendOrderHistory(
          statusHistory,
          buildOrderHistoryEntry({
            status: ORDER_STATUS.pay_pending,
            timestamp: pendingAt,
            note: pendingMessage,
          }),
        ),
        updated_at: pendingAt,
      });

      return success({
        out_trade_no: outTradeNo,
        plan_code: plan.code,
        order_type: orderType,
        amount_fen: plan.amount_fen,
        currency: plan.currency,
        status: ORDER_STATUS.pay_pending,
        payment_ready: true,
        payment_message: '',
        payment_params: paymentParams,
      });
    } catch (error) {
      const failedAt = new Date().toISOString();
      const failureMessage = error.message || '微信支付下单失败，请稍后重试';

      await updateOrderRecord(orderId, {
        status: ORDER_STATUS.failed,
        raw_notify_summary: failureMessage,
        status_history: appendOrderHistory(
          statusHistory,
          buildOrderHistoryEntry({
            status: ORDER_STATUS.failed,
            timestamp: failedAt,
            note: failureMessage,
          }),
        ),
        updated_at: failedAt,
      });

      return success({
        out_trade_no: outTradeNo,
        plan_code: plan.code,
        order_type: orderType,
        amount_fen: plan.amount_fen,
        currency: plan.currency,
        status: ORDER_STATUS.failed,
        payment_ready: false,
        payment_message: failureMessage,
        payment_params: null,
      });
    }
  } catch (error) {
    return fail(error.message || '创建会员订单失败');
  }
};
