const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { pageNo = 1, pageSize = 50 } = event || {};

  try {
    const res = await db.collection('internal_projects')
      .orderBy('push_time', 'desc')
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .get();

    return {
      success: true,
      data: {
        list: res.data,
        total: res.data.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || '查询失败',
    };
  }
};
