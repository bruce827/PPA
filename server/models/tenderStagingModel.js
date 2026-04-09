const db = require('../utils/db');

const TABLE_NAME = 'opportunity_tender_staging';
const ENSURE_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS opportunity_tender_staging (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_item_id TEXT NOT NULL,
    title TEXT NOT NULL,
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
    announcement_html TEXT,
    announcement_plain_text TEXT,
    detail_payload_json TEXT,
    source_file TEXT,
    raw_payload_json TEXT,
    push_status TEXT NOT NULL DEFAULT 'pending',
    push_error TEXT,
    last_synced_at DATETIME,
    pushed_at DATETIME,
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
  };
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

async function listTenderStaging(filters = {}) {
  await ensureSchema();
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize = Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 20;
  const offset = (page - 1) * pageSize;
  const { whereClause, params } = buildFilters(filters);

  const totalRow = await db.get(
    `SELECT COUNT(1) AS total FROM ${TABLE_NAME} ${whereClause}`,
    params
  );
  const rows = await db.all(
    `SELECT *
     FROM ${TABLE_NAME}
     ${whereClause}
     ORDER BY
       CASE push_status
         WHEN 'pending' THEN 0
         WHEN 'failed' THEN 1
         ELSE 2
       END,
       COALESCE(published_date, '') DESC,
       updated_at DESC,
       id DESC
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
      title,
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
      announcement_html,
      announcement_plain_text,
      detail_payload_json,
      source_file,
      raw_payload_json,
      push_status,
      push_error,
      last_synced_at,
      pushed_at,
      deleted_at,
      delete_reason,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.source_item_id,
      data.title,
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
      data.announcement_html,
      data.announcement_plain_text,
      data.detail_payload_json,
      data.source_file,
      data.raw_payload_json,
      data.push_status,
      data.push_error,
      data.last_synced_at,
      data.pushed_at,
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
           title = ?,
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
           announcement_html = ?,
           announcement_plain_text = ?,
           detail_payload_json = ?,
           source_file = ?,
           raw_payload_json = ?,
           push_status = ?,
           push_error = ?,
           last_synced_at = ?,
           pushed_at = ?,
           deleted_at = ?,
           delete_reason = ?,
           updated_at = ?
     WHERE id = ?`,
    [
      data.source_item_id,
      data.title,
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
      data.announcement_html,
      data.announcement_plain_text,
      data.detail_payload_json,
      data.source_file,
      data.raw_payload_json,
      data.push_status,
      data.push_error,
      data.last_synced_at,
      data.pushed_at,
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
    `SELECT id, source_item_id, push_status, push_error, pushed_at
     FROM ${TABLE_NAME}
     WHERE deleted_at IS NULL`
  );
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

module.exports = {
  ensureSchema,
  listTenderStaging,
  getTenderStagingById,
  getTenderStagingBySourceItemId,
  createTenderStaging,
  updateTenderStaging,
  updateTenderPushState,
  getTenderStagingStats,
  listAllTenderStagingSourceItemIds,
  listActiveTenderStagingForPrune,
  softDeleteTenderStagingByIds,
  deleteTenderStagingBySourceItemIds,
};
