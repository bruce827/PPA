const projectModel = require('../models/projectModel');
const calculationService = require('./calculationService');

/**
 * 创建项目（包含完整计算）
 */
const createProject = async (projectData) => {
  const { name, description, is_template, assessmentData } = projectData;

  // 执行完整计算
  const calculation = await calculationService.calculateProjectCost(assessmentData);

  // 准备数据库数据
  const dbData = {
    name,
    description,
    is_template,
    final_total_cost: calculation.total_cost,
    final_risk_score: calculation.risk_score,
    final_workload_days: calculation.total_workload_days,
    assessment_details_json: JSON.stringify(assessmentData)
  };

  // 保存到数据库
  return await projectModel.createProject(dbData);
};

/**
 * 更新项目（包含完整计算）
 */
const updateProject = async (id, projectData) => {
  const { name, description, is_template, assessmentData } = projectData;

  // 执行完整计算
  const calculation = await calculationService.calculateProjectCost(assessmentData);

  // 准备数据库数据
  const dbData = {
    name,
    description,
    is_template,
    final_total_cost: calculation.total_cost,
    final_risk_score: calculation.risk_score,
    final_workload_days: calculation.total_workload_days,
    assessment_details_json: JSON.stringify(assessmentData)
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
const getAllProjects = async () => {
  return await projectModel.getAllProjects();
};

/**
 * 获取所有模板
 */
const getAllTemplates = async () => {
  return await projectModel.getAllTemplates();
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
  getAllTemplates,
  deleteProject
};
