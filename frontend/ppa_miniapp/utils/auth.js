const USER_STORAGE_KEY = 'ppaMiniappUser';

function toTrimmedString(value) {
  return String(value || '').trim();
}

function normalizeUser(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const openid = toTrimmedString(user.openid);
  const displayName = toTrimmedString(user.displayName || user.display_name);

  if (!openid || !displayName) {
    return null;
  }

  return {
    openid,
    displayName,
    nickname: toTrimmedString(user.nickname),
    avatarUrl: toTrimmedString(user.avatarUrl || user.avatar_url),
  };
}

function getCachedUser() {
  try {
    return normalizeUser(wx.getStorageSync(USER_STORAGE_KEY));
  } catch (error) {
    return null;
  }
}

function setCachedUser(user) {
  const normalizedUser = normalizeUser(user);

  if (!normalizedUser) {
    clearCachedUser();
    return null;
  }

  wx.setStorageSync(USER_STORAGE_KEY, normalizedUser);
  return normalizedUser;
}

function clearCachedUser() {
  wx.removeStorageSync(USER_STORAGE_KEY);
}

module.exports = {
  clearCachedUser,
  getCachedUser,
  normalizeUser,
  setCachedUser,
};
