const db = require('../utils/db');

const TABLE_NAME = 'opportunity_tender_staging';
const ENSURE_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS opportunity_tender_staging (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_item_id TEXT NOT NULL,
    source_origin_id TEXT,
    source_record_id TEXT,
    title TEXT NOT NULL,
    notice_type TEXT,
    published_at TEXT,
    published_date TEXT,
    deadline_at TEXT,
    deadline_date TEXT,
    issuer TEXT,
    budget_amount TEXT,
    region TEXT,
    source_platform TEXT,
    source_url TEXT,
    summary TEXT,
    detail_excerpt TEXT,
    announcement_html TEXT,
    announcement_plain_text TEXT,
    detail_payload_json TEXT,
    source_file TEXT,
    raw_payload_json TEXT,
    push_status TEXT NOT NULL DEFAULT 'pending',
    push_error TEXT,
    last_synced_at DATETIME,
    pushed_at DATETIME,
    last_parsed_at DATETIME,
    parse_status TEXT NOT NULL DEFAULT 'never_parsed',
    parse_error TEXT,
    parse_meta_json TEXT,
    deleted_at DATETIME,
    delete_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_tender_staging_source_item_id
    ON opportunity_tender_staging(source_item_id)`,
  `CREATE INDEX IF NOT EXISTS idx_opportunity_tender_staging_push_status
    ON opportunity_tender_staging(push_status)`,
  `CREATE INDEX IF NOT EXISTS idx_opportunity_tender_staging_published_date
    ON opportunity_tender_staging(published_date)`,
  `CREATE INDEX IF NOT EXISTS idx_opportunity_tender_staging_source_file
    ON opportunity_tender_staging(source_file)`,
];

let schemaEnsuredPromise = null;
let schemaEnsuredForConnectionId = null;

async function ensureSchema() {
  try {
    const currentConnId =
      typeof db.getConnectionId === 'function' ? db.getConnectionId() : null;
    if (
      schemaEnsuredForConnectionId !== null &&
      currentConnId !== null &&
      currentConnId !== schemaEnsuredForConnectionId
    ) {
      schemaEnsuredPromise = null;
      schemaEnsuredForConnectionId = null;
    }
  } catch (_error) {}

  if (schemaEnsuredPromise) {
    return schemaEnsuredPromise;
  }

  schemaEnsuredPromise = (async () => {
    try {
      schemaEnsuredForConnectionId =
        typeof db.getConnectionId === 'function' ? db.getConnectionId() : null;
    } catch (_error) {
      schemaEnsuredForConnectionId = null;
    }

    for (const statement of ENSURE_SCHEMA_STATEMENTS) {
      await db.run(statement);
    }

    const columns = await db.all(`PRAGMA table_info(${TABLE_NAME})`);
    const columnNames = new Set(columns.map((column) => column && column.name).filter(Boolean));

    if (!columnNames.has('deleted_at')) {
      await db.run(`ALTER TABLE ${TABLE_NAME} ADD COLUMN deleted_at DATETIME`);
    }

    if (!columnNames.has('delete_reason')) {
      await db.run(`ALTER TABLE ${TABLE_NAME} ADD COLUMN delete_reason TEXT`);
    }

    if (!columnNames.has('last_parsed_at')) {
      await db.run(`ALTER TABLE ${TABLE_NAME} ADD COLUMN last_parsed_at DATETIME`);
    }

    if (!columnNames.has('parse_status')) {
      await db.run(
        `ALTER TABLE ${TABLE_NAME} ADD COLUMN parse_status TEXT NOT NULL DEFAULT 'never_parsed'`
      );
    }

    if (!columnNames.has('parse_error')) {
      await db.run(`ALTER TABLE ${TABLE_NAME} ADD COLUMN parse_error TEXT`);
    }

    if (!columnNames.has('parse_meta_json')) {
      await db.run(`ALTER TABLE ${TABLE_NAME} ADD COLUMN parse_meta_json TEXT`);
    }

    if (!columnNames.has('source_origin_id')) {
      await db.run(`ALTER TABLE ${TABLE_NAME} ADD COLUMN source_origin_id TEXT`);
    }

    if (!columnNames.has('source_record_id')) {
      await db.run(`ALTER TABLE ${TABLE_NAME} ADD COLUMN source_record_id TEXT`);
    }

    if (!columnNames.has('notice_type')) {
      await db.run(`ALTER TABLE ${TABLE_NAME} ADD COLUMN notice_type TEXT`);
    }

    if (!columnNames.has('detail_excerpt')) {
      await db.run(`ALTER TABLE ${TABLE_NAME} ADD COLUMN detail_excerpt TEXT`);
    }
  })();

  return schemaEnsuredPromise;
}

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapRow(row) {
  if (!row) return null;

  return {
    ...row,
    detail_payload: parseJsonField(row.detail_payload_json, null),
    raw_payload: parseJsonField(row.raw_payload_json, null),
    parse_meta: parseJsonField(row.parse_meta_json, null),
  };
}

function normalizeReadableText(value) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function stripHtmlTags(value) {
  const text = normalizeReadableText(value);
  if (!text) return '';
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasParseableContent(row) {
  return Boolean(
    normalizeReadableText(row.announcement_plain_text) ||
      normalizeReadableText(row.detail_excerpt) ||
      stripHtmlTags(row.announcement_html)
  );
}

function getDataQualityIssues(row) {
  const issues = [];

  if (!normalizeReadableText(row.issuer)) {
    issues.push('missing_issuer');
  }

  if (!normalizeReadableText(row.deadline_date)) {
    issues.push('missing_deadline');
  }

  if (!hasParseableContent(row)) {
    issues.push('missing_content');
  }

  return issues;
}

function matchesDataQualityFilters(row, filters = {}) {
  const dataQualityFilters = Array.isArray(filters.data_quality)
    ? filters.data_quality
    : [];
  if (dataQualityFilters.length === 0) {
    return true;
  }

  const issues = getDataQualityIssues(row);
  return dataQualityFilters.some((issue) => issues.includes(issue));
}

function buildFilters(filters = {}) {
  const conditions = [];
  const params = [];
  const includeDeleted = filters.include_deleted === true;

  if (!includeDeleted) {
    conditions.push('deleted_at IS NULL');
  }

  if (filters.keyword) {
    conditions.push(
      '(title LIKE ? OR issuer LIKE ? OR source_item_id LIKE ? OR source_file LIKE ?)'
    );
    const keyword = `%${filters.keyword}%`;
    params.push(keyword, keyword, keyword, keyword);
  }

  if (filters.title) {
    conditions.push('title LIKE ?');
    params.push(`%${filters.title}%`);
  }

  if (filters.issuer) {
    conditions.push('issuer LIKE ?');
    params.push(`%${filters.issuer}%`);
  }

  if (filters.push_status) {
    conditions.push('push_status = ?');
    params.push(filters.push_status);
  }

  if (filters.source_file) {
    conditions.push('source_file LIKE ?');
    params.push(`%${filters.source_file}%`);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

function getStatusRankExpression() {
  return `CASE push_status
    WHEN 'pending' THEN 0
    WHEN 'failed' THEN 1
    ELSE 2
  END`;
}

function getDateSortExpression(columnName, sortOrder) {
  return `CASE WHEN ${columnName} IS NULL OR TRIM(${columnName}) = '' THEN 1 ELSE 0 END ASC,
    ${columnName} ${sortOrder},
    updated_at DESC,
    id DESC`;
}

function buildOrderByClause(filters = {}) {
  const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';

  if (filters.sort_by === 'published_date') {
    return getDateSortExpression('published_date', sortOrder);
  }

  if (filters.sort_by === 'deadline_date') {
    return getDateSortExpression('deadline_date', sortOrder);
  }

  if (filters.sort_by === 'updated_at') {
    return `updated_at ${sortOrder}, id DESC`;
  }

  if (filters.sort_by === 'push_status') {
    return `${getStatusRankExpression()} ${sortOrder}, published_date DESC, updated_at DESC, id DESC`;
  }

  return `${getStatusRankExpression()} ASC,
    COALESCE(published_date, '') DESC,
    updated_at DESC,
    id DESC`;
}

async function listTenderStaging(filters = {}) {
  await ensureSchema();
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize = Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 20;
  const offset = (page - 1) * pageSize;
  const { whereClause, params } = buildFilters(filters);
  const orderByClause = buildOrderByClause(filters);

  if (Array.isArray(filters.data_quality) && filters.data_quality.length > 0) {
    const rows = await db.all(
      `SELECT *
       FROM ${TABLE_NAME}
       ${whereClause}
       ORDER BY ${orderByClause}`,
      params
    );
    const filteredRows = rows.filter((row) => matchesDataQualityFilters(row, filters));

    return {
      items: filteredRows.slice(offset, offset + pageSize).map(mapRow),
      total: filteredRows.length,
      page,
      pageSize,
    };
  }

  const totalRow = await db.get(
    `SELECT COUNT(1) AS total FROM ${TABLE_NAME} ${whereClause}`,
    params
  );
  const rows = await db.all(
    `SELECT *
     FROM ${TABLE_NAME}
     ${whereClause}
     ORDER BY ${orderByClause}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return {
    items: rows.map(mapRow),
    total: totalRow?.total || 0,
    page,
    pageSize,
  };
}

async function getTenderStagingById(id) {
  await ensureSchema();
  const row = await db.get(`SELECT * FROM ${TABLE_NAME} WHERE id = ?`, [id]);
  return mapRow(row);
}

async function getTenderStagingBySourceItemId(sourceItemId) {
  await ensureSchema();
  const row = await db.get(
    `SELECT * FROM ${TABLE_NAME} WHERE source_item_id = ?`,
    [sourceItemId]
  );
  return mapRow(row);
}

async function createTenderStaging(data) {
  await ensureSchema();
  const result = await db.run(
    `INSERT INTO ${TABLE_NAME} (
      source_item_id,
      source_origin_id,
      source_record_id,
      title,
      notice_type,
      published_at,
      published_date,
      deadline_at,
      deadline_date,
      issuer,
      budget_amount,
      region,
      source_platform,
      source_url,
      summary,
      detail_excerpt,
      announcement_html,
      announcement_plain_text,
      detail_payload_json,
      source_file,
      raw_payload_json,
      push_status,
      push_error,
      last_synced_at,
      pushed_at,
      last_parsed_at,
      parse_status,
      parse_error,
      parse_meta_json,
      deleted_at,
      delete_reason,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.source_item_id,
      data.source_origin_id,
      data.source_record_id,
      data.title,
      data.notice_type,
      data.published_at,
      data.published_date,
      data.deadline_at,
      data.deadline_date,
      data.issuer,
      data.budget_amount,
      data.region,
      data.source_platform,
      data.source_url,
      data.summary,
      data.detail_excerpt,
      data.announcement_html,
      data.announcement_plain_text,
      data.detail_payload_json,
      data.source_file,
      data.raw_payload_json,
      data.push_status,
      data.push_error,
      data.last_synced_at,
      data.pushed_at,
      data.last_parsed_at || null,
      data.parse_status || 'never_parsed',
      data.parse_error || null,
      data.parse_meta_json || null,
      data.deleted_at,
      data.delete_reason,
      data.created_at,
      data.updated_at,
    ]
  );

  return getTenderStagingById(result.lastID);
}

async function updateTenderStaging(id, data) {
  await ensureSchema();
  await db.run(
    `UPDATE ${TABLE_NAME}
       SET source_item_id = ?,
           source_origin_id = ?,
           source_record_id = ?,
           title = ?,
           notice_type = ?,
           published_at = ?,
           published_date = ?,
           deadline_at = ?,
           deadline_date = ?,
           issuer = ?,
           budget_amount = ?,
           region = ?,
           source_platform = ?,
           source_url = ?,
           summary = ?,
           detail_excerpt = ?,
           announcement_html = ?,
           announcement_plain_text = ?,
           detail_payload_json = ?,
           source_file = ?,
           raw_payload_json = ?,
           push_status = ?,
           push_error = ?,
           last_synced_at = ?,
           pushed_at = ?,
           last_parsed_at = ?,
           parse_status = ?,
           parse_error = ?,
           parse_meta_json = ?,
           deleted_at = ?,
           delete_reason = ?,
           updated_at = ?
     WHERE id = ?`,
    [
      data.source_item_id,
      data.source_origin_id,
      data.source_record_id,
      data.title,
      data.notice_type,
      data.published_at,
      data.published_date,
      data.deadline_at,
      data.deadline_date,
      data.issuer,
      data.budget_amount,
      data.region,
      data.source_platform,
      data.source_url,
      data.summary,
      data.detail_excerpt,
      data.announcement_html,
      data.announcement_plain_text,
      data.detail_payload_json,
      data.source_file,
      data.raw_payload_json,
      data.push_status,
      data.push_error,
      data.last_synced_at,
      data.pushed_at,
      data.last_parsed_at || null,
      data.parse_status || 'never_parsed',
      data.parse_error || null,
      data.parse_meta_json || null,
      data.deleted_at,
      data.delete_reason,
      data.updated_at,
      id,
    ]
  );

  return getTenderStagingById(id);
}

async function updateTenderPushState(id, payload = {}) {
  await ensureSchema();
  await db.run(
    `UPDATE ${TABLE_NAME}
       SET push_status = ?,
           push_error = ?,
           pushed_at = ?,
           updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [payload.push_status, payload.push_error || null, payload.pushed_at || null, id]
  );

  return getTenderStagingById(id);
}

async function updateTenderParseState(id, payload = {}) {
  await ensureSchema();
  await db.run(
    `UPDATE ${TABLE_NAME}
       SET issuer = COALESCE(?, issuer),
           deadline_at = COALESCE(?, deadline_at),
           deadline_date = COALESCE(?, deadline_date),
           last_parsed_at = ?,
           parse_status = ?,
           parse_error = ?,
           parse_meta_json = ?,
           updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      payload.issuer ?? null,
      payload.deadline_at ?? null,
      payload.deadline_date ?? null,
      payload.last_parsed_at || null,
      payload.parse_status || 'never_parsed',
      payload.parse_error || null,
      payload.parse_meta_json || null,
      id,
    ]
  );

  return getTenderStagingById(id);
}

async function getTenderStagingStats() {
  await ensureSchema();
  const totalRow = await db.get(
    `SELECT COUNT(1) AS total FROM ${TABLE_NAME} WHERE deleted_at IS NULL`
  );
  const groupedRows = await db.all(
    `SELECT push_status, COUNT(1) AS total
     FROM ${TABLE_NAME}
     WHERE deleted_at IS NULL
     GROUP BY push_status`
  );

  const stats = {
    total: totalRow?.total || 0,
    pending: 0,
    pushed: 0,
    failed: 0,
  };

  groupedRows.forEach((row) => {
    if (row.push_status && Object.prototype.hasOwnProperty.call(stats, row.push_status)) {
      stats[row.push_status] = row.total || 0;
    }
  });

  return stats;
}

async function listAllTenderStagingSourceItemIds() {
  await ensureSchema();
  const rows = await db.all(
    `SELECT source_item_id FROM ${TABLE_NAME} WHERE deleted_at IS NULL`
  );
  return rows
    .map((row) => row?.source_item_id)
    .filter((sourceItemId) => typeof sourceItemId === 'string' && sourceItemId);
}

async function listActiveTenderStagingForPrune() {
  await ensureSchema();
  return db.all(
    `SELECT id, source_item_id, push_status, push_error, pushed_at, parse_status
     FROM ${TABLE_NAME}
     WHERE deleted_at IS NULL`
  );
}

async function listActiveTenderStagingForDedupe() {
  await ensureSchema();
  const rows = await db.all(
    `SELECT *
     FROM ${TABLE_NAME}
     WHERE deleted_at IS NULL
     ORDER BY id ASC`
  );
  return rows.map(mapRow);
}

async function softDeleteTenderStagingByIds(ids = [], reason = 'missing_from_sync_source') {
  await ensureSchema();

  if (!Array.isArray(ids) || ids.length === 0) {
    return 0;
  }

  let deletedCount = 0;
  const chunkSize = 200;

  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    const placeholders = chunk.map(() => '?').join(', ');
    const result = await db.run(
      `UPDATE ${TABLE_NAME}
       SET deleted_at = CURRENT_TIMESTAMP,
           delete_reason = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      [reason, ...chunk]
    );
    deletedCount += result.changes || 0;
  }

  return deletedCount;
}

async function deleteTenderStagingBySourceItemIds(sourceItemIds = []) {
  await ensureSchema();

  if (!Array.isArray(sourceItemIds) || sourceItemIds.length === 0) {
    return 0;
  }

  let deletedCount = 0;
  const chunkSize = 200;

  for (let index = 0; index < sourceItemIds.length; index += chunkSize) {
    const chunk = sourceItemIds.slice(index, index + chunkSize);
    const placeholders = chunk.map(() => '?').join(', ');
    const result = await db.run(
      `DELETE FROM ${TABLE_NAME} WHERE source_item_id IN (${placeholders})`,
      chunk
    );
    deletedCount += result.changes || 0;
  }

  return deletedCount;
}

async function deleteTenderStagingByIds(ids = []) {
  await ensureSchema();

  if (!Array.isArray(ids) || ids.length === 0) {
    return 0;
  }

  let deletedCount = 0;
  const chunkSize = 200;

  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    const placeholders = chunk.map(() => '?').join(', ');
    const result = await db.run(
      `DELETE FROM ${TABLE_NAME} WHERE id IN (${placeholders})`,
      chunk
    );
    deletedCount += result.changes || 0;
  }

  return deletedCount;
}

module.exports = {
  ensureSchema,
  listTenderStaging,
  getTenderStagingById,
  getTenderStagingBySourceItemId,
  createTenderStaging,
  updateTenderStaging,
  updateTenderPushState,
  updateTenderParseState,
  getTenderStagingStats,
  listAllTenderStagingSourceItemIds,
  listActiveTenderStagingForPrune,
  listActiveTenderStagingForDedupe,
  softDeleteTenderStagingByIds,
  deleteTenderStagingByIds,
  deleteTenderStagingBySourceItemIds,
};
