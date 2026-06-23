/**
 * 表单设计数据访问层
 */

const db = require('../utils/db');

// ========== 设计项目 CRUD ==========

exports.getAllProjects = async () => {
  return db.all(`
    SELECT p.*, COUNT(DISTINCT a.id) as app_count, COUNT(DISTINCT f.id) as form_count
    FROM form_project p
    LEFT JOIN form_app a ON a.project_id = p.id
    LEFT JOIN form_definition f ON f.app_id = a.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `);
};

exports.getProjectById = async (id) => {
  return db.get('SELECT * FROM form_project WHERE id = ?', [id]);
};

exports.createProject = async (data) => {
  const result = await db.run(
    'INSERT INTO form_project (project_name, project_desc, linked_project_id) VALUES (?, ?, ?)',
    [data.project_name, data.project_desc, data.linked_project_id || null]
  );
  return { id: result.lastID, ...data };
};

exports.updateProject = async (id, data) => {
  await db.run(
    'UPDATE form_project SET project_name = ?, project_desc = ?, linked_project_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [data.project_name, data.project_desc, data.linked_project_id || null, id]
  );
  return exports.getProjectById(id);
};

exports.deleteProject = async (id) => {
  const result = await db.run('DELETE FROM form_project WHERE id = ?', [id]);
  if (result.changes === 0) {
    const err = new Error('项目不存在');
    err.statusCode = 404;
    throw err;
  }
};

// ========== 应用 CRUD ==========

exports.getAppsByProjectId = async (projectId) => {
  return db.all(`
    SELECT a.*, COUNT(f.id) as form_count
    FROM form_app a
    LEFT JOIN form_definition f ON f.app_id = a.id
    WHERE a.project_id = ?
    GROUP BY a.id
    ORDER BY a.sort_order, a.id
  `, [projectId]);
};

exports.getAllApps = async () => {
  return db.all(`
    SELECT a.*, COUNT(f.id) as form_count
    FROM form_app a
    LEFT JOIN form_definition f ON f.app_id = a.id
    GROUP BY a.id
    ORDER BY a.sort_order, a.id
  `);
};

exports.getAppById = async (id) => {
  return db.get('SELECT * FROM form_app WHERE id = ?', [id]);
};

exports.createApp = async (data) => {
  const result = await db.run(
    'INSERT INTO form_app (app_name, app_code, project_id, description, sort_order) VALUES (?, ?, ?, ?, ?)',
    [data.app_name, data.app_code, data.project_id || null, data.description, data.sort_order || 0]
  );
  return { id: result.lastID, ...data };
};

exports.updateApp = async (id, data) => {
  await db.run(
    'UPDATE form_app SET app_name = ?, app_code = ?, project_id = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [data.app_name, data.app_code, data.project_id || null, data.description, data.sort_order, id]
  );
  return exports.getAppById(id);
};

exports.deleteApp = async (id) => {
  const result = await db.run('DELETE FROM form_app WHERE id = ?', [id]);
  if (result.changes === 0) {
    const err = new Error('应用不存在');
    err.statusCode = 404;
    throw err;
  }
};

// ========== 表单 CRUD ==========

exports.getFormsByAppId = async (appId) => {
  return db.all(
    'SELECT * FROM form_definition WHERE app_id = ? ORDER BY sort_order, id',
    [appId]
  );
};

exports.getFormById = async (id) => {
  return db.get('SELECT * FROM form_definition WHERE id = ?', [id]);
};

exports.getFormByCode = async (code) => {
  return db.get('SELECT * FROM form_definition WHERE form_code = ?', [code]);
};

exports.createForm = async (data) => {
  const result = await db.run(
    'INSERT INTO form_definition (app_id, form_name, form_code, filter_condition, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [data.app_id, data.form_name, data.form_code, data.filter_condition, data.description, data.sort_order || 0]
  );
  return { id: result.lastID, ...data };
};

exports.updateForm = async (id, data) => {
  await db.run(
    'UPDATE form_definition SET form_name = ?, form_code = ?, filter_condition = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [data.form_name, data.form_code, data.filter_condition, data.description, data.sort_order, id]
  );
  return exports.getFormById(id);
};

exports.deleteForm = async (id) => {
  const result = await db.run('DELETE FROM form_definition WHERE id = ?', [id]);
  if (result.changes === 0) {
    const err = new Error('表单不存在');
    err.statusCode = 404;
    throw err;
  }
};

// ========== 字段 CRUD ==========

exports.getFieldsByFormId = async (formId) => {
  return db.all(
    'SELECT * FROM form_field WHERE form_id = ? ORDER BY sort_order, id',
    [formId]
  );
};

exports.getFieldById = async (id) => {
  return db.get('SELECT * FROM form_field WHERE id = ?', [id]);
};

exports.createField = async (data) => {
  // 处理 input_params：如果已经是字符串就不需要再 stringify
  const inputParamsValue = data.input_params
    ? (typeof data.input_params === 'string' ? data.input_params : JSON.stringify(data.input_params))
    : null;

  const result = await db.run(`
    INSERT INTO form_field (
      form_id, field_name, field_code, is_primary_key, is_virtual,
      field_type, field_length, field_precision, default_value,
      input_type, input_type_code, input_component, input_params,
      is_required, is_unique, placeholder, remark,
      card_group, card_sort, card_width, card_width_span,
      add_control, update_control, detail_control,
      list_width, list_control, list_sort, list_formatter,
      is_filter, filter_mode, filter_default, filter_placeholder, source_system,
      sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.form_id, data.field_name, data.field_code, data.is_primary_key ? 1 : 0, data.is_virtual ? 1 : 0,
    data.field_type, data.field_length, data.field_precision, data.default_value,
    data.input_type, data.input_type_code, data.input_component, inputParamsValue,
    data.is_required ? 1 : 0, data.is_unique ? 1 : 0, data.placeholder, data.remark,
    data.card_group || '基本信息', data.card_sort, data.card_width || '半行', data.card_width_span || 12,
    data.add_control || '读写', data.update_control || '读写', data.detail_control || '读写',
    data.list_width, data.list_control || '显示', data.list_sort, data.list_formatter,
    data.is_filter ? 1 : 0, data.filter_mode, data.filter_default, data.filter_placeholder, data.source_system,
    data.sort_order || 0
  ]);
  return exports.getFieldById(result.lastID);
};

exports.updateField = async (id, data) => {
  // 处理 input_params：如果已经是字符串就不需要再 stringify
  const inputParamsValue = data.input_params
    ? (typeof data.input_params === 'string' ? data.input_params : JSON.stringify(data.input_params))
    : null;

  await db.run(`
    UPDATE form_field SET
      field_name = ?, field_code = ?, is_primary_key = ?, is_virtual = ?,
      field_type = ?, field_length = ?, field_precision = ?, default_value = ?,
      input_type = ?, input_type_code = ?, input_component = ?, input_params = ?,
      is_required = ?, is_unique = ?, placeholder = ?, remark = ?,
      card_group = ?, card_sort = ?, card_width = ?, card_width_span = ?,
      add_control = ?, update_control = ?, detail_control = ?,
      list_width = ?, list_control = ?, list_sort = ?, list_formatter = ?,
      is_filter = ?, filter_mode = ?, filter_default = ?, filter_placeholder = ?, source_system = ?,
      sort_order = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    data.field_name, data.field_code, data.is_primary_key ? 1 : 0, data.is_virtual ? 1 : 0,
    data.field_type, data.field_length, data.field_precision, data.default_value,
    data.input_type, data.input_type_code, data.input_component, inputParamsValue,
    data.is_required ? 1 : 0, data.is_unique ? 1 : 0, data.placeholder, data.remark,
    data.card_group, data.card_sort, data.card_width, data.card_width_span,
    data.add_control, data.update_control, data.detail_control,
    data.list_width, data.list_control, data.list_sort, data.list_formatter,
    data.is_filter ? 1 : 0, data.filter_mode, data.filter_default, data.filter_placeholder, data.source_system,
    data.sort_order, id
  ]);
  return exports.getFieldById(id);
};

exports.deleteField = async (id) => {
  const result = await db.run('DELETE FROM form_field WHERE id = ?', [id]);
  if (result.changes === 0) {
    const err = new Error('字段不存在');
    err.statusCode = 404;
    throw err;
  }
};

exports.batchUpdateFields = async (fields) => {
  await db.run('BEGIN');
  try {
    for (const field of fields) {
      if (field.id) {
        await exports.updateField(field.id, field);
      }
    }
    await db.run('COMMIT');
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }
};

// ========== 统计 ==========

exports.getStats = async () => {
  const projects = await db.get('SELECT COUNT(*) as count FROM form_project');
  const apps = await db.get('SELECT COUNT(*) as count FROM form_app');
  const forms = await db.get('SELECT COUNT(*) as count FROM form_definition');
  const fields = await db.get('SELECT COUNT(*) as count FROM form_field');
  return {
    project_count: projects.count,
    app_count: apps.count,
    form_count: forms.count,
    field_count: fields.count
  };
};
