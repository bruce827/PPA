const { envId, appName } = require('./config/env');
const { getCachedUser } = require('./utils/auth');
const { initCloud } = require('./utils/cloud');

App({
  globalData: {
    appName,
    envId,
    user: null,
  },

  onLaunch() {
    initCloud(envId);
    this.globalData.user = getCachedUser();
  },
});
