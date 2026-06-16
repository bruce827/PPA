/**
 * 数据指标设计 - 业务逻辑层
 * 包含业务逻辑、Excel导入导出、数据校验
 */

const dataMetricsModel = require('../models/dataMetricsModel');
const ExcelJS = require('exceljs');

// ========== 展示方式枚举 ==========
const DISPLAY_TYPES = [
  '统计数据', '柱状图', '条形图', '折线图', '饼图', '表格', '地图', '视频'
];

// ========== Excel导入限制 ==========
const MAX_EXCEL_ROWS = 10000; // 最大导入行数

// ========== Excel列映射 ==========
const EXCEL_FIELD_MAP = {
  '所属应用': 'application',
  '功能模块': 'module_name',
  '一级场景': 'scene_l1',
  '二级场景': 'scene_l2',
  '指标/数据项': 'metric_name',
  '展示方式': 'display_type',
  '取数逻辑': 'data_source_logic',
  '算法': 'algorithm',
  '采集周期': 'collection_cycle',
  '数据来源系统': 'source_system',
  '数据来源功能模块': 'source_module',
  '对接方式': 'integration_method',
  '备注': 'remark',
};

// ========== 项目 CRUD ==========

exports.getAllProjects = async () => {
  return dataMetricsModel.getAllProjects();
};

exports.getProjectById = async (id) => {
  const project = await dataMetricsModel.getProjectById(id);
  if (!project) {
    const err = new Error('数据指标项目不存在');
    err.statusCode = 404;
    throw err;
  }
  return project;
};

exports.createProject = async (data) => {
  if (!data.project_name) {
    const err = new Error('项目名称不能为空');
    err.statusCode = 400;
    throw err;
  }
  return dataMetricsModel.createProject(data);
};

exports.updateProject = async (id, data) => {
  const existing = await dataMetricsModel.getProjectById(id);
  if (!existing) {
    const err = new Error('数据指标项目不存在');
    err.statusCode = 404;
    throw err;
  }
  if (!data.project_name) {
    const err = new Error('项目名称不能为空');
    err.statusCode = 400;
    throw err;
  }
  return dataMetricsModel.updateProject(id, data);
};

exports.deleteProject = async (id) => {
  const existing = await dataMetricsModel.getProjectById(id);
  if (!existing) {
    const err = new Error('数据指标项目不存在');
    err.statusCode = 404;
    throw err;
  }
  return dataMetricsModel.deleteProject(id);
};

// ========== 指标列表查询 ==========

exports.getList = async (filters) => {
  const { dmProjectId, moduleName, sceneL1, sceneL2, displayType, keyword, page, pageSize } = filters;
  
  // 构建查询条件
  const conditions = [];
  const params = [];

  if (dmProjectId) {
    conditions.push('dm_project_id = ?');
    params.push(dmProjectId);
  }
  if (moduleName) {
    conditions.push('module_name = ?');
    params.push(moduleName);
  }
  if (sceneL1) {
    conditions.push('scene_l1 = ?');
    params.push(sceneL1);
  }
  if (sceneL2) {
    conditions.push('scene_l2 = ?');
    params.push(sceneL2);
  }
  if (displayType) {
    conditions.push('display_type = ?');
    params.push(displayType);
  }
  if (keyword) {
    conditions.push('(metric_name LIKE ? OR data_source_logic LIKE ? OR algorithm LIKE ? OR remark LIKE ?)');
    const likeKeyword = `%${keyword}%`;
    params.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 查询总数
  const countResult = await dataMetricsModel.count(whereClause, params);
  const total = countResult.total;

  // 查询数据
  const offset = (page - 1) * pageSize;
  const items = await dataMetricsModel.getList(whereClause, params, pageSize, offset);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};

// ========== 单条指标操作 ==========

exports.getById = async (id) => {
  const metric = await dataMetricsModel.getById(id);
  if (!metric) {
    const err = new Error('数据指标不存在');
    err.statusCode = 404;
    throw err;
  }
  return metric;
};

exports.create = async (data) => {
  // 校验必填字段
  const required = ['dm_project_id', 'module_name', 'scene_l1', 'scene_l2', 'metric_name', 'display_type'];
  for (const field of required) {
    if (!data[field]) {
      const err = new Error(`${field} 不能为空`);
      err.statusCode = 400;
      throw err;
    }
  }

  // 校验展示方式
  if (!DISPLAY_TYPES.includes(data.display_type)) {
    const err = new Error(`无效的展示方式: ${data.display_type}，有效值: ${DISPLAY_TYPES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  return dataMetricsModel.create(data);
};

exports.update = async (id, data) => {
  const existing = await dataMetricsModel.getById(id);
  if (!existing) {
    const err = new Error('数据指标不存在');
    err.statusCode = 404;
    throw err;
  }

  // 校验展示方式
  if (data.display_type && !DISPLAY_TYPES.includes(data.display_type)) {
    const err = new Error(`无效的展示方式: ${data.display_type}，有效值: ${DISPLAY_TYPES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  return dataMetricsModel.update(id, data);
};

exports.remove = async (id) => {
  const existing = await dataMetricsModel.getById(id);
  if (!existing) {
    const err = new Error('数据指标不存在');
    err.statusCode = 404;
    throw err;
  }

  return dataMetricsModel.remove(id);
};

// ========== 批量操作 ==========

exports.batch = async (action, ids, data) => {
  if (action === 'delete') {
    return dataMetricsModel.batchDelete(ids);
  }
  if (action === 'update') {
    return dataMetricsModel.batchUpdate(ids, data);
  }
  const err = new Error(`不支持的操作: ${action}`);
  err.statusCode = 400;
  throw err;
};

// ========== 统计 ==========

exports.getStats = async (dmProjectId) => {
  return dataMetricsModel.getStats(dmProjectId);
};

// ========== Excel导入 ==========

exports.previewImport = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // 查找"数据指标明细统计" sheet
  let targetSheet = null;
  workbook.eachSheet((worksheet, sheetId) => {
    if (worksheet.name.includes('数据指标明细') || worksheet.name.includes('指标明细')) {
      targetSheet = worksheet;
    }
  });

  // 如果没找到，使用第一个sheet
  if (!targetSheet) {
    targetSheet = workbook.worksheets[0];
  }

  if (!targetSheet) {
    const err = new Error('Excel文件为空或格式不正确');
    err.statusCode = 400;
    throw err;
  }

  // 解析表头
  const headerRow = targetSheet.getRow(1);
  const headers = {};
  headerRow.eachCell((cell, colNumber) => {
    const headerName = cell.value?.toString().trim();
    if (headerName && EXCEL_FIELD_MAP[headerName]) {
      headers[colNumber] = EXCEL_FIELD_MAP[headerName];
    }
  });

  // 检查是否找到必要的列
  const foundFields = Object.values(headers);
  const requiredFields = ['module_name', 'scene_l1', 'scene_l2', 'metric_name', 'display_type'];
  const missingFields = requiredFields.filter(f => !foundFields.includes(f));
  
  if (missingFields.length > 0) {
    const err = new Error(`Excel缺少必要的列: ${missingFields.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // 解析数据行
  const items = [];
  const errors = [];
  let rowCount = 0;

  targetSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // 跳过表头
    
    // 检查行数限制
    rowCount++;
    if (rowCount > MAX_EXCEL_ROWS) {
      errors.push({
        row: rowNumber,
        field: 'general',
        message: `超出最大行数限制（${MAX_EXCEL_ROWS}行）`,
      });
      return;
    }

    const item = {};
    let hasError = false;

    row.eachCell((cell, colNumber) => {
      const fieldName = headers[colNumber];
      if (fieldName) {
        item[fieldName] = cell.value?.toString().trim() || '';
      }
    });

    // 跳过空行
    if (!item.module_name && !item.metric_name) {
      return;
    }

    // 校验必填字段
    for (const field of requiredFields) {
      if (!item[field]) {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} 不能为空`,
        });
        hasError = true;
      }
    }

    // 校验展示方式
    if (item.display_type && !DISPLAY_TYPES.includes(item.display_type)) {
      errors.push({
        row: rowNumber,
        field: 'display_type',
        message: `无效的展示方式: ${item.display_type}，有效值: ${DISPLAY_TYPES.join(', ')}`,
      });
      hasError = true;
    }

    if (!hasError) {
      items.push(item);
    }
  });

  return {
    sheetName: targetSheet.name,
    totalRows: items.length + errors.length,
    validCount: items.length,
    errorCount: errors.length,
    items,
    errors,
  };
};

exports.confirmImport = async (dmProjectId, mode, items) => {
  if (mode === 'overwrite') {
    // 清空当前项目的数据
    const deleteResult = await dataMetricsModel.deleteAllByProject(dmProjectId);
    console.log(`[DataMetrics] Overwrite mode: deleted ${deleteResult.deleted} records for project ${dmProjectId}`);
  }

  // 添加项目ID
  const itemsWithProject = items.map(item => ({
    ...item,
    dm_project_id: dmProjectId,
  }));

  // 批量插入
  const result = await dataMetricsModel.batchCreate(itemsWithProject);
  console.log(`[DataMetrics] Import completed: created=${result.created}, skipped=${result.skipped}`);

  return {
    imported: result.created,
    skipped: result.skipped,
  };
};

// ========== Excel导出 ==========

exports.exportToExcel = async (filters) => {
  // 查询数据
  const items = await dataMetricsModel.getAll(filters);
  
  // 验证导出数据
  const validatedItems = items.map(item => ({
    application: item.application || '',
    module_name: item.module_name || '',
    scene_l1: item.scene_l1 || '',
    scene_l2: item.scene_l2 || '',
    metric_name: item.metric_name || '',
    display_type: DISPLAY_TYPES.includes(item.display_type) ? item.display_type : '统计数据',
    data_source_logic: item.data_source_logic || '',
    algorithm: item.algorithm || '',
    collection_cycle: item.collection_cycle || '',
    source_system: item.source_system || '',
    source_module: item.source_module || '',
    integration_method: item.integration_method || '',
    remark: item.remark || '',
  }));

  // 创建工作簿
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PPA System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('数据指标明细统计');

  // 设置表头
  worksheet.columns = [
    { header: '所属应用', key: 'application', width: 15 },
    { header: '功能模块', key: 'module_name', width: 15 },
    { header: '一级场景', key: 'scene_l1', width: 15 },
    { header: '二级场景', key: 'scene_l2', width: 15 },
    { header: '指标/数据项', key: 'metric_name', width: 20 },
    { header: '展示方式', key: 'display_type', width: 12 },
    { header: '取数逻辑', key: 'data_source_logic', width: 30 },
    { header: '算法', key: 'algorithm', width: 30 },
    { header: '采集周期', key: 'collection_cycle', width: 10 },
    { header: '数据来源系统', key: 'source_system', width: 25 },
    { header: '数据来源功能模块', key: 'source_module', width: 25 },
    { header: '对接方式', key: 'integration_method', width: 12 },
    { header: '备注', key: 'remark', width: 20 },
  ];

  // 设置表头样式
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // 添加数据
  validatedItems.forEach(item => {
    worksheet.addRow(item);
  });

  // 设置边框
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  // 冻结首行
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // 生成buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

// ========== 场景分类 ==========

exports.getCategoryTree = async (dmProjectId) => {
  const categories = await dataMetricsModel.getAllCategories(dmProjectId);
  
  // 构建树形结构
  const modules = categories.filter(c => c.type === 'module');
  const scenesL1 = categories.filter(c => c.type === 'scene_l1');
  const scenesL2 = categories.filter(c => c.type === 'scene_l2');

  const tree = modules.map(mod => ({
    id: mod.id,
    name: mod.name,
    type: 'module',
    children: scenesL1
      .filter(s1 => s1.parent_id === mod.id)
      .map(s1 => ({
        id: s1.id,
        name: s1.name,
        type: 'scene_l1',
        children: scenesL2
          .filter(s2 => s2.parent_id === s1.id)
          .map(s2 => ({
            id: s2.id,
            name: s2.name,
            type: 'scene_l2',
          })),
      })),
  }));

  return tree;
};

exports.createCategory = async (data) => {
  // 校验类型
  const validTypes = ['module', 'scene_l1', 'scene_l2'];
  if (!validTypes.includes(data.type)) {
    const err = new Error(`无效的分类类型: ${data.type}，有效值: ${validTypes.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  // 校验名称
  if (!data.name || data.name.trim() === '') {
    const err = new Error('分类名称不能为空');
    err.statusCode = 400;
    throw err;
  }

  // 校验项目ID
  if (!data.dm_project_id) {
    const err = new Error('项目ID不能为空');
    err.statusCode = 400;
    throw err;
  }

  // scene_l1 必须有 parent_id（module的id）
  if (data.type === 'scene_l1' && !data.parent_id) {
    const err = new Error('一级场景必须关联功能模块');
    err.statusCode = 400;
    throw err;
  }

  // scene_l2 必须有 parent_id（scene_l1的id）
  if (data.type === 'scene_l2' && !data.parent_id) {
    const err = new Error('二级场景必须关联一级场景');
    err.statusCode = 400;
    throw err;
  }

  return dataMetricsModel.createCategory(data);
};

exports.updateCategory = async (id, data) => {
  const existing = await dataMetricsModel.getCategoryById(id);
  if (!existing) {
    const err = new Error('分类不存在');
    err.statusCode = 404;
    throw err;
  }

  // 校验名称
  if (data.name !== undefined && data.name.trim() === '') {
    const err = new Error('分类名称不能为空');
    err.statusCode = 400;
    throw err;
  }

  return dataMetricsModel.updateCategory(id, data);
};

exports.removeCategory = async (id) => {
  const existing = await dataMetricsModel.getCategoryById(id);
  if (!existing) {
    const err = new Error('分类不存在');
    err.statusCode = 404;
    throw err;
  }

  // 检查是否有关联的数据指标
  const count = await dataMetricsModel.countByCategory(id);
  if (count > 0) {
    const err = new Error(`该分类下存在 ${count} 条数据指标，无法删除`);
    err.statusCode = 400;
    throw err;
  }

  // 获取所有分类
  const allCategories = await dataMetricsModel.getAllCategories(existing.dm_project_id);
  
  // 检查是否有子分类
  const hasChildren = allCategories.some(c => c.parent_id === id);
  if (hasChildren) {
    const childType = existing.type === 'module' ? '一级场景' : '二级场景';
    const err = new Error(`该分类下存在${childType}，无法删除`);
    err.statusCode = 400;
    throw err;
  }

  // 如果是scene_l1，检查是否有scene_l2子分类
  if (existing.type === 'scene_l1') {
    const hasSceneL2 = allCategories.some(c => c.type === 'scene_l2' && c.parent_id === id);
    if (hasSceneL2) {
      const err = new Error('该一级场景下存在二级场景，无法删除');
      err.statusCode = 400;
      throw err;
    }
  }

  return dataMetricsModel.removeCategory(id);
};

// ========== 筛选选项 ==========

exports.getFilterOptions = async (dmProjectId) => {
  const [modules, scenesL1, scenesL2, displayTypes, cycles, systems] = await Promise.all([
    dataMetricsModel.getDistinctValues(dmProjectId, 'module_name'),
    dataMetricsModel.getDistinctValues(dmProjectId, 'scene_l1'),
    dataMetricsModel.getDistinctValues(dmProjectId, 'scene_l2'),
    dataMetricsModel.getDistinctValues(dmProjectId, 'display_type'),
    dataMetricsModel.getDistinctValues(dmProjectId, 'collection_cycle'),
    dataMetricsModel.getDistinctValues(dmProjectId, 'source_system'),
  ]);

  return {
    modules: modules.map(m => m.value),
    scenesL1: scenesL1.map(s => s.value),
    scenesL2: scenesL2.map(s => s.value),
    displayTypes: displayTypes.map(d => d.value),
    collectionCycles: cycles.map(c => c.value),
    sourceSystems: systems.map(s => s.value),
  };
};

// ========== 历史项目 ==========

exports.getLinkedProjects = async () => {
  return dataMetricsModel.getLinkedProjects();
};
