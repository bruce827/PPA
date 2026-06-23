const cloud = require('wx-server-sdk');
const sampleTenders = require('./sampleTenders');

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

function mergeTenderData(existingTender = {}, incomingTender = {}) {
  return {
    ...incomingTender,
    created_at: existingTender.created_at || incomingTender.created_at || new Date().toISOString(),
    updated_at: incomingTender.updated_at || new Date().toISOString(),
    adopt_status: existingTender.adopt_status || incomingTender.adopt_status || 'unadopted',
    adopted_by_openid: existingTender.adopted_by_openid || incomingTender.adopted_by_openid || '',
    adopted_by_name: existingTender.adopted_by_name || incomingTender.adopted_by_name || '',
    adopted_at: existingTender.adopted_at || incomingTender.adopted_at || '',
  };
}

exports.main = async () => {
  try {
    let created = 0;
    let updated = 0;

    for (const tender of sampleTenders) {
      const existing = await db.collection('tenders').where({ source_item_id: tender.source_item_id }).limit(1).get();

      if (existing.data.length > 0) {
        const current = existing.data[0];
        await db.collection('tenders').doc(current._id).update({
          data: mergeTenderData(current, tender),
        });
        updated += 1;
      } else {
        await db.collection('tenders').add({
          data: mergeTenderData({}, tender),
        });
        created += 1;
      }
    }

    return success({
      total: sampleTenders.length,
      created,
      updated,
    });
  } catch (error) {
    return fail(error.message || '灌入样例数据失败');
  }
};
