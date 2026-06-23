const { getCachedUser } = require('../../utils/auth');
const { buildTenderListPath, formatDateTime, getTodayRange, normalizeDateRange } = require('../../utils/date');
const { getReminderPreferences, getTenderReminder } = require('../../utils/reminders');
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

function mapTenderList(list = []) {
  return list.map((item) => ({
    ...item,
    title: item.title || '未命名项目',
    adoptLabel: item.adopt_status === 'adopted' ? `已采纳：${item.adopted_by_name || '已锁定'}` : '可采纳',
    budgetText: formatBudget(item.budget_amount),
    publishedDate: formatDateTime(item.published_at) || item.published_date || '未填写',
    deadlineDate: formatDateTime(item.deadline_at) || item.deadline_date || '未填写',
    issuerText: item.issuer || '未填写',
  }));
}

Page({
  data: {
    startDate: '',
    endDate: '',
    today: '',
    list: [],
    loading: false,
    pageNo: 1,
    pageSize: 20,
    total: 0,
    finished: false,
    emptyText: '当前日期范围内暂无招标信息',
    reminderType: '',
    reminderBanner: null,
    tenderSubscriptionEnabled: false,
  },

  onLoad(options) {
    const todayRange = getTodayRange();
    const range = normalizeDateRange(options.startDate, options.endDate);

    this.setData({
      today: todayRange.startDate,
      startDate: range.startDate,
      endDate: range.endDate,
      reminderType: (options && options.reminderType) || '',
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

    this.loadReminderPreferences();
    return this.reloadList();
  },

  loadReminderPreferences() {
    const preferences = getReminderPreferences();

    this.setData({
      tenderSubscriptionEnabled: preferences.tenderSubscriptionEnabled,
    });
  },

  onPullDownRefresh() {
    this.reloadList().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async onReachBottom() {
    if (this.data.loading || this.data.finished) {
      return;
    }

    await this.loadList(true);
  },

  onChangeStartDate(event) {
    const startDate = event.detail.value;
    const endDate = startDate > this.data.endDate ? startDate : this.data.endDate;

    this.setData({
      startDate,
      endDate,
    });
  },

  onChangeEndDate(event) {
    const endDate = event.detail.value;
    const startDate = endDate < this.data.startDate ? endDate : this.data.startDate;

    this.setData({
      startDate,
      endDate,
    });
  },

  async handleSearch() {
    if (this.data.startDate > this.data.endDate) {
      wx.showToast({
        title: '开始日期不能晚于结束日期',
        icon: 'none',
      });
      return;
    }

    await this.reloadList();
  },

  async reloadList() {
    this.setData({
      pageNo: 1,
      finished: false,
      list: [],
    });

    await this.loadList(false);
  },

  async loadList(append) {
    const pageNo = append ? this.data.pageNo + 1 : 1;

    this.setData({
      loading: true,
    });

    try {
      const data = await callFunction('getTenderList', {
        startDate: this.data.startDate,
        endDate: this.data.endDate,
        pageNo,
        pageSize: this.data.pageSize,
      });

      const receivedList = mapTenderList(data.list || []);
      const nextList = append ? this.data.list.concat(receivedList) : receivedList;
      const finished = nextList.length >= (data.total || 0) || receivedList.length < this.data.pageSize;

      this.setData({
        list: nextList,
        pageNo: data.pageNo || pageNo,
        total: data.total || 0,
        finished,
        reminderBanner: getTenderReminder({
          preferences: {
            tenderSubscriptionEnabled: this.data.tenderSubscriptionEnabled,
          },
          total: data.total || 0,
          startDate: this.data.startDate,
          endDate: this.data.endDate,
          reminderType: this.data.reminderType,
        }),
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '获取列表失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        loading: false,
      });
    }
  },

  openDetail(event) {
    const { id } = event.currentTarget.dataset;

    wx.navigateTo({
      url: `/pages/tender-detail/index?sourceItemId=${id}`,
    });
  },

  openMembershipStatus() {
    wx.navigateTo({
      url: '/pages/membership-status/index',
    });
  },

  handleReminderAction() {
    wx.navigateTo({
      url: '/pages/membership-status/index?reminderType=new_tender_subscription',
    });
  },

  onShareAppMessage() {
    return {
      title: 'PPA 招标快报',
      path: buildTenderListPath(this.data.today, this.data.today),
    };
  },
});
