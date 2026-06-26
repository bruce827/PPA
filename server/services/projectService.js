const projectModel = require('../models/projectModel');
const calculationService = require('./calculationService');
const { HttpError } = require('../utils/errors');

const normalizeTags = (raw) => {
  if (!Array.isArray(raw)) {
    throw new HttpError(400, 'tags 必须是数组', 'ValidationError');
  }

  const normalized = raw
    .map((t) => String(t == null ? '' : t).trim())
    .filter(Boolean);

  const unique = Array.from(new Set(normalized));
  const sliced = unique
    .slice(0, 30)
    .map((t) => (t.length > 30 ? t.slice(0, 30) : t));
  return sliced;
};

const safeParseJsonObject = (raw) => {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      return parsed;
    return {};
  } catch (_e) {
    return {};
  }
};

const normalizeBooleanFlagForDb = (value) => {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value === 1 ? 1 : 0;
  if (typeof value === 'string') {
    return ['1', 'true', 'yes'].includes(value.trim().toLowerCase()) ? 1 : 0;
  }
  return 0;
};

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

  if (
    normalized.iot_point_integration !== undefined &&
    (normalized.iot_point_integration === null ||
      typeof normalized.iot_point_integration !== 'object' ||
      Array.isArray(normalized.iot_point_integration))
  ) {
    throw new HttpError(
      400,
      'IoT 点位对接评估数据必须为对象',
      'ValidationError'
    );
  }

  if (normalized.iot_point_integration) {
    const iot = normalized.iot_point_integration;
    normalized.iot_point_integration = {
      ...iot,
      assumptions:
        iot.assumptions && typeof iot.assumptions === 'object'
          ? iot.assumptions
          : {},
      scale_params:
        iot.scale_params && typeof iot.scale_params === 'object'
          ? iot.scale_params
          : {},
      generated_items: Array.isArray(iot.generated_items)
        ? iot.generated_items
        : []
    };
  }

  return normalized;
};

/**
 * 创建项目（包含完整计算）
 */
const createProject = async (projectData) => {
  const { name, description, is_template, assessmentData, tags } = projectData;

  // 若当前保存为模板，先清除其他项目上的模板标记，确保全局唯一
  if (is_template) {
    await projectModel.clearAllTemplateFlags();
  }

  const normalizedAssessment = normalizeAssessmentData(assessmentData);

  if (typeof tags !== 'undefined') {
    const normalizedTags = normalizeTags(tags);
    normalizedAssessment.tags = normalizedTags;
  }

  // 执行完整计算
  const calculation = await calculationService.calculateProjectCost(
    normalizedAssessment
  );

  // 准备数据库数据
  const dbData = {
    name,
    description,
    is_template,
    final_total_cost: calculation.total_cost,
    final_risk_score: calculation.risk_score,
    final_workload_days: calculation.total_workload_days,
    assessment_details_json: JSON.stringify(normalizedAssessment),
    tags_json:
      typeof tags === 'undefined'
        ? undefined
        : JSON.stringify(normalizedAssessment.tags || normalizeTags(tags))
  };

  // 保存到数据库
  return await projectModel.createProject(dbData);
};

/**
 * 更新项目（包含完整计算）
 */
const updateProject = async (id, projectData) => {
  const { name, description, is_template, assessmentData, tags } = projectData;

  // 若当前更新为模板，先清除其他项目上的模板标记，确保全局唯一
  if (is_template) {
    await projectModel.clearAllTemplateFlags();
  }

  // 轻量更新：仅更新 tags（不触发重新计算），用于历史详情页标签编辑
  if (typeof assessmentData === 'undefined' && typeof tags !== 'undefined') {
    const project = await projectModel.getProjectById(id);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    const normalizedTags = normalizeTags(tags);
    const details = safeParseJsonObject(project.assessment_details_json);
    details.tags = normalizedTags;

    const updateFields = {
      tags_json: JSON.stringify(normalizedTags),
      assessment_details_json: JSON.stringify(details)
    };
    if (typeof is_template !== 'undefined') {
      updateFields.is_template = normalizeBooleanFlagForDb(is_template);
    }

    return await projectModel.updateProjectFields(id, updateFields);
  }

  const normalizedAssessment = normalizeAssessmentData(assessmentData);

  if (typeof tags !== 'undefined') {
    const normalizedTags = normalizeTags(tags);
    normalizedAssessment.tags = normalizedTags;
  }

  // 执行完整计算
  const calculation = await calculationService.calculateProjectCost(
    normalizedAssessment
  );

  // 准备数据库数据
  const dbData = {
    name,
    description,
    is_template,
    final_total_cost: calculation.total_cost,
    final_risk_score: calculation.risk_score,
    final_workload_days: calculation.total_workload_days,
    assessment_details_json: JSON.stringify(normalizedAssessment),
    tags_json:
      typeof tags === 'undefined'
        ? undefined
        : JSON.stringify(normalizeTags(tags))
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
