const { getCachedUser, setCachedUser } = require('../../utils/auth');
const { callFunction } = require('../../utils/request');

Page({
  data: {
    displayName: '',
    nickname: '',
    avatarUrl: '',
    profileReady: false,
    submitting: false,
  },

  onShow() {
    const cachedUser = getCachedUser();

    if (cachedUser) {
      getApp().globalData.user = cachedUser;
      wx.reLaunch({
        url: '/pages/tender-list/index',
      });
    }
  },

  onInputDisplayName(event) {
    this.setData({
      displayName: event.detail.value,
    });
  },

  async handleGetProfile() {
    try {
      const profile = await wx.getUserProfile({
        desc: '用于记录采纳人名称和头像',
      });
      const userInfo = profile.userInfo || {};

      this.setData({
        nickname: userInfo.nickName || '',
        avatarUrl: userInfo.avatarUrl || '',
        displayName: this.data.displayName || userInfo.nickName || '',
        profileReady: true,
      });
    } catch (error) {
      wx.showToast({
        title: '未获取微信资料',
        icon: 'none',
      });
    }
  },

  async handleLogin() {
    const displayName = (this.data.displayName || this.data.nickname || '').trim();

    if (!displayName) {
      wx.showToast({
        title: '请先填写展示名称',
        icon: 'none',
      });
      return;
    }

    this.setData({
      submitting: true,
    });

    wx.showLoading({
      title: '登录中',
      mask: true,
    });

    try {
      const user = await callFunction('loginUser', {
        displayName,
        nickname: this.data.nickname,
        avatarUrl: this.data.avatarUrl,
      });

      setCachedUser(user);
      getApp().globalData.user = user;

      wx.hideLoading();
      wx.showToast({
        title: '登录成功',
        icon: 'success',
      });

      wx.reLaunch({
        url: '/pages/tender-list/index',
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'none',
      });
    } finally {
      this.setData({
        submitting: false,
      });
    }
  },
});
