const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const command = db.command;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PUBLIC_LIST_FIELDS = [
  'source_item_id',
  'title',
  'published_at',
  'published_date',
  'deadline_at',
  'deadline_date',
  'issuer',
  'budget_amount',
  'adopt_status',
  'adopted_by_name',
  'adopted_at',
];

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

function pad(value) {
  return String(value).padStart(2, '0');
}

function getChinaDateString(date = new Date()) {
  const diffMinutes = 480 + date.getTimezoneOffset();
  const chinaDate = new Date(date.getTime() + diffMinutes * 60 * 1000);
  const year = chinaDate.getUTCFullYear();
  const month = pad(chinaDate.getUTCMonth() + 1);
  const day = pad(chinaDate.getUTCDate());
  return `${year}-${month}-${day}`;
}

function buildListItem(tender = {}) {
  const listItem = {};

  PUBLIC_LIST_FIELDS.forEach((field) => {
    if (tender[field] !== undefined) {
      listItem[field] = tender[field];
    }
  });

  return listItem;
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext();

    if (!OPENID) {
      return fail('请先登录后再查看列表', 'UNAUTHORIZED');
    }

    const fallbackDate = getChinaDateString();
    const startDate = String(event.startDate || fallbackDate);
    const endDate = String(event.endDate || startDate);
    const pageNo = Math.max(Number(event.pageNo || 1), 1);
    const pageSize = Math.min(Math.max(Number(event.pageSize || 20), 1), 50);

    if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate) || startDate > endDate) {
      return fail('日期范围不合法', 'INVALID_DATE_RANGE');
    }

    const filters = {
      published_date: command.gte(startDate).and(command.lte(endDate)),
    };

    const collection = db.collection('tenders');
    const totalResponse = await collection.where(filters).count();
    const listResponse = await collection
      .where(filters)
      .orderBy('published_at', 'desc')
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .get();

    return success({
      list: (listResponse.data || []).map(buildListItem),
      pageNo,
      pageSize,
      total: totalResponse.total || 0,
    });
  } catch (error) {
    return fail(error.message || '获取列表失败');
  }
};
