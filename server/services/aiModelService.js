const aiModelModel = require('../models/aiModelModel');
const { normalizeApiHost: normalizeCherryStudioApiHost } = require('../providers/ai/cherryStudioProvider');
const { HttpError, validationError } = require('../utils/errors');
const aiTestService = require('./aiTestService');
const promptTemplateService = require('./promptTemplateService');

function ensureId(id) {
  if (!id) {
    throw validationError('缺少必填参数：id');
  }
  return id;
}

function toNotFoundError(message) {
  return new HttpError(404, message || '未找到指定的 AI 模型配置', 'NotFoundError');
}

function isTavilyProvider(provider) {
  return typeof provider === 'string' && provider.toLowerCase().includes('tavily');
}

function isCherryStudioProvider(provider) {
  return typeof provider === 'string' && provider.toLowerCase().includes('cherry');
}

function isGeminiProvider(provider) {
  if (typeof provider !== 'string') return false;
  const normalized = provider.toLowerCase();
  return normalized.includes('google') || normalized.includes('gemini');
}

function isMinimaxProvider(provider) {
  if (typeof provider !== 'string') return false;
  return provider.toLowerCase().includes('minimax');
}

function isVisionCapableProvider(provider) {
  return isGeminiProvider(provider) || isMinimaxProvider(provider);
}

function normalizeApiHost(provider, apiHost) {
  if (apiHost === undefined || apiHost === null || apiHost === '') {
    return apiHost;
  }

  const trimmed = String(apiHost).trim();
  let url;
  try {
    url = new URL(trimmed);
  } catch (_error) {
    throw validationError('API Host 必须为有效的 URL');
  }

  const normalizedUrl = url.toString();

  if (isCherryStudioProvider(provider)) {
    return normalizeCherryStudioApiHost(normalizedUrl);
  }

  if (isGeminiProvider(provider) || isTavilyProvider(provider)) {
    return normalizedUrl;
  }

  if (isMinimaxProvider(provider)) {
    return normalizedUrl;
  }

  const normalizedPathname = (url.pathname || '').replace(/\/+$/, '') || '/';
  if (normalizedPathname === '/' || normalizedPathname === '/v1') {
    throw validationError(
      'OpenAI 兼容服务的 API Host 需填写完整接口 URL，例如 https://api.openai.com/v1/chat/completions'
    );
  }

  return normalizedUrl;
}

function normalizeFlag(name, value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (value === true || value === 1 || value === '1') {
    return 1;
  }

  if (value === false || value === 0 || value === '0') {
    return 0;
  }

  throw validationError(`${name} 必须为 0 或 1`);
}

function normalizePayload(payload, defaults = {}) {
  const {
    config_name = defaults.config_name,
    description = defaults.description || null,
    provider = defaults.provider,
    api_key = defaults.api_key,
    api_host = defaults.api_host,
    model_name = defaults.model_name,
    temperature = defaults.temperature ?? 0.7,
    max_tokens = defaults.max_tokens ?? 2000,
    timeout = defaults.timeout ?? 30,
    is_current = defaults.is_current ?? 0,
    is_current_vision = defaults.is_current_vision ?? 0,
    is_active = defaults.is_active ?? 1,
    supports_web_search,
    supports_vision,
  } = payload;

  const normalized = {
    config_name,
    description,
    provider,
    api_key,
    api_host: normalizeApiHost(provider, api_host),
    model_name,
    temperature,
    max_tokens,
    timeout,
    is_current: normalizeFlag('is_current', is_current, defaults.is_current ?? 0),
    is_current_vision: normalizeFlag(
      'is_current_vision',
      is_current_vision,
      defaults.is_current_vision ?? 0
    ),
    is_active: normalizeFlag('is_active', is_active, defaults.is_active ?? 1),
    supports_web_search: normalizeFlag(
      'supports_web_search',
      supports_web_search,
      defaults.supports_web_search ?? 0
    ),
    supports_vision: normalizeFlag(
      'supports_vision',
      supports_vision,
      defaults.supports_vision ?? 0
    ),
  };

  if (isTavilyProvider(normalized.provider)) {
    if (normalized.is_current === 1) {
      throw validationError('Tavily 仅可用于联网搜索，不能设为当前使用模型');
    }

    if (normalized.is_current_vision === 1) {
      throw validationError('Tavily 不支持图片识别，不能设为当前视觉模型');
    }

    normalized.supports_web_search = 1;
    normalized.supports_vision = 0;
  }

  if (!isVisionCapableProvider(normalized.provider)) {
    if (normalized.supports_vision === 1) {
      throw validationError('当前 provider 暂不支持图片识别，仅 Gemini / MiniMax 可用');
    }

    if (normalized.is_current_vision === 1) {
      throw validationError('当前 provider 不能设为视觉模型，仅 Gemini / MiniMax 可用');
    }
  }

  if (normalized.is_current_vision === 1 && normalized.supports_vision !== 1) {
    throw validationError('仅支持图片识别的模型才能设为当前视觉模型');
  }

  return normalized;
}

function validateRequiredFields(model) {
  const { config_name, provider, api_key, api_host, model_name } = model;
  if (!config_name || !provider || !api_key || !api_host || !model_name) {
    throw validationError(
      '缺少必填字段：config_name, provider, api_key, api_host, model_name'
    );
  }
}

function handleUniqueConstraint(error) {
  if (error && typeof error.message === 'string') {
    if (error.message.includes('UNIQUE constraint failed') && error.message.includes('config_name')) {
      throw validationError('配置名称已存在，请使用不同的名称');
    }
  }
  throw error;
}

function normalizeModelFilters(filters = {}) {
  const normalized = {};

  if (Object.prototype.hasOwnProperty.call(filters, 'supports_web_search')) {
    normalized.supports_web_search = normalizeFlag(
      'supports_web_search',
      filters.supports_web_search
    );
  }

  if (Object.prototype.hasOwnProperty.call(filters, 'supports_vision')) {
    normalized.supports_vision = normalizeFlag(
      'supports_vision',
      filters.supports_vision
    );
  }

  if (Object.prototype.hasOwnProperty.call(filters, 'is_active')) {
    normalized.is_active = normalizeFlag('is_active', filters.is_active);
  }

  return normalized;
}

async function getAllModels(filters = {}) {
  return aiModelModel.getAllModels(normalizeModelFilters(filters));
}

async function getModelById(id) {
  const modelId = ensureId(id);
  const model = await aiModelModel.getModelById(modelId);
  if (!model) {
    throw toNotFoundError('未找到指定的 AI 模型配置');
  }
  return model;
}

async function createModel(payload) {
  const normalized = normalizePayload(payload);
  validateRequiredFields(normalized);

  try {
    return await aiModelModel.createModel(normalized);
  } catch (error) {
    handleUniqueConstraint(error);
  }
}

async function updateModel(id, payload) {
  const modelId = ensureId(id);
  const existing = await aiModelModel.getModelById(modelId);
  if (!existing) {
    throw toNotFoundError('未找到指定的 AI 模型配置');
  }

  const normalized = normalizePayload(payload, existing);
  validateRequiredFields(normalized);

  try {
    return await aiModelModel.updateModel(modelId, normalized);
  } catch (error) {
    handleUniqueConstraint(error);
  }
}

async function deleteModel(id) {
  const modelId = ensureId(id);
  const existing = await aiModelModel.getModelById(modelId);
  if (!existing) {
    throw toNotFoundError('未找到指定的 AI 模型配置');
  }

  if (existing.is_current === 1) {
    throw validationError('无法删除当前使用的模型，请先切换到其他模型');
  }

  await aiModelModel.deleteModel(modelId);
}

async function setCurrentModel(id) {
  const modelId = ensureId(id);
  const existing = await aiModelModel.getModelById(modelId);
  if (!existing) {
    throw toNotFoundError('未找到指定的 AI 模型配置');
  }
  if (isTavilyProvider(existing.provider)) {
    throw validationError('Tavily 仅可用于联网搜索，不能设为当前使用模型');
  }
  if (existing.is_active === 0) {
    throw validationError('无法设置未启用的模型为当前使用');
  }

  await aiModelModel.setCurrentModel(modelId);
  return aiModelModel.getModelById(modelId);
}

async function setCurrentVisionModel(id) {
  const modelId = ensureId(id);
  const existing = await aiModelModel.getModelById(modelId);
  if (!existing) {
    throw toNotFoundError('未找到指定的 AI 模型配置');
  }
  if (existing.is_active !== 1) {
    throw validationError('无法设置未启用的模型为当前视觉模型');
  }
  if (!isVisionCapableProvider(existing.provider)) {
    throw validationError('当前 provider 不能设为视觉模型，仅 Gemini / MiniMax 可用');
  }
  if (existing.supports_vision !== 1) {
    throw validationError('该模型未启用图片识别能力');
  }

  await aiModelModel.setCurrentVisionModel(modelId);
  return aiModelModel.getModelById(modelId);
}

async function getCurrentModel() {
  const current = await aiModelModel.getCurrentModel();
  if (!current) {
    throw new HttpError(
      404,
      '当前没有设置使用的模型，请先配置并设置一个模型为当前使用',
      'NotFoundError'
    );
  }
  return current;
}

async function getCurrentVisionModel() {
  const current = await aiModelModel.getCurrentVisionModel();
  if (!current) {
    throw new HttpError(
      404,
      '当前没有设置视觉模型，请先配置并设置一个支持图片识别的模型',
      'NotFoundError'
    );
  }
  return current;
}

async function ensureActiveWebSearchModel(id) {
  const model = await getModelById(id);

  if (model.is_active !== 1) {
    throw validationError('所选模型未启用，无法用于联网搜索');
  }

  if (model.supports_web_search !== 1) {
    throw validationError('所选模型不支持联网搜索');
  }

  return model;
}

async function validateWebSearchRuntimeConfig(input = {}) {
  const modelId = input.modelId ?? input.model_id;
  const templateId = input.templateId ?? input.promptTemplateId ?? input.prompt_template_id;

  if (!modelId) {
    throw validationError('缺少必填参数：modelId');
  }

  if (!templateId) {
    throw validationError('缺少必填参数：promptTemplateId');
  }

  const model = await ensureActiveWebSearchModel(modelId);
  const template = await promptTemplateService.ensureActiveWebSearchTemplate(templateId);

  return {
    model,
    template,
  };
}

async function testModelConnection(id) {
  const modelId = ensureId(id);
  const existing = await aiModelModel.getModelById(modelId);
  if (!existing) {
    throw toNotFoundError('未找到指定的 AI 模型配置');
  }

  const testResult = await aiTestService.testConnection(existing);
  const testStatus = testResult.success ? 'success' : 'failed';
  await aiModelModel.updateTestResult(modelId, testStatus);

  return testResult;
}

async function testTempConnection(payload) {
  const {
    provider,
    api_key,
    api_host,
    model_name,
    timeout = 30,
  } = payload || {};

  if (!provider || !api_key || !api_host || !model_name) {
    throw validationError('缺少必填字段：provider, api_key, api_host, model_name');
  }

  const tempConfig = {
    provider,
    api_key,
    api_host: normalizeApiHost(provider, api_host),
    model_name,
    timeout,
  };

  return aiTestService.testConnection(tempConfig);
}

module.exports = {
  getAllModels,
  getModelById,
  createModel,
  updateModel,
  deleteModel,
  setCurrentModel,
  setCurrentVisionModel,
  getCurrentModel,
  getCurrentVisionModel,
  ensureActiveWebSearchModel,
  validateWebSearchRuntimeConfig,
  testModelConnection,
  testTempConnection,
  isTavilyProvider,
  isCherryStudioProvider,
  isGeminiProvider,
  isMinimaxProvider,
  isVisionCapableProvider,
  normalizeApiHost,
};
