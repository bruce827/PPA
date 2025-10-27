const promptTemplateModel = require('../models/promptTemplateModel');

// 创建提示词模板
exports.createPromptTemplate = async (req, res) => {
  const { template_name, category, system_prompt, user_prompt_template } = req.body;
  if (!template_name || !category || !system_prompt || !user_prompt_template) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const newTemplate = await promptTemplateModel.create(req.body);
    res.status(201).json(newTemplate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 获取所有提示词模板
exports.getPromptTemplates = async (req, res) => {
  try {
    const templates = await promptTemplateModel.getAll(req.query);
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 通过ID获取单个提示词模板
exports.getPromptTemplateById = async (req, res) => {
  try {
    const template = await promptTemplateModel.getById(req.params.id);
    if (template) {
      res.status(200).json(template);
    } else {
      res.status(404).json({ message: 'Template not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 更新提示词模板
exports.updatePromptTemplate = async (req, res) => {
  try {
    const template = await promptTemplateModel.getById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    if (template.is_system) {
      return res.status(403).json({ message: 'System templates cannot be modified' });
    }

    const updatedTemplate = await promptTemplateModel.update(req.params.id, req.body);
    res.status(200).json(updatedTemplate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 删除提示词模板
exports.deletePromptTemplate = async (req, res) => {
  try {
    const template = await promptTemplateModel.getById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    if (template.is_system) {
      return res.status(403).json({ message: 'System templates cannot be deleted' });
    }

    await promptTemplateModel.delete(req.params.id);
    res.status(200).json({ message: 'Prompt template deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 复制提示词模板
exports.copyTemplate = async (req, res) => {
  try {
    const newTemplate = await promptTemplateModel.copy(req.params.id);
    res.status(201).json(newTemplate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};