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

const MAX_SNAPSHOT_LENGTH = 8000;
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

function normalizeTags(input) {
  const arr = Array.isArray(input) ? input : [];
  const out = [];
  const seen = new Set();
  for (const raw of arr) {
    if (raw === null || raw === undefined) continue;
    const t = ensureString(raw).trim();
    if (!t) continue;
    const truncated = t.length > 30 ? t.slice(0, 30) : t;
    if (!truncated) continue;
    if (seen.has(truncated)) continue;
    seen.add(truncated);
    out.push(truncated);
    if (out.length >= 30) break;
  }
  return out;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw validationError('请求体不能为空');
  }

  const { promptId, projectSnapshot } = payload;
  if (!promptId || typeof promptId !== 'string') {
    throw validationError('promptId 为必填字段');
  }

  if (projectSnapshot === undefined || projectSnapshot === null) {
    throw validationError('projectSnapshot 为必填字段');
  }
}

function stringifySnapshot(snapshot) {
  if (typeof snapshot === 'string') return snapshot;
  try {
    return JSON.stringify(snapshot);
  } catch (e) {
    return ensureString(snapshot);
  }
}

function parseTagsFromObject(obj) {
  if (!obj || typeof obj !== 'object') return null;

  const candidates = [obj, obj.data, obj.result, obj.output].filter(Boolean);
  const keys = ['tags', 'tag_list', 'tagList', 'labels', 'project_tags', 'projectTags', '项目标签'];

  for (const c of candidates) {
    for (const k of keys) {
      const v = c && Object.prototype.hasOwnProperty.call(c, k) ? c[k] : undefined;
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    }
  }

  return null;
}

function parseProviderResult(rawResponse) {
  let candidate = extractContentFromProviderResponse(rawResponse);
  candidate = cleanJsonCandidate(candidate);

  if (typeof candidate === 'string') {
    try {
      const parsed = JSON.parse(candidate);
      const fromObj = parseTagsFromObject(parsed);
      if (fromObj) return normalizeTags(fromObj);
      throw unprocessableError('AI 响应缺少 tags 字段');
    } catch (error) {
      const text = ensureString(candidate);
      const m = text.match(/\[[^\]]*\]/);
      if (m) {
        try {
          const parsed = JSON.parse(m[0]);
          if (Array.isArray(parsed)) return normalizeTags(parsed);
        } catch (e) {}
      }

      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const extracted = lines
        .map((l) => l.replace(/^[-•\s]+/, '').trim())
        .filter(Boolean);
      if (extracted.length > 0) {
        return normalizeTags(extracted);
      }

      throw unprocessableError('AI 响应不是有效 JSON');
    }
  }

  const fromObj = parseTagsFromObject(candidate);
  if (fromObj) return normalizeTags(fromObj);
  throw unprocessableError('AI 响应缺少 tags 字段');
}

async function logAssessment({
  promptId,
  modelUsed,
  requestHash,
  durationMs,
  status,
  errorMessage,
  step,
  route,
  projectId,
}) {
  try {
    await aiAssessmentLogModel.insertLog({
      promptId,
      modelUsed,
      requestHash,
      durationMs,
      status,
      errorMessage,
      step,
      route,
      projectId,
    });
  } catch (error) {
    logger.warn('写入 ai_assessment_logs 失败(项目标签生成)', { error: error.message });
  }
}

async function generateProjectTags(payload) {
  validatePayload(payload);

  const { promptId, projectSnapshot, variables = {}, projectId } = payload;

  const snapshotText = stringifySnapshot(projectSnapshot);
  if (snapshotText.length > MAX_SNAPSHOT_LENGTH) {
    throw validationError(`projectSnapshot 字数超出限制 (最大 ${MAX_SNAPSHOT_LENGTH})`);
  }

  const promptDefinition = await aiPromptService.getPromptById(promptId);
  const variableDefaults = {};
  (promptDefinition?.variables || []).forEach((v) => {
    variableDefaults[v.name] = v.default_value || '';
  });

  const variableMap = {
    ...variableDefaults,
    ...variables,
    project_snapshot: snapshotText,
    projectSnapshot: snapshotText,
  };

  const content = promptDefinition?.content || '';
  const containsSnapshotToken =
    /\{\{\s*(project_snapshot|projectSnapshot)\s*\}\}/i.test(content);

  let promptText = applyTemplate(content, variableMap);
  if (!containsSnapshotToken && snapshotText) {
    promptText = [promptText, '', '项目快照:', snapshotText].join('\n');
  }

  let currentModel = null;
  try {
    currentModel = await aiModelModel.getCurrentModel();
  } catch (e) {
    currentModel = null;
  }

  if (!currentModel) {
    throw internalError('未配置当前可用的AI模型，请在模型应用管理中设置');
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
  const providerMaxTokens =
    Number.isFinite(configuredMaxTokens) && configuredMaxTokens > 0
      ? configuredMaxTokens
      : undefined;

  const requestHash = crypto
    .createHash('sha256')
    .update(`${promptId}:${ensureString(projectId || '')}:${snapshotText}`)
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
    logger.info('AI Project Tagging Provider 选择结果', {
      providerLabel,
      providerKey,
      apiHost: apiHostFromDb,
      model: providerParams.model,
      providerTimeoutMs,
      serviceTimeoutMs,
    });
  } catch (e) {}

  const startedAt = Date.now();
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
      new Promise((_, reject) =>
        setTimeout(() => reject(timeoutError('AI 调用超时')), serviceTimeoutMs)
      ),
    ]);

    providerModelUsed = providerResult.model || providerParams.model;
    const rawSource = providerResult.data || providerResult;
    providerRaw = rawSource;
    const rawContent = extractContentFromProviderResponse(rawSource);
    providerContent =
      typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);

    const tags = parseProviderResult(rawSource);

    const durationMs = providerResult.durationMs || Date.now() - startedAt;

    await logAssessment({
      promptId,
      modelUsed: providerModelUsed,
      requestHash,
      durationMs,
      status,
      step: 'project-tags',
      route: '/api/ai/generate-project-tags',
      projectId,
    });

    try {
      const logDir = await aiFileLogger.save({
        step: 'project-tags',
        route: '/api/ai/generate-project-tags',
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
          projectId,
          projectSnapshot: snapshotText,
          final_prompt: promptText,
        },
        responseRaw: JSON.stringify(providerRaw),
        responseParsed: {
          tags,
          _raw_text: providerContent,
        },
        notesLines: [
          `[provider] ${providerLabel} model=${providerModelUsed}`,
          `[timing] durationMs=${durationMs} providerTimeoutMs=${providerTimeoutMs} serviceTimeoutMs=${serviceTimeoutMs}`,
        ],
      });

      try {
        await aiAssessmentLogModel.updateLogDir({
          requestHash,
          step: 'project-tags',
          route: '/api/ai/generate-project-tags',
          logDir,
        });
      } catch (e) {}
    } catch (e) {}

    return {
      tags,
      model_used: providerModelUsed,
      duration_ms: durationMs,
      raw_response: providerContent || (providerRaw ? JSON.stringify(providerRaw) : ''),
    };
  } catch (error) {
    status = error.statusCode === 504 ? 'timeout' : 'fail';
    errorMessage = error.message;

    const durationMs = Date.now() - startedAt;

    await logAssessment({
      promptId,
      modelUsed: providerModelUsed || sanitizeModelHint(modelFromDb),
      requestHash,
      durationMs,
      status,
      errorMessage,
      step: 'project-tags',
      route: '/api/ai/generate-project-tags',
      projectId,
    });

    try {
      const logDir = await aiFileLogger.save({
        step: 'project-tags',
        route: '/api/ai/generate-project-tags',
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
          variables: variableMap,
          projectId,
          projectSnapshot: snapshotText,
          final_prompt: promptText,
        },
        responseRaw: providerRaw ? JSON.stringify(providerRaw) : undefined,
        responseParsed: providerContent ? { _raw_text: providerContent } : undefined,
        notesLines: [`[error] ${error.message}`],
      });

      try {
        await aiAssessmentLogModel.updateLogDir({
          requestHash,
          step: 'project-tags',
          route: '/api/ai/generate-project-tags',
          logDir,
        });
      } catch (e) {}
    } catch (e) {}

    if (error.statusCode) throw error;
    throw internalError(error.message || 'AI 项目标签生成失败');
  }
}

module.exports = {
  generateProjectTags,
};
