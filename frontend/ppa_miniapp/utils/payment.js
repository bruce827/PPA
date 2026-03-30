const MONTHLY_PLAN_CODE = 'monthly_20';
const QUARTERLY_PLAN_CODE = 'quarterly_56';
const YEARLY_PLAN_CODE = 'yearly_199';

const MEMBERSHIP_PLAN_OPTIONS = [
  {
    code: MONTHLY_PLAN_CODE,
    title: '月会员',
    subtitle: '当前开放',
    priceText: '20 元 / 30 天',
    amountFen: 2000,
    durationDays: 30,
    enabled: true,
    description: '适合首次试用和短期高频找标。',
  },
  {
    code: QUARTERLY_PLAN_CODE,
    title: '季会员',
    subtitle: '敬请期待',
    priceText: '56 元 / 90 天',
    amountFen: 5600,
    durationDays: 90,
    enabled: false,
    description: '后续将开放更稳定的长期使用方案。',
  },
  {
    code: YEARLY_PLAN_CODE,
    title: '年会员',
    subtitle: '敬请期待',
    priceText: '199 元 / 365 天',
    amountFen: 19900,
    durationDays: 365,
    enabled: false,
    description: '适合长期持续跟标和会员经营增强阶段。',
  },
];

function normalizeMode(value) {
  return value === 'renew' ? 'renew' : 'open';
}

function getMembershipPlanOptions() {
  return MEMBERSHIP_PLAN_OPTIONS.map((item) => ({ ...item }));
}

function findMembershipPlan(planCode) {
  const normalizedPlanCode = String(planCode || '').trim();
  return MEMBERSHIP_PLAN_OPTIONS.find((item) => item.code === normalizedPlanCode) || null;
}

function getDefaultMembershipPlan() {
  return MEMBERSHIP_PLAN_OPTIONS.find((item) => item.enabled) || MEMBERSHIP_PLAN_OPTIONS[0];
}

function buildMembershipOrderPayload({ mode, sourceItemId = '', planCode = '' } = {}) {
  const normalizedPlanCode = String(planCode || '').trim() || getDefaultMembershipPlan().code;

  return {
    planCode: normalizedPlanCode,
    orderType: normalizeMode(mode) === 'renew' ? 'renew' : 'open',
    sourceItemId: String(sourceItemId || '').trim(),
  };
}

function buildPaymentError(error = {}) {
  const rawMessage = String(error.errMsg || error.message || '').trim();
  const lowered = rawMessage.toLowerCase();
  const isCancelled = lowered.includes('cancel');

  if (isCancelled) {
    const paymentError = new Error('你已取消支付，本次订单已保留，可稍后重新发起');
    paymentError.code = 'PAYMENT_CANCELLED';
    paymentError.cancelled = true;
    paymentError.raw = error;
    return paymentError;
  }

  const paymentError = new Error(rawMessage || '拉起微信支付失败，请稍后重试');
  paymentError.code = 'PAYMENT_REQUEST_FAILED';
  paymentError.cancelled = false;
  paymentError.raw = error;
  return paymentError;
}

function requestMiniProgramPayment(paymentParams = {}) {
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      ...paymentParams,
      success(result) {
        resolve(result || {});
      },
      fail(error) {
        reject(buildPaymentError(error));
      },
    });
  });
}

module.exports = {
  MEMBERSHIP_PLAN_OPTIONS,
  MONTHLY_PLAN_CODE,
  QUARTERLY_PLAN_CODE,
  YEARLY_PLAN_CODE,
  buildMembershipOrderPayload,
  buildPaymentError,
  findMembershipPlan,
  getDefaultMembershipPlan,
  getMembershipPlanOptions,
  requestMiniProgramPayment,
};
