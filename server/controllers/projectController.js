const projectService = require('../services/projectService');

const ALLOWED_SORT_BY_FIELDS = new Set([
  'final_total_cost',
  'final_risk_score',
  'created_at',
]);

const normalizeSortOrder = (rawOrder) => {
  if (typeof rawOrder !== 'string') return 'desc';
  const normalized = rawOrder.toLowerCase();
  if (['asc', 'ascend', 'ascending'].includes(normalized)) return 'asc';
  if (['desc', 'descend', 'descending'].includes(normalized)) return 'desc';
  return 'desc';
};

const parseSortOptions = (query) => {
  const rawSortBy = query?.sort_by;
  if (typeof rawSortBy !== 'string' || !ALLOWED_SORT_BY_FIELDS.has(rawSortBy)) {
    return {};
  }
  return {
    sortBy: rawSortBy,
    sortOrder: normalizeSortOrder(query?.sort_order),
  };
};

const parseListOptions = (query) => {
  const options = { ...parseSortOptions(query) };
  if (typeof query?.name === 'string' && query.name.trim()) {
    options.name = query.name.trim();
  }
  if (typeof query?.final_risk_score !== 'undefined') {
    options.final_risk_score = query.final_risk_score;
  }
  if (typeof query?.final_total_cost_min !== 'undefined') {
    options.final_total_cost_min = query.final_total_cost_min;
  }
  if (typeof query?.final_total_cost_max !== 'undefined') {
    options.final_total_cost_max = query.final_total_cost_max;
  }
  if (typeof query?.created_at_start !== 'undefined') {
    options.created_at_start = query.created_at_start;
  }
  if (typeof query?.created_at_end !== 'undefined') {
    options.created_at_end = query.created_at_end;
  }
  return options;
};

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

    // 兜底补齐新增字段（ai_unmatched_risks / custom_risk_items），保持 assessment_details_json 为字符串返回
    if (project?.assessment_details_json) {
      try {
        const parsed = JSON.parse(project.assessment_details_json);
        const normalized = {
          ...parsed,
          ai_unmatched_risks: Array.isArray(parsed.ai_unmatched_risks)
            ? parsed.ai_unmatched_risks
            : [],
          custom_risk_items: Array.isArray(parsed.custom_risk_items)
            ? parsed.custom_risk_items
            : []
        };
        project.assessment_details_json = JSON.stringify(normalized);
      } catch (_e) {
        // 保持原样，避免因旧数据格式问题直接报错
      }
    }

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
    const listOptions = parseListOptions(req.query);
    const { is_template: isTemplateQuery } = req.query;
    if (typeof isTemplateQuery !== 'undefined') {
      const normalized = String(isTemplateQuery).toLowerCase();
      if (['1', 'true', 'yes'].includes(normalized)) {
        const templates = await projectService.getAllTemplates(listOptions);
        return res.json({ data: templates });
      }
      if (['0', 'false', 'no'].includes(normalized)) {
        const projects = await projectService.getAllProjects(listOptions);
        return res.json({ data: projects });
      }
      const error = new Error('Invalid is_template query value');
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }

    // 未传 is_template 时，返回所有项目（包含模板和正式项目）
    const projects = await projectService.getAllProjectsIncludingTemplates(listOptions);
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
    const listOptions = parseListOptions(req.query);
    const templates = await projectService.getAllTemplates(listOptions);
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
