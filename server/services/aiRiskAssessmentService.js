const crypto = require('crypto');
const aiPromptService = require('./aiPromptService');
const aiModelModel = require('../models/aiModelModel');
const { selectProvider } = require('../providers/ai/providerSelector');
const aiAssessmentLogModel = require('../models/aiAssessmentLogModel');
const aiFileLogger = require('./aiFileLogger');
const logger = require('../utils/logger');
const {
  validationError,
  unprocessableError,
  timeoutError,
  internalError,
} = require('../utils/errors');

const MAX_DOCUMENT_LENGTH = 5000;
const DEFAULT_TIMEOUT_MS = parseInt(process.env.AI_ASSESS_TIMEOUT_MS || '8000', 10);

function ensureString(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function validatePayload(payload) {
  if (!payload) {
    throw validationError('请求体不能为空');
  }

  const { document, promptId, variables } = payload;

  if (!document || typeof document !== 'string') {
    throw validationError('document 为必填字段');
  }

  if (document.length > MAX_DOCUMENT_LENGTH) {
    throw validationError(`document 字数超出限制 (最大 ${MAX_DOCUMENT_LENGTH})`);
  }

  if (!promptId || typeof promptId !== 'string') {
    throw validationError('promptId 为必填字段');
  }

  if (variables && typeof variables !== 'object') {
    throw validationError('variables 必须为对象');
  }
}

function buildVariableMap(promptDefinition, incomingVariables = {}) {
  const defaults = {};
  promptDefinition.variables.forEach((variable) => {
    defaults[variable.name] = variable.default_value || '';
  });

  return {
    ...defaults,
    ...incomingVariables,
  };
}

function formatRiskItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return '无';
  }

  return items
    .map((item) => {
      if (typeof item === 'string') {
        return `- ${item}`;
      }
      const name = ensureString(item.item_name || item.name, '未知风险项');
      const description = ensureString(item.description, '').trim();
      return description ? `- ${name}: ${description}` : `- ${name}`;
    })
    .join('\n');
}

function formatScores(scores = {}) {
  if (!scores || typeof scores !== 'object' || Object.keys(scores).length === 0) {
    return '无';
  }
  return Object.entries(scores)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');
}

function applyTemplate(content, variables) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return ensureString(variables[key]);
    }
    return '';
  });
}

function sanitizeModelHint(modelHint) {
  if (modelHint && typeof modelHint === 'string') {
    return modelHint;
  }
  return '';
}

function extractContentFromProviderResponse(response) {
  if (!response) {
    return '';
  }

  if (typeof response === 'string') {
    return response;
  }

  const { choices } = response;
  if (Array.isArray(choices) && choices.length > 0) {
    const message = choices[0].message || {};
    if (message.content) {
      return message.content;
    }
    if (choices[0].text) {
      return choices[0].text;
    }
  }

  return JSON.stringify(response);
}

function cleanJsonCandidate(candidate) {
  if (typeof candidate !== 'string') {
    return candidate;
  }

  return candidate
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function ensureRiskScores(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw unprocessableError('AI 响应无法解析为对象');
  }

  // 允许常见的字段变体与嵌套结构
  const candidates = [
    parsed,
    parsed.data,
    parsed.result,
    parsed.output,
  ].filter(Boolean);

  let riskArray = null;
  for (const obj of candidates) {
    const maybe =
      obj.risk_scores ||
      obj.riskScores ||
      obj.scores ||
      obj.risks ||
      obj.risk_suggestions ||
      obj.riskScoreSuggestions ||
      obj.suggestions;
    if (Array.isArray(maybe)) {
      riskArray = maybe;
      break;
    }
  }

  // 将风险项标准化
  function normalizeRiskItems(arr) {
    return (arr || [])
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const itemName =
          item.item_name || item.name || item.title || item.risk || item.key;
        const scoreRaw =
          item.suggested_score ?? item.score ?? item.value ?? item.points ?? item.level;
        const reason =
          item.reason || item.comment || item.explain || item.description || item.desc || '';

        const num = Number(scoreRaw);
        if (!itemName || !Number.isFinite(num)) return null;
        return {
          item_name: ensureString(itemName),
          suggested_score: num,
          reason: ensureString(reason),
        };
      })
      .filter(Boolean);
  }

  const normalized = normalizeRiskItems(riskArray);
  if (!normalized || normalized.length === 0) {
    return {
      risk_scores: [],
      missing_risks: [],
      overall_suggestion: ensureString(overallSuggestion, ''),
      confidence: undefined,
      _empty: true,
    };
  }

  // 其他字段的宽松映射
  let overallSuggestion = '';
  for (const obj of candidates) {
    overallSuggestion =
      obj.overall_suggestion ||
      obj.overallSuggestion ||
      obj.suggestion ||
      obj.summary ||
      obj.advice ||
      '';
    if (overallSuggestion) break;
  }

  let missingRisks = [];
  for (const obj of candidates) {
    const mr =
      obj.missing_risks || obj.missingRisks || obj.missed || obj.missing || [];
    if (Array.isArray(mr) && mr.length > 0) {
      missingRisks = mr
        .map((x) => {
          if (!x) return null;
          if (typeof x === 'string') return { item_name: x, description: '' };
          const name = x.item_name || x.name || x.title || x.key;
          const desc = x.description || x.reason || x.explain || '';
          if (!name) return null;
          return { item_name: ensureString(name), description: ensureString(desc) };
        })
        .filter(Boolean);
      break;
    }
  }

  const confidence = (() => {
    for (const obj of candidates) {
      const c = obj.confidence ?? obj.confidence_score ?? obj.confidenceRatio;
      if (c !== undefined) return Number(c);
    }
    return undefined;
  })();

  return {
    risk_scores: normalized,
    missing_risks: missingRisks,
    overall_suggestion: ensureString(overallSuggestion, ''),
    confidence,
  };
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
    logger.warn('写入 ai_assessment_logs 失败', { error: error.message });
  }
}

function parseProviderResult(rawResponse) {
  let candidate = extractContentFromProviderResponse(rawResponse);
  candidate = cleanJsonCandidate(candidate);

  // 文本 → JSON 尝试
  if (typeof candidate === 'string') {
    try {
      const parsed = JSON.parse(candidate);
      return ensureRiskScores(parsed);
    } catch (error) {
      // B2：从纯文本中提取评分
      const text = String(candidate);
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const riskScores = [];
      let overall = '';

      const regexes = [
        // 形如：项名: 3 分 ... 原因: xxx
        /^(.+?)[:：]\s*(\d+(?:\.\d+)?)\s*(?:分|分数)?[^\n]*?原因[:：]?\s*(.+)$/,
        // 形如：项名: 3（无“原因”）
        /^(.-?\s*)?(.+?)[:：]\s*(\d+(?:\.\d+)?)(?:\s*(?:分|分数))?\s*$/,
      ];

      for (const line of lines) {
        let matched = false;
        for (const re of regexes) {
          const m = line.match(re);
          if (m) {
            matched = true;
            const name = ensureString(m[1] && re === regexes[0] ? m[1] : (re === regexes[0] ? m[1] : m[2])).replace(/^[-•\s]+/, '');
            const scoreStr = re === regexes[0] ? m[2] : m[3];
            const reason = re === regexes[0] ? ensureString(m[3]) : '';
            const score = Number(scoreStr);
            if (name && Number.isFinite(score)) {
              riskScores.push({ item_name: name, suggested_score: score, reason });
            }
            break;
          }
        }

        if (!matched) {
          // 捕捉总体建议关键词
          if (/^(总体|总结|建议)[:：]/.test(line) && !overall) {
            overall = line.replace(/^(总体|总结|建议)[:：]/, '').trim();
          }
        }
      }

      if (riskScores.length > 0) {
        return {
          risk_scores: riskScores,
          missing_risks: [],
          overall_suggestion: overall,
        };
      }

      logger.warn('解析 AI 文本响应失败', { reason: '无法提取风险评分' });
      return {
        risk_scores: [],
        missing_risks: [],
        overall_suggestion: '',
        confidence: undefined,
        _empty: true,
      };
    }
  }

  // candidate 已是对象
  return ensureRiskScores(candidate);
}

async function assessRisk(payload) {
  validatePayload(payload);

  const { document, promptId, variables = {}, currentRiskItems = [], currentScores = {} } = payload;

  const promptDefinition = await aiPromptService.getPromptById(promptId);
  const mergedVariables = buildVariableMap(promptDefinition, variables);

  const templateVariables = {
    ...mergedVariables,
    document,
    current_risk_items: formatRiskItems(currentRiskItems),
    current_scores: formatScores(currentScores),
  };

  const basePromptContent = applyTemplate(promptDefinition.content, templateVariables);
  const promptContent = document
    ? `${basePromptContent}\n\n项目文档：\n${ensureString(document)}`
    : basePromptContent;

  const requestHash = crypto
    .createHash('sha256')
    .update(`${promptId}:${document}`)
    .digest('hex');

  // 选择 Provider：优先使用数据库中当前模型配置
  let currentModel = null;
  try {
    currentModel = await aiModelModel.getCurrentModel();
  } catch (e) {
    // 忽略 DB 错误，退回到环境变量配置
    currentModel = null;
  }

  const providerLabel = currentModel?.provider || 'openai-compatible';
  const { impl: providerImpl, key: providerKey } = selectProvider(providerLabel);
  const modelFromDb = currentModel?.model_name;
  const apiHostFromDb = currentModel?.api_host;
  const apiKeyFromDb = currentModel?.api_key;
  // 统一超时：使用模型配置的 timeout(秒)，provider 与服务层对齐
  const configuredTimeoutSec = parseInt(currentModel?.timeout, 10);
  const providerTimeoutMs = Number.isFinite(configuredTimeoutSec)
    ? Math.max(5000, configuredTimeoutSec * 1000)
    : DEFAULT_TIMEOUT_MS; // fallback: 8s (for service) but we will set serviceTimeout differently
  // 服务层超时稍长于 provider，避免服务提前返回
  const serviceTimeoutMs = providerTimeoutMs + 2000;

  const configuredMaxTokens = parseInt(currentModel?.max_tokens, 10);
  const providerMaxTokens = Number.isFinite(configuredMaxTokens) && configuredMaxTokens > 0
    ? configuredMaxTokens
    : undefined;

  const providerParams = {
    prompt: promptContent,
    model: sanitizeModelHint(modelFromDb || promptDefinition.model_hint),
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

  // 记录选用的 Provider 与关键上下文（不记录密钥）
  try {
    logger.info('AI Provider 选择结果', {
      providerLabel,
      providerKey,
      apiHost: apiHostFromDb,
      model: providerParams.model,
      providerTimeoutMs,
      serviceTimeoutMs,
    });
  } catch (e) {
    // ignore logging error
  }

  const startedAt = Date.now();
  let status = 'success';
  let errorMessage = null;
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
      new Promise((_, reject) => {
        setTimeout(() => reject(timeoutError('AI 调用超时')), serviceTimeoutMs);
      }),
    ]);
    providerModelUsed = providerResult.model || providerParams.model;
    const rawSource = providerResult.data || providerResult;
    providerRaw = rawSource;
    const rawContent = extractContentFromProviderResponse(rawSource);
    providerContent = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
    const parsed = parseProviderResult(rawSource);

    const durationMs = Date.now() - startedAt;
    logger.info('AI 风险评估成功', {
      promptId,
      requestHash,
      model: providerModelUsed,
      durationMs,
    });
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
        step: 'risk',
        route: '/api/ai/assess-risk',
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
          variables: templateVariables,
          document,
          final_prompt: promptContent,
          extras: { currentRiskItems, currentScores },
        },
        responseRaw: JSON.stringify(providerRaw),
        responseParsed: {
          ...parsed,
          _raw_text: providerContent,
        },
        notesLines: [
          `[provider] ${providerLabel} model=${providerModelUsed}`,
          `[timing] durationMs=${durationMs} providerTimeoutMs=${providerTimeoutMs} serviceTimeoutMs=${serviceTimeoutMs}`,
          `[counts] risk_scores=${Array.isArray(parsed.risk_scores) ? parsed.risk_scores.length : 0}`,
        ],
      });
    } catch (e) {}

    return {
      raw_response: typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent),
      parsed,
      model_used: providerResult.model || providerParams.model,
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
    };
  } catch (error) {
    status = error.statusCode === 504 ? 'timeout' : 'fail';
    errorMessage = error.message;

    logger.error('AI 风险评估失败', {
      promptId,
      requestHash,
      status,
      error: error.message,
      });

    const durationMs = Date.now() - startedAt;
    await logAssessment({
      promptId,
      modelUsed: providerModelUsed || providerParams.model,
      requestHash,
      durationMs,
      status,
      errorMessage,
    });

    // 文件日志（失败）
    try {
      await aiFileLogger.save({
        step: 'risk',
        route: '/api/ai/assess-risk',
        requestHash,
        promptTemplateId: String(promptId),
        modelProvider: providerLabel,
        modelName: providerModelUsed || providerParams.model,
        status,
        durationMs,
        providerTimeoutMs,
        serviceTimeoutMs,
        request: {
          promptId,
          template_content: promptDefinition.content,
          variables: templateVariables,
          document,
          final_prompt: promptContent,
          extras: { currentRiskItems, currentScores },
        },
        responseRaw: providerRaw ? JSON.stringify(providerRaw) : undefined,
        responseParsed: providerContent ? { _raw_text: providerContent } : undefined,
        notesLines: [
          `[error] ${error.message}`,
        ],
      });
    } catch (e) {}

    if (error.statusCode) {
      throw error;
    }

    throw internalError(error.message || 'AI 评估失败');
  }
}

async function normalizeRiskNames(payload) {
  if (!payload || typeof payload !== 'object') {
    throw validationError('请求体不能为空');
  }
  const { allowed_item_names, risk_scores } = payload;
  if (!Array.isArray(allowed_item_names) || allowed_item_names.length === 0) {
    throw validationError('allowed_item_names 为必填数组');
  }
  if (!Array.isArray(risk_scores) || risk_scores.length === 0) {
    throw validationError('risk_scores 为必填数组');
  }

  // 构造提示词
  const allowList = allowed_item_names.map((n, i) => `${i + 1}. ${ensureString(n)}`).join('\n');
  const inputScores = JSON.stringify(risk_scores, null, 2);

  const promptContent = [
    '你是一名项目风险评估助手。请将以下评估结果中的每个 item_name 规范化为“允许名称列表”中的一个，并只输出严格 JSON。',
    '',
    '要求：',
    '1) 对每一项 risk_scores，选择 allowed_item_names 中语义最接近的一项，作为新的 item_name（必须完全相同的字符串）。',
    '2) 保留 suggested_score 数值；保留 reason 文本（可适当精简）。',
    '3) 只输出 JSON：{"risk_scores": [{"item_name":"...","suggested_score": 数值, "reason":"..."}]}',
    '4) 禁止输出任何额外说明、Markdown或非 JSON 内容。',
    '',
    'allowed_item_names 列表：',
    allowList,
    '',
    '当前评估结果（需规范化 item_name）：',
    inputScores,
  ].join('\n');

  // 选择 Provider：优先使用数据库中当前模型配置
  let currentModel = null;
  try {
    currentModel = await aiModelModel.getCurrentModel();
  } catch (e) {
    currentModel = null;
  }

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
    .update(`normalize:${modelFromDb || 'model'}:${Date.now()}`)
    .digest('hex');

  const providerParams = {
    prompt: promptContent,
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
    logger.info('AI Normalize Provider 选择结果', {
      providerLabel,
      providerKey,
      apiHost: apiHostFromDb,
      model: providerParams.model,
      providerTimeoutMs,
      serviceTimeoutMs,
    });
  } catch (e) {}

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
      new Promise((_, reject) => {
        setTimeout(() => reject(timeoutError('AI 调用超时')), serviceTimeoutMs);
      }),
    ]);

    providerModelUsed = providerResult.model || providerParams.model;
    const rawSource = providerResult.data || providerResult;
    providerRaw = rawSource;
    const rawContent = extractContentFromProviderResponse(rawSource);
    providerContent = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
    const parsed = ensureRiskScores(
      typeof rawContent === 'string' ? JSON.parse(cleanJsonCandidate(rawContent)) : rawSource
    );

    const durationMs = providerResult.durationMs || 0;
    await logAssessment({
      promptId: 'normalize',
      modelUsed: providerModelUsed,
      requestHash,
      durationMs,
      status: 'success',
    });

    // 文件日志（成功）
    try {
      await aiFileLogger.save({
        step: 'risk-normalize',
        route: '/api/ai/normalize-risk-names',
        requestHash,
        promptTemplateId: 'normalize',
        modelProvider: providerLabel,
        modelName: providerModelUsed,
        status: 'success',
        durationMs,
        providerTimeoutMs,
        serviceTimeoutMs,
        request: {
          promptId: 'normalize',
          template_content: promptContent,
          variables: { allowed_item_names, risk_scores },
          final_prompt: promptContent,
        },
        responseRaw: JSON.stringify(providerRaw),
        responseParsed: {
          ...parsed,
          _raw_text: providerContent,
        },
        notesLines: [
          `[provider] ${providerLabel} model=${providerModelUsed}`,
          `[timing] durationMs=${durationMs} providerTimeoutMs=${providerTimeoutMs} serviceTimeoutMs=${serviceTimeoutMs}`,
          `[counts] normalized_risk_scores=${Array.isArray(parsed.risk_scores) ? parsed.risk_scores.length : 0}`,
        ],
      });
    } catch (e) {}

    return {
      raw_response: typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent),
      parsed,
      model_used: providerResult.model || providerParams.model,
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
    };
  } catch (error) {
    await logAssessment({
      promptId: 'normalize',
      modelUsed: providerModelUsed || sanitizeModelHint(modelFromDb),
      requestHash,
      durationMs: 0,
      status: error.statusCode === 504 ? 'timeout' : 'fail',
      errorMessage: error.message,
    });
    // 文件日志（失败）
    try {
      await aiFileLogger.save({
        step: 'risk-normalize',
        route: '/api/ai/normalize-risk-names',
        requestHash,
        promptTemplateId: 'normalize',
        modelProvider: providerLabel,
        modelName: providerModelUsed || providerParams.model,
        status: error.statusCode === 504 ? 'timeout' : 'fail',
        durationMs: 0,
        providerTimeoutMs,
        serviceTimeoutMs,
        request: {
          promptId: 'normalize',
          template_content: promptContent,
          variables: { allowed_item_names, risk_scores },
          final_prompt: promptContent,
        },
        responseRaw: providerRaw ? JSON.stringify(providerRaw) : undefined,
        responseParsed: providerContent ? { _raw_text: providerContent } : undefined,
        notesLines: [
          `[error] ${error.message}`,
        ],
      });
    } catch (e) {}
    if (error.statusCode) throw error;
    throw internalError(error.message || 'AI 名称归一失败');
  }
}

module.exports = {
  assessRisk,
  normalizeRiskNames,
};
