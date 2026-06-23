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

async function getCurrentUser(openid) {
  const response = await db.collection('miniapp_users').where({ openid }).limit(1).get();
  return response.data[0] || null;
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext();

    if (!OPENID) {
      return fail('请先登录后再执行采纳', 'UNAUTHORIZED');
    }

    const sourceItemId = String(event.sourceItemId || '').trim();

    if (!sourceItemId) {
      return fail('缺少项目标识', 'TENDER_NOT_FOUND');
    }

    const user = await getCurrentUser(OPENID);

    if (!user) {
      return fail('用户信息不存在，请重新登录', 'UNAUTHORIZED');
    }

    const transactionResult = await db.runTransaction(async (transaction) => {
      const tenderResponse = await transaction.collection('tenders').where({ source_item_id: sourceItemId }).limit(1).get();
      const tender = tenderResponse.data[0];

      if (!tender) {
        throw new Error('TENDER_NOT_FOUND');
      }

      if (tender.adopt_status === 'adopted') {
        if (tender.adopted_by_openid === OPENID) {
          return {
            source_item_id: tender.source_item_id,
            adopt_status: tender.adopt_status,
            adopted_by_name: tender.adopted_by_name,
            adopted_at: tender.adopted_at,
          };
        }

        throw new Error('TENDER_ALREADY_ADOPTED');
      }

      const now = new Date().toISOString();

      await transaction.collection('tenders').doc(tender._id).update({
        data: {
          adopt_status: 'adopted',
          adopted_by_openid: OPENID,
          adopted_by_name: user.display_name || user.nickname || '微信用户',
          adopted_at: now,
          updated_at: now,
        },
      });

      return {
        source_item_id: tender.source_item_id,
        adopt_status: 'adopted',
        adopted_by_name: user.display_name || user.nickname || '微信用户',
        adopted_at: now,
      };
    });

    return success(transactionResult);
  } catch (error) {
    if (error.message === 'TENDER_NOT_FOUND') {
      return fail('未找到该招标信息', 'TENDER_NOT_FOUND');
    }

    if (error.message === 'TENDER_ALREADY_ADOPTED') {
      return fail('该项目已被其他用户采纳', 'TENDER_ALREADY_ADOPTED');
    }

    return fail(error.message || '采纳失败');
  }
};
