const crypto = require('crypto');
const http = require('http');
const https = require('https');
const zlib = require('zlib');
const { URL } = require('url');

const chardet = require('chardet');
const iconv = require('iconv-lite');

const aiModelModel = require('../models/aiModelModel');
const aiAssessmentLogModel = require('../models/aiAssessmentLogModel');
const { selectProvider } = require('../providers/ai/providerSelector');
const aiFileLogger = require('./aiFileLogger');
const logger = require('../utils/logger');

const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = parseInt(process.env.BIDDING_SITE_VALIDATE_TIMEOUT_MS || '12000', 10);
const AI_TIMEOUT_MS = parseInt(process.env.BIDDING_SITE_VALIDATE_AI_TIMEOUT_MS || '25000', 10);
const AI_SNIPPET_LIMIT = 4000;

function truncateText(value, limit) {
  const text = value ? String(value) : '';
  if (!limit || text.length <= limit) return text;
  return text.slice(0, limit);
}

function extractContentFromProviderResponse(response) {
  if (!response) return '';
  if (typeof response === 'string') return response;
  const { choices } = response;
  if (Array.isArray(choices) && choices.length > 0) {
    const firstChoice = choices[0];
    const message = firstChoice.message || {};
    if (message.content) return message.content;
    if (firstChoice.text) return firstChoice.text;
  }
  return JSON.stringify(response);
}

function cleanJsonCandidate(candidate) {
  if (typeof candidate !== 'string') return candidate;
  return candidate.replace(/```json/gi, '').replace(/```/g, '').trim();
}

function normalizeAiBoolean(value) {
  if (value === true || value === false) return value;
  if (value === null || typeof value === 'undefined') return null;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', '1', '是'].includes(normalized)) return true;
    if (['false', 'no', '0', '否'].includes(normalized)) return false;
  }
  return null;
}

function normalizeConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 0) return 0;
  if (numeric > 1) return 1;
  return Number(numeric.toFixed(2));
}

function normalizeCharset(value) {
  if (!value) return '';
  const normalized = String(value).trim().replace(/['"]/g, '').toLowerCase();
  if (normalized === 'gb2312' || normalized === 'gbk') return 'gb18030';
  if (normalized === 'utf8') return 'utf-8';
  return normalized;
}

function decodeBody(buffer, headers = {}) {
  if (!buffer || buffer.length === 0) {
    return {
      text: '',
      charset: 'utf-8',
    };
  }

  const contentEncoding = String(headers['content-encoding'] || '').toLowerCase();
  let decodedBuffer = buffer;

  try {
    if (contentEncoding.includes('br')) {
      decodedBuffer = zlib.brotliDecompressSync(buffer);
    } else if (contentEncoding.includes('gzip')) {
      decodedBuffer = zlib.gunzipSync(buffer);
    } else if (contentEncoding.includes('deflate')) {
      decodedBuffer = zlib.inflateSync(buffer);
    }
  } catch (error) {
    logger.warn('解压站点响应失败，回退为原始响应体', { message: error.message });
    decodedBuffer = buffer;
  }

  const contentType = String(headers['content-type'] || '');
  const charsetMatch = contentType.match(/charset=([^;]+)/i);
  const detectedCharset = normalizeCharset(
    charsetMatch?.[1] || chardet.detect(decodedBuffer) || 'utf-8'
  );
  const charset = iconv.encodingExists(detectedCharset) ? detectedCharset : 'utf-8';

  try {
    return {
      text: iconv.decode(decodedBuffer, charset),
      charset,
    };
  } catch (_error) {
    return {
      text: decodedBuffer.toString('utf8'),
      charset: 'utf-8',
    };
  }
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(text) {
  const match = String(text || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).slice(0, 200) : '';
}

function containsAuthMarker(text) {
  const content = String(text || '').toLowerCase();
  return (
    /type\s*=\s*["']?password/i.test(content) ||
    /(统一身份认证|单点登录|用户登录|请登录|登录后查看|账号登录|密码登录|sso|signin|sign in|login)/i.test(content)
  );
}

function extractSnippet(text) {
  return truncateText(stripHtml(text), 1200);
}

function buildHeuristicResult(site, probeResult) {
  const joinedSignals = [
    site.name,
    probeResult.title,
    probeResult.snippet,
    probeResult.final_url,
  ]
    .filter(Boolean)
    .join(' ');

  const biddingKeywords = [
    '招标',
    '采购',
    '公共资源',
    '交易中心',
    '招投标',
    '电子交易平台',
    '中标',
    '竞价',
    '比选',
    '政府采购',
    '招采',
  ];
  const biddingHits = biddingKeywords.filter((keyword) => joinedSignals.includes(keyword));

  const authPath = /\/(login|signin|sso|oauth|cas|auth)(\/|$|\?)/i.test(probeResult.final_url || '');
  const authRequired =
    probeResult.status_code === 401 ||
    probeResult.status_code === 403 ||
    authPath ||
    probeResult.has_auth_marker;

  let isBiddingSite = null;
  if (biddingHits.length >= 2) {
    isBiddingSite = true;
  } else if (!authRequired && probeResult.status_code >= 200 && probeResult.status_code < 400) {
    isBiddingSite = false;
  }

  const confidenceBase = Math.min(0.9, 0.3 + biddingHits.length * 0.12 + (authRequired ? 0.05 : 0));
  const confidence = normalizeConfidence(confidenceBase);
  const reasonParts = [];
  if (biddingHits.length > 0) {
    reasonParts.push(`命中关键词: ${biddingHits.join('、')}`);
  }
  if (authRequired) {
    reasonParts.push('页面存在登录或身份认证特征');
  }
  if (probeResult.redirect_chain.length > 1) {
    reasonParts.push(`发生 ${probeResult.redirect_chain.length - 1} 次跳转`);
  }
  if (reasonParts.length === 0) {
    reasonParts.push('页面特征较弱，启发式判断置信度有限');
  }

  return {
    auth_required: authRequired,
    is_bidding_site: isBiddingSite,
    confidence,
    summary: reasonParts.join('；'),
    keyword_hits: biddingHits,
  };
}

function requestOnce(targetUrl) {
  const url = new URL(targetUrl);
  const client = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname || '/'}${url.search || ''}`,
        method: 'GET',
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
          'User-Agent': 'PPA-BiddingSiteValidator/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      (res) => {
        const chunks = [];
        let total = 0;
        let truncated = false;

        res.on('data', (chunk) => {
          if (!Buffer.isBuffer(chunk)) return;
          if (total < MAX_BODY_BYTES) {
            const nextChunk = chunk.slice(0, Math.max(0, MAX_BODY_BYTES - total));
            if (nextChunk.length > 0) {
              chunks.push(nextChunk);
              total += nextChunk.length;
            }
          } else {
            truncated = true;
          }
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
            truncated,
          });
        });
      }
    );

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`请求超时 (${REQUEST_TIMEOUT_MS}ms)`));
    });

    req.end();
  });
}

async function probeUrl(rawUrl) {
  const redirectChain = [];
  let currentUrl = rawUrl;

  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt += 1) {
    const response = await requestOnce(currentUrl);
    const statusCode = response.statusCode || 0;
    const location = response.headers.location
      ? new URL(response.headers.location, currentUrl).toString()
      : null;

    redirectChain.push({
      url: currentUrl,
      status_code: statusCode,
      location,
    });

    if (location && statusCode >= 300 && statusCode < 400) {
      currentUrl = location;
      continue;
    }

    const decoded = decodeBody(response.body, response.headers);
    const title = extractTitle(decoded.text);
    const snippet = extractSnippet(decoded.text);
    const finalUrl = currentUrl;
    const hasAuthMarker = containsAuthMarker(decoded.text);
    const explicitFailure =
      (statusCode >= 400 && statusCode !== 401 && statusCode !== 403) || statusCode === 0;

    return {
      ok: !explicitFailure,
      explicit_failure: explicitFailure,
      status_code: statusCode,
      final_url: finalUrl,
      redirect_chain: redirectChain,
      title,
      snippet,
      charset: decoded.charset,
      content_type: response.headers['content-type'] || '',
      body_truncated: response.truncated,
      has_auth_marker: hasAuthMarker,
    };
  }

  return {
    ok: false,
    explicit_failure: true,
    status_code: null,
    final_url: currentUrl,
    redirect_chain: redirectChain,
    title: '',
    snippet: '',
    charset: '',
    content_type: '',
    body_truncated: false,
    has_auth_marker: false,
    error_message: `重定向超过 ${MAX_REDIRECTS} 次`,
  };
}

function buildAiPrompt(site, probeResult, heuristicResult) {
  const payload = {
    site_name: site.name,
    url: site.url,
    source_level: site.source_level,
    platform_type: site.platform_type,
    probe: {
      status_code: probeResult.status_code,
      final_url: probeResult.final_url,
      title: probeResult.title,
      snippet: truncateText(probeResult.snippet, AI_SNIPPET_LIMIT),
      redirect_chain: probeResult.redirect_chain,
      charset: probeResult.charset,
      content_type: probeResult.content_type,
      has_auth_marker: probeResult.has_auth_marker,
    },
    heuristic: heuristicResult,
  };

  return [
    '你是一个中国招标网站识别助手。请根据输入的站点探测结果，只返回一个 JSON 对象。',
    'JSON 结构必须是：',
    '{',
    '  "is_bidding_site": true | false | null,',
    '  "auth_required": true | false | null,',
    '  "summary": "一句中文总结",',
    '  "confidence": 0 到 1 之间的小数,',
    '  "reasons": ["原因1", "原因2"]',
    '}',
    '不要输出 Markdown，不要输出额外解释。',
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

function parseAiResponse(rawResponse) {
  const rawContent = cleanJsonCandidate(extractContentFromProviderResponse(rawResponse));
  let parsed = null;

  if (typeof rawContent === 'string') {
    try {
      parsed = JSON.parse(rawContent);
    } catch (_error) {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    }
  } else if (rawContent && typeof rawContent === 'object') {
    parsed = rawContent;
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI 响应不是有效 JSON');
  }

  const reasons = Array.isArray(parsed.reasons)
    ? parsed.reasons.map((item) => String(item).trim()).filter(Boolean)
    : [];

  return {
    is_bidding_site: normalizeAiBoolean(parsed.is_bidding_site),
    auth_required: normalizeAiBoolean(parsed.auth_required),
    summary: truncateText(parsed.summary || '', 500),
    confidence: normalizeConfidence(parsed.confidence),
    reasons,
  };
}

async function logAiAssessment({
  requestHash,
  modelUsed,
  durationMs,
  status,
  errorMessage,
  prompt,
  responseRaw,
  responseParsed,
}) {
  try {
    await aiAssessmentLogModel.insertLog({
      promptId: 'bidding-site-validation',
      modelUsed,
      requestHash,
      durationMs,
      status,
      errorMessage,
      step: 'site-validation',
      route: '/api/opportunity/bidding-sites/:id/validate',
    });
  } catch (error) {
    logger.warn('写入 ai_assessment_logs 失败(招标网站校验)', { error: error.message });
  }

  try {
    await aiFileLogger.save({
      step: 'site-validation',
      route: '/api/opportunity/bidding-sites/:id/validate',
      requestHash,
      promptTemplateId: 'bidding-site-validation',
      modelProvider: modelUsed ? String(modelUsed).split(':')[0] : '',
      modelName: modelUsed,
      status,
      durationMs,
      providerTimeoutMs: AI_TIMEOUT_MS,
      serviceTimeoutMs: AI_TIMEOUT_MS + 1000,
      request: {
        finalPrompt: prompt,
      },
      responseRaw,
      responseParsed,
      notesLines: errorMessage ? [errorMessage] : [],
    });
  } catch (_error) {}
}

async function runAiValidation(site, probeResult, heuristicResult) {
  let currentModel = null;

  try {
    currentModel = await aiModelModel.getCurrentModel();
  } catch (_error) {
    currentModel = null;
  }

  if (!currentModel) {
    return {
      state: 'unavailable',
      error_message: '未配置当前可用的 AI 模型',
    };
  }

  const providerLabel = currentModel.provider || 'openai-compatible';
  const { impl: providerImpl } = selectProvider(providerLabel);
  const prompt = buildAiPrompt(site, probeResult, heuristicResult);
  const requestHash = crypto
    .createHash('sha256')
    .update(`${site.id || ''}:${site.normalized_url}:${truncateText(prompt, 1000)}`)
    .digest('hex');
  const startedAt = Date.now();

  try {
    const providerResult = await Promise.race([
      providerImpl.createRiskAssessment({
        prompt,
        model: currentModel.model_name,
        requestHash,
        api_host: currentModel.api_host,
        api_key: currentModel.api_key,
        maxTokens: parseInt(currentModel.max_tokens, 10) || 800,
        timeoutMs: Math.max(5000, (parseInt(currentModel.timeout, 10) || 20) * 1000),
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`AI 调用超时 (${AI_TIMEOUT_MS}ms)`)), AI_TIMEOUT_MS);
      }),
    ]);

    const rawSource = providerResult.data || providerResult;
    const parsed = parseAiResponse(rawSource);
    const durationMs = providerResult.durationMs || Date.now() - startedAt;

    await logAiAssessment({
      requestHash,
      modelUsed: providerResult.model || currentModel.model_name,
      durationMs,
      status: 'success',
      prompt,
      responseRaw: extractContentFromProviderResponse(rawSource),
      responseParsed: parsed,
    });

    return {
      state: 'success',
      ...parsed,
    };
  } catch (error) {
    const durationMs = error.durationMs || Date.now() - startedAt;
    await logAiAssessment({
      requestHash,
      modelUsed: currentModel.model_name,
      durationMs,
      status: 'failed',
      errorMessage: error.message,
      prompt,
      responseRaw: '',
      responseParsed: null,
    });

    return {
      state: 'failed',
      error_message: error.message,
    };
  }
}

function mergeValidationResult(site, probeResult, heuristicResult, aiResult) {
  const authRequired =
    aiResult?.state === 'success' && aiResult.auth_required !== null
      ? aiResult.auth_required
      : heuristicResult.auth_required;
  const isBiddingSite =
    aiResult?.state === 'success' && aiResult.is_bidding_site !== null
      ? aiResult.is_bidding_site
      : heuristicResult.is_bidding_site;
  const confidence =
    aiResult?.state === 'success' && aiResult.confidence !== null
      ? aiResult.confidence
      : heuristicResult.confidence;
  const summary =
    aiResult?.state === 'success' && aiResult.summary
      ? aiResult.summary
      : heuristicResult.summary || probeResult.error_message || '未能形成有效判断';

  let validationStatus = 'validated_failed';
  if (probeResult.ok) {
    if (aiResult?.state !== 'success') {
      validationStatus = 'heuristic_only';
    } else if (
      authRequired !== true &&
      isBiddingSite === true &&
      (confidence === null || confidence >= 0.6)
    ) {
      validationStatus = 'validated_ok';
    } else {
      validationStatus = 'validated_warning';
    }
  }

  const validationPayload = {
    site: {
      id: site.id,
      name: site.name,
      url: site.url,
      normalized_url: site.normalized_url,
    },
    probe: probeResult,
    heuristic: heuristicResult,
    ai: aiResult || null,
  };

  return {
    validation_status: validationStatus,
    validation_summary: summary,
    auth_required: probeResult.ok ? authRequired : null,
    is_bidding_site: probeResult.ok ? isBiddingSite : null,
    http_status: probeResult.status_code,
    final_url: probeResult.final_url || site.url,
    redirect_chain_json: JSON.stringify(probeResult.redirect_chain || []),
    validation_confidence: confidence,
    validation_payload_json: JSON.stringify(validationPayload),
    last_validated_at: new Date().toISOString(),
    validation_payload: validationPayload,
  };
}

async function validateBiddingSite(site) {
  try {
    const probeResult = await probeUrl(site.url);
    const heuristicResult = buildHeuristicResult(site, probeResult);
    const aiResult = probeResult.ok
      ? await runAiValidation(site, probeResult, heuristicResult)
      : {
          state: 'skipped',
          error_message: probeResult.error_message || '网络探测失败',
        };

    return mergeValidationResult(site, probeResult, heuristicResult, aiResult);
  } catch (error) {
    const validationPayload = {
      site: {
        id: site.id,
        name: site.name,
        url: site.url,
        normalized_url: site.normalized_url,
      },
      error: {
        message: error.message,
      },
    };

    return {
      validation_status: 'validated_failed',
      validation_summary: error.message || '校验失败',
      auth_required: null,
      is_bidding_site: null,
      http_status: null,
      final_url: site.url,
      redirect_chain_json: JSON.stringify([]),
      validation_confidence: null,
      validation_payload_json: JSON.stringify(validationPayload),
      last_validated_at: new Date().toISOString(),
      validation_payload: validationPayload,
    };
  }
}

module.exports = {
  validateBiddingSite,
  probeUrl,
  buildHeuristicResult,
  parseAiResponse,
};
