const projectService = require('../services/projectService');

/**
 * 创建项目
 */
exports.createProject = async (req, res, next) => {
  try {
    const result = await projectService.createProject(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取单个项目
 */
exports.getProjectById = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    res.json({ data: project });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有项目
 */
exports.getAllProjects = async (req, res, next) => {
  try {
    const { is_template: isTemplateQuery } = req.query;
    if (typeof isTemplateQuery !== 'undefined') {
      const normalized = String(isTemplateQuery).toLowerCase();
      if (['1', 'true', 'yes'].includes(normalized)) {
        const templates = await projectService.getAllTemplates();
        return res.json({ data: templates });
      }
      if (['0', 'false', 'no'].includes(normalized)) {
        const projects = await projectService.getAllProjects();
        return res.json({ data: projects });
      }
      const error = new Error('Invalid is_template query value');
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }

    const projects = await projectService.getAllProjects();
    res.json({ data: projects });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有模板
 */
exports.getAllTemplates = async (req, res, next) => {
  try {
    const templates = await projectService.getAllTemplates();
    res.json({ data: templates });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新项目
 */
exports.updateProject = async (req, res, next) => {
  try {
    const result = await projectService.updateProject(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * 删除项目
 */
exports.deleteProject = async (req, res, next) => {
  try {
    const result = await projectService.deleteProject(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
