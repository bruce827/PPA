const promptTemplateModel = require('../models/promptTemplateModel');
const aiModelModel = require('../models/aiModelModel');
const logger = require('../utils/logger');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cache = {
  data: null,
  expiresAt: 0,
};

/**
 * 转换 PromptTemplate 为 AiPrompt 格式
 */
function convertToAiPrompt(template, currentModel) {
  // 获取完整的模板数据
  const fullTemplate = template;

  // 解析变量
  let variables = [];
  if (fullTemplate.variables_json) {
    try {
      variables = JSON.parse(fullTemplate.variables_json);
    } catch (error) {
      logger.warn('解析提示词变量失败', { templateId: fullTemplate.id, error: error.message });
      variables = [];
    }
  }

  // 转换变量格式
  const convertedVariables = variables.map(variable => ({
    name: variable.name,
    display_name: variable.display_name || variable.name,
    description: variable.description || '',
    default_value: variable.default_value || ''
  }));

  // 组合 system_prompt 和 user_prompt_template 作为 content
  const content = [
    fullTemplate.system_prompt || '',
    fullTemplate.user_prompt_template || ''
  ].filter(Boolean).join('\n\n');

  return {
    id: String(fullTemplate.id),
    name: fullTemplate.template_name || '',
    description: fullTemplate.description || '',
    content: content,
    variables: convertedVariables,
    model_hint: currentModel?.model_name || 'gpt-4-turbo',
    updated_at: fullTemplate.updated_at
  };
}

/**
 * 获取所有AI评估用的提示词模板
 */
async function getAllPrompts() {
  const now = Date.now();
  if (cache.data && cache.expiresAt > now) {
    return cache.data;
  }

  // 获取当前使用的模型
  const currentModel = await aiModelModel.getCurrentModel();
  if (!currentModel) {
    throw new Error('当前没有设置使用的模型，请先配置并设置一个模型为当前使用');
  }

  // 获取所有活跃的提示词模板
  const templatesResult = await promptTemplateModel.getAll({
    is_active: 1,
    pageSize: 1000 // 获取所有记录，不分页
  });

  // 获取每个模板的完整数据并转换格式
  const prompts = await Promise.all(
    templatesResult.data.map(async (template) => {
      const fullTemplate = await promptTemplateModel.getById(template.id);
      return convertToAiPrompt(fullTemplate, currentModel);
    })
  );

  // 更新缓存
  cache = {
    data: prompts,
    expiresAt: now + CACHE_TTL_MS,
  };

  return prompts;
}

/**
 * 按类别获取提示词模板（例如：'module_analysis'）
 */
async function getPromptsByCategory(category) {
  const now = Date.now();

  // 获取当前模型
  const currentModel = await aiModelModel.getCurrentModel();
  if (!currentModel) {
    throw new Error('当前没有设置使用的模型，请先配置并设置一个模型为当前使用');
  }

  // 仅拉取分类下的活跃模板
  const templatesResult = await promptTemplateModel.getAll({
    is_active: 1,
    category,
    pageSize: 1000,
  });

  const prompts = await Promise.all(
    templatesResult.data.map(async (t) => {
      const fullTemplate = await promptTemplateModel.getById(t.id);
      return convertToAiPrompt(fullTemplate, currentModel);
    })
  );

  // 不缓存分类结果，避免混淆全量缓存；如需缓存，可单独维护 keyed cache
  return prompts;
}

/**
 * 根据ID获取单个提示词模板
 */
async function getPromptById(promptId) {
  if (!promptId) {
    throw new Error('promptId 为必填字段');
  }

  // 先从缓存中查找
  const cachedPrompts = cache.data;
  if (cachedPrompts) {
    const found = cachedPrompts.find((item) => item.id === promptId);
    if (found) {
      return found;
    }
  }

  // 缓存中没有，重新获取所有数据
  const prompts = await getAllPrompts();
  const found = prompts.find((item) => item.id === promptId);

  if (!found) {
    throw new Error(`提示词 ${promptId} 不存在`);
  }

  return found;
}

/**
 * 清除缓存
 */
function invalidateCache() {
  cache = {
    data: null,
    expiresAt: 0,
  };
}

module.exports = {
  getAllPrompts,
  getPromptsByCategory,
  getPromptById,
  invalidateCache,
};
