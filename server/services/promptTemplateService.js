const promptTemplateModel = require('../models/promptTemplateModel');
const { HttpError, validationError } = require('../utils/errors');
const {
  normalizePromptTemplateCategory,
  normalizePromptTemplateCategoryFilter,
  isValidPromptTemplateCategory,
} = require('../utils/promptTemplateCategories');

function ensureTemplateExists(template, notFoundMessage = 'Template not found') {
  if (!template) {
    throw new HttpError(404, notFoundMessage, 'NotFoundError');
  }
  return template;
}

function parseVariablesJson(variablesJson) {
  if (!variablesJson) {
    return [];
  }
  try {
    const parsed = JSON.parse(variablesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    // 保持兼容：解析失败时仅记录日志，不中断预览
    console.error('Failed to parse variables_json:', error);
    return [];
  }
}

function escapeRegExp(str = '') {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createPlaceholderRegex(varName, flags = 'g') {
  const escaped = escapeRegExp(varName);
  return new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, flags);
}

function ensureValidCategory(category) {
  const normalizedCategory = normalizePromptTemplateCategory(category);
  if (!normalizedCategory || !isValidPromptTemplateCategory(normalizedCategory)) {
    throw validationError('category 必须为合法分类');
  }
  return normalizedCategory;
}

function normalizeTemplateCategory(template) {
  if (!template) {
    return template;
  }

  return {
    ...template,
    category: normalizePromptTemplateCategory(template.category),
  };
}

async function createPromptTemplate(payload) {
  const { template_name, category, system_prompt, user_prompt_template } = payload || {};

  if (!template_name || !category || !system_prompt || !user_prompt_template) {
    throw validationError('Missing required fields.');
  }

  return promptTemplateModel.create({
    ...payload,
    category: ensureValidCategory(category),
  });
}

async function getPromptTemplates(filters = {}) {
  const normalizedFilters = { ...filters };
  if (Object.prototype.hasOwnProperty.call(filters, 'category')) {
    normalizedFilters.category = normalizePromptTemplateCategoryFilter(filters.category);
  }

  const result = await promptTemplateModel.getAll(normalizedFilters);
  return {
    ...result,
    data: Array.isArray(result.data)
      ? result.data.map((template) => normalizeTemplateCategory(template))
      : [],
  };
}

async function getPromptTemplateById(id) {
  const template = await promptTemplateModel.getById(id);
  return normalizeTemplateCategory(ensureTemplateExists(template));
}

async function ensureActiveWebSearchTemplate(id) {
  return ensureActiveTemplateByCategory(id, 'web_search', '联网搜索');
}

async function ensureActiveTemplateByCategory(id, category, usageLabel = '当前操作') {
  const template = await getPromptTemplateById(id);
  const normalizedCategory = ensureValidCategory(category);

  if (template.is_active !== 1) {
    throw validationError(`所选提示词模板未启用，无法用于${usageLabel}`);
  }

  if (template.category !== normalizedCategory) {
    throw validationError(`所选提示词模板不属于${usageLabel}分类`);
  }

  return template;
}

async function getLatestActiveTemplateByCategory(category) {
  const normalizedCategory = ensureValidCategory(category);
  const result = await promptTemplateModel.getAll({
    current: 1,
    pageSize: 1,
    category: normalizedCategory,
    is_active: 1,
  });

  const latest = Array.isArray(result?.data) ? result.data[0] : null;
  if (!latest?.id) {
    throw validationError(`未找到已启用的 ${normalizedCategory} 提示词模板`);
  }

  return normalizeTemplateCategory(
    ensureTemplateExists(
      await promptTemplateModel.getById(latest.id),
      'Template not found'
    )
  );
}

async function updatePromptTemplate(id, payload) {
  const template = await promptTemplateModel.getById(id);
  ensureTemplateExists(template);

  if (template.is_system) {
    throw new HttpError(
      403,
      'System templates cannot be modified',
      'ForbiddenError'
    );
  }

  const nextPayload = { ...payload };
  if (Object.prototype.hasOwnProperty.call(payload || {}, 'category')) {
    nextPayload.category = ensureValidCategory(payload.category);
  }

  return promptTemplateModel.update(id, nextPayload);
}

async function deletePromptTemplate(id) {
  const template = await promptTemplateModel.getById(id);
  ensureTemplateExists(template);

  if (template.is_system) {
    throw new HttpError(
      403,
      'System templates cannot be deleted',
      'ForbiddenError'
    );
  }

  await promptTemplateModel.delete(id);
}

async function copyTemplate(id) {
  try {
    const template = await promptTemplateModel.copy(id);
    return normalizeTemplateCategory(template);
  } catch (error) {
    if (error && error.message === 'Template not found') {
      throw new HttpError(404, 'Template not found', 'NotFoundError');
    }
    throw error;
  }
}

async function previewTemplate(id, variableValues = {}) {
  const template = await getPromptTemplateById(id);

  const variables = parseVariablesJson(template.variables_json);

  let userPrompt = template.user_prompt_template || '';
  const missing_required = [];
  const unused_variables = [];
  const provided_variables = Object.keys(variableValues || {});

  // 检查必填变量是否提供
  variables.forEach((variable) => {
    if (variable.required && !variableValues[variable.name]) {
      missing_required.push(variable.name);
    }
  });

  // 检查提供的变量是否被使用
  provided_variables.forEach((varName) => {
    const regex = createPlaceholderRegex(varName);
    if (!regex.test(userPrompt)) {
      unused_variables.push(varName);
    }
  });

  // 替换所有变量
  Object.keys(variableValues || {}).forEach((varName) => {
    const regex = createPlaceholderRegex(varName, 'g');
    userPrompt = userPrompt.replace(regex, variableValues[varName]);
  });

  return {
    system_prompt: template.system_prompt,
    user_prompt: userPrompt,
    missing_required,
    unused_variables,
  };
}

module.exports = {
  createPromptTemplate,
  getPromptTemplates,
  getPromptTemplateById,
  ensureActiveTemplateByCategory,
  ensureActiveWebSearchTemplate,
  getLatestActiveTemplateByCategory,
  updatePromptTemplate,
  deletePromptTemplate,
  copyTemplate,
  previewTemplate,
};
