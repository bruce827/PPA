const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 云函数：upsertInternalProject
 * 接收来自后端的推送数据，写入 internal_projects 集合
 *
 * 入参：{ secretKey, data }
 * 返回：{ success: true, data: { id } } | { success: false, error }
 */
exports.main = async (event, context) => {
  const { secretKey, data } = event || {};

  // 认证校验
  const expectedKey = process.env.MINIAPP_PUSH_SECRET_KEY;
  if (!expectedKey || secretKey !== expectedKey) {
    return { success: false, error: '认证失败' };
  }

  if (!data) {
    return { success: false, error: '缺少推送数据' };
  }

  try {
    const result = await db.collection('internal_projects').add({
      data: {
        ...data,
        pushTime: data.pushTime || data.push_time || null,
        push_time: data.pushTime || data.push_time || null,
        createdAt: db.serverDate(),
      },
    });

    return {
      success: true,
      data: { id: result._id },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || '写入集合失败',
    };
  }
};
