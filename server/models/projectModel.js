const { getDatabase } = require('../config/database');

/**
 * 项目相关的数据库操作
 */

const SORT_BY_WHITELIST = {
  final_total_cost: 'final_total_cost',
  final_risk_score: 'final_risk_score',
  created_at: 'created_at',
};

const normalizeSortOrder = (rawOrder) => {
  if (typeof rawOrder !== 'string') return 'desc';
  const normalized = rawOrder.toLowerCase();
  if (['asc', 'ascend', 'ascending'].includes(normalized)) return 'asc';
  if (['desc', 'descend', 'descending'].includes(normalized)) return 'desc';
  return 'desc';
};

const buildOrderByClause = (options = {}) => {
  const sortByKey =
    typeof options.sortBy === 'string'
      ? options.sortBy
      : typeof options.sort_by === 'string'
        ? options.sort_by
        : undefined;
  const sortColumn = sortByKey ? SORT_BY_WHITELIST[sortByKey] : undefined;
  if (!sortColumn) {
    return 'created_at DESC, id DESC';
  }

  const sortOrder = normalizeSortOrder(options.sortOrder ?? options.sort_order);
  if (sortColumn === 'created_at') {
    return `created_at ${sortOrder}, id DESC`;
  }
  return `${sortColumn} ${sortOrder}, created_at DESC, id DESC`;
};

const parseNonEmptyString = (value) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const parseFiniteNumber = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const extractDatePrefix = (value) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : undefined;
};

const buildFilterClauses = (options = {}) => {
  const clauses = [];
  const params = [];

  const name = parseNonEmptyString(options.name);
  if (name) {
    clauses.push('name LIKE ?');
    params.push(`%${name}%`);
  }

  let costMin = parseFiniteNumber(options.final_total_cost_min);
  let costMax = parseFiniteNumber(options.final_total_cost_max);
  if (typeof costMin !== 'undefined' && typeof costMax !== 'undefined' && costMin > costMax) {
    [costMin, costMax] = [costMax, costMin];
  }
  if (typeof costMin !== 'undefined') {
    clauses.push('final_total_cost >= ?');
    params.push(costMin);
  }
  if (typeof costMax !== 'undefined') {
    clauses.push('final_total_cost <= ?');
    params.push(costMax);
  }

  const riskScore = parseFiniteNumber(options.final_risk_score);
  if (typeof riskScore !== 'undefined') {
    clauses.push('final_risk_score = ?');
    params.push(riskScore);
  }

  const createdStart = extractDatePrefix(options.created_at_start);
  if (createdStart) {
    clauses.push('date(created_at) >= date(?)');
    params.push(createdStart);
  }

  const createdEnd = extractDatePrefix(options.created_at_end);
  if (createdEnd) {
    clauses.push('date(created_at) <= date(?)');
    params.push(createdEnd);
  }

  return { clauses, params };
};

const createProject = (projectData) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const {
      name,
      description,
      is_template,
      final_total_cost,
      final_risk_score,
      final_workload_days,
      assessment_details_json
    } = projectData;

    const sql = `INSERT INTO projects
      (name, description, is_template, project_type, final_total_cost, final_risk_score, final_workload_days, assessment_details_json)
      VALUES (?, ?, ?, 'standard', ?, ?, ?, ?)`;

    const params = [
      name,
      description,
      is_template || 0,
      final_total_cost,
      final_risk_score,
      final_workload_days,
      assessment_details_json
    ];

    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID });
    });
  });
};

const getProjectById = (id) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.get(
      "SELECT * FROM projects WHERE id = ? AND (project_type IS NULL OR project_type = 'standard')",
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
};

const getAllProjects = (options = {}) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const orderBy = buildOrderByClause(options);
    const { clauses, params } = buildFilterClauses(options);
    const whereParts = [
      'is_template = 0',
      "(project_type IS NULL OR project_type = 'standard')",
      ...clauses,
    ];
    db.all(
      `SELECT id, name, final_total_cost, final_risk_score, created_at
       FROM projects
       WHERE ${whereParts.join(' AND ')}
       ORDER BY ${orderBy}`,
      params,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

// 获取所有项目（包含模板和正式项目）
const getAllProjectsIncludingTemplates = (options = {}) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const orderBy = buildOrderByClause(options);
    const { clauses, params } = buildFilterClauses(options);
    const whereParts = [
      "(project_type IS NULL OR project_type = 'standard')",
      ...clauses,
    ];
    db.all(
      `SELECT id, name, description, is_template, final_total_cost, final_risk_score, final_workload_days, created_at
       FROM projects
       WHERE ${whereParts.join(' AND ')}
       ORDER BY ${orderBy}`,
      params,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

const getAllTemplates = (options = {}) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const orderBy = buildOrderByClause(options);
    const { clauses, params } = buildFilterClauses(options);
    const whereParts = [
      'is_template = 1',
      "(project_type IS NULL OR project_type = 'standard')",
      ...clauses,
    ];
    db.all(
      `SELECT id, name, description, is_template, final_total_cost, final_risk_score, final_workload_days, created_at
       FROM projects
       WHERE ${whereParts.join(' AND ')}
       ORDER BY ${orderBy}`,
      params,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

// 清除所有项目的模板标记
const clearAllTemplateFlags = () => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(
      "UPDATE projects SET is_template = 0 WHERE is_template = 1 AND (project_type IS NULL OR project_type = 'standard')",
      [],
      function (err) {
        if (err) reject(err);
        else resolve({ updated: this.changes });
      },
    );
  });
};

const updateProject = (id, projectData) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const {
      name,
      description,
      is_template,
      final_total_cost,
      final_risk_score,
      final_workload_days,
      assessment_details_json
    } = projectData;

    const sql = `UPDATE projects 
      SET name = ?, description = ?, is_template = ?, project_type = 'standard', final_total_cost = ?, 
          final_risk_score = ?, final_workload_days = ?, assessment_details_json = ? 
      WHERE id = ? AND (project_type IS NULL OR project_type = 'standard')`;
    
    const params = [
      name,
      description,
      is_template || 0,
      final_total_cost,
      final_risk_score,
      final_workload_days,
      assessment_details_json,
      id
    ];

    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ updated: this.changes });
    });
  });
};

const deleteProject = (id) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(
      `DELETE FROM projects WHERE id = ? AND (project_type IS NULL OR project_type = 'standard')`,
      [id],
      function(err) {
        if (err) reject(err);
        else resolve({ deleted: this.changes });
      }
    );
  });
};

module.exports = {
  createProject,
  getProjectById,
  getAllProjects,
  getAllProjectsIncludingTemplates,
  getAllTemplates,
  clearAllTemplateFlags,
  updateProject,
  deleteProject
};
