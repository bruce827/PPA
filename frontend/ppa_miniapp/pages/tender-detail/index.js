const { getCachedUser } = require('../../utils/auth');
const { formatDateTime } = require('../../utils/date');
const { callFunction } = require('../../utils/request');

function formatBudget(value) {
  if (value === undefined || value === null || value === '') {
    return '未填写';
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return value;
  }

  return `¥${numberValue.toLocaleString('zh-CN')}`;
}

function mapTenderDetail(detail) {
  if (!detail) {
    return null;
  }

  const extra = detail.detail_payload || {};

  return {
    ...detail,
    extra,
    adoptLabel: detail.adopt_status === 'adopted' ? `已采纳：${detail.adopted_by_name || '已锁定'}` : '未采纳',
    adoptedText: formatDateTime(detail.adopted_at),
    publishedText: formatDateTime(detail.published_at) || detail.published_date || '',
    deadlineText: formatDateTime(detail.deadline_at) || detail.deadline_date || '',
    budgetText: formatBudget(detail.budget_amount),
  };
}

Page({
  data: {
    sourceItemId: '',
    detail: null,
    loading: true,
    submitting: false,
    canAdopt: false,
    canCancel: false,
  },

  onLoad(options) {
    this.setData({
      sourceItemId: options.sourceItemId || '',
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

    this.loadDetail();
  },

  async loadDetail() {
    if (!this.data.sourceItemId) {
      wx.showToast({
        title: '缺少项目标识',
        icon: 'none',
      });
      return;
    }

    this.setData({
      loading: true,
    });

    try {
      const detail = await callFunction('getTenderDetail', {
        sourceItemId: this.data.sourceItemId,
      });
      const user = getCachedUser();
      const mappedDetail = mapTenderDetail(detail);
      const isAdopted = mappedDetail.adopt_status === 'adopted';
      const isSelfAdopted = isAdopted && mappedDetail.adopted_by_openid === user.openid;

      this.setData({
        detail: mappedDetail,
        canAdopt: !isAdopted,
        canCancel: isSelfAdopted,
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '获取详情失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },

  async handleAdopt() {
    this.setData({
      submitting: true,
    });

    try {
      await callFunction('adoptTender', {
        sourceItemId: this.data.sourceItemId,
      });
      wx.showToast({
        title: '采纳成功',
        icon: 'success',
      });
      await this.loadDetail();
    } catch (error) {
      wx.showToast({
        title: error.message || '采纳失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        submitting: false,
      });
    }
  },

  async handleCancelAdoption() {
    this.setData({
      submitting: true,
    });

    try {
      await callFunction('cancelTenderAdoption', {
        sourceItemId: this.data.sourceItemId,
      });
      wx.showToast({
        title: '已取消采纳',
        icon: 'success',
      });
      await this.loadDetail();
    } catch (error) {
      wx.showToast({
        title: error.message || '取消失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        submitting: false,
      });
    }
  },

  handleCopyLink() {
    if (!this.data.detail || !this.data.detail.source_url) {
      return;
    }

    wx.setClipboardData({
      data: this.data.detail.source_url,
    });
  },
});
