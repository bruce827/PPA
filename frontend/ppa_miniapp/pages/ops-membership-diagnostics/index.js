const { getCachedUser } = require('../../utils/auth');
const { callFunction } = require('../../utils/request');

const QUERY_TYPE_OPTIONS = [
  { label: '按 openid 查询', value: 'openid' },
  { label: '按订单号查询', value: 'order' },
];

const ACTION_OPTIONS = [
  { label: '人工补开会员', value: 'grant_membership' },
  { label: '修正会员状态', value: 'update_membership_status' },
  { label: '修正订单状态', value: 'update_order_status' },
];

const MEMBERSHIP_STATUS_OPTIONS = [
  { label: '有效', value: 'active' },
  { label: '已过期', value: 'expired' },
  { label: '未开通', value: 'inactive' },
];

const ORDER_STATUS_OPTIONS = [
  { label: '支付成功', value: 'paid' },
  { label: '支付失败', value: 'failed' },
  { label: '已取消', value: 'cancelled' },
];

function resolveOptionValue(options, index, fallback) {
  const normalizedIndex = Number(index);

  if (Number.isInteger(normalizedIndex) && options[normalizedIndex]) {
    return options[normalizedIndex].value;
  }

  return fallback;
}

function formatMembershipTitle(snapshot) {
  const status = snapshot && snapshot.membership_status;

  if (status === 'active') {
    return '会员有效';
  }

  if (status === 'expired') {
    return '会员已过期';
  }

  return '未开通会员';
}

function formatOrderTitle(order) {
  if (!order || !order.out_trade_no) {
    return '暂无订单记录';
  }

  return `${order.out_trade_no} · ${order.status || '未知状态'}`;
}

Page({
  data: {
    queryTypeOptions: QUERY_TYPE_OPTIONS,
    actionOptions: ACTION_OPTIONS,
    membershipStatusOptions: MEMBERSHIP_STATUS_OPTIONS,
    orderStatusOptions: ORDER_STATUS_OPTIONS,
    queryTypeIndex: 0,
    actionIndex: 0,
    membershipStatusIndex: 0,
    orderStatusIndex: 1,
    queryType: QUERY_TYPE_OPTIONS[0].value,
    selectedAction: ACTION_OPTIONS[0].value,
    queryOpenid: '',
    queryOutTradeNo: '',
    reason: '',
    querying: false,
    submitting: false,
    queryMessage: '',
    submitMessage: '',
    diagnostics: null,
    lastActionResult: null,
  },

  onLoad(options = {}) {
    if (options.queryOpenid || options.queryOutTradeNo || options.queryType) {
      const queryType = options.queryType === 'order' ? 'order' : 'openid';

      this.setData({
        queryType,
        queryTypeIndex: queryType === 'order' ? 1 : 0,
        queryOpenid: options.queryOpenid || '',
        queryOutTradeNo: options.queryOutTradeNo || '',
      });
    }

    wx.setNavigationBarTitle({
      title: '会员异常处理',
    });
  },

  onShow() {
    const user = getCachedUser();

    if (!user) {
      wx.reLaunch({
        url: '/pages/login/index',
      });
    }
  },

  handleQueryTypeChange(event) {
    const queryTypeIndex = Number(event.detail.value || 0);
    const queryType = resolveOptionValue(QUERY_TYPE_OPTIONS, queryTypeIndex, 'openid');

    this.setData({
      queryTypeIndex,
      queryType,
      queryMessage: '',
      submitMessage: '',
    });
  },

  handleActionChange(event) {
    const actionIndex = Number(event.detail.value || 0);
    const selectedAction = resolveOptionValue(ACTION_OPTIONS, actionIndex, 'grant_membership');

    this.setData({
      actionIndex,
      selectedAction,
      submitMessage: '',
    });
  },

  handleMembershipStatusChange(event) {
    this.setData({
      membershipStatusIndex: Number(event.detail.value || 0),
    });
  },

  handleOrderStatusChange(event) {
    this.setData({
      orderStatusIndex: Number(event.detail.value || 0),
    });
  },

  handleQueryOpenidInput(event) {
    this.setData({
      queryOpenid: event.detail.value || '',
    });
  },

  handleQueryOutTradeNoInput(event) {
    this.setData({
      queryOutTradeNo: event.detail.value || '',
    });
  },

  handleReasonInput(event) {
    this.setData({
      reason: event.detail.value || '',
    });
  },

  buildQueryPayload() {
    if (this.data.queryType === 'order') {
      return {
        outTradeNo: this.data.queryOutTradeNo.trim(),
      };
    }

    return {
      openid: this.data.queryOpenid.trim(),
    };
  },

  getCurrentQueryContext() {
    const diagnostics = this.data.diagnostics;

    if (!diagnostics) {
      return null;
    }

    return {
      queryType: diagnostics.query_type,
      queryOpenid: diagnostics.query_openid,
      queryOutTradeNo: diagnostics.query_out_trade_no,
    };
  },

  async runDiagnosticsQuery(options = {}) {
    const { silent = false } = options;
    const payload = this.buildQueryPayload();

    if (this.data.queryType === 'order' && !payload.outTradeNo) {
      if (!silent) {
        wx.showToast({
          title: '请先输入订单号',
          icon: 'none',
        });
      }
      return;
    }

    if (this.data.queryType === 'openid' && !payload.openid) {
      if (!silent) {
        wx.showToast({
          title: '请先输入 openid',
          icon: 'none',
        });
      }
      return;
    }

    this.setData({
      querying: true,
      queryMessage: '正在查询会员与订单状态...',
    });

    try {
      const diagnostics = await callFunction('queryMembershipDiagnostics', payload);

      this.setData({
        diagnostics,
        queryMessage: diagnostics.has_latest_order || diagnostics.membership.has_membership_record
          ? '已返回当前会员、订单和修正记录，可继续执行人工处理'
          : '当前用户暂无会员或订单记录，可根据需要继续人工处理',
      });
    } catch (error) {
      const message = (error && error.message) || '查询会员与订单状态失败';

      this.setData({
        diagnostics: null,
        queryMessage: message,
      });

      if (!silent) {
        wx.showToast({
          title: message,
          icon: 'none',
        });
      }
    } finally {
      this.setData({
        querying: false,
      });
    }
  },

  handleRunQuery() {
    return this.runDiagnosticsQuery();
  },

  async handleSubmitFix() {
    const queryContext = this.getCurrentQueryContext();

    if (!queryContext) {
      wx.showToast({
        title: '请先完成查询，再执行人工修正',
        icon: 'none',
      });
      return;
    }

    const reason = this.data.reason.trim();

    if (!reason) {
      wx.showToast({
        title: '请先填写修正原因',
        icon: 'none',
      });
      return;
    }

    const payload = {
      action: this.data.selectedAction,
      reason,
      queryType: queryContext.queryType,
      queryOpenid: queryContext.queryOpenid,
      queryOutTradeNo: queryContext.queryOutTradeNo,
    };

    if (this.data.selectedAction === 'update_membership_status') {
      payload.membershipStatus = resolveOptionValue(
        MEMBERSHIP_STATUS_OPTIONS,
        this.data.membershipStatusIndex,
        'active',
      );
    }

    if (this.data.selectedAction === 'update_order_status') {
      payload.orderStatus = resolveOptionValue(
        ORDER_STATUS_OPTIONS,
        this.data.orderStatusIndex,
        'failed',
      );
    }

    this.setData({
      submitting: true,
      submitMessage: '正在提交人工修正...',
      lastActionResult: null,
    });

    try {
      const result = await callFunction('fixMembershipOrder', payload);

      this.setData({
        submitMessage: result.message || '人工修正已完成',
        lastActionResult: result,
      });

      await this.runDiagnosticsQuery({ silent: true });

      wx.showToast({
        title: '人工修正已完成',
        icon: 'success',
      });
    } catch (error) {
      const message = (error && error.message) || '执行人工修正失败';

      this.setData({
        submitMessage: message,
      });

      wx.showToast({
        title: message,
        icon: 'none',
      });
    } finally {
      this.setData({
        submitting: false,
      });
    }
  },

  getMembershipTitle() {
    return formatMembershipTitle(this.data.diagnostics && this.data.diagnostics.membership);
  },

  getOrderTitle() {
    return formatOrderTitle(this.data.diagnostics && this.data.diagnostics.latest_order);
  },

  handleOpenInsights() {
    wx.navigateTo({
      url: '/pages/membership-insights/index',
    });
  },
});
