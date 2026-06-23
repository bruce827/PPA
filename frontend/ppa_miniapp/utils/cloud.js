function initCloud(envId) {
  if (!wx.cloud) {
    console.error('当前基础库不支持云开发');
    return false;
  }

  wx.cloud.init({
    env: envId || undefined,
    traceUser: true,
  });

  return true;
}

module.exports = {
  initCloud,
};
