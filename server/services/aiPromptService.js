const promptTemplateModel = require('../models/promptTemplateModel');
const aiModelModel = require('../models/aiModelModel');
const logger = require('../utils/logger');

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

  return prompts;
}

/**
 * 按类别获取提示词模板（例如：'module_analysis'）
 */
async function getPromptsByCategory(category) {
  // 获取当前模型
  const currentModel = await aiModelModel.getCurrentModel();
  if (!currentModel) {
    throw new Error('当前没有设置使用的模型，请先配置并设置一个模型为当前使用');
  }

  // 分类别名兼容（例如：'成本估算' / '工作量评估' 视为 'workload_evaluation' 的等价分类）
  let categories = category;
  if (category === 'workload_evaluation') {
    categories = ['workload_evaluation', 'cost_estimation', '成本估算', '工作量评估'];
  }

  // 仅拉取分类下的活跃模板（支持多分类 IN 查询）
  const templatesResult = await promptTemplateModel.getAll({
    is_active: 1,
    category: categories,
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

  // 获取当前使用的模型
  const currentModel = await aiModelModel.getCurrentModel();
  if (!currentModel) {
    throw new Error('当前没有设置使用的模型，请先配置并设置一个模型为当前使用');
  }

  const template = await promptTemplateModel.getById(promptId);
  if (!template) {
    throw new Error(`提示词 ${promptId} 不存在`);
  }

  return convertToAiPrompt(template, currentModel);
}

module.exports = {
  getAllPrompts,
  getPromptsByCategory,
  getPromptById,
};
