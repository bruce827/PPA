const db = require('../utils/db');

async function insertLog({ promptId, modelUsed, requestHash, durationMs, status, errorMessage }) {
  return db.run(
    `INSERT INTO ai_assessment_logs (prompt_id, model_used, request_hash, duration_ms, status, error_message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [promptId, modelUsed, requestHash, durationMs, status, errorMessage || null]
  );
}

module.exports = {
  insertLog,
};
