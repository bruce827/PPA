const db = require('../utils/db');
const aiAssessmentLogModel = require('./aiAssessmentLogModel');

function buildInClause(values, params) {
  if (!Array.isArray(values) || values.length === 0) {
    return { clause: '', params };
  }
  const placeholders = values.map(() => '?').join(', ');
  values.forEach((v) => params.push(v));
  return { clause: `(${placeholders})`, params };
}

function buildWhereAndParams({
  startDate,
  endDate,
  steps,
  statuses,
  models,
  promptId,
  projectId,
  searchHash,
}) {
  const where = [];
  const params = [];

  if (startDate) {
    where.push(`created_at >= datetime(?)`);
    params.push(startDate);
  }
  if (endDate) {
    where.push(`created_at <= datetime(?)`);
    params.push(endDate);
  }

  if (promptId !== undefined && promptId !== null && String(promptId).trim() !== '') {
    where.push(`prompt_id = ?`);
    params.push(String(promptId).trim());
  }

  if (projectId !== undefined && projectId !== null && String(projectId).trim() !== '') {
    where.push(`project_id = ?`);
    params.push(Number(projectId));
  }

  if (searchHash) {
    where.push(`request_hash LIKE ?`);
    params.push(`%${String(searchHash).trim()}%`);
  }

  if (Array.isArray(steps) && steps.length > 0) {
    const { clause } = buildInClause(steps, params);
    where.push(`step IN ${clause}`);
  }

  if (Array.isArray(statuses) && statuses.length > 0) {
    const { clause } = buildInClause(statuses, params);
    where.push(`status IN ${clause}`);
  }

  if (Array.isArray(models) && models.length > 0) {
    const { clause } = buildInClause(models, params);
    where.push(`model_used IN ${clause}`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  return { whereSql, params };
}

async function getLogs({
  page = 1,
  pageSize = 20,
  startDate,
  endDate,
  steps,
  statuses,
  models,
  promptId,
  projectId,
  searchHash,
}) {
  await aiAssessmentLogModel.ensureSchema();

  const { whereSql, params } = buildWhereAndParams({
    startDate,
    endDate,
    steps,
    statuses,
    models,
    promptId,
    projectId,
    searchHash,
  });

  const countRow = await db.get(
    `SELECT COUNT(1) AS total
     FROM ai_assessment_logs
     ${whereSql}`,
    params
  );

  const offset = (page - 1) * pageSize;
  const listParams = [...params, pageSize, offset];

  const list = await db.all(
    `SELECT
        id,
        prompt_id,
        model_used,
        request_hash,
        duration_ms,
        status,
        error_message,
        created_at,
        step,
        route,
        project_id
     FROM ai_assessment_logs
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    listParams
  );

  return {
    total: Number(countRow?.total || 0),
    list: Array.isArray(list) ? list : [],
  };
}

async function getStats({
  startDate,
  endDate,
  steps,
  statuses,
  models,
  promptId,
  projectId,
  searchHash,
}) {
  await aiAssessmentLogModel.ensureSchema();

  const { whereSql, params } = buildWhereAndParams({
    startDate,
    endDate,
    steps,
    statuses,
    models,
    promptId,
    projectId,
    searchHash,
  });

  const statRow = await db.get(
    `SELECT
        COUNT(1) AS total_calls,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_calls,
        AVG(COALESCE(duration_ms, 0)) AS avg_duration
     FROM ai_assessment_logs
     ${whereSql}`,
    params
  );

  const lowerError = `lower(COALESCE(error_message, ''))`;
  const parseHit = `${lowerError} LIKE '%json%' OR ${lowerError} LIKE '%parse%' OR ${lowerError} LIKE '%解析%'`;
  const networkHit = `${lowerError} LIKE '%econn%' OR ${lowerError} LIKE '%enotfound%' OR ${lowerError} LIKE '%etimedout%' OR ${lowerError} LIKE '%network%' OR ${lowerError} LIKE '%连接%'`;

  const distRow = await db.get(
    `SELECT
        SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) AS timeout,
        SUM(CASE WHEN status != 'success' AND status != 'timeout' AND (${parseHit}) THEN 1 ELSE 0 END) AS parse,
        SUM(CASE WHEN status != 'success' AND status != 'timeout' AND (${networkHit}) THEN 1 ELSE 0 END) AS network,
        SUM(CASE WHEN status != 'success' AND status != 'timeout' AND NOT ((${parseHit}) OR (${networkHit})) THEN 1 ELSE 0 END) AS other
     FROM ai_assessment_logs
     ${whereSql}`,
    params
  );

  const totalCalls = Number(statRow?.total_calls || 0);
  const successCalls = Number(statRow?.success_calls || 0);
  const avgDuration = Number(statRow?.avg_duration || 0);
  const successRate = totalCalls > 0 ? (successCalls / totalCalls) * 100 : 0;

  return {
    totalCalls,
    successRate,
    avgDuration,
    errorDistribution: {
      timeout: Number(distRow?.timeout || 0),
      parse: Number(distRow?.parse || 0),
      network: Number(distRow?.network || 0),
      other: Number(distRow?.other || 0),
    },
  };
}

async function getLatestLogMetaByHash(requestHash) {
  await aiAssessmentLogModel.ensureSchema();
  const escapeLike = (s) => String(s).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const hash = String(requestHash || '').trim();
  const isFullHash = hash.length >= 64;
  const whereSql = isFullHash ? `request_hash = ?` : `request_hash LIKE ? ESCAPE '\\'`;
  const param = isFullHash ? hash : `${escapeLike(hash)}%`;
  return db.get(
    `SELECT
        id,
        prompt_id,
        model_used,
        request_hash,
        duration_ms,
        status,
        error_message,
        step,
        route,
        project_id,
        log_dir,
        created_at
     FROM ai_assessment_logs
     WHERE ${whereSql}
     ORDER BY created_at DESC
     LIMIT 1`,
    [param]
  );
}

module.exports = {
  getLogs,
  getStats,
  getLatestLogMetaByHash,
};
