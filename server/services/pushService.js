const fs = require('fs/promises');
const path = require('path');
const projectModel = require('../models/projectModel');
const { getProjectAttachments, UPLOAD_DIR } = require('./attachmentService');
const { createPushRecord } = require('../models/pushRecordModel');
const { validationError } = require('../utils/errors');

/**
 * 推送业务逻辑（校验 + CloudBase 上传 + 写入集合 + 记录推送结果）
 */

let cloudbaseApp = null;

function getCloudbaseApp() {
  if (cloudbaseApp) {
    return cloudbaseApp;
  }

  let cloudbase;
  try {
    cloudbase = require('@cloudbase/node-sdk');
  } catch (_error) {
    throw validationError('未安装 @cloudbase/node-sdk，请先在 server 目录执行 npm install');
  }

  const env = String(process.env.CLOUDBASE_ENV_ID || '').trim();
  const apiKey = String(process.env.CLOUDBASE_APIKEY || '').trim();
  const secretId = String(process.env.CLOUDBASE_SECRET_ID || '').trim();
  const secretKey = String(process.env.CLOUDBASE_SECRET_KEY || '').trim();

  if (!env) {
    throw validationError('缺少 CLOUDBASE_ENV_ID，无法连接 CloudBase 环境');
  }

  if (apiKey) {
    process.env.CLOUDBASE_APIKEY = apiKey;
    cloudbaseApp = cloudbase.init({ env });
    return cloudbaseApp;
  }

  if (!secretId || !secretKey) {
    throw validationError(
      '缺少 CloudBase 服务端配置，请设置 CLOUDBASE_APIKEY，或同时设置 CLOUDBASE_SECRET_ID、CLOUDBASE_SECRET_KEY',
    );
  }

  cloudbaseApp = cloudbase.init({ env, secretId, secretKey });
  return cloudbaseApp;
}

/**
 * 预算验证（ADR-1）
 */
function validateBudget(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw validationError('客户预算必须为数字');
  }
  if (amount <= 0) {
    throw validationError('客户预算必须大于 0');
  }
  if (Number(amount.toFixed(2)) !== amount) {
    throw validationError('客户预算最多两位小数');
  }
  return amount;
}

/**
 * 前置校验：商务报价 + 附件 + 预算
 */
async function validatePush(projectId, customerBudget) {
  const project = await projectModel.getProjectById(projectId);
  if (!project) {
    throw validationError('项目不存在');
  }

  // 1. 商务报价完成状态
  if (!project.business_quote_json) {
    throw validationError('商务报价未完成');
  }

  // 2. 附件存在性
  const attachments = await getProjectAttachments(projectId);
  if (attachments.length === 0) {
    throw validationError('请先上传至少一个附件');
  }

  // 3. 预算格式（如果提供了预算）
  if (customerBudget !== undefined && customerBudget !== null && customerBudget !== 0) {
    validateBudget(customerBudget);
  }

  return { success: true, project, attachments };
}

/**
 * 构建推送数据快照
 */
function buildPushSnapshot(project, customerBudget, attachmentFileIds) {
  const businessQuote = safeParseJson(project.business_quote_json);
  const assessmentData = safeParseJson(project.assessment_details_json);

  // 从商务报价中提取总额和实施成本
  let ourQuote = null;
  let implementationCost = null;
  let costBreakdown = null;
  if (businessQuote) {
    // custom_development 模式下在 amounts 中，enterprise_product 在顶层
    ourQuote = businessQuote.amounts?.quote_total_wan || businessQuote.quote_total_wan || null;
    if (ourQuote != null) ourQuote = Number(ourQuote);
    // 实施成本取 base_cost_wan
    implementationCost = businessQuote.amounts?.base_cost_wan || businessQuote.base_cost_wan || null;
    if (implementationCost != null) implementationCost = Number(implementationCost);
    costBreakdown = JSON.stringify(businessQuote);
  }

  // 从评估数据中提取 TOP 3 风险
  const top3RiskScores = extractTop3Risks(assessmentData);

  // 风险等级
  let riskLevel = '未知';
  const riskScore = project.final_risk_score || 0;
  if (riskScore >= 70) riskLevel = '高风险';
  else if (riskScore >= 40) riskLevel = '中风险';
  else if (riskScore > 0) riskLevel = '低风险';

  return {
    projectName: project.name,
    projectDescription: project.description || null,
    ourQuote,
    implementationCost,
    customerBudget,
    budgetDifference: ourQuote != null ? Number((ourQuote - customerBudget).toFixed(2)) : null,
    costBreakdownJson: costBreakdown,
    riskTotalScore: project.final_risk_score || null,
    riskLevel,
    totalWorkloadDays: project.final_workload_days || null,
    newDevWorkloadDays: extractWorkloadTotal(assessmentData, 'new_feature'),
    travelCostTotal: extractTravelCost(assessmentData),
    top3RiskScores: top3RiskScores,
    attachmentFileIds,
  };
}

function extractTop3Risks(assessmentData) {
  if (!assessmentData || !assessmentData.risk_scores) return [];
  const scores = Object.entries(assessmentData.risk_scores || {})
    .map(([key, value]) => ({ name: key, score: Number(value) || 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return scores;
}

function extractWorkloadTotal(assessmentData, category) {
  if (!assessmentData) return null;

  // 新版数据结构：development_workload / integration_workload 数组
  if (category === 'new_feature' && assessmentData.development_workload) {
    const list = assessmentData.development_workload;
    return list.reduce((sum, w) => sum + (Number(w.workload) || 0), 0);
  }
  if (category === 'integration' && assessmentData.integration_workload) {
    const list = assessmentData.integration_workload;
    return list.reduce((sum, w) => sum + (Number(w.workload) || 0), 0);
  }

  // 旧版数据结构：workload_list 数组
  if (assessmentData.workload_list) {
    const list = assessmentData.workload_list.filter(
      (w) => !category || w.category === category,
    );
    return list.reduce((sum, w) => sum + (Number(w.workload) || 0), 0);
  }

  return null;
}

function extractTravelCost(assessmentData) {
  if (!assessmentData) return null;

  // 新版数据结构：travel_months + travel_headcount
  if (assessmentData.travel_months != null && assessmentData.travel_headcount != null) {
    const travelCostPerMonth = 7500; // 元/月/人（取自 config_travel_costs 总和）
    const cost = Number(assessmentData.travel_months) * Number(assessmentData.travel_headcount) * (travelCostPerMonth / 10000);
    return cost > 0 ? Number(cost.toFixed(2)) : 0;
  }

  // 旧版数据结构：travel_cost_total
  return assessmentData.travel_cost_total || null;
}

/**
 * 上传本地附件到 CloudBase 云存储，返回 fileID 列表
 */
async function uploadAttachmentsToCloudBase(projectId) {
  const app = getCloudbaseApp();
  const attachments = await getProjectAttachments(projectId);
  const fileIds = [];

  for (const attachment of attachments) {
    const filePath = attachment.fullPath;
    const fileBuffer = await fs.readFile(filePath);

    const cloudPath = `project-attachments/${projectId}/${attachment.filename}`;
    const uploadResult = await app.uploadFile({
      cloudPath,
      fileContent: fileBuffer,
    });

    fileIds.push({
      filename: attachment.filename,
      originalname: attachment.originalname || attachment.filename,
      fileID: uploadResult.fileID,
      size: attachment.size,
    });
  }

  return fileIds;
}

/**
 * 调用云函数写入 internal_projects 集合
 */
async function callUpsertInternalProject(data) {
  const app = getCloudbaseApp();
  const pushSecret = String(process.env.MINIAPP_PUSH_SECRET_KEY || '').trim();
  const functionName = String(
    process.env.INTERNAL_PUSH_FUNCTION_NAME || 'upsertInternalProject',
  ).trim();

  if (!pushSecret) {
    throw validationError('缺少 MINIAPP_PUSH_SECRET_KEY，无法推送到小程序');
  }

  const response = await app.callFunction({
    name: functionName,
    data: {
      secretKey: pushSecret,
      data,
    },
  });

  const result = normalizeFunctionResult(response?.result);
  if (!result?.success) {
    const errorMessage =
      result?.error || result?.message || '云函数返回失败';
    throw new Error(errorMessage);
  }

  return result;
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

function safeParseJson(str) {
  if (!str || typeof str !== 'string') return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * 推送执行主流程
 */
async function executePush(projectId, customerBudget) {
  // 1. 前置校验
  const validation = await validatePush(projectId, customerBudget);
  const project = validation.project;

  const pushTime = new Date().toISOString();
  let attachmentFileIds = [];
  let cloudResult = null;

  try {
    // 2. 上传附件到 CloudBase
    attachmentFileIds = await uploadAttachmentsToCloudBase(projectId);

    // 3. 构建快照
    const snapshot = buildPushSnapshot(project, customerBudget, attachmentFileIds);
    snapshot.pushTime = pushTime;
    snapshot.push_time = pushTime;

    // 4. 调用云函数写入集合
    cloudResult = await callUpsertInternalProject(snapshot);

    // 5. 记录推送结果（成功）
    const pushRecord = await createPushRecord({
      projectId,
      ...snapshot,
      pushTime,
      pushStatus: 'success',
    });

    return {
      success: true,
      pushId: pushRecord.id,
      data: cloudResult?.data || null,
    };
  } catch (error) {
    // 记录推送失败
    const snapshot = buildPushSnapshot(project, customerBudget, attachmentFileIds);
    await createPushRecord({
      projectId,
      ...snapshot,
      pushTime,
      pushStatus: 'failed',
      pushError: error.message || '推送失败',
    });

    // 区分错误类型
    if (error.message?.includes('upload') || error.message?.includes('Upload')) {
      return {
        success: false,
        isCloudBaseUploadError: true,
        error: error.message || '附件上传失败',
      };
    }

    return {
      success: false,
      isCloudBaseUploadError: false,
      error: error.message || '推送失败',
    };
  }
}

module.exports = {
  validatePush,
  validateBudget,
  executePush,
  getCloudbaseApp,
};
