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

  // 动态读取展示方式白名单（来自"展示方式选项" sheet）
  const optionsSheet = workbook.getWorksheet("展示方式选项");
  const validDisplayTypes = [];
  if (optionsSheet) {
    optionsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const val = row.getCell(1).value?.toString().trim();
      if (val && rowNumber > 0) {
        validDisplayTypes.push(val);
      }
    });
  }

  // 如果没有找到或为空，使用内置的 DISPLAY_TYPES 作为降级备份
  const finalDisplayTypes = validDisplayTypes.length > 0 ? validDisplayTypes : DISPLAY_TYPES;

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

  // 解析数据行与状态机填补 (ffill平替)
  const items = [];
  const errors = [];
  let rowCount = 0;

  // 状态机，用于合并单元格的向下前向填补 (ffill)
  let currentApplication = '';
  let currentModuleName = '';
  let currentSceneL1 = '';
  let currentSceneL2 = '';

  const seenCombos = new Set(); // 用于四元组跨行唯一性校验 (D01)

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

    // a. 提取这一行已填的物理格数据
    row.eachCell((cell, colNumber) => {
      const fieldName = headers[colNumber];
      if (fieldName) {
        item[fieldName] = cell.value?.toString().trim() || '';
      }
    });

    // 过滤全空行
    const hasValues = Object.keys(item).some(k => item[k] !== '');
    if (!hasValues) {
      return;
    }

    // b. 状态机合并单元格值前向继承 (ffill平替)与空格彻底去噪
    if (item.application) currentApplication = item.application;
    if (item.module_name) currentModuleName = item.module_name;
    if (item.scene_l1) currentSceneL1 = item.scene_l1;
    if (item.scene_l2) currentSceneL2 = item.scene_l2;

    // 填补
    item.application = currentApplication;
    item.module_name = currentModuleName;
    item.scene_l1 = currentSceneL1;
    item.scene_l2 = currentSceneL2;

    // c. 校验必填字段
    for (const field of requiredFields) {
      if (!item[field]) {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} (经单元格填补后) 不能为空`,
        });
        hasError = true;
      }
    }

    // d. 校验展示方式
    if (item.display_type && !finalDisplayTypes.includes(item.display_type)) {
      errors.push({
        row: rowNumber,
        field: 'display_type',
        message: `无效的展示方式: "${item.display_type}"，可选范围为: [${finalDisplayTypes.join(', ')}]`,
      });
      hasError = true;
    }

    // e. 跨行唯一性校验 (D01) - 如果必填项都没问题，检查是否四元组重复
    if (!hasError) {
      const comboKey = `${item.module_name}-${item.scene_l1}-${item.scene_l2}-${item.metric_name}`;
      if (seenCombos.has(comboKey)) {
        errors.push({
          row: rowNumber,
          field: 'metric_name',
          message: `指标节点四元组组合产生重复，可能导致大屏原型ID冲突: "${comboKey}"`,
        });
        hasError = true;
      } else {
        seenCombos.add(comboKey);
      }
    }

    // f. 采集周期缺失的弱填补与警告（在此不阻断，自动处理）
    if (!item.collection_cycle) {
      item.collection_cycle = '日';
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

// =========================================================================
// ========== Agent 专享 & 模板双向转化业务扩展 (Antigravity 改造版) ==========
// =========================================================================

/**
 * 获取极简紧凑的 Agent 友好型指标树大纲 (支持 Markdown/JSON 两种格式)
 */
exports.getAgentContext = async (projectId, format = 'json') => {
  const project = await dataMetricsModel.getProjectById(projectId);
  if (!project) {
    const err = new Error('数据指标项目不存在');
    err.statusCode = 404;
    throw err;
  }

  // 1. 获取该项目下的所有扁平指标
  const metrics = await dataMetricsModel.getAll({ dmProjectId: projectId });
  
  // 2. 如果请求格式为 Markdown，则生成极低 Token、超强语义树
  if (format === 'markdown') {
    let md = `# 项目大屏指标大纲: ${project.project_name} (ID: ${projectId})\n\n`;
    const moduleMap = new Map();

    metrics.forEach(m => {
      const modName = m.module_name || '未定义模块';
      const s1Name = m.scene_l1 || '未定义一级场景';
      const s2Name = m.scene_l2 || '';
      
      const renderTypeMap = {
        '统计数据': 'KPI_CARD', '柱状图': 'BAR_CHART', '条形图': 'HORIZONTAL_BAR',
        '折线图': 'LINE_CHART', '饼图': 'PIE_CHART', '表格': 'TABLE', '地图': 'MAP', '视频': 'VIDEO'
      };
      const displayType = renderTypeMap[m.display_type] || 'KPI_CARD';
      const colorAlert = /红|绿|警|差|异|超限|超压/.test((m.algorithm || '') + (m.data_source_logic || '')) ? '有预警警示' : '无';

      if (!moduleMap.has(modName)) moduleMap.set(modName, new Map());
      const sceneMap = moduleMap.get(modName);
      const comboKey = `${s1Name}##${s2Name}`;

      if (!sceneMap.has(comboKey)) sceneMap.set(comboKey, []);
      sceneMap.get(comboKey).push(`- 指标: ${m.metric_name} | 展示: ${displayType} | 周期: ${m.collection_cycle || '日'} | 预警: ${colorAlert}`);
    });

    for (const [modName, sceneMap] of moduleMap.entries()) {
      md += `## 模块: ${modName}\n`;
      for (const [comboKey, metricsList] of sceneMap.entries()) {
        const [s1Name, s2Name] = comboKey.split('##');
        md += `### 一级场景: ${s1Name} ${s2Name ? '| 二级场景: ' + s2Name : ''}\n`;
        md += metricsList.join('\n') + '\n\n';
      }
    }
    return md;
  }

  // 3. 否则默认组装极简树状 JSON
  const moduleMap = new Map();
  metrics.forEach(m => {
    const modName = m.module_name || '未定义模块';
    const s1Name = m.scene_l1 || '未定义一级场景';
    const s2Name = m.scene_l2 || '';
    
    const renderTypeMap = {
      '统计数据': 'KPI_CARD', '柱状图': 'BAR_CHART', '条形图': 'HORIZONTAL_BAR',
      '折线图': 'LINE_CHART', '饼图': 'PIE_CHART', '表格': 'TABLE', '地图': 'MAP', '视频': 'VIDEO'
    };
    const displayType = renderTypeMap[m.display_type] || 'KPI_CARD';
    const colorAlert = /红|绿|警|差|异|超限|超压/.test((m.algorithm || '') + (m.data_source_logic || ''));

    if (!moduleMap.has(modName)) moduleMap.set(modName, new Map());
    const sceneMap = moduleMap.get(modName);
    const comboKey = `${s1Name}##${s2Name}`;

    if (!sceneMap.has(comboKey)) sceneMap.set(comboKey, []);
    sceneMap.get(comboKey).push({
      name: m.metric_name,
      type: displayType,
      cycle: m.collection_cycle || '日',
      colorAlert
    });
  });

  const tree = [];
  for (const [modName, sceneMap] of moduleMap.entries()) {
    const scenes = [];
    for (const [comboKey, metricsList] of sceneMap.entries()) {
      const [s1Name, s2Name] = comboKey.split('##');
      scenes.push({ sceneL1: s1Name, sceneL2: s2Name, metrics: metricsList });
    }
    tree.push({ module: modName, scenes });
  }

  return { projectId, projectName: project.project_name, tree };
};

/**
 * 自动计算并生成 12 栅格 Canvas 推荐组件排版布局 (Grid Layout Generator DSL)
 */
exports.generateAgentLayout = async (projectId) => {
  const project = await dataMetricsModel.getProjectById(projectId);
  if (!project) {
    const err = new Error('数据指标项目不存在');
    err.statusCode = 404;
    throw err;
  }

  const metrics = await dataMetricsModel.getAll({ dmProjectId: projectId });
  const layout = [];
  
  // 按照模块进行栅格自适应布局分配
  const moduleGroups = {};
  metrics.forEach(m => {
    const mod = m.module_name || '公共大屏';
    if (!moduleGroups[mod]) moduleGroups[mod] = [];
    moduleGroups[mod].push(m);
  });

  const gridSizes = {
    '统计数据': { w: 3, h: 2 }, // 小型卡片
    '视频': { w: 3, h: 2 },
    '柱状图': { w: 6, h: 4 },   // 中型图表
    '条形图': { w: 6, h: 4 },
    '折线图': { w: 6, h: 4 },
    '饼图': { w: 4, h: 4 },
    '表格': { w: 12, h: 5 },   // 大型容器
    '地图': { w: 12, h: 6 }
  };

  const componentHints = {
    '统计数据': 'ECharts翻牌器',
    '柱状图': 'ECharts柱状图',
    '条形图': 'ECharts条形图',
    '折线图': 'ECharts折线图',
    '饼图': 'ECharts饼图',
    '表格': 'AntD自适应表格',
    '地图': 'Web3D/GeoJSON三维地图',
    '视频': '流媒体播放组件'
  };

  Object.keys(moduleGroups).forEach(modName => {
    const groupMetrics = moduleGroups[modName];
    let currentX = 0;
    let currentY = 0;
    let maxHeightInRow = 0;

    groupMetrics.forEach(m => {
      const size = gridSizes[m.display_type] || { w: 4, h: 4 };
      
      // 换行控制：在 12 栅格中，如果当前行放不下了
      if (currentX + size.w > 12) {
        currentX = 0;
        currentY += maxHeightInRow;
        maxHeightInRow = 0;
      }

      layout.push({
        metric_id: m.id,
        metric_name: m.metric_name,
        module_name: modName,
        scene_l1: m.scene_l1,
        display_type: m.display_type,
        grid: {
          x: currentX,
          y: currentY,
          w: size.w,
          h: size.h
        },
        component_hint: componentHints[m.display_type] || '通用图表容器'
      });

      currentX += size.w;
      if (size.h > maxHeightInRow) {
        maxHeightInRow = size.h;
      }
    });
  });

  return { projectId, projectName: project.project_name, layout };
};

/**
 * 外部 Agent 反馈与布局坐标双向写入回写
 */
exports.saveAgentFeedback = async (projectId, layoutArray, web3dSettings) => {
  const project = await dataMetricsModel.getProjectById(projectId);
  if (!project) {
    const err = new Error('数据指标项目不存在');
    err.statusCode = 404;
    throw err;
  }

  // 1. 如果有 3D 参数，更新大屏项目配置表的 3D 属性 (安全写进 project_desc，防止无 remark 列报错并保持完整性)
  if (web3dSettings) {
    const updatedSettings = JSON.stringify(web3dSettings);
    const originalDesc = project.project_desc || '';
    const cleanedDesc = originalDesc.replace(/\[Agent-3D-Synced\].*?$/g, '').trim();
    
    await dataMetricsModel.updateProject(projectId, {
      project_name: project.project_name,
      linked_project_id: project.linked_project_id,
      project_desc: `${cleanedDesc}\n[Agent-3D-Synced] ${new Date().toISOString().slice(0,10)} 3D模型参数已同步。配置：${updatedSettings}`.trim()
    });
  }

  // 2. 批量将组件布局网格坐标更新回具体的 data_metrics 表中 (存入备注中)
  let updatedCount = 0;
  if (Array.isArray(layoutArray)) {
    for (const item of layoutArray) {
      if (item.metric_name && item.grid) {
        // 更新 data_metrics 对应指标的备注或自定义布局列
        const metrics = await dataMetricsModel.getAll({ dmProjectId: projectId });
        const target = metrics.find(m => m.metric_name === item.metric_name);
        if (target) {
          const layoutStr = `[Grid: x=${item.grid.x}, y=${item.grid.y}, w=${item.grid.w}, h=${item.grid.h}]`;
          const originalRemark = target.remark || '';
          const cleanedRemark = originalRemark.replace(/\[Grid:.*?\]/g, '').trim();
          
          await dataMetricsModel.update(target.id, {
            remark: `${cleanedRemark} ${layoutStr}`.trim()
          });
          updatedCount++;
        }
      }
    }
  }

  return {
    projectId,
    updatedCount,
    web3dSynced: !!web3dSettings
  };
};

/**
 * 将大屏指标项目一键自动转化为 PPA 成本估算模板 (业务闭环)
 */
exports.convertToPpaTemplate = async (projectId) => {
  const project = await dataMetricsModel.getProjectById(projectId);
  if (!project) {
    const err = new Error('数据指标项目不存在');
    err.statusCode = 404;
    throw err;
  }

  const metrics = await dataMetricsModel.getAll({ dmProjectId: projectId });
  if (metrics.length === 0) {
    const err = new Error('该大屏指标项目内无任何指标，无法生成估算底座');
    err.statusCode = 400;
    throw err;
  }

  // 1. 核心映射逻辑：根据不同大图展示方式自动折算其所需要的前后端研发人天
  const defaultWorkloads = {
    '统计数据': { '前端工程师': 0.5, '后端工程师': 0.5 },
    '视频': { '前端工程师': 0.5, '后端工程师': 0.5 },
    '柱状图': { '前端工程师': 1.0, '后端工程师': 1.0 },
    '条形图': { '前端工程师': 1.0, '后端工程师': 1.0 },
    '折线图': { '前端工程师': 1.0, '后端工程师': 1.0 },
    '饼图': { '前端工程师': 1.0, '后端工程师': 1.0 },
    '表格': { '前端工程师': 2.0, '后端工程师': 2.0 },
    '地图': { '前端工程师': 2.5, '后端工程师': 2.0 }
  };

  // 2. 统计各角色累计工作量
  const roleWorkloadSummary = { '前端工程师': 0, '后端工程师': 0 };
  metrics.forEach(m => {
    const rules = defaultWorkloads[m.display_type] || { '前端工程师': 1.0, '后端工程师': 1.0 };
    Object.keys(rules).forEach(role => {
      roleWorkloadSummary[role] += rules[role];
    });
  });

  const developmentWorkloadRows = [];
  Object.keys(roleWorkloadSummary).forEach(role => {
    developmentWorkloadRows.push({
      role_name: role,
      workload_days: roleWorkloadSummary[role],
      delivery_factor: 1.0
    });
  });

  // 3. 构造 PPA 统一的 assessment_details_json 快照
  const rolesWithPrice = [
    { role_name: '前端工程师', unit_price: 1800 },
    { role_name: '后端工程师', unit_price: 2000 }
  ];

  const assessmentDetails = {
    project_info: {
      name: `【大屏导入模板】${project.project_name}`,
      description: `导入自大屏数据指标清单: ${project.project_name}，内含 ${metrics.length} 项图元指标`
    },
    risk_scores: {}, 
    roles: rolesWithPrice,
    development_workload: developmentWorkloadRows,
    travel_cost: { cities: [] },
    maintenance_cost: { duration_months: 12, cost_per_month: 0 },
    iot_point_integration: null
  };

  // 4. 调用 PPA 原生 projectModel 写入数据库，并置 is_template = 1
  const projectModel = require('../models/projectModel');
  const ppaTemplate = await projectModel.createProject({
    name: `【大屏导入】${project.project_name}`,
    description: `由大屏数据指标项目 (ID: ${projectId}) 自动重构转化，内含 ${metrics.length} 条指标开发工作。`,
    is_template: 1, 
    assessment_details_json: JSON.stringify(assessmentDetails)
  });

  return {
    ppaTemplateId: ppaTemplate.id,
    ppaTemplateName: ppaTemplate.name,
    mappedMetricsCount: metrics.length,
    initialEstimatedWorkload: `${roleWorkloadSummary['前端工程师'] + roleWorkloadSummary['后端工程师']} 人天`
  };
};

/**
 * 完整 indicators 扁平 JSON 列表无状态获取
 */
exports.exportToJson = async (projectId) => {
  const project = await dataMetricsModel.getProjectById(projectId);
  if (!project) {
    const err = new Error('数据指标项目不存在');
    err.statusCode = 404;
    throw err;
  }
  return dataMetricsModel.getAll({ dmProjectId: projectId });
};
