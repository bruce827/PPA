const { getCachedUser } = require('../../utils/auth');
const { formatDateTime } = require('../../utils/date');
const {
  requestMiniProgramPayment,
  buildMembershipOrderPayload,
  getDefaultMembershipPlan,
  getMembershipPlanOptions,
} = require('../../utils/payment');
const {
  getMembershipReminder,
  getReminderPreferences,
  setReminderPreferences,
} = require('../../utils/reminders');
const { callFunction } = require('../../utils/request');

const MODE_COPY = {
  open: {
    navTitle: '开通会员',
    statusLabel: '未开通',
    title: '开通月会员后继续查看当前项目',
    description: '开通后可查看完整招标公告、更多信息、原文链接，以及后续会员专属权益。',
    primaryText: '月会员 20 元，下一步开通',
  },
  renew: {
    navTitle: '续费会员',
    statusLabel: '已过期',
    title: '续费月会员后恢复当前项目访问',
    description: '续费后可继续查看完整详情，不会丢失你当前的项目上下文。',
    primaryText: '月会员 20 元，下一步续费',
  },
};

function normalizeMode(value) {
  return value === 'renew' ? 'renew' : 'open';
}

function normalizePageMode(options = {}) {
  return options.mode ? 'purchase' : 'overview';
}

function buildOverviewCopy(snapshot = {}) {
  const membershipStatus = String(snapshot.membership_status || '').trim().toLowerCase();
  const expiresText = snapshot.expires_at ? formatDateTime(snapshot.expires_at) : '未开通';
  const startsText = snapshot.starts_at ? formatDateTime(snapshot.starts_at) : '';

  if (membershipStatus === 'active') {
    return {
      mode: 'renew',
      statusLabel: '会员有效',
      title: '你的会员当前有效',
      description: expiresText ? `会员有效期至 ${expiresText}，当前可查看完整详情与后续会员权益。` : '你当前可查看完整详情与后续会员权益。',
      primaryText: '立即续费月会员',
      statusSummary: '当前已开通月会员，可继续浏览完整详情并保留续费入口。',
      expiresText,
      startsText,
      recordHint: '后续将在这里展示开通与续费记录；当前可先通过到期时间与当前状态确认会员权益。',
    };
  }

  if (membershipStatus === 'expired') {
    return {
      mode: 'renew',
      statusLabel: '已过期',
      title: '你的会员已过期',
      description: expiresText && expiresText !== '未开通'
        ? `会员已于 ${expiresText} 到期，续费后可恢复完整详情访问。`
        : '你的会员已过期，续费后可恢复完整详情访问。',
      primaryText: '立即续费月会员',
      statusSummary: '当前无法继续访问会员内容，续费后可恢复完整详情与后续权益。',
      expiresText,
      startsText,
      recordHint: '后续将在这里展示开通与续费记录；当前保留该区块作为会员记录入口位置。',
    };
  }

  return {
    mode: 'open',
    statusLabel: '未开通',
    title: '你还未开通会员',
    description: '开通月会员后可查看完整招标公告、更多信息、原文链接，以及后续会员专属权益。',
    primaryText: '立即开通月会员',
    statusSummary: '当前处于未开通状态，可先查看公开信息，再按需开通会员。',
    expiresText: '未开通',
    startsText: '',
    recordHint: '后续将在这里展示开通与续费记录；当前该位置作为会员记录入口预留。',
  };
}

Page({
  data: {
    pageMode: 'purchase',
    mode: 'open',
    navTitle: MODE_COPY.open.navTitle,
    statusLabel: MODE_COPY.open.statusLabel,
    title: MODE_COPY.open.title,
    description: MODE_COPY.open.description,
    defaultPrimaryText: MODE_COPY.open.primaryText,
    primaryText: MODE_COPY.open.primaryText,
    sourceItemId: '',
    submitting: false,
    awaitingSync: false,
    latestSyncState: '',
    submitMessage: '',
    latestOrderNo: '',
    secondaryText: '返回当前项目',
    membershipStatus: 'inactive',
    accessState: 'membership_required',
    expiresText: '',
    startsText: '',
    statusSummary: '',
    recordHint: '',
    statusLoading: false,
    statusLoaded: false,
    hasMembershipRecord: false,
    reminderType: '',
    tenderSubscriptionEnabled: false,
    membershipReminder: null,
    planOptions: getMembershipPlanOptions(),
    selectedPlanCode: getDefaultMembershipPlan().code,
    selectedPlanTitle: getDefaultMembershipPlan().title,
    selectedPlanPriceText: getDefaultMembershipPlan().priceText,
  },

  onLoad(options = {}) {
    const pageMode = normalizePageMode(options);
    const reminderType = String(options.reminderType || '').trim();
    const defaultPlan = getDefaultMembershipPlan();
    const planOptions = getMembershipPlanOptions();

    if (pageMode === 'overview') {
      this.setData({
        pageMode,
        reminderType,
        planOptions,
        selectedPlanCode: defaultPlan.code,
        selectedPlanTitle: defaultPlan.title,
        selectedPlanPriceText: defaultPlan.priceText,
        navTitle: '会员状态',
        title: '正在加载会员状态...',
        description: '系统正在确认你的会员状态与到期时间。',
        defaultPrimaryText: '立即开通月会员',
        primaryText: '立即开通月会员',
        sourceItemId: '',
        secondaryText: '返回列表',
      });

      wx.setNavigationBarTitle({
        title: '会员状态',
      });
      return;
    }

    const mode = normalizeMode(options.mode);
    const copy = MODE_COPY[mode];

    this.setData({
      pageMode,
      reminderType,
      planOptions,
      selectedPlanCode: defaultPlan.code,
      selectedPlanTitle: defaultPlan.title,
      selectedPlanPriceText: defaultPlan.priceText,
      mode,
      navTitle: copy.navTitle,
      statusLabel: copy.statusLabel,
      title: copy.title,
      description: copy.description,
      defaultPrimaryText: copy.primaryText,
      primaryText: copy.primaryText,
      sourceItemId: options.sourceItemId || '',
      secondaryText: '返回当前项目',
    });

    wx.setNavigationBarTitle({
      title: copy.navTitle,
    });
  },

  onShow() {
    const user = getCachedUser();

    if (!user) {
      wx.reLaunch({
        url: '/pages/login/index',
      });
      return;
    }

    if (this.data.pageMode === 'overview') {
      this.loadReminderPreferences();
      return this.loadMembershipOverview();
    }
  },

  loadReminderPreferences() {
    const preferences = getReminderPreferences();

    this.setData({
      tenderSubscriptionEnabled: preferences.tenderSubscriptionEnabled,
    });
  },

  async loadMembershipOverview() {
    this.setData({
      statusLoading: true,
    });

    try {
      const snapshot = await callFunction('getMembershipStatus');
      const overviewCopy = buildOverviewCopy(snapshot);
      const membershipReminder = getMembershipReminder(snapshot, {
        reminderType: this.data.reminderType,
      });

      this.setData({
        mode: overviewCopy.mode,
        membershipStatus: snapshot.membership_status || 'inactive',
        accessState: snapshot.access_state || 'membership_required',
        hasMembershipRecord: Boolean(snapshot.has_membership_record),
        navTitle: '会员状态',
        statusLabel: overviewCopy.statusLabel,
        title: overviewCopy.title,
        description: overviewCopy.description,
        defaultPrimaryText: overviewCopy.primaryText,
        primaryText: this.data.awaitingSync ? '刷新会员状态' : overviewCopy.primaryText,
        expiresText: overviewCopy.expiresText,
        startsText: overviewCopy.startsText,
        statusSummary: overviewCopy.statusSummary,
        recordHint: overviewCopy.recordHint,
        statusLoaded: true,
        membershipReminder,
      });
    } catch (error) {
      const message = (error && error.message) || '获取会员状态失败';

      this.setData({
        statusLoaded: false,
      });

      wx.showToast({
        title: message,
        icon: 'none',
      });
    } finally {
      this.setData({
        statusLoading: false,
      });
    }
  },

  handlePrimaryAction() {
    if (this.data.submitting) {
      return;
    }

    if (this.data.awaitingSync && this.data.latestOrderNo) {
      return this.refreshLatestOrderStatus();
    }

    return this.submitMembershipOrder();
  },

  async submitMembershipOrder() {
    this.setData({
      submitting: true,
      awaitingSync: false,
      latestSyncState: '',
      primaryText: this.data.defaultPrimaryText,
      submitMessage: '正在创建订单...',
    });

    try {
      const order = await callFunction(
        'createMembershipOrder',
        buildMembershipOrderPayload({
          mode: this.data.mode,
          sourceItemId: this.data.sourceItemId,
          planCode: this.data.selectedPlanCode,
        }),
      );

      this.setData({
        latestOrderNo: order.out_trade_no || '',
        submitMessage: order.payment_ready ? '正在拉起微信支付...' : order.payment_message || '当前暂不可支付',
      });

      if (!order.payment_ready || !order.payment_params) {
        wx.showToast({
          title: order.payment_message || '当前暂不可支付',
          icon: 'none',
        });
        return;
      }

      await requestMiniProgramPayment(order.payment_params);

      this.setData({
        submitMessage: '支付成功，正在确认会员状态...',
      });

      await this.refreshLatestOrderStatus({
        manageSubmitting: false,
        silentPendingToast: true,
      });
    } catch (error) {
      const message = (error && error.message) || '发起支付失败，请稍后重试';

      this.setData({
        awaitingSync: false,
        latestSyncState: '',
        primaryText: this.data.defaultPrimaryText,
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

  async refreshLatestOrderStatus(options = {}) {
    const { manageSubmitting = true, silentPendingToast = false } = options;

    if (!this.data.latestOrderNo) {
      return;
    }

    if (manageSubmitting) {
      this.setData({
        submitting: true,
        submitMessage: '正在刷新会员状态...',
      });
    }

    try {
      const refreshResult = await callFunction('refreshMembershipOrder', {
        outTradeNo: this.data.latestOrderNo,
      });

      const syncState = refreshResult.sync_state || '';
      const message = refreshResult.message || '会员状态已更新';

      if (syncState === 'membership_granted' && refreshResult.access_state === 'full') {
        this.setData({
          awaitingSync: false,
          latestSyncState: syncState,
          primaryText: this.data.defaultPrimaryText,
          submitMessage: message,
        });

        wx.showToast({
          title: '会员已生效',
          icon: 'success',
        });

        if (this.data.pageMode === 'overview' && !this.data.sourceItemId) {
          await this.loadMembershipOverview();
          return;
        }

        this.handleBackToDetail();
        return;
      }

      if (syncState === 'pay_sync_pending') {
        this.setData({
          awaitingSync: true,
          latestSyncState: syncState,
          primaryText: '刷新会员状态',
          submitMessage: message,
        });

        if (!silentPendingToast) {
          wx.showToast({
            title: message,
            icon: 'none',
          });
        }
        return;
      }

      this.setData({
        awaitingSync: false,
        latestSyncState: syncState,
        primaryText: this.data.defaultPrimaryText,
        submitMessage: message,
      });

      wx.showToast({
        title: message,
        icon: 'none',
      });
    } catch (error) {
      const message = (error && error.message) || '刷新会员状态失败，请稍后重试';

      this.setData({
        awaitingSync: true,
        latestSyncState: 'pay_sync_pending',
        primaryText: '刷新会员状态',
        submitMessage: message,
      });

      wx.showToast({
        title: message,
        icon: 'none',
      });
    } finally {
      if (manageSubmitting) {
        this.setData({
          submitting: false,
        });
      }
    }
  },

  handleBackToDetail() {
    if (this.data.sourceItemId) {
      wx.redirectTo({
        url: `/pages/tender-detail/index?sourceItemId=${encodeURIComponent(this.data.sourceItemId)}`,
      });
      return;
    }

    wx.navigateBack({
      delta: 1,
    });
  },

  handleSecondaryAction() {
    if (this.data.submitting) {
      return;
    }

    if (this.data.sourceItemId) {
      this.handleBackToDetail();
      return;
    }

    wx.redirectTo({
      url: '/pages/tender-list/index',
    });
  },

  handleMembershipReminderAction() {
    if (!this.data.membershipReminder || !this.data.membershipReminder.actionText) {
      return;
    }

    return this.handlePrimaryAction();
  },

  handleTenderReminderToggle(event) {
    const value = Boolean(event.detail.value);
    const preferences = setReminderPreferences({
      tenderSubscriptionEnabled: value,
    });

    this.setData({
      tenderSubscriptionEnabled: preferences.tenderSubscriptionEnabled,
    });

    wx.showToast({
      title: value ? '已开启站内新招标提醒' : '已关闭站内新招标提醒',
      icon: 'none',
    });
  },

  handlePlanSelect(event) {
    const planCode = String((event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.code) || '').trim();
    const selectedPlan = this.data.planOptions.find((item) => item.code === planCode);

    if (!selectedPlan) {
      return;
    }

    if (!selectedPlan.enabled) {
      wx.showToast({
        title: `${selectedPlan.title}暂未开放`,
        icon: 'none',
      });
      return;
    }

    this.setData({
      selectedPlanCode: selectedPlan.code,
      selectedPlanTitle: selectedPlan.title,
      selectedPlanPriceText: selectedPlan.priceText,
    });
  },
});
