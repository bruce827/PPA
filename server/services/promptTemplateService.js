const promptTemplateModel = require('../models/promptTemplateModel');
const { HttpError, validationError } = require('../utils/errors');

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

async function createPromptTemplate(payload) {
  const { template_name, category, system_prompt, user_prompt_template } = payload || {};

  if (!template_name || !category || !system_prompt || !user_prompt_template) {
    throw validationError('Missing required fields.');
  }

  return promptTemplateModel.create(payload);
}

async function getPromptTemplates(filters = {}) {
  return promptTemplateModel.getAll(filters);
}

async function getPromptTemplateById(id) {
  const template = await promptTemplateModel.getById(id);
  return ensureTemplateExists(template);
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

  return promptTemplateModel.update(id, payload);
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
  updatePromptTemplate,
  deletePromptTemplate,
  copyTemplate,
  previewTemplate,
};
