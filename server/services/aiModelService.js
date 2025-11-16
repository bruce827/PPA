const aiModelModel = require('../models/aiModelModel');
const { HttpError, validationError } = require('../utils/errors');
const aiTestService = require('./aiTestService');

function ensureId(id) {
  if (!id) {
    throw validationError('缺少必填参数：id');
  }
  return id;
}

function toNotFoundError(message) {
  return new HttpError(404, message || '未找到指定的 AI 模型配置', 'NotFoundError');
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
    is_active = defaults.is_active ?? 1,
  } = payload;

  return {
    config_name,
    description,
    provider,
    api_key,
    api_host,
    model_name,
    temperature,
    max_tokens,
    timeout,
    is_current,
    is_active,
  };
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

async function getAllModels() {
  return aiModelModel.getAllModels();
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
  if (existing.is_active === 0) {
    throw validationError('无法设置未启用的模型为当前使用');
  }

  await aiModelModel.setCurrentModel(modelId);
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
    api_host,
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
  getCurrentModel,
  testModelConnection,
  testTempConnection,
};
