const promptTemplateService = require('../services/promptTemplateService');

// 创建提示词模板
exports.createPromptTemplate = async (req, res, next) => {
  try {
    const newTemplate = await promptTemplateService.createPromptTemplate(req.body);
    res.status(201).json(newTemplate);
  } catch (error) {
    next(error);
  }
};

// 获取所有提示词模板
exports.getPromptTemplates = async (req, res, next) => {
  try {
    const templates = await promptTemplateService.getPromptTemplates(req.query);
    res.status(200).json(templates);
  } catch (error) {
    next(error);
  }
};

// 通过ID获取单个提示词模板
exports.getPromptTemplateById = async (req, res, next) => {
  try {
    const template = await promptTemplateService.getPromptTemplateById(req.params.id);
    res.status(200).json(template);
  } catch (error) {
    next(error);
  }
};

// 更新提示词模板
exports.updatePromptTemplate = async (req, res, next) => {
  try {
    const updatedTemplate = await promptTemplateService.updatePromptTemplate(
      req.params.id,
      req.body
    );
    res.status(200).json(updatedTemplate);
  } catch (error) {
    next(error);
  }
};

// 删除提示词模板
exports.deletePromptTemplate = async (req, res, next) => {
  try {
    await promptTemplateService.deletePromptTemplate(req.params.id);
    res.status(200).json({ message: 'Prompt template deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// 复制提示词模板
exports.copyTemplate = async (req, res, next) => {
  try {
    const newTemplate = await promptTemplateService.copyTemplate(req.params.id);
    res.status(201).json(newTemplate);
  } catch (error) {
    next(error);
  }
};

// 预览提示词模板
exports.previewTemplate = async (req, res, next) => {
  try {
    const { variable_values = {} } = req.body || {};
    const result = await promptTemplateService.previewTemplate(
      req.params.id,
      variable_values
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
