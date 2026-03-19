const http = require('http');
const https = require('https');
const { URL } = require('url');

const logger = require('../../utils/logger');
const {
  HttpError,
  internalError,
  timeoutError,
  unprocessableError,
} = require('../../utils/errors');

const DEFAULT_TIMEOUT_MS = parseInt(process.env.AI_PROVIDER_TIMEOUT_MS || '20000', 10);
const MAX_RETRIES = 2;
const DEFAULT_MAX_RESULTS = 5;
const SEARCH_DEPTH_ALLOWLIST = new Set(['basic', 'advanced', 'fast', 'ultra-fast']);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSearchDepth(model) {
  const value = String(model || '').trim().toLowerCase();
  if (SEARCH_DEPTH_ALLOWLIST.has(value)) {
    return value;
  }
  if (value.includes('ultra-fast')) {
    return 'ultra-fast';
  }
  if (value.includes('advanced')) {
    return 'advanced';
  }
  if (value.includes('fast')) {
    return 'fast';
  }
  return 'basic';
}

function normalizeMaxResults(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_MAX_RESULTS;
  }
  return Math.min(numeric, 10);
}

function buildRequestUrl(api_host) {
  let url;
  try {
    url = new URL(api_host);
  } catch (_error) {
    throw internalError('Tavily API Host 配置不正确');
  }

  if (!url.pathname || url.pathname === '/') {
    url.pathname = '/search';
  }

  return url;
}

function deriveSiteName(itemUrl) {
  try {
    const url = new URL(itemUrl);
    return url.hostname.replace(/^www\./i, '');
  } catch (_error) {
    return '未知来源';
  }
}

function normalizePublishedAt(item) {
  return String(
    item?.published_date || item?.published_at || item?.publishedAt || ''
  )
    .trim()
    .slice(0, 32);
}

function normalizeContentType(item) {
  const haystack = `${item?.title || ''} ${item?.content || ''} ${item?.url || ''}`;

  if (/中标/i.test(haystack)) return '中标结果';
  if (/变更|更正|澄清/i.test(haystack)) return '变更公告';
  if (/采购/i.test(haystack)) return '采购公告';
  if (/招标/i.test(haystack)) return '招标公告';
  if (/新闻|报道/i.test(haystack)) return '项目新闻';
  if (/政策/i.test(haystack)) return '政策通知';
  if (/官网/i.test(haystack)) return '官网介绍';
  if (/动态/i.test(haystack)) return '企业动态';
  return '其他';
}

function buildRelevanceReason(item) {
  const reasons = ['Tavily 按搜索相关度返回了该结果'];

  if (typeof item?.score === 'number' && Number.isFinite(item.score)) {
    reasons.push(`相关度分数 ${item.score.toFixed(2)}`);
  }

  if (item?.url) {
    reasons.push(`来源站点 ${deriveSiteName(item.url)}`);
  }

  return reasons.join('，');
}

function normalizeResults(data) {
  const rawResults = Array.isArray(data?.results) ? data.results : [];

  return rawResults
    .map((item) => {
      const site_url = String(item?.url || '').trim();
      const page_title = String(item?.title || '').trim();
      const snippet = String(item?.content || '').trim();

      if (!site_url || !page_title || !snippet) {
        return null;
      }

      return {
        site_name: deriveSiteName(site_url),
        site_url,
        page_title,
        content_type: normalizeContentType(item),
        published_at: normalizePublishedAt(item),
        snippet,
        relevance_reason: buildRelevanceReason(item),
        confidence:
          typeof item?.score === 'number' && Number.isFinite(item.score)
            ? Number(item.score.toFixed(4))
            : null,
      };
    })
    .filter(Boolean);
}

function normalizeToSearchPayload(data) {
  const results = normalizeResults(data);
  const summary =
    typeof data?.answer === 'string' && data.answer.trim()
      ? data.answer.trim()
      : results.length > 0
        ? `共找到 ${results.length} 条高相关结果。`
        : '未检索到高相关结果。';

  return {
    summary,
    results,
  };
}

function normalizeToOpenAIShape(data, model) {
  const payload = normalizeToSearchPayload(data);

  return {
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: JSON.stringify(payload),
        },
        finish_reason: 'stop',
      },
    ],
    raw_tavily: data,
  };
}

function requestOnce({ prompt, query, model, requestHash, api_host, api_key, timeoutMs, maxResults }) {
  if (!api_key) {
    return Promise.reject(internalError('Tavily API Key 未配置'));
  }

  if (!api_host) {
    return Promise.reject(internalError('Tavily API Host 未配置'));
  }

  const url = buildRequestUrl(api_host);
  const searchDepth = normalizeSearchDepth(model);
  const searchQuery = String(query || prompt || '').trim();

  if (!searchQuery) {
    return Promise.reject(unprocessableError('Tavily 检索内容为空'));
  }

  const payload = JSON.stringify({
    query: searchQuery,
    search_depth: searchDepth,
    max_results: normalizeMaxResults(maxResults),
    include_answer: true,
    include_raw_content: false,
    topic: 'general',
  });

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + (url.search || ''),
    method: 'POST',
    protocol: url.protocol,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      Authorization: `Bearer ${api_key}`,
      'User-Agent': 'PPA-AI-Agent/1.0',
    },
  };

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        const durationMs = Date.now() - startedAt;

        if (res.statusCode >= 400) {
          let errorMessage = `Tavily 响应错误 (${res.statusCode})`;
          try {
            const parsed = JSON.parse(responseBody || '{}');
            errorMessage = parsed.error?.message || parsed.detail || parsed.message || errorMessage;
          } catch (_error) {
            // ignore
          }

          const error =
            res.statusCode === 400 || res.statusCode === 422
              ? unprocessableError(errorMessage)
              : internalError(errorMessage);
          error.statusCode = res.statusCode;
          error.durationMs = durationMs;
          return reject(error);
        }

        let data;
        try {
          data = responseBody ? JSON.parse(responseBody) : {};
        } catch (_error) {
          const parseError = unprocessableError('Tavily 返回非 JSON 数据');
          parseError.details = { raw: responseBody };
          parseError.durationMs = durationMs;
          return reject(parseError);
        }

        const normalized = normalizeToOpenAIShape(data, searchDepth);
        const requestId = res.headers['x-request-id'] || res.headers['request-id'];

        logger.info('Tavily 调用成功', {
          requestHash,
          requestId,
          searchDepth,
          durationMs,
        });

        resolve({
          data: normalized,
          statusCode: res.statusCode,
          model: searchDepth,
          requestId,
          durationMs,
        });
      });
    });

    req.on('error', (error) => {
      const durationMs = Date.now() - startedAt;
      logger.error('Tavily 网络错误', {
        requestHash,
        message: error.message,
      });
      const err = new HttpError(500, `Tavily 网络错误: ${error.message}`, 'TavilyNetworkError');
      err.durationMs = durationMs;
      reject(err);
    });

    const effectiveTimeout = timeoutMs || DEFAULT_TIMEOUT_MS;
    req.setTimeout(effectiveTimeout, () => {
      req.destroy();
      const durationMs = Date.now() - startedAt;
      logger.error('Tavily 调用超时', {
        requestHash,
        durationMs,
      });
      const err = timeoutError(`Tavily 超时 (${effectiveTimeout}ms)`);
      err.durationMs = durationMs;
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

async function createRiskAssessment(params) {
  let attempt = 0;
  let lastError = null;

  while (attempt < MAX_RETRIES) {
    attempt += 1;
    try {
      return await requestOnce(params);
    } catch (error) {
      lastError = error;
      const isClientError = error.statusCode && error.statusCode < 500 && error.statusCode !== 429;
      const shouldRetry = attempt < MAX_RETRIES && !isClientError;

      if (!shouldRetry) {
        throw error;
      }

      const delayMs = Math.pow(2, attempt) * 200;
      logger.warn('Tavily 调用失败，准备重试', {
        attempt,
        delayMs,
        requestHash: params.requestHash,
        reason: error.message,
      });
      await delay(delayMs);
    }
  }

  throw lastError || internalError('Tavily 调用失败');
}

module.exports = {
  createRiskAssessment,
};
