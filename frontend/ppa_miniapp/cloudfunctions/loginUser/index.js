const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

function toTrimmedString(value) {
  return String(value || '').trim();
}

function resolveDisplayName(event = {}, existingUser = null) {
  const requestedDisplayName = toTrimmedString(event.displayName);

  if (requestedDisplayName) {
    return requestedDisplayName;
  }

  const candidates = existingUser
    ? [existingUser.display_name, existingUser.nickname, event.nickname, '微信用户']
    : [event.nickname, '微信用户'];

  for (const candidate of candidates) {
    const normalized = toTrimmedString(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return '微信用户';
}

function success(data) {
  return {
    success: true,
    data,
    error: '',
    errorCode: '',
  };
}

function fail(message, errorCode = 'SYSTEM_ERROR') {
  return {
    success: false,
    data: null,
    error: message,
    errorCode,
  };
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext();

    if (!OPENID) {
      return fail('未获取到微信身份', 'UNAUTHORIZED');
    }

    const now = new Date().toISOString();
    const requestedNickname = toTrimmedString(event.nickname);
    const requestedAvatarUrl = toTrimmedString(event.avatarUrl);
    const collection = db.collection('miniapp_users');
    const existing = await collection.where({ openid: OPENID }).limit(1).get();
    const existingUser = existing.data[0] || null;
    const displayName = resolveDisplayName(event, existingUser);
    const nickname = requestedNickname || (existingUser && existingUser.nickname) || '';
    const avatarUrl = requestedAvatarUrl || (existingUser && existingUser.avatar_url) || '';

    if (existingUser) {
      await collection.doc(existingUser._id).update({
        data: {
          display_name: displayName,
          nickname,
          avatar_url: avatarUrl,
          last_login_at: now,
        },
      });
    } else {
      await collection.add({
        data: {
          openid: OPENID,
          display_name: displayName,
          nickname,
          avatar_url: avatarUrl,
          created_at: now,
          last_login_at: now,
        },
      });
    }

    return success({
      openid: OPENID,
      displayName,
      nickname,
      avatarUrl,
    });
  } catch (error) {
    return fail(error.message || '登录失败');
  }
};
