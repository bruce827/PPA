/**
 * 数据指标设计 - 数据访问层
 */

const db = require('../utils/db');

// ========== 项目 CRUD ==========

exports.getAllProjects = async () => {
  return db.all(`
    SELECT p.*, COUNT(m.id) as metric_count
    FROM data_metrics_project p
    LEFT JOIN data_metrics m ON m.dm_project_id = p.id
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `);
};

exports.getProjectById = async (id) => {
  return db.get('SELECT * FROM data_metrics_project WHERE id = ?', [id]);
};

exports.createProject = async (data) => {
  const result = await db.run(
    'INSERT INTO data_metrics_project (project_name, project_desc, linked_project_id) VALUES (?, ?, ?)',
    [data.project_name, data.project_desc || null, data.linked_project_id || null]
  );
  return { id: result.lastID, ...data };
};

exports.updateProject = async (id, data) => {
  await db.run(
    'UPDATE data_metrics_project SET project_name = ?, project_desc = ?, linked_project_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [data.project_name, data.project_desc || null, data.linked_project_id || null, id]
  );
  return exports.getProjectById(id);
};

exports.deleteProject = async (id) => {
  const result = await db.run('DELETE FROM data_metrics_project WHERE id = ?', [id]);
  if (result.changes === 0) {
    const err = new Error('项目不存在');
    err.statusCode = 404;
    throw err;
  }
};

exports.updateProjectMetricCount = async (projectId) => {
  const count = await db.get(
    'SELECT COUNT(*) as count FROM data_metrics WHERE dm_project_id = ?',
    [projectId]
  );
  await db.run(
    'UPDATE data_metrics_project SET metric_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [count.count, projectId]
  );
};

// ========== 指标列表查询 ==========

exports.count = async (whereClause, params) => {
  return db.get(`SELECT COUNT(*) as total FROM data_metrics ${whereClause}`, params);
};

exports.getList = async (whereClause, params, limit, offset) => {
  return db.all(
    `SELECT * FROM data_metrics ${whereClause} ORDER BY module_name, scene_l1, scene_l2, id LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
};

exports.getAll = async (filters = {}) => {
  const conditions = [];
  const params = [];

  if (filters.dmProjectId) {
    conditions.push('dm_project_id = ?');
    params.push(filters.dmProjectId);
  }
  if (filters.moduleName) {
    conditions.push('module_name = ?');
    params.push(filters.moduleName);
  }
  if (filters.sceneL1) {
    conditions.push('scene_l1 = ?');
    params.push(filters.sceneL1);
  }
  if (filters.displayType) {
    conditions.push('display_type = ?');
    params.push(filters.displayType);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.all(`SELECT * FROM data_metrics ${whereClause} ORDER BY module_name, scene_l1, scene_l2`, params);
};

// ========== 单条指标操作 ==========

exports.getById = async (id) => {
  return db.get('SELECT * FROM data_metrics WHERE id = ?', [id]);
};

exports.create = async (data) => {
  const result = await db.run(
    `INSERT INTO data_metrics (
      dm_project_id, application, module_name, scene_l1, scene_l2, 
      metric_name, display_type, data_source_logic, algorithm,
      collection_cycle, source_system, source_module, integration_method, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.dm_project_id, data.application || null, data.module_name, data.scene_l1, data.scene_l2,
      data.metric_name, data.display_type, data.data_source_logic || null, data.algorithm || null,
      data.collection_cycle || null, data.source_system || null, data.source_module || null, 
      data.integration_method || null, data.remark || null,
    ]
  );
  
  // 更新项目指标数量
  if (data.dm_project_id) {
    await exports.updateProjectMetricCount(data.dm_project_id);
  }
  
  return exports.getById(result.lastID);
};

exports.update = async (id, data) => {
  const fields = [];
  const params = [];

  const allowedFields = [
    'dm_project_id', 'application', 'module_name', 'scene_l1', 'scene_l2',
    'metric_name', 'display_type', 'data_source_logic', 'algorithm',
    'collection_cycle', 'source_system', 'source_module', 'integration_method', 'remark'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      params.push(data[field]);
    }
  }

  if (fields.length === 0) {
    return exports.getById(id);
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  await db.run(
    `UPDATE data_metrics SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  return exports.getById(id);
};

exports.remove = async (id) => {
  const metric = await exports.getById(id);
  if (!metric) {
    const err = new Error('数据指标不存在');
    err.statusCode = 404;
    throw err;
  }

  const result = await db.run('DELETE FROM data_metrics WHERE id = ?', [id]);
  
  // 更新项目指标数量
  if (metric.dm_project_id) {
    await exports.updateProjectMetricCount(metric.dm_project_id);
  }
  
  return result;
};

// ========== 批量操作 ==========

exports.batchDelete = async (ids) => {
  if (ids.length === 0) return { deleted: 0 };
  
  // 先获取要删除的指标，用于更新项目计数
  const placeholders = ids.map(() => '?').join(',');
  const metrics = await db.all(`SELECT DISTINCT dm_project_id FROM data_metrics WHERE id IN (${placeholders})`, ids);
  
  const result = await db.run(`DELETE FROM data_metrics WHERE id IN (${placeholders})`, ids);
  
  // 更新相关项目的指标数量
  for (const metric of metrics) {
    if (metric.dm_project_id) {
      await exports.updateProjectMetricCount(metric.dm_project_id);
    }
  }
  
  return { deleted: result.changes };
};

exports.batchUpdate = async (ids, data) => {
  if (ids.length === 0) return { updated: 0 };

  const fields = [];
  const params = [];

  const allowedFields = ['display_type', 'collection_cycle', 'integration_method'];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      params.push(data[field]);
    }
  }

  if (fields.length === 0) {
    return { updated: 0 };
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  
  const placeholders = ids.map(() => '?').join(',');
  params.push(...ids);

  const result = await db.run(
    `UPDATE data_metrics SET ${fields.join(', ')} WHERE id IN (${placeholders})`,
    params
  );

  return { updated: result.changes };
};

exports.batchCreate = async (items) => {
  let created = 0;
  let skipped = 0;

  // 使用事务保证批量操作的原子性
  await db.run('BEGIN TRANSACTION');
  try {
    for (const item of items) {
      try {
        await exports.create(item);
        created++;
      } catch (err) {
        console.error('Failed to create metric:', err.message);
        skipped++;
      }
    }
    await db.run('COMMIT');
  } catch (err) {
    await db.run('ROLLBACK');
    throw err;
  }

  return { created, skipped };
};

exports.deleteAllByProject = async (dmProjectId) => {
  const result = await db.run('DELETE FROM data_metrics WHERE dm_project_id = ?', [dmProjectId]);
  await exports.updateProjectMetricCount(dmProjectId);
  return { deleted: result.changes };
};

// ========== 统计 ==========

exports.getStats = async (dmProjectId) => {
  const whereClause = dmProjectId ? 'WHERE dm_project_id = ?' : '';
  const params = dmProjectId ? [dmProjectId] : [];

  const total = await db.get(`SELECT COUNT(*) as count FROM data_metrics ${whereClause}`, params);
  const byModule = await db.all(
    `SELECT module_name, COUNT(*) as count FROM data_metrics ${whereClause} GROUP BY module_name ORDER BY count DESC`,
    params
  );
  const byDisplayType = await db.all(
    `SELECT display_type, COUNT(*) as count FROM data_metrics ${whereClause} GROUP BY display_type ORDER BY count DESC`,
    params
  );

  return {
    total: total.count,
    byModule,
    byDisplayType,
  };
};

// ========== 分类操作 ==========

exports.getAllCategories = async (dmProjectId) => {
  const whereClause = dmProjectId ? 'WHERE dm_project_id = ?' : '';
  const params = dmProjectId ? [dmProjectId] : [];
  return db.all(`SELECT * FROM data_metric_categories ${whereClause} ORDER BY sort_order, id`, params);
};

exports.getCategoriesByType = async (dmProjectId, type) => {
  return db.all(
    'SELECT * FROM data_metric_categories WHERE dm_project_id = ? AND type = ? ORDER BY sort_order, id',
    [dmProjectId, type]
  );
};

exports.getCategoryById = async (id) => {
  return db.get('SELECT * FROM data_metric_categories WHERE id = ?', [id]);
};

exports.createCategory = async (data) => {
  const result = await db.run(
    'INSERT INTO data_metric_categories (dm_project_id, type, name, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)',
    [data.dm_project_id, data.type, data.name, data.parent_id || null, data.sort_order || 0]
  );
  return { id: result.lastID, ...data };
};

exports.updateCategory = async (id, data) => {
  const fields = [];
  const params = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    params.push(data.name);
  }
  if (data.sort_order !== undefined) {
    fields.push('sort_order = ?');
    params.push(data.sort_order);
  }
  if (data.parent_id !== undefined) {
    fields.push('parent_id = ?');
    params.push(data.parent_id);
  }

  if (fields.length === 0) {
    return exports.getCategoryById(id);
  }

  params.push(id);

  await db.run(
    `UPDATE data_metric_categories SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  return exports.getCategoryById(id);
};

exports.removeCategory = async (id) => {
  const result = await db.run('DELETE FROM data_metric_categories WHERE id = ?', [id]);
  if (result.changes === 0) {
    const err = new Error('分类不存在');
    err.statusCode = 404;
    throw err;
  }
};

exports.countByCategory = async (categoryId) => {
  const category = await exports.getCategoryById(categoryId);
  if (!category) return 0;

  let count = 0;
  if (category.type === 'module') {
    const result = await db.get(
      'SELECT COUNT(*) as count FROM data_metrics WHERE dm_project_id = ? AND module_name = ?',
      [category.dm_project_id, category.name]
    );
    count = result.count;
  } else if (category.type === 'scene_l1') {
    const result = await db.get(
      'SELECT COUNT(*) as count FROM data_metrics WHERE dm_project_id = ? AND scene_l1 = ?',
      [category.dm_project_id, category.name]
    );
    count = result.count;
  } else if (category.type === 'scene_l2') {
    const result = await db.get(
      'SELECT COUNT(*) as count FROM data_metrics WHERE dm_project_id = ? AND scene_l2 = ?',
      [category.dm_project_id, category.name]
    );
    count = result.count;
  }

  return count;
};

// 安全的字段名映射，避免SQL注入
const FIELD_MAP = {
  'module_name': 'module_name',
  'scene_l1': 'scene_l1',
  'scene_l2': 'scene_l2',
  'display_type': 'display_type',
  'collection_cycle': 'collection_cycle',
  'source_system': 'source_system',
};

exports.getDistinctValues = async (dmProjectId, field) => {
  const safeField = FIELD_MAP[field];
  if (!safeField) {
    throw new Error(`不允许查询字段: ${field}`);
  }
  return db.all(
    `SELECT DISTINCT ${safeField} as value FROM data_metrics WHERE dm_project_id = ? AND ${safeField} IS NOT NULL ORDER BY ${safeField}`,
    [dmProjectId]
  );
};

// ========== 历史项目（复用现有接口）==========

exports.getLinkedProjects = async () => {
  return db.all('SELECT id, name FROM projects ORDER BY created_at DESC');
};
