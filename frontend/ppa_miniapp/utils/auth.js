const USER_STORAGE_KEY = 'ppaMiniappUser';

function getCachedUser() {
  try {
    return wx.getStorageSync(USER_STORAGE_KEY) || null;
  } catch (error) {
    return null;
  }
}

function setCachedUser(user) {
  wx.setStorageSync(USER_STORAGE_KEY, user);
}

function clearCachedUser() {
  wx.removeStorageSync(USER_STORAGE_KEY);
}

module.exports = {
  clearCachedUser,
  getCachedUser,
  setCachedUser,
};
