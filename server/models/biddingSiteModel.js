const db = require('../utils/db');

const TABLE_NAME = 'opportunity_bidding_sites';
const ENSURE_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS opportunity_bidding_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    alias_name TEXT,
    url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    source_level TEXT,
    province TEXT,
    city TEXT,
    platform_type TEXT,
    is_official INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    notes TEXT,
    validation_status TEXT NOT NULL DEFAULT 'never_validated',
    validation_summary TEXT,
    auth_required INTEGER,
    is_bidding_site INTEGER,
    http_status INTEGER,
    final_url TEXT,
    redirect_chain_json TEXT,
    validation_confidence REAL,
    validation_payload_json TEXT,
    last_validated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_normalized_url
    ON opportunity_bidding_sites(normalized_url)`,
  `CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_source_level
    ON opportunity_bidding_sites(source_level)`,
  `CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_platform_type
    ON opportunity_bidding_sites(platform_type)`,
  `CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_enabled
    ON opportunity_bidding_sites(enabled)`,
  `CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_validation_status
    ON opportunity_bidding_sites(validation_status)`,
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

function parseBooleanField(value) {
  if (value === null || typeof value === 'undefined') return null;
  return Boolean(value);
}

function toDbBoolean(value) {
  if (value === null || typeof value === 'undefined') return null;
  return value ? 1 : 0;
}

function mapRow(row) {
  if (!row) return null;

  return {
    ...row,
    is_official: Boolean(row.is_official),
    enabled: Boolean(row.enabled),
    auth_required: parseBooleanField(row.auth_required),
    is_bidding_site: parseBooleanField(row.is_bidding_site),
    redirect_chain: parseJsonField(row.redirect_chain_json, []),
    validation_payload: parseJsonField(row.validation_payload_json, null),
  };
}

function buildFilters(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.keyword) {
    conditions.push('(name LIKE ? OR alias_name LIKE ? OR url LIKE ? OR notes LIKE ?)');
    const keyword = `%${filters.keyword}%`;
    params.push(keyword, keyword, keyword, keyword);
  }

  if (filters.source_level) {
    conditions.push('source_level = ?');
    params.push(filters.source_level);
  }

  if (filters.platform_type) {
    conditions.push('platform_type = ?');
    params.push(filters.platform_type);
  }

  if (typeof filters.is_official === 'boolean') {
    conditions.push('is_official = ?');
    params.push(filters.is_official ? 1 : 0);
  }

  if (typeof filters.enabled === 'boolean') {
    conditions.push('enabled = ?');
    params.push(filters.enabled ? 1 : 0);
  }

  if (filters.validation_status) {
    conditions.push('validation_status = ?');
    params.push(filters.validation_status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, params };
}

async function listBiddingSites(filters = {}) {
  await ensureSchema();
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const pageSize = Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 20;
  const offset = (page - 1) * pageSize;
  const { whereClause, params } = buildFilters(filters);

  const totalRow = await db.get(`SELECT COUNT(1) AS total FROM ${TABLE_NAME} ${whereClause}`, params);
  const rows = await db.all(
    `SELECT *
     FROM ${TABLE_NAME}
     ${whereClause}
     ORDER BY updated_at DESC, id DESC
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

async function getBiddingSiteById(id) {
  await ensureSchema();
  const row = await db.get(`SELECT * FROM ${TABLE_NAME} WHERE id = ?`, [id]);
  return mapRow(row);
}

async function getBiddingSiteByNormalizedUrl(normalizedUrl) {
  await ensureSchema();
  const row = await db.get(
    `SELECT * FROM ${TABLE_NAME} WHERE normalized_url = ?`,
    [normalizedUrl]
  );
  return mapRow(row);
}

async function createBiddingSite(data) {
  await ensureSchema();
  const result = await db.run(
    `INSERT INTO ${TABLE_NAME} (
      name,
      alias_name,
      url,
      normalized_url,
      source_level,
      province,
      city,
      platform_type,
      is_official,
      enabled,
      notes,
      validation_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.alias_name,
      data.url,
      data.normalized_url,
      data.source_level,
      data.province,
      data.city,
      data.platform_type,
      toDbBoolean(data.is_official),
      toDbBoolean(data.enabled),
      data.notes,
      data.validation_status,
    ]
  );

  return getBiddingSiteById(result.lastID);
}

async function updateBiddingSite(id, data) {
  await ensureSchema();
  await db.run(
    `UPDATE ${TABLE_NAME}
       SET name = ?,
           alias_name = ?,
           url = ?,
           normalized_url = ?,
           source_level = ?,
           province = ?,
           city = ?,
           platform_type = ?,
           is_official = ?,
           enabled = ?,
           notes = ?,
           updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      data.name,
      data.alias_name,
      data.url,
      data.normalized_url,
      data.source_level,
      data.province,
      data.city,
      data.platform_type,
      toDbBoolean(data.is_official),
      toDbBoolean(data.enabled),
      data.notes,
      id,
    ]
  );

  return getBiddingSiteById(id);
}

async function updateValidationResult(id, data) {
  await ensureSchema();
  await db.run(
    `UPDATE ${TABLE_NAME}
       SET validation_status = ?,
           validation_summary = ?,
           auth_required = ?,
           is_bidding_site = ?,
           http_status = ?,
           final_url = ?,
           redirect_chain_json = ?,
           validation_confidence = ?,
           validation_payload_json = ?,
           last_validated_at = ?,
           updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      data.validation_status,
      data.validation_summary,
      toDbBoolean(data.auth_required),
      toDbBoolean(data.is_bidding_site),
      data.http_status,
      data.final_url,
      data.redirect_chain_json,
      data.validation_confidence,
      data.validation_payload_json,
      data.last_validated_at,
      id,
    ]
  );

  return getBiddingSiteById(id);
}

async function deleteBiddingSite(id) {
  await ensureSchema();
  return db.run(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);
}

module.exports = {
  ensureSchema,
  listBiddingSites,
  getBiddingSiteById,
  getBiddingSiteByNormalizedUrl,
  createBiddingSite,
  updateBiddingSite,
  updateValidationResult,
  deleteBiddingSite,
};
