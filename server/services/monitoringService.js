const { validationError } = require('../utils/errors');
const monitoringModel = require('../models/monitoringModel');
const aiAssessmentLogModel = require('../models/aiAssessmentLogModel');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

function normalizeNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v || '').trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

async function getLogs(query = {}) {
  const page = Math.max(1, Math.floor(normalizeNumber(query.page, 1)));
  const pageSize = Math.max(1, Math.min(100, Math.floor(normalizeNumber(query.pageSize, 20))));

  const startDate = normalizeOptionalString(query.startDate);
  const endDate = normalizeOptionalString(query.endDate);

  const steps = normalizeStringArray(query.steps);
  const statuses = normalizeStringArray(query.statuses);
  const models = normalizeStringArray(query.models);

  const promptId = normalizeOptionalString(query.promptId);
  const projectIdRaw = normalizeOptionalString(query.projectId);
  const searchHash = normalizeOptionalString(query.searchHash);

  let projectId;
  if (projectIdRaw !== undefined) {
    const parsed = Number(projectIdRaw);
    if (!Number.isFinite(parsed)) {
      throw validationError('projectId 必须为数字');
    }
    projectId = parsed;
  }

  const { total, list } = await monitoringModel.getLogs({
    page,
    pageSize,
    startDate,
    endDate,
    steps,
    statuses,
    models,
    promptId,
    projectId,
    searchHash,
  });

  return {
    total,
    page,
    pageSize,
    list,
  };
}

async function getStats(query = {}) {
  const startDate = normalizeOptionalString(query.startDate);
  const endDate = normalizeOptionalString(query.endDate);

  const steps = normalizeStringArray(query.steps);
  const statuses = normalizeStringArray(query.statuses);
  const models = normalizeStringArray(query.models);

  const promptId = normalizeOptionalString(query.promptId);
  const projectIdRaw = normalizeOptionalString(query.projectId);
  const searchHash = normalizeOptionalString(query.searchHash);

  let projectId;
  if (projectIdRaw !== undefined) {
    const parsed = Number(projectIdRaw);
    if (!Number.isFinite(parsed)) {
      throw validationError('projectId 必须为数字');
    }
    projectId = parsed;
  }

  return monitoringModel.getStats({
    startDate,
    endDate,
    steps,
    statuses,
    models,
    promptId,
    projectId,
    searchHash,
  });
}

function getAiLogBaseDir() {
  return process.env.AI_LOG_DIR || path.resolve(__dirname, '..', 'logs', 'ai');
}

function validateRequestHash(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    throw validationError('requestHash 不能为空');
  }
  if (value.length > 128) {
    throw validationError('requestHash 长度超出限制');
  }
  if (value.includes('..') || value.includes('/') || value.includes('\\')) {
    throw validationError('requestHash 非法');
  }
  return value;
}

async function safeReadText(filePath) {
  try {
    return await fsp.readFile(filePath, 'utf8');
  } catch (_e) {
    return null;
  }
}

async function safeReadJson(filePath) {
  const raw = await safeReadText(filePath);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {
      _parse_error: e.message,
      _raw_text: raw,
    };
  }
}

async function listSubdirs(dirPath) {
  try {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (_e) {
    return [];
  }
}

async function findLogDir({ baseDir, step, dateHint, requestHash, shortHash }) {
  const candidates = [];

  if (step) {
    candidates.push(path.join(baseDir, step));
  } else {
    const steps = await listSubdirs(baseDir);
    steps.forEach((s) => candidates.push(path.join(baseDir, s)));
  }

  for (const stepDir of candidates) {
    const dateDirs = await listSubdirs(stepDir);

    const orderedDates = (() => {
      if (dateHint && dateDirs.includes(dateHint)) {
        return [dateHint, ...dateDirs.filter((d) => d !== dateHint)];
      }
      return dateDirs;
    })();

    for (const dateDirName of orderedDates) {
      const dateDir = path.join(stepDir, dateDirName);
      const runDirs = await listSubdirs(dateDir);
      const matchedDirs = runDirs.filter((d) => d.endsWith(`_${shortHash}`));
      for (const matched of matchedDirs) {
        const candidateDir = path.join(dateDir, matched);
        const indexPath = path.join(candidateDir, 'index.json');
        const indexJson = await safeReadJson(indexPath);
        const candidateHash = typeof indexJson?.request_hash === 'string' ? indexJson.request_hash : null;

        if (!candidateHash) {
          return candidateDir;
        }

        if (candidateHash.startsWith(requestHash)) {
          return candidateDir;
        }
      }
    }
  }

  return null;
}

async function getLogDetail(requestHashParam) {
  const requestHash = validateRequestHash(requestHashParam);
  const baseDir = getAiLogBaseDir();
  const baseDirResolved = path.resolve(baseDir);

  const meta = await monitoringModel.getLatestLogMetaByHash(requestHash);
  const detailMeta = meta
    ? {
        id: typeof meta.id === 'undefined' ? null : meta.id,
        requestHash: meta.request_hash || null,
        status: meta.status || null,
        durationMs: typeof meta.duration_ms === 'undefined' ? null : meta.duration_ms,
        errorMessage: meta.error_message || null,
        step: meta.step || null,
        route: meta.route || null,
        promptId: meta.prompt_id || null,
        modelUsed: meta.model_used || null,
        projectId: typeof meta.project_id === 'undefined' ? null : meta.project_id,
        createdAt: meta.created_at || null,
        logDir: meta.log_dir || null,
      }
    : {
        id: null,
        requestHash: null,
        status: null,
        durationMs: null,
        errorMessage: null,
        step: null,
        route: null,
        promptId: null,
        modelUsed: null,
        projectId: null,
        createdAt: null,
        logDir: null,
      };
  const step = meta?.step ? String(meta.step) : null;
  const createdAt = meta?.created_at ? String(meta.created_at) : null;
  const dateHint = createdAt ? createdAt.slice(0, 10) : null;
  const shortHash = requestHash.slice(0, 12);

  if (!fs.existsSync(baseDirResolved)) {
    return {
      meta: detailMeta,
      index: null,
      request: null,
      responseRaw: null,
      responseParsed: null,
      notes: null,
    };
  }

  const logDirFromDb = typeof meta?.log_dir === 'string' && meta.log_dir.trim() ? meta.log_dir.trim() : null;
  if (logDirFromDb) {
    const resolvedDir = path.resolve(logDirFromDb);
    if (!resolvedDir.startsWith(baseDirResolved + path.sep) && resolvedDir !== baseDirResolved) {
      throw validationError('日志路径非法');
    }

    const indexPath = path.join(resolvedDir, 'index.json');
    const indexJson = await safeReadJson(indexPath);
    const candidateHash = typeof indexJson?.request_hash === 'string' ? indexJson.request_hash : null;

    if (!candidateHash || candidateHash.startsWith(requestHash)) {
      const requestPath = path.join(resolvedDir, 'request.json');
      const rawPath = path.join(resolvedDir, 'response.raw.txt');
      const parsedPath = path.join(resolvedDir, 'response.parsed.json');
      const notesPath = path.join(resolvedDir, 'notes.log');

      const [index, request, responseRaw, responseParsed, notes] = await Promise.all([
        safeReadJson(indexPath),
        safeReadJson(requestPath),
        safeReadText(rawPath),
        safeReadJson(parsedPath),
        safeReadText(notesPath),
      ]);

      detailMeta.logDir = resolvedDir;
      return {
        meta: detailMeta,
        index,
        request,
        responseRaw,
        responseParsed,
        notes,
      };
    }
  }

  const dir = await findLogDir({
    baseDir: baseDirResolved,
    step,
    dateHint,
    requestHash,
    shortHash,
  });

  if (!dir) {
    return {
      meta: detailMeta,
      index: null,
      request: null,
      responseRaw: null,
      responseParsed: null,
      notes: null,
    };
  }

  const resolvedDir = path.resolve(dir);
  if (!resolvedDir.startsWith(baseDirResolved + path.sep) && resolvedDir !== baseDirResolved) {
    throw validationError('日志路径非法');
  }

  const indexPath = path.join(resolvedDir, 'index.json');
  const requestPath = path.join(resolvedDir, 'request.json');
  const rawPath = path.join(resolvedDir, 'response.raw.txt');
  const parsedPath = path.join(resolvedDir, 'response.parsed.json');
  const notesPath = path.join(resolvedDir, 'notes.log');

  const [index, request, responseRaw, responseParsed, notes] = await Promise.all([
    safeReadJson(indexPath),
    safeReadJson(requestPath),
    safeReadText(rawPath),
    safeReadJson(parsedPath),
    safeReadText(notesPath),
  ]);

  const fullHashForCache = typeof index?.request_hash === 'string' ? index.request_hash : null;
  if (fullHashForCache) {
    aiAssessmentLogModel
      .updateLatestLogDirByRequestHash({ requestHash: fullHashForCache, logDir: resolvedDir })
      .catch(() => {});
  }

  detailMeta.logDir = resolvedDir;
  return {
    meta: detailMeta,
    index,
    request,
    responseRaw,
    responseParsed,
    notes,
  };
}

module.exports = {
  getLogs,
  getStats,
  getLogDetail,
};
