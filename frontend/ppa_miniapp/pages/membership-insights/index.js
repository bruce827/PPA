const { getCachedUser } = require('../../utils/auth');
const { formatDateTime } = require('../../utils/date');
const { callFunction } = require('../../utils/request');

function normalizeSummary(summary = {}) {
  return {
    totalOrders: Number(summary.total_orders || 0),
    paidOrders: Number(summary.paid_orders || 0),
    renewOrders: Number(summary.renew_orders || 0),
    payingUsersCount: Number(summary.paying_users_count || 0),
    activeMembers: Number(summary.active_members || 0),
    expiredMembers: Number(summary.expired_members || 0),
    fullDetailViews: Number(summary.full_detail_views || 0),
    activeViewerCount: Number(summary.active_viewer_count || 0),
    uniqueViewedTenderCount: Number(summary.unique_viewed_tender_count || 0),
    topSourcePlatforms: Array.isArray(summary.top_source_platforms) ? summary.top_source_platforms : [],
    topIssuers: Array.isArray(summary.top_issuers) ? summary.top_issuers : [],
    topContent: Array.isArray(summary.top_content)
      ? summary.top_content.map((item) => ({
          ...item,
          latestViewedText: formatDateTime(item.latest_viewed_at) || '暂无',
        }))
      : [],
    latestActivityText: formatDateTime(summary.latest_activity_at) || '暂无',
  };
}

Page({
  data: {
    loading: false,
    loaded: false,
    summary: normalizeSummary(),
    generatedAtText: '',
    activityLogState: 'ready',
    activityLogError: '',
    emptyText: '当前还没有足够的会员经营数据',
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '会员经营分析',
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

    return this.loadInsights();
  },

  async loadInsights() {
    this.setData({
      loading: true,
    });

    try {
      const insights = await callFunction('getMembershipInsights');

      this.setData({
        loaded: true,
        summary: normalizeSummary(insights.summary),
        generatedAtText: formatDateTime(insights.generated_at) || '暂无',
        activityLogState: insights.activity_log_query_state || 'ready',
        activityLogError: insights.activity_log_query_error || '',
      });
    } catch (error) {
      const message = (error && error.message) || '获取会员经营分析失败';

      this.setData({
        loaded: false,
      });

      wx.showToast({
        title: message,
        icon: 'none',
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },

  handleReload() {
    return this.loadInsights();
  },

  handleBackToOps() {
    wx.navigateTo({
      url: '/pages/ops-membership-diagnostics/index',
    });
  },
});
