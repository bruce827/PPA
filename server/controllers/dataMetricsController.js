/**
 * 数据指标设计 - 控制器层
 * 处理HTTP请求，提取参数，调用Service层
 */

const dataMetricsService = require('../services/dataMetricsService');

// ========== 项目 CRUD ==========

exports.getProjects = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const projects = await dataMetricsService.getAllProjects();
    const durationMs = Date.now() - startedAt;
    console.log('Data metrics projects retrieved', { count: projects.length, durationMs });
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
};

exports.getProjectById = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { id } = req.params;
    const project = await dataMetricsService.getProjectById(parseInt(id));
    const durationMs = Date.now() - startedAt;
    console.log('Data metrics project retrieved', { id, durationMs });
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

exports.createProject = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const project = await dataMetricsService.createProject(req.body);
    const durationMs = Date.now() - startedAt;
    console.log('Data metrics project created', { id: project.id, durationMs });
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

exports.updateProject = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { id } = req.params;
    const project = await dataMetricsService.updateProject(parseInt(id), req.body);
    const durationMs = Date.now() - startedAt;
    console.log('Data metrics project updated', { id, durationMs });
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

exports.deleteProject = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { id } = req.params;
    await dataMetricsService.deleteProject(parseInt(id));
    const durationMs = Date.now() - startedAt;
    console.log('Data metrics project deleted', { id, durationMs });
    res.json({ success: true, data: { id: parseInt(id) } });
  } catch (error) {
    next(error);
  }
};

// ========== 统计 ==========

exports.getStats = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { dm_project_id } = req.query;
    const stats = await dataMetricsService.getStats(dm_project_id ? parseInt(dm_project_id) : undefined);
    const durationMs = Date.now() - startedAt;
    console.log('Data metrics stats retrieved', { durationMs });
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// ========== 筛选选项 ==========

exports.getFilterOptions = async (req, res, next) => {
  try {
    const { dm_project_id } = req.query;
    const options = await dataMetricsService.getFilterOptions(dm_project_id ? parseInt(dm_project_id) : undefined);
    res.json({ success: true, data: options });
  } catch (error) {
    next(error);
  }
};

// ========== 指标列表查询 ==========

exports.getList = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { dm_project_id, module_name, scene_l1, scene_l2, display_type, keyword, page = 1, pageSize = 20 } = req.query;
    
    const result = await dataMetricsService.getList({
      dmProjectId: dm_project_id ? parseInt(dm_project_id) : undefined,
      moduleName: module_name,
      sceneL1: scene_l1,
      sceneL2: scene_l2,
      displayType: display_type,
      keyword,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });

    const durationMs = Date.now() - startedAt;
    console.log('Data metrics list retrieved', { durationMs, total: result.total });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ========== 单条指标操作 ==========

exports.getById = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { id } = req.params;
    const metric = await dataMetricsService.getById(parseInt(id));
    const durationMs = Date.now() - startedAt;
    console.log('Data metric retrieved', { id, durationMs });
    res.json({ success: true, data: metric });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const metric = await dataMetricsService.create(req.body);
    const durationMs = Date.now() - startedAt;
    console.log('Data metric created', { id: metric.id, durationMs });
    res.status(201).json({ success: true, data: metric });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { id } = req.params;
    const metric = await dataMetricsService.update(parseInt(id), req.body);
    const durationMs = Date.now() - startedAt;
    console.log('Data metric updated', { id, durationMs });
    res.json({ success: true, data: metric });
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { id } = req.params;
    await dataMetricsService.remove(parseInt(id));
    const durationMs = Date.now() - startedAt;
    console.log('Data metric deleted', { id, durationMs });
    res.json({ success: true, data: { id: parseInt(id) } });
  } catch (error) {
    next(error);
  }
};

// ========== 批量操作 ==========

exports.batch = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { action, ids, data } = req.body;
    const result = await dataMetricsService.batch(action, ids, data);
    const durationMs = Date.now() - startedAt;
    console.log('Data metrics batch operation', { action, count: ids.length, durationMs });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ========== Excel导入导出 ==========

exports.importPreview = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请上传文件' });
    }

    console.log('Import preview started', { 
      filename: req.file.originalname, 
      size: req.file.size 
    });

    const result = await dataMetricsService.previewImport(req.file.buffer);
    const durationMs = Date.now() - startedAt;
    console.log('Import preview completed', { 
      validCount: result.validCount, 
      errorCount: result.errorCount, 
      durationMs 
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.importConfirm = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { dm_project_id, mode, data } = req.body;

    if (!dm_project_id) {
      return res.status(400).json({ success: false, error: '项目ID不能为空' });
    }

    if (!mode || !['append', 'overwrite'].includes(mode)) {
      return res.status(400).json({ success: false, error: '无效的导入模式' });
    }

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, error: '导入数据不能为空' });
    }

    console.log('Import confirm started', { dm_project_id, mode, count: data.length });

    const result = await dataMetricsService.confirmImport(parseInt(dm_project_id), mode, data);
    const durationMs = Date.now() - startedAt;
    console.log('Import completed', { imported: result.imported, skipped: result.skipped, durationMs });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.export = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { dm_project_id, module_name, scene_l1, display_type } = req.query;

    console.log('Export started', { dm_project_id, module_name, scene_l1, display_type });

    const buffer = await dataMetricsService.exportToExcel({
      dmProjectId: dm_project_id ? parseInt(dm_project_id) : undefined,
      moduleName: module_name,
      sceneL1: scene_l1,
      displayType: display_type,
    });

    const filename = `数据指标清单_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const durationMs = Date.now() - startedAt;
    console.log('Export completed', { filename, durationMs });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// ========== 场景分类 ==========

exports.getCategoryTree = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { dm_project_id } = req.query;
    if (!dm_project_id) {
      return res.status(400).json({ success: false, error: '项目ID不能为空' });
    }
    const tree = await dataMetricsService.getCategoryTree(parseInt(dm_project_id));
    const durationMs = Date.now() - startedAt;
    console.log('Category tree retrieved', { durationMs });
    res.json({ success: true, data: tree });
  } catch (error) {
    next(error);
  }
};

exports.createCategory = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const category = await dataMetricsService.createCategory(req.body);
    const durationMs = Date.now() - startedAt;
    console.log('Category created', { id: category.id, type: category.type, durationMs });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { id } = req.params;
    const category = await dataMetricsService.updateCategory(parseInt(id), req.body);
    const durationMs = Date.now() - startedAt;
    console.log('Category updated', { id, durationMs });
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

exports.removeCategory = async (req, res, next) => {
  const startedAt = Date.now();
  try {
    const { id } = req.params;
    await dataMetricsService.removeCategory(parseInt(id));
    const durationMs = Date.now() - startedAt;
    console.log('Category deleted', { id, durationMs });
    res.json({ success: true, data: { id: parseInt(id) } });
  } catch (error) {
    next(error);
  }
};

// ========== 历史项目 ==========

exports.getLinkedProjects = async (req, res, next) => {
  try {
    const projects = await dataMetricsService.getLinkedProjects();
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
};
