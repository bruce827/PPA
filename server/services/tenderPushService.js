const tenderStagingModel = require('../models/tenderStagingModel');
const tenderStagingService = require('./tenderStagingService');
const { validationError } = require('../utils/errors');

const PUSHABLE_FIELDS = [
  'source_item_id',
  'title',
  'published_at',
  'published_date',
  'deadline_at',
  'deadline_date',
  'issuer',
  'budget_amount',
  'region',
  'source_platform',
  'source_url',
  'summary',
  'announcement_html',
  'announcement_plain_text',
];

let cloudbaseApp = null;

function getCloudbaseApp() {
  if (cloudbaseApp) {
    return cloudbaseApp;
  }

  let cloudbase;
  try {
    cloudbase = require('@cloudbase/node-sdk');
  } catch (_error) {
    throw validationError(
      '未安装 @cloudbase/node-sdk，请先在 server 目录执行 npm install'
    );
  }

  const env = String(process.env.CLOUDBASE_ENV_ID || '').trim();
  const apiKey = String(process.env.CLOUDBASE_APIKEY || '').trim();
  const secretId = String(process.env.CLOUDBASE_SECRET_ID || '').trim();
  const secretKey = String(process.env.CLOUDBASE_SECRET_KEY || '').trim();

  if (!env) {
    throw validationError(
      '缺少 CLOUDBASE_ENV_ID，无法连接 CloudBase 环境'
    );
  }

  if (apiKey) {
    process.env.CLOUDBASE_APIKEY = apiKey;
    cloudbaseApp = cloudbase.init({
      env,
    });
    return cloudbaseApp;
  }

  if (!secretId || !secretKey) {
    throw validationError(
      '缺少 CloudBase 服务端配置，请设置 CLOUDBASE_APIKEY，或同时设置 CLOUDBASE_SECRET_ID、CLOUDBASE_SECRET_KEY'
    );
  }

  cloudbaseApp = cloudbase.init({
    env,
    secretId,
    secretKey,
  });

  return cloudbaseApp;
}

function buildPushPayload(record) {
  const payload = {};

  PUSHABLE_FIELDS.forEach((field) => {
    if (record[field] !== undefined) {
      payload[field] = record[field];
    }
  });

  if (record.detail_payload) {
    payload.detail_payload = record.detail_payload;
  }

  payload.last_pushed_at = new Date().toISOString();
  return payload;
}

function normalizeFunctionResult(result) {
  if (!result) return result;
  if (typeof result === 'string') {
    try {
      return JSON.parse(result);
    } catch (_error) {
      return { success: false, error: result };
    }
  }
  return result;
}

async function pushTenderStaging(id) {
  await tenderStagingModel.ensureSchema();

  const record = await tenderStagingService.getRequiredTenderStaging(id);
  const pushSecret = String(process.env.MINIAPP_PUSH_SECRET_KEY || '').trim();
  const functionName = String(
    process.env.MINIAPP_PUSH_FUNCTION_NAME || 'upsertTenderBySourceId'
  ).trim();

  if (!pushSecret) {
    throw validationError('缺少 MINIAPP_PUSH_SECRET_KEY，无法推送到小程序');
  }

  const app = getCloudbaseApp();
  const payload = buildPushPayload(record);

  try {
    const response = await app.callFunction({
      name: functionName,
      data: {
        secretKey: pushSecret,
        data: payload,
      },
    });

    const functionResult = normalizeFunctionResult(response?.result);
    if (!functionResult?.success) {
      const errorMessage =
        functionResult?.error ||
        functionResult?.message ||
        '云函数返回失败';
      throw new Error(errorMessage);
    }

    const pushedAt = new Date().toISOString();
    const updatedRecord = await tenderStagingModel.updateTenderPushState(record.id, {
      push_status: 'pushed',
      push_error: null,
      pushed_at: pushedAt,
    });

    return {
      record: updatedRecord,
      cloudResult: functionResult.data || null,
    };
  } catch (error) {
    const failedRecord = await tenderStagingModel.updateTenderPushState(record.id, {
      push_status: 'failed',
      push_error: error.message || '推送失败',
      pushed_at: null,
    });

    return {
      record: failedRecord,
      cloudResult: null,
      error: error.message || '推送失败',
    };
  }
}

module.exports = {
  pushTenderStaging,
};
