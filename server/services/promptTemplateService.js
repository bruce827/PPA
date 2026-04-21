const promptTemplateModel = require('../models/promptTemplateModel');
const { HttpError, validationError } = require('../utils/errors');
const {
  normalizeModuleTag,
  validateModuleTag,
  RECOMMENDED_MODULE_TAGS,
} = require('../utils/promptTemplateCategories');
const db = require('../utils/db');

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

async function createPromptTemplate(payload) {
  const { template_name, module_tag, system_prompt, user_prompt_template } = payload || {};

  if (!template_name || !module_tag || !system_prompt || !user_prompt_template) {
    throw validationError('template_name, module_tag, system_prompt, user_prompt_template 为必填字段');
  }

  return promptTemplateModel.create({
    ...payload,
    module_tag: validateModuleTag(module_tag),
  });
}

async function getPromptTemplates(filters = {}) {
  const normalizedFilters = { ...filters };
  if (filters.module_tag) {
    normalizedFilters.module_tag = normalizeModuleTag(filters.module_tag);
  }

  return promptTemplateModel.getAll(normalizedFilters);
}

async function getPromptTemplateById(id) {
  return ensureTemplateExists(await promptTemplateModel.getById(id));
}

async function ensureActiveWebSearchTemplate(id) {
  return ensureActiveTemplateByModuleTag(id, 'bidding_search', '全网招标检索');
}

async function ensureActiveTemplateByModuleTag(id, moduleTag, usageLabel = '当前操作') {
  const template = await getPromptTemplateById(id);

  if (template.is_active !== 1) {
    throw validationError(`所选提示词模板未启用，无法用于${usageLabel}`);
  }

  if (template.module_tag !== moduleTag) {
    throw validationError(`所选提示词模板不属于${usageLabel}分类（当前: ${template.module_tag}）`);
  }

  return template;
}

async function getLatestActiveTemplateByModuleTag(moduleTag) {
  const normalized = normalizeModuleTag(moduleTag);
  const result = await promptTemplateModel.getAll({
    module_tag: normalized,
    is_active: 1,
    pageSize: 1,
  });

  const latest = Array.isArray(result?.data) ? result.data[0] : null;
  if (!latest?.id) {
    throw validationError(`未找到已启用的 ${normalized} 模块的提示词模板`);
  }

  return ensureTemplateExists(
    await promptTemplateModel.getById(latest.id),
    'Template not found'
  );
}

async function updatePromptTemplate(id, payload) {
  const template = await promptTemplateModel.getById(id);
  ensureTemplateExists(template);

  if (template.is_system) {
    throw new HttpError(403, 'System templates cannot be modified', 'ForbiddenError');
  }

  const nextPayload = { ...payload };
  if (payload && Object.prototype.hasOwnProperty.call(payload, 'module_tag')) {
    nextPayload.module_tag = validateModuleTag(payload.module_tag);
  }

  return promptTemplateModel.update(id, nextPayload);
}

async function deletePromptTemplate(id) {
  const template = await promptTemplateModel.getById(id);
  ensureTemplateExists(template);

  if (template.is_system) {
    throw new HttpError(403, 'System templates cannot be deleted', 'ForbiddenError');
  }

  await promptTemplateModel.delete(id);
}

async function copyTemplate(id) {
  try {
    return await promptTemplateModel.copy(id);
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

  variables.forEach((variable) => {
    if (variable.required && !variableValues[variable.name]) {
      missing_required.push(variable.name);
    }
  });

  provided_variables.forEach((varName) => {
    const regex = createPlaceholderRegex(varName);
    if (!regex.test(userPrompt)) {
      unused_variables.push(varName);
    }
  });

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

async function getPromptModuleTags() {
  const rows = await db.all(
    'SELECT value, label, description, is_recommended FROM prompt_module_tags ORDER BY sort_order ASC, id ASC'
  );
  return rows;
}

module.exports = {
  createPromptTemplate,
  getPromptTemplates,
  getPromptTemplateById,
  getPromptModuleTags,
  ensureActiveTemplateByModuleTag,
  ensureActiveWebSearchTemplate,
  getLatestActiveTemplateByModuleTag,
  updatePromptTemplate,
  deletePromptTemplate,
  copyTemplate,
  previewTemplate,
  RECOMMENDED_MODULE_TAGS,
};
