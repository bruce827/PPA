const db = require('../utils/db');

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

const parseBooleanFlag = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes'].includes(normalized)) return true;
  if (['0', 'false', 'no'].includes(normalized)) return false;
  return undefined;
};

const normalizeBooleanFlagForDb = (value) => (parseBooleanFlag(value) ? 1 : 0);

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

  const hasBusinessQuote = parseBooleanFlag(options.has_business_quote);
  if (typeof hasBusinessQuote !== 'undefined') {
    clauses.push(
      hasBusinessQuote
        ? "business_quote_json IS NOT NULL AND business_quote_json != ''"
        : "(business_quote_json IS NULL OR business_quote_json = '')"
    );
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

let ensuredConnectionId = null;
let ensureSchemaPromise = null;

const ensureSchema = async () => {
  const currentConnectionId = db.getConnectionId();
  if (ensuredConnectionId === currentConnectionId) return;
  if (ensureSchemaPromise) {
    await ensureSchemaPromise;
    if (ensuredConnectionId === currentConnectionId) return;
  }

  ensureSchemaPromise = (async () => {
    const columns = await db.all('PRAGMA table_info(projects);');
    const hasTagsJson = Array.isArray(columns) && columns.some((col) => col.name === 'tags_json');
    const hasBusinessQuoteJson =
      Array.isArray(columns) && columns.some((col) => col.name === 'business_quote_json');
    if (!hasTagsJson) {
      await db.run('ALTER TABLE projects ADD COLUMN tags_json TEXT;');
    }
    if (!hasBusinessQuoteJson) {
      await db.run('ALTER TABLE projects ADD COLUMN business_quote_json TEXT;');
    }

    ensuredConnectionId = currentConnectionId;
  })();

  try {
    await ensureSchemaPromise;
  } finally {
    ensureSchemaPromise = null;
  }
};

const createProject = async (projectData) => {
  await ensureSchema();
  const {
    name,
    description,
    is_template,
    final_total_cost,
    final_risk_score,
    final_workload_days,
    assessment_details_json,
    tags_json,
  } = projectData;

  const sql = `INSERT INTO projects
    (name, description, is_template, project_type, final_total_cost, final_risk_score, final_workload_days, assessment_details_json, tags_json)
    VALUES (?, ?, ?, 'standard', ?, ?, ?, ?, ?)`;

  const params = [
    name,
    description,
    normalizeBooleanFlagForDb(is_template),
    final_total_cost,
    final_risk_score,
    final_workload_days,
    assessment_details_json,
    typeof tags_json === 'undefined' ? null : tags_json,
  ];

  const result = await db.run(sql, params);
  return { id: result.id };
};

const getProjectById = async (id) => {
  await ensureSchema();
  return await db.get(
    "SELECT * FROM projects WHERE id = ? AND (project_type IS NULL OR project_type = 'standard')",
    [id]
  );
};

const getAllProjects = async (options = {}) => {
  await ensureSchema();
  const orderBy = buildOrderByClause(options);
  const { clauses, params } = buildFilterClauses(options);
  const whereParts = [
    'is_template = 0',
    "(project_type IS NULL OR project_type = 'standard')",
    ...clauses,
  ];
  return await db.all(
    `SELECT id, name, final_total_cost, final_risk_score, business_quote_json, created_at,
            CASE WHEN business_quote_json IS NOT NULL AND business_quote_json != '' THEN 1 ELSE 0 END AS has_business_quote
     FROM projects
     WHERE ${whereParts.join(' AND ')}
     ORDER BY ${orderBy}`,
    params
  );
};

// 获取所有项目（包含模板和正式项目）
const getAllProjectsIncludingTemplates = async (options = {}) => {
  await ensureSchema();
  const orderBy = buildOrderByClause(options);
  const { clauses, params } = buildFilterClauses(options);
  const whereParts = [
    "(project_type IS NULL OR project_type = 'standard')",
    ...clauses,
  ];
  return await db.all(
    `SELECT id, name, description, is_template, final_total_cost, final_risk_score, final_workload_days, business_quote_json, created_at,
            CASE WHEN business_quote_json IS NOT NULL AND business_quote_json != '' THEN 1 ELSE 0 END AS has_business_quote
     FROM projects
     WHERE ${whereParts.join(' AND ')}
     ORDER BY ${orderBy}`,
    params
  );
};

const getAllTemplates = async (options = {}) => {
  await ensureSchema();
  const orderBy = buildOrderByClause(options);
  const { clauses, params } = buildFilterClauses(options);
  const whereParts = [
    'is_template = 1',
    "(project_type IS NULL OR project_type = 'standard')",
    ...clauses,
  ];
  return await db.all(
    `SELECT id, name, description, is_template, final_total_cost, final_risk_score, final_workload_days, business_quote_json, created_at,
            CASE WHEN business_quote_json IS NOT NULL AND business_quote_json != '' THEN 1 ELSE 0 END AS has_business_quote
     FROM projects
     WHERE ${whereParts.join(' AND ')}
     ORDER BY ${orderBy}`,
    params
  );
};

// 清除所有项目的模板标记
const clearAllTemplateFlags = async () => {
  await ensureSchema();
  const result = await db.run(
    "UPDATE projects SET is_template = 0, updated_at = CURRENT_TIMESTAMP WHERE is_template = 1 AND (project_type IS NULL OR project_type = 'standard')"
  );
  return { updated: result.id };
};

const updateProjectFields = async (id, fields) => {
  await ensureSchema();

  const allowed = [
    'name',
    'description',
    'is_template',
    'final_total_cost',
    'final_risk_score',
    'final_workload_days',
    'assessment_details_json',
    'tags_json',
    'business_quote_json',
  ];

  const setParts = [];
  const params = [];

  allowed.forEach((key) => {
    if (typeof fields[key] === 'undefined') return;
    setParts.push(`${key} = ?`);
    params.push(key === 'is_template' ? normalizeBooleanFlagForDb(fields[key]) : fields[key]);
  });

  if (!setParts.length) {
    return { updated: 0 };
  }

  setParts.push("project_type = 'standard'");
  setParts.push('updated_at = CURRENT_TIMESTAMP');

  const sql = `UPDATE projects
    SET ${setParts.join(', ')}
    WHERE id = ? AND (project_type IS NULL OR project_type = 'standard')`;
  params.push(id);

  const result = await db.run(sql, params);
  return { updated: result.id };
};

const updateProject = async (id, projectData) => {
  return await updateProjectFields(id, projectData);
};

const deleteProject = async (id) => {
  await ensureSchema();
  const result = await db.run(
    `DELETE FROM projects WHERE id = ? AND (project_type IS NULL OR project_type = 'standard')`,
    [id]
  );
  return { deleted: result.id };
};

module.exports = {
  ensureSchema,
  createProject,
  getProjectById,
  getAllProjects,
  getAllProjectsIncludingTemplates,
  getAllTemplates,
  clearAllTemplateFlags,
  updateProjectFields,
  updateProject,
  deleteProject
};
