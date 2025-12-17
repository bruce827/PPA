const projectModel = require('../models/projectModel');
const calculationService = require('./calculationService');
const { HttpError } = require('../utils/errors');

const normalizeAssessmentData = (assessmentData) => {
  if (!assessmentData || typeof assessmentData !== 'object') {
    throw new HttpError(400, 'assessmentData 必须是对象', 'ValidationError');
  }

  const normalized = { ...assessmentData };

  // AI 未匹配风险项：必须为数组，默认空数组
  if (normalized.ai_unmatched_risks === undefined) {
    normalized.ai_unmatched_risks = [];
  } else if (!Array.isArray(normalized.ai_unmatched_risks)) {
    throw new HttpError(400, 'AI 未匹配风险项必须为数组', 'ValidationError');
  }

  // 自定义风险项：必须为数组，默认空数组
  if (normalized.custom_risk_items === undefined) {
    normalized.custom_risk_items = [];
  } else if (!Array.isArray(normalized.custom_risk_items)) {
    throw new HttpError(400, '自定义风险项必须为数组', 'ValidationError');
  }

  return normalized;
};

/**
 * 创建项目（包含完整计算）
 */
const createProject = async (projectData) => {
  const { name, description, is_template, assessmentData } = projectData;

  // 若当前保存为模板，先清除其他项目上的模板标记，确保全局唯一
  if (is_template) {
    await projectModel.clearAllTemplateFlags();
  }

  const normalizedAssessment = normalizeAssessmentData(assessmentData);

  // 执行完整计算
  const calculation = await calculationService.calculateProjectCost(normalizedAssessment);

  // 准备数据库数据
  const dbData = {
    name,
    description,
    is_template,
    final_total_cost: calculation.total_cost,
    final_risk_score: calculation.risk_score,
    final_workload_days: calculation.total_workload_days,
    assessment_details_json: JSON.stringify(normalizedAssessment)
  };

  // 保存到数据库
  return await projectModel.createProject(dbData);
};

/**
 * 更新项目（包含完整计算）
 */
const updateProject = async (id, projectData) => {
  const { name, description, is_template, assessmentData } = projectData;

  // 若当前更新为模板，先清除其他项目上的模板标记，确保全局唯一
  if (is_template) {
    await projectModel.clearAllTemplateFlags();
  }

  const normalizedAssessment = normalizeAssessmentData(assessmentData);

  // 执行完整计算
  const calculation = await calculationService.calculateProjectCost(normalizedAssessment);

  // 准备数据库数据
  const dbData = {
    name,
    description,
    is_template,
    final_total_cost: calculation.total_cost,
    final_risk_score: calculation.risk_score,
    final_workload_days: calculation.total_workload_days,
    assessment_details_json: JSON.stringify(normalizedAssessment)
  };

  // 更新数据库
  return await projectModel.updateProject(id, dbData);
};

/**
 * 获取单个项目
 */
const getProjectById = async (id) => {
  const project = await projectModel.getProjectById(id);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }
  return project;
};

/**
 * 获取所有项目
 */
const getAllProjects = async (options = {}) => {
  return await projectModel.getAllProjects(options);
};

/**
 * 获取所有项目（包含模板和正式项目）
 */
const getAllProjectsIncludingTemplates = async (options = {}) => {
  return await projectModel.getAllProjectsIncludingTemplates(options);
};

/**
 * 获取所有模板
 */
const getAllTemplates = async (options = {}) => {
  return await projectModel.getAllTemplates(options);
};

/**
 * 删除项目
 */
const deleteProject = async (id) => {
  return await projectModel.deleteProject(id);
};

module.exports = {
  createProject,
  updateProject,
  getProjectById,
  getAllProjects,
  getAllProjectsIncludingTemplates,
  getAllTemplates,
  deleteProject
};
