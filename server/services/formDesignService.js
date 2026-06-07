/**
 * 表单设计服务层
 * 包含业务逻辑，调用 Model 层
 */

const formDesignModel = require('../models/formDesignModel');

// ========== 数据校验规则 ==========
// 注意：以下枚举值（numberTypes、selectTypes、uploadTypes 等）与前端 constants.ts
// 手动保持同步，但两端不共享同一数据源。新增/修改输入类型时需同时更新两端。
// 前端定义位置：frontend/ppa_frontend/src/pages/FormDesign/constants.ts

/**
 * 校验单个字段
 * @param {Object} field - 字段数据
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateField(field) {
  const errors = [];
  const warnings = [];

  // R1: 数字类字段 → 必须用数字框
  const numberTypes = ['整型', '长整型', '单精度数字', '双精度数字', 'int', 'bigint', 'float', 'double'];
  if (numberTypes.includes(field.field_type)) {
    if (field.input_type !== '数字框' && field.input_type_code !== 'number') {
      errors.push(`R1: 数字类字段必须使用数字框，当前使用: ${field.input_type}`);
    }
  }

  // R2: 日期/时间类字段 → 控件匹配
  if (field.field_type === '日期' || field.field_type === 'date') {
    if (field.input_type !== '日期选择器' && field.input_type_code !== 'selectorDate') {
      errors.push(`R2: 日期类型字段应使用日期选择器，当前使用: ${field.input_type}`);
    }
  }
  if (field.field_type === '日期时间' || field.field_type === 'datetime') {
    if (field.input_type !== '时间选择器' && field.input_type_code !== 'selectorTime') {
      errors.push(`R2: 时间类型字段应使用时间选择器，当前使用: ${field.input_type}`);
    }
  }

  // R3: 有输入参数 → 必须是选择类控件
  let hasInputParams = false;
  if (field.input_params) {
    try {
      const parsed = typeof field.input_params === 'string' ? JSON.parse(field.input_params) : field.input_params;
      if (parsed && typeof parsed === 'object') {
        hasInputParams = Array.isArray(parsed) ? parsed.length > 0 : Object.keys(parsed).length > 0;
      }
    } catch {
      hasInputParams = !!field.input_params;
    }
  }
  if (hasInputParams) {
    const selectTypes = ['下拉选择器', '下拉树形选择器', '弹出选择器', '单选框', '复选框'];
    const selectCodes = ['selectorDropdown', 'selectorDropdownTree', 'selectorPopup', 'radioBox', 'checkBox'];
    if (!selectTypes.includes(field.input_type) && !selectCodes.includes(field.input_type_code)) {
      errors.push(`R3: 有输入参数的字段必须使用选择类控件，当前使用: ${field.input_type}`);
    }
  }

  // R4: 上传类控件 → 字段类型约束
  const uploadTypes = ['图片上传', '文件上传', '附件上传（Word）'];
  const uploadCodes = ['uploadImage', 'uploadFile', 'uploadFile(word)'];
  if (uploadTypes.includes(field.input_type) || uploadCodes.includes(field.input_type_code)) {
    const validFieldTypes = ['varchar', 'text', '字符', '文本'];
    if (!validFieldTypes.includes(field.field_type)) {
      errors.push(`R4: 上传类控件字段类型应为 varchar/text，当前: ${field.field_type}`);
    }
    if (!field.field_length || field.field_length < 255) {
      errors.push(`R4: 上传类控件字段长度应 >= 255，当前: ${field.field_length || '未填写'}`);
    }
  }

  // R5: 主键字段 → 四场景全隐藏
  if (field.is_primary_key) {
    if (field.add_control !== '隐藏' || field.update_control !== '隐藏' ||
        field.detail_control !== '隐藏' || field.list_control !== '隐藏') {
      errors.push(`R5: 主键字段应在所有场景下隐藏`);
    }
  }

  // R6: 系统字段 → 全隐藏
  const systemFields = ['creator', 'updater', 'dept_id', 'tenant_id', 'deleted',
    'create_time', 'update_time', 'create_by', 'update_by'];
  if (systemFields.includes(field.field_code)) {
    if (field.add_control !== '隐藏' || field.update_control !== '隐藏' ||
        field.detail_control !== '隐藏' || field.list_control !== '隐藏') {
      errors.push(`R6: 系统字段应在所有场景下隐藏`);
    }
  }

  // R7: 过滤器字段完整性
  if (field.is_filter) {
    if (!field.filter_mode) {
      errors.push(`R7: 标记为过滤器的字段必须填写过滤方式`);
    }
  }

  // R8: 小数类型必须填精度
  const decimalTypes = ['单精度数字', '双精度数字', 'float', 'double'];
  if (decimalTypes.includes(field.field_type)) {
    if (!field.field_precision || field.field_precision <= 0) {
      errors.push(`R8: 小数类型必须指定精度（如金额类通常填2）`);
    }
  }

  // R9: 读写字段必须有提示信息
  if (field.add_control === '读写' || field.update_control === '读写') {
    if (!field.placeholder) {
      errors.push(`R9: 可编辑字段必须填写提示信息，用于 placeholder 展示`);
    }
  }

  // W1: 字符 500+ 用文本框
  if (field.field_type === '字符' || field.field_type === 'varchar') {
    if (field.field_length >= 500 && (field.input_type === '文本框' || field.input_type_code === 'text')) {
      warnings.push(`W1: 长文本字段建议使用文本域(textArea)，当前使用文本框(text)`);
    }
  }

  // W4: 列表控制含 Excel 公式
  if (field.list_control && (field.list_control.includes('=') || field.list_control.includes('!'))) {
    warnings.push(`W4: 列表控制列包含 Excel 公式引用，应填入中文控制值`);
  }

  // W5: 只读字段补充列表排序
  if (field.list_control === '只读' && !field.list_sort) {
    warnings.push(`W5: 只读字段建议补充列表排序值，否则列顺序不确定`);
  }

  // W6: 精度值范围检查
  if (field.field_precision && (field.field_precision < 1 || field.field_precision > 6)) {
    warnings.push(`W6: 精度值建议范围 1~6，当前值: ${field.field_precision}，请确认是否正确`);
  }

  // W7: 提示信息长度检查
  if (field.placeholder && field.placeholder.length > 30) {
    warnings.push(`W7: 提示信息超过30字，建议精简或移至备注列`);
  }

  return { errors, warnings };
}

// ========== 统计 ==========

exports.getStats = async () => {
  return formDesignModel.getStats();
};

// ========== 校验 ==========

exports.validateField = (field) => {
  return validateField(field);
};

exports.validateForm = async (formId) => {
  const fields = await formDesignModel.getFieldsByFormId(formId);
  const results = [];

  for (const field of fields) {
    const { errors, warnings } = validateField(field);
    if (errors.length > 0 || warnings.length > 0) {
      results.push({
        field_id: field.id,
        field_name: field.field_name,
        field_code: field.field_code,
        errors,
        warnings
      });
    }
  }

  return {
    form_id: formId,
    total_fields: fields.length,
    passed_fields: fields.length - results.length,
    failed_fields: results.length,
    details: results
  };
};

// ========== 设计项目 CRUD ==========

exports.getAllProjects = async () => {
  return formDesignModel.getAllProjects();
};

exports.getProjectById = async (id) => {
  return formDesignModel.getProjectById(id);
};

exports.createProject = async (data) => {
  // 业务逻辑：如果关联了历史项目，可以在这里获取项目信息
  return formDesignModel.createProject(data);
};

exports.updateProject = async (id, data) => {
  // 检查项目是否存在
  const existing = await formDesignModel.getProjectById(id);
  if (!existing) {
    return null;
  }
  return formDesignModel.updateProject(id, data);
};

exports.deleteProject = async (id) => {
  // 检查项目是否存在
  const existing = await formDesignModel.getProjectById(id);
  if (!existing) {
    throw new Error('项目不存在');
  }
  return formDesignModel.deleteProject(id);
};

// ========== 应用 CRUD ==========

exports.getAppsByProjectId = async (projectId) => {
  return formDesignModel.getAppsByProjectId(projectId);
};

exports.createApp = async (data) => {
  // 检查 project_id 是否存在
  if (data.project_id) {
    const project = await formDesignModel.getProjectById(data.project_id);
    if (!project) {
      const err = new Error('关联的设计项目不存在');
      err.statusCode = 400;
      throw err;
    }
  }
  return formDesignModel.createApp(data);
};

exports.updateApp = async (id, data) => {
  // 检查应用是否存在
  const existing = await formDesignModel.getAppById(id);
  if (!existing) {
    return null;
  }
  return formDesignModel.updateApp(id, data);
};

exports.deleteApp = async (id) => {
  // 检查应用是否存在
  const existing = await formDesignModel.getAppById(id);
  if (!existing) {
    throw new Error('应用不存在');
  }
  return formDesignModel.deleteApp(id);
};

// ========== 表单 CRUD ==========

exports.getFormsByAppId = async (appId) => {
  return formDesignModel.getFormsByAppId(appId);
};

exports.createForm = async (data) => {
  // 检查 app_id 是否存在
  const app = await formDesignModel.getAppById(data.app_id);
  if (!app) {
    const err = new Error('关联的应用不存在');
    err.statusCode = 400;
    throw err;
  }
  return formDesignModel.createForm(data);
};

exports.updateForm = async (id, data) => {
  // 检查表单是否存在
  const existing = await formDesignModel.getFormById(id);
  if (!existing) {
    return null;
  }
  return formDesignModel.updateForm(id, data);
};

exports.deleteForm = async (id) => {
  // 检查表单是否存在
  const existing = await formDesignModel.getFormById(id);
  if (!existing) {
    throw new Error('表单不存在');
  }
  return formDesignModel.deleteForm(id);
};

// ========== 字段 CRUD ==========

exports.getFieldsByFormId = async (formId) => {
  return formDesignModel.getFieldsByFormId(formId);
};

exports.createField = async (data) => {
  const { errors } = validateField(data);
  if (errors.length > 0) {
    const err = new Error(errors.join('; '));
    err.statusCode = 400;
    throw err;
  }
  return formDesignModel.createField(data);
};

exports.updateField = async (id, data) => {
  // 检查字段是否存在
  const existing = await formDesignModel.getFieldById(id);
  if (!existing) {
    return null;
  }
  // 合并现有数据和更新数据后校验
  const merged = { ...existing, ...data };
  const { errors } = validateField(merged);
  if (errors.length > 0) {
    const err = new Error(errors.join('; '));
    err.statusCode = 400;
    throw err;
  }
  return formDesignModel.updateField(id, data);
};

exports.deleteField = async (id) => {
  // 检查字段是否存在
  const existing = await formDesignModel.getFieldById(id);
  if (!existing) {
    throw new Error('字段不存在');
  }
  return formDesignModel.deleteField(id);
};

exports.batchUpdateFields = async (fields) => {
  // 批量校验
  for (const field of fields) {
    if (field.id) {
      const existing = await formDesignModel.getFieldById(field.id);
      if (existing) {
        const merged = { ...existing, ...field };
        const { errors } = validateField(merged);
        if (errors.length > 0) {
          const err = new Error(`字段 ${field.id} 校验失败: ${errors.join('; ')}`);
          err.statusCode = 400;
          throw err;
        }
      }
    }
  }
  return formDesignModel.batchUpdateFields(fields);
};
