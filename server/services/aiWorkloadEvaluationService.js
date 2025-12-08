const crypto = require('crypto');
const aiPromptService = require('./aiPromptService');
const aiModelModel = require('../models/aiModelModel');
const { selectProvider } = require('../providers/ai/providerSelector');
const aiAssessmentLogModel = require('../models/aiAssessmentLogModel');
const aiFileLogger = require('./aiFileLogger');
const configModel = require('../models/configModel');
const logger = require('../utils/logger');
const {
  validationError,
  unprocessableError,
  timeoutError,
  internalError,
} = require('../utils/errors');

const MAX_DESCRIPTION_LENGTH = 3000;
const DEFAULT_TIMEOUT_MS = parseInt(process.env.AI_ASSESS_TIMEOUT_MS || '90000', 10);

function ensureString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function applyTemplate(content, variables) {
  if (!content || typeof content !== 'string') return '';
  return content.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return ensureString(variables[key]);
    }
    return '';
  });
}

function sanitizeModelHint(modelHint) {
  if (modelHint && typeof modelHint === 'string') return modelHint;
  return '';
}

function extractContentFromProviderResponse(response) {
  if (!response) return '';
  if (typeof response === 'string') return response;
  const { choices } = response;
  if (Array.isArray(choices) && choices.length > 0) {
    const message = choices[0].message || {};
    if (message.content) return message.content;
    if (choices[0].text) return choices[0].text;
  }
  return JSON.stringify(response);
}

function cleanJsonCandidate(candidate) {
  if (typeof candidate !== 'string') return candidate;
  return candidate.replace(/```json/gi, '').replace(/```/g, '').trim();
}

function normalizeComplexity(raw) {
  const s = ensureString(raw).toLowerCase();
  if (!s) return undefined;
  if (s.includes('简单') || s.includes('simple')) return '简单';
  if (s.includes('复杂') || s.includes('complex')) return '复杂';
  if (s.includes('中') || s.includes('medium') || s.includes('moderate')) return '中等';
  return undefined;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw validationError('请求体不能为空');
  }
  const { promptId, module1, module2, module3, description, variables, roles } = payload;
  if (!promptId || typeof promptId !== 'string') throw validationError('promptId 为必填字段');
  if (!module1 || typeof module1 !== 'string') throw validationError('module1 为必填字段');
  if (!module2 || typeof module2 !== 'string') throw validationError('module2 为必填字段');
  if (!module3 || typeof module3 !== 'string') throw validationError('module3 为必填字段');
  if (!description || typeof description !== 'string') throw validationError('description 为必填字段');
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw validationError(`description 字数超出限制 (最大 ${MAX_DESCRIPTION_LENGTH})`);
  }
  if (variables && typeof variables !== 'object') throw validationError('variables 必须为对象');
  if (roles && !Array.isArray(roles)) throw validationError('roles 必须为字符串数组');
}

function normalizeKey(key) {
  return ensureString(key)
    .toLowerCase()
    .replace(/[\s:：，,.。;；_\-]/g, '')
    .trim();
}

function alignRoleWorkloads(roleWorkloads, configRoles) {
  const normalizedMap = {};
  const entries = Object.entries(roleWorkloads || {}).filter(([, v]) => Number.isFinite(Number(v)));
  const normEntries = entries.map(([k, v]) => [normalizeKey(k), Number(v)]);

  configRoles.forEach((role) => {
    const target = normalizeKey(role.role_name);
    let matched = 0;
    for (const [nk, val] of normEntries) {
      if (nk === target || nk.includes(target) || target.includes(nk)) {
        matched = val;
        break;
      }
    }
    normalizedMap[role.role_name] = Number.isFinite(matched) ? Number(matched) : 0;
  });
  return normalizedMap;
}

function parseWorkloadFromText(rawText, configRoles) {
  const text = ensureString(rawText);
  if (!text) return {};
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const result = {};
  const roleNames = configRoles.map((r) => r.role_name);
  const patterns = roleNames.map((name) => ({
    name,
    re: new RegExp(`^\n?\s*${name}\s*[:：]?\s*(\\d+(?:\\.\\d+)?)`),
  }));
  for (const line of lines) {
    for (const { name, re } of patterns) {
      const m = line.match(re);
      if (m) {
        result[name] = Number(m[1]);
      }
    }
  }
  return result;
}

function ensureParsedStructure(parsed, configRoles) {
  let roleWorkloads = {};
  let deliveryFactor;
  let complexity;
  let confidence;

  const candidates = [parsed, parsed?.data, parsed?.result, parsed?.output].filter(Boolean);

  for (const obj of candidates) {
    if (obj && typeof obj === 'object') {
      const maybe = obj.role_workloads || obj.workloads || obj.role_days || obj.roles;
      if (maybe && typeof maybe === 'object') {
        roleWorkloads = maybe;
        break;
      }
    }
  }

  for (const obj of candidates) {
    const v = obj?.delivery_factor ?? obj?.deliveryFactor ?? obj?.factor;
    if (v !== undefined) { deliveryFactor = Number(v); break; }
  }
  for (const obj of candidates) {
    const c = obj?.complexity ?? obj?.level ?? obj?.difficulty;
    const n = normalizeComplexity(c);
    if (n) { complexity = n; break; }
  }
  for (const obj of candidates) {
    const c = obj?.confidence ?? obj?.confidence_score ?? obj?.confidenceRatio;
    if (c !== undefined) { confidence = Number(c); break; }
  }

  // 对齐角色
  const aligned = alignRoleWorkloads(roleWorkloads, configRoles);

  return {
    role_workloads: aligned,
    delivery_factor: Number.isFinite(deliveryFactor) ? Number(deliveryFactor) : undefined,
    complexity,
    confidence: Number.isFinite(confidence) ? Number(confidence) : undefined,
  };
}

function parseProviderResult(rawResponse, configRoles) {
  let candidate = extractContentFromProviderResponse(rawResponse);
  candidate = cleanJsonCandidate(candidate);

  if (typeof candidate === 'string') {
    try {
      const parsed = JSON.parse(candidate);
      return ensureParsedStructure(parsed, configRoles);
    } catch (error) {
      // 尝试从纯文本解析
      const fromText = parseWorkloadFromText(candidate, configRoles);
      if (Object.keys(fromText).length > 0) {
        const aligned = alignRoleWorkloads(fromText, configRoles);
        return { role_workloads: aligned };
      }
      logger.warn('解析 AI 文本响应失败(工作量评估)', { reason: '无法提取角色工作量' });
      throw unprocessableError('AI 响应不是有效 JSON');
    }
  }

  return ensureParsedStructure(candidate, configRoles);
}

async function logAssessment({ promptId, modelUsed, requestHash, durationMs, status, errorMessage }) {
  try {
    await aiAssessmentLogModel.insertLog({
      promptId,
      modelUsed,
      requestHash,
      durationMs,
      status,
      errorMessage,
    });
  } catch (error) {
    logger.warn('写入 ai_assessment_logs 失败(工作量评估)', { error: error.message });
  }
}

async function evaluateWorkload(payload) {
  validatePayload(payload);

  const { promptId, module1, module2, module3, description, variables = {}, roles = [] } = payload;

  // 角色基准：以配置表为准
  const configRoles = await configModel.getAllRoles();
  const roleNames = configRoles.map((r) => r.role_name);

  // 读取提示词模板
  const promptDefinition = await aiPromptService.getPromptById(promptId);
  const variableDefaults = {};
  (promptDefinition?.variables || []).forEach((v) => {
    variableDefaults[v.name] = v.default_value || '';
  });
  const variableMap = {
    ...variableDefaults,
    ...variables,
    module1: ensureString(module1),
    module2: ensureString(module2),
    module3: ensureString(module3),
    description: ensureString(description),
    roles: Array.isArray(roles) && roles.length > 0 ? roles.join(', ') : roleNames.join(', '),
  };

  const templateContent = promptDefinition?.content || '';
  const containsDescToken = /\{\{\s*(desc|description)\s*\}\}/i.test(templateContent);
  let promptText = applyTemplate(templateContent, variableMap);
  if (!containsDescToken && variableMap.description) {
    promptText = [
      promptText,
      '',
      '【模块功能描述】',
      ensureString(variableMap.description),
    ].join('\n');
  }

  // 选择 Provider
  let currentModel = null;
  try { currentModel = await aiModelModel.getCurrentModel(); } catch (e) { currentModel = null; }
  const providerLabel = currentModel?.provider || 'openai-compatible';
  const { impl: providerImpl, key: providerKey } = selectProvider(providerLabel);
  const modelFromDb = currentModel?.model_name;
  const apiHostFromDb = currentModel?.api_host;
  const apiKeyFromDb = currentModel?.api_key;
  const configuredTimeoutSec = parseInt(currentModel?.timeout, 10);
  const providerTimeoutMs = Number.isFinite(configuredTimeoutSec)
    ? Math.max(5000, configuredTimeoutSec * 1000)
    : DEFAULT_TIMEOUT_MS;
  const serviceTimeoutMs = providerTimeoutMs + 2000;

  const configuredMaxTokens = parseInt(currentModel?.max_tokens, 10);
  const providerMaxTokens = Number.isFinite(configuredMaxTokens) && configuredMaxTokens > 0
    ? configuredMaxTokens
    : undefined;

  const requestHash = crypto
    .createHash('sha256')
    .update(`${promptId}:${module1}:${module2}:${module3}:${description}`)
    .digest('hex');

  const providerParams = {
    prompt: promptText,
    model: sanitizeModelHint(modelFromDb),
    requestHash,
    api_host: apiHostFromDb,
    api_key: apiKeyFromDb,
    maxTokens: providerMaxTokens,
  };

  if (!providerParams.model) {
    throw validationError('当前模型未配置模型名称');
  }
  if (!providerParams.api_host || !providerParams.api_key) {
    throw validationError('当前模型未配置完整的 API Host 或 API Key');
  }

  try {
    logger.info('AI Workload Provider 选择结果', {
      providerLabel,
      providerKey,
      apiHost: apiHostFromDb,
      model: providerParams.model,
      providerTimeoutMs,
      serviceTimeoutMs,
    });
  } catch (e) {}

  let status = 'success';
  let errorMessage = '';
  let providerRaw = null;
  let providerContent = null;
  let providerModelUsed = null;

  try {
    const providerCall = providerImpl.createRiskAssessment({
      ...providerParams,
      timeoutMs: providerTimeoutMs,
    });

    const providerResult = await Promise.race([
      providerCall,
      new Promise((_, reject) => setTimeout(() => reject(timeoutError('AI 调用超时')), serviceTimeoutMs)),
    ]);

    providerModelUsed = providerResult.model || providerParams.model;
    const rawSource = providerResult.data || providerResult;
    providerRaw = rawSource;
    const rawContent = extractContentFromProviderResponse(rawSource);
    providerContent = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
    const parsed = parseProviderResult(rawSource, configRoles);

    const durationMs = providerResult.durationMs || 0;
    await logAssessment({
      promptId,
      modelUsed: providerModelUsed,
      requestHash,
      durationMs,
      status,
    });

    // 文件日志（成功）
    try {
      await aiFileLogger.save({
        step: 'workload',
        route: '/api/ai/evaluate-workload',
        requestHash,
        promptTemplateId: String(promptId),
        modelProvider: providerLabel,
        modelName: providerModelUsed,
        status: 'success',
        durationMs,
        providerTimeoutMs,
        serviceTimeoutMs,
        request: {
          promptId,
          template_content: promptDefinition.content,
          variables: variableMap,
          module1,
          module2,
          module3,
          description,
          final_prompt: promptText,
        },
        responseRaw: JSON.stringify(providerRaw),
        responseParsed: {
          ...parsed,
          _raw_text: providerContent,
        },
        notesLines: [
          `[provider] ${providerLabel} model=${providerModelUsed}`,
          `[timing] durationMs=${durationMs} providerTimeoutMs=${providerTimeoutMs} serviceTimeoutMs=${serviceTimeoutMs}`,
          `[counts] roles=${configRoles.length}`,
        ],
      });
    } catch (e) {}

    return {
      parsed,
      raw_response: providerContent || (providerRaw ? JSON.stringify(providerRaw) : ''),
      model_used: providerModelUsed || providerParams.model,
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
    };
  } catch (error) {
    status = error.statusCode === 504 ? 'timeout' : 'fail';
    errorMessage = error.message;

    const durationMs = 0;
    await logAssessment({
      promptId,
      modelUsed: providerModelUsed || sanitizeModelHint(modelFromDb),
      requestHash,
      durationMs,
      status,
      errorMessage,
    });

    // 文件日志（失败）
    try {
      await aiFileLogger.save({
        step: 'workload',
        route: '/api/ai/evaluate-workload',
        requestHash,
        promptTemplateId: String(promptId),
        modelProvider: providerLabel,
        modelName: providerModelUsed || providerParams.model,
        status,
        durationMs: 0,
        providerTimeoutMs,
        serviceTimeoutMs,
        request: {
          promptId,
          template_content: promptDefinition.content,
          variables: variableMap,
          module1,
          module2,
          module3,
          description,
          final_prompt: promptText,
        },
        responseRaw: providerRaw ? JSON.stringify(providerRaw) : undefined,
        responseParsed: providerContent ? { _raw_text: providerContent } : undefined,
        notesLines: [
          `[error] ${error.message}`,
        ],
      });
    } catch (e) {}

    if (error.statusCode) throw error;
    throw internalError(error.message || 'AI 工作量评估失败');
  }
}

module.exports = {
  evaluateWorkload,
};
