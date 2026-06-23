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
      return fail('请先登录后再取消采纳', 'UNAUTHORIZED');
    }

    const sourceItemId = String(event.sourceItemId || '').trim();

    if (!sourceItemId) {
      return fail('缺少项目标识', 'TENDER_NOT_FOUND');
    }

    const transactionResult = await db.runTransaction(async (transaction) => {
      const tenderResponse = await transaction.collection('tenders').where({ source_item_id: sourceItemId }).limit(1).get();
      const tender = tenderResponse.data[0];

      if (!tender) {
        throw new Error('TENDER_NOT_FOUND');
      }

      if (tender.adopt_status !== 'adopted') {
        return {
          source_item_id: tender.source_item_id,
          adopt_status: 'unadopted',
        };
      }

      if (tender.adopted_by_openid !== OPENID) {
        throw new Error('ADOPTION_FORBIDDEN');
      }

      const now = new Date().toISOString();

      await transaction.collection('tenders').doc(tender._id).update({
        data: {
          adopt_status: 'unadopted',
          adopted_by_openid: '',
          adopted_by_name: '',
          adopted_at: '',
          updated_at: now,
        },
      });

      return {
        source_item_id: tender.source_item_id,
        adopt_status: 'unadopted',
      };
    });

    return success(transactionResult);
  } catch (error) {
    if (error.message === 'TENDER_NOT_FOUND') {
      return fail('未找到该招标信息', 'TENDER_NOT_FOUND');
    }

    if (error.message === 'ADOPTION_FORBIDDEN') {
      return fail('仅采纳人本人可以取消采纳', 'ADOPTION_FORBIDDEN');
    }

    return fail(error.message || '取消采纳失败');
  }
};
