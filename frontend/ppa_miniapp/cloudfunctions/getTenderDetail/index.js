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
      return fail('请先登录后再查看详情', 'UNAUTHORIZED');
    }

    const sourceItemId = String(event.sourceItemId || '').trim();

    if (!sourceItemId) {
      return fail('缺少项目标识', 'TENDER_NOT_FOUND');
    }

    const response = await db.collection('tenders').where({ source_item_id: sourceItemId }).limit(1).get();

    if (!response.data.length) {
      return fail('未找到该招标信息', 'TENDER_NOT_FOUND');
    }

    return success(response.data[0]);
  } catch (error) {
    return fail(error.message || '获取详情失败');
  }
};
