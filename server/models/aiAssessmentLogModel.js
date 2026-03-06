const db = require('../utils/db');
const logger = require('../utils/logger');

let schemaEnsuredPromise = null;
let schemaEnsuredForConnectionId = null;

async function ensureSchema() {
  try {
    const currentConnId = typeof db.getConnectionId === 'function' ? db.getConnectionId() : null;
    if (schemaEnsuredForConnectionId !== null && currentConnId !== null && currentConnId !== schemaEnsuredForConnectionId) {
      schemaEnsuredPromise = null;
      schemaEnsuredForConnectionId = null;
    }
  } catch (e) {}

  if (schemaEnsuredPromise) {
    return schemaEnsuredPromise;
  }

  schemaEnsuredPromise = (async () => {
    try {
      schemaEnsuredForConnectionId = typeof db.getConnectionId === 'function' ? db.getConnectionId() : null;
    } catch (e) {
      schemaEnsuredForConnectionId = null;
    }

    const cols = await db.all(`PRAGMA table_info(ai_assessment_logs)`);
    if (!Array.isArray(cols) || cols.length === 0) {
      const error = new Error('ai_assessment_logs 表不存在或数据库未初始化');
      error.name = 'InternalServerError';
      error.statusCode = 500;
      throw error;
    }

    const colNames = new Set(cols.map((c) => c && c.name).filter(Boolean));

    if (!colNames.has('step')) {
      await db.run(`ALTER TABLE ai_assessment_logs ADD COLUMN step TEXT`);
    }
    if (!colNames.has('route')) {
      await db.run(`ALTER TABLE ai_assessment_logs ADD COLUMN route TEXT`);
    }
    if (!colNames.has('project_id')) {
      await db.run(`ALTER TABLE ai_assessment_logs ADD COLUMN project_id INTEGER`);
    }

    if (!colNames.has('log_dir')) {
      await db.run(`ALTER TABLE ai_assessment_logs ADD COLUMN log_dir TEXT`);
    }

    // 性能相关：AI 日志监控（/api/monitoring/logs + /api/monitoring/stats）会大量按 created_at 倒序分页，
    // 并频繁按 step/status/model_used/prompt_id/project_id 过滤。
    // 这里使用 CREATE INDEX IF NOT EXISTS 做幂等索引创建：
    // - 可重复执行，不会破坏已有库
    // - 对老库升级只需跑一次 ensureSchema 即可补齐索引
    try {
      logger.info('Ensuring ai_assessment_logs indexes (idempotent, for monitoring performance)');
    } catch (e) {}

    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_request_hash
       ON ai_assessment_logs(request_hash)`
    );
    try {
      logger.debug('Ensured index: idx_ai_assessment_logs_request_hash');
    } catch (e) {}

    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_created_at
       ON ai_assessment_logs(created_at)`
    );
    try {
      logger.debug('Ensured index: idx_ai_assessment_logs_created_at');
    } catch (e) {}
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_step_created_at
       ON ai_assessment_logs(step, created_at)`
    );
    try {
      logger.debug('Ensured index: idx_ai_assessment_logs_step_created_at');
    } catch (e) {}
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_status_created_at
       ON ai_assessment_logs(status, created_at)`
    );
    try {
      logger.debug('Ensured index: idx_ai_assessment_logs_status_created_at');
    } catch (e) {}
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_model_created_at
       ON ai_assessment_logs(model_used, created_at)`
    );
    try {
      logger.debug('Ensured index: idx_ai_assessment_logs_model_created_at');
    } catch (e) {}
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_prompt_created_at
       ON ai_assessment_logs(prompt_id, created_at)`
    );
    try {
      logger.debug('Ensured index: idx_ai_assessment_logs_prompt_created_at');
    } catch (e) {}
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_ai_assessment_logs_project_created_at
       ON ai_assessment_logs(project_id, created_at)`
    );
    try {
      logger.debug('Ensured index: idx_ai_assessment_logs_project_created_at');
    } catch (e) {}
  })();

  return schemaEnsuredPromise;
}

async function insertLog({
  promptId,
  modelUsed,
  requestHash,
  durationMs,
  status,
  errorMessage,
  step,
  route,
  projectId,
  logDir,
}) {
  await ensureSchema();
  const result = await db.run(
    `INSERT INTO ai_assessment_logs (
      prompt_id,
      model_used,
      request_hash,
      duration_ms,
      status,
      error_message,
      created_at,
      step,
      route,
      project_id,
      log_dir
    )
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)`,
    [
      promptId,
      modelUsed,
      requestHash,
      durationMs,
      status,
      errorMessage || null,
      step || null,
      route || null,
      typeof projectId === 'undefined' ? null : projectId,
      logDir || null,
    ]
  );

  try {
    const monitoringWsService = require('../services/monitoringWsService');
    monitoringWsService.publishAiLogCreated({
      id: result?.id ?? null,
      prompt_id: promptId || null,
      model_used: modelUsed || null,
      request_hash: requestHash,
      duration_ms: typeof durationMs === 'undefined' ? null : durationMs,
      status: status || null,
      error_message: errorMessage || null,
      created_at: new Date().toISOString(),
      step: step || null,
      route: route || null,
      project_id: typeof projectId === 'undefined' ? null : projectId,
    });
  } catch (e) {}

  return result;
}

async function updateLogDir({ requestHash, step, route, logDir }) {
  if (!logDir) return;
  await ensureSchema();
  return db.run(
    `UPDATE ai_assessment_logs
     SET log_dir = ?
     WHERE id = (
       SELECT id
       FROM ai_assessment_logs
       WHERE request_hash = ?
         AND step = ?
         AND route = ?
       ORDER BY id DESC
       LIMIT 1
     )`,
    [logDir, requestHash, step || null, route || null]
  );
}

async function updateLatestLogDirByRequestHash({ requestHash, logDir }) {
  if (!logDir) return;
  await ensureSchema();
  return db.run(
    `UPDATE ai_assessment_logs
     SET log_dir = ?
     WHERE id = (
       SELECT id
       FROM ai_assessment_logs
       WHERE request_hash = ?
       ORDER BY id DESC
       LIMIT 1
     )`,
    [logDir, requestHash]
  );
}

module.exports = {
  ensureSchema,
  insertLog,
  updateLogDir,
  updateLatestLogDirByRequestHash,
};
