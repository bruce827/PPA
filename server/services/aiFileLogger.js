const fsp = require('fs/promises');
const path = require('path');

function pad2(n) {
  return String(n).padStart(2, '0');
}

function getBaseDir() {
  const root = process.env.AI_LOG_DIR || path.resolve(__dirname, '..', 'logs', 'ai');
  return root;
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true }).catch(() => {});
}

function safeJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return JSON.stringify({ _error: 'json_stringify_failed' });
  }
}

function computeCounts(parsed, step) {
  try {
    if (!parsed || typeof parsed !== 'object') return {};
    if (step === 'modules') {
      const modules = Array.isArray(parsed.modules) ? parsed.modules : [];
      return { modules_count: modules.length };
    }
    if (step === 'risk') {
      const rs = Array.isArray(parsed.risk_scores) ? parsed.risk_scores : [];
      return { risk_scores_count: rs.length };
    }
    if (step === 'risk-normalize') {
      const rs = Array.isArray(parsed.risk_scores) ? parsed.risk_scores : [];
      return { normalized_risk_scores_count: rs.length };
    }
    return {};
  } catch (e) {
    return {};
  }
}

async function save({
  step,
  route,
  requestHash,
  promptTemplateId,
  modelProvider,
  modelName,
  status,
  durationMs,
  providerTimeoutMs,
  serviceTimeoutMs,
  request, // { templateContent, variables, description|document, finalPrompt, extras }
  responseRaw,
  responseParsed,
  notesLines = [],
}) {
  try {
    const enabled = process.env.AI_LOG_ENABLED;
    if (enabled !== undefined && !/^true$/i.test(String(enabled))) {
      return null;
    }

    const base = getBaseDir();
    const now = new Date();
    const dateDir = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const timePart = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
    const shortHash = String(requestHash || '').slice(0, 12) || 'nohash';
    const dir = path.join(base, step || 'unknown', dateDir, `${timePart}_${shortHash}`);
    await ensureDir(dir);

    const index = {
      step,
      route,
      request_hash: requestHash,
      prompt_template_id: promptTemplateId,
      model_provider: modelProvider,
      model_name: modelName,
      status,
      duration_ms: durationMs || 0,
      provider_timeout_ms: providerTimeoutMs,
      service_timeout_ms: serviceTimeoutMs,
      timestamp: now.toISOString(),
      ...computeCounts(responseParsed, step),
    };

    const indexPath = path.join(dir, 'index.json');
    const requestPath = path.join(dir, 'request.json');
    const rawPath = path.join(dir, 'response.raw.txt');
    const parsedPath = path.join(dir, 'response.parsed.json');
    const notesPath = path.join(dir, 'notes.log');

    await fsp.writeFile(indexPath, safeJson(index), 'utf8');

    if (request) {
      await fsp.writeFile(requestPath, safeJson(request), 'utf8');
    }

    if (responseRaw !== undefined && responseRaw !== null) {
      await fsp.writeFile(rawPath, String(responseRaw), 'utf8');
    }

    if (responseParsed) {
      await fsp.writeFile(parsedPath, safeJson(responseParsed), 'utf8');
    }

    if (notesLines && notesLines.length > 0) {
      await fsp.writeFile(notesPath, notesLines.join('\n'), 'utf8');
    }
    try {
      // eslint-disable-next-line no-console
      console.info(`[AI File Logger] saved to: ${dir}`);
    } catch {}

    return dir;
  } catch (e) {
    // 仅告警，避免影响主流程
    try {
      // eslint-disable-next-line no-console
      console.warn('[AI File Logger] write failed:', e.message);
    } catch {}

    return null;
  }
}

module.exports = {
  save,
};
