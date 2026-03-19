const db = require('../utils/db');

const TABLE_NAME = 'tender_staging_web_search_results';
const ENSURE_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tender_staging_id INTEGER NOT NULL UNIQUE,
    model_config_id INTEGER NOT NULL,
    prompt_template_id INTEGER NOT NULL,
    searched_at TEXT NOT NULL,
    summary TEXT NOT NULL,
    results_json TEXT NOT NULL,
    meta_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_tender_web_search_results_tender_staging_id
    ON ${TABLE_NAME}(tender_staging_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tender_web_search_results_searched_at
    ON ${TABLE_NAME}(searched_at)`,
];

let schemaEnsuredPromise = null;
let schemaEnsuredForConnectionId = null;

function parseJsonField(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function mapRow(row) {
  if (!row) {
    return null;
  }

  const results = parseJsonField(row.results_json, []);
  const meta = parseJsonField(row.meta_json, {});
  const resultCount =
    Number.isInteger(meta.result_count) && meta.result_count >= 0
      ? meta.result_count
      : Array.isArray(results)
        ? results.length
        : 0;

  return {
    record_id: row.tender_staging_id,
    model_id: row.model_config_id,
    prompt_template_id: row.prompt_template_id,
    searched_at: row.searched_at,
    state: meta.state || (resultCount > 0 ? 'fresh_result' : 'empty_result'),
    summary: row.summary,
    results: Array.isArray(results) ? results : [],
    result_count: resultCount,
  };
}

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

async function getByTenderStagingId(tenderStagingId) {
  await ensureSchema();
  const row = await db.get(
    `SELECT * FROM ${TABLE_NAME} WHERE tender_staging_id = ?`,
    [tenderStagingId]
  );
  return mapRow(row);
}

async function saveLatestResult(payload) {
  await ensureSchema();

  const results = Array.isArray(payload.results) ? payload.results : [];
  const meta = {
    ...(payload.meta || {}),
    state: payload.state || (results.length > 0 ? 'fresh_result' : 'empty_result'),
    result_count: results.length,
  };
  const existing = await db.get(
    `SELECT id FROM ${TABLE_NAME} WHERE tender_staging_id = ?`,
    [payload.tender_staging_id]
  );

  if (existing) {
    await db.run(
      `UPDATE ${TABLE_NAME}
       SET model_config_id = ?,
           prompt_template_id = ?,
           searched_at = ?,
           summary = ?,
           results_json = ?,
           meta_json = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE tender_staging_id = ?`,
      [
        payload.model_config_id,
        payload.prompt_template_id,
        payload.searched_at,
        payload.summary,
        JSON.stringify(results),
        JSON.stringify(meta),
        payload.tender_staging_id,
      ]
    );
  } else {
    await db.run(
      `INSERT INTO ${TABLE_NAME} (
        tender_staging_id,
        model_config_id,
        prompt_template_id,
        searched_at,
        summary,
        results_json,
        meta_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.tender_staging_id,
        payload.model_config_id,
        payload.prompt_template_id,
        payload.searched_at,
        payload.summary,
        JSON.stringify(results),
        JSON.stringify(meta),
      ]
    );
  }

  return getByTenderStagingId(payload.tender_staging_id);
}

module.exports = {
  TABLE_NAME,
  ENSURE_SCHEMA_STATEMENTS,
  ensureSchema,
  getByTenderStagingId,
  saveLatestResult,
};
