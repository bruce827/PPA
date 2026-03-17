const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

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
    const displayName = String(event.displayName || event.nickname || '微信用户').trim();
    const nickname = String(event.nickname || '').trim();
    const avatarUrl = String(event.avatarUrl || '').trim();
    const collection = db.collection('miniapp_users');
    const existing = await collection.where({ openid: OPENID }).limit(1).get();

    if (existing.data.length > 0) {
      await collection.doc(existing.data[0]._id).update({
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
