const https = require('https');
const http = require('http');
const { URL } = require('url');
const logger = require('../../utils/logger');
const {
  HttpError,
  internalError,
  timeoutError,
  unprocessableError,
} = require('../../utils/errors');

const DEFAULT_TIMEOUT_MS = parseInt(process.env.AI_PROVIDER_TIMEOUT_MS || '20000', 10);
const MAX_RETRIES = 2; // 请求尝试次数（含初次）

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPayload(prompt, model, maxTokens) {
  const fallbackMaxTokens = Number(process.env.AI_PROVIDER_MAX_TOKENS || '800');
  const resolvedMaxTokens = Number.isFinite(Number(maxTokens))
    ? Number(maxTokens)
    : fallbackMaxTokens;

  const body = {
    model,
    messages: [
      {
        role: 'system',
        content:
          process.env.AI_PROVIDER_SYSTEM_PROMPT ||
          'You are a senior project risk analyst. Return JSON results only.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: Number(process.env.AI_PROVIDER_TEMPERATURE || '0.2'),
    max_tokens: resolvedMaxTokens,
    response_format: { type: 'json_object' },
  };

  return JSON.stringify(body);
}

function requestOnce({ prompt, model, requestHash, api_host, api_key, timeoutMs, maxTokens }) {
  if (!api_key) {
    return Promise.reject(internalError('AI Provider API Key 未配置'));
  }

  if (!api_host) {
    return Promise.reject(internalError('AI Provider API Host 未配置'));
  }

  let url;
  try {
    url = new URL(api_host);
  } catch (error) {
    return Promise.reject(internalError('AI Provider API Host 配置不正确'));
  }

  const payload = buildPayload(prompt, model, maxTokens);

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
          let errorMessage = `AI Provider 响应错误 (${res.statusCode})`;
          try {
            const parsed = JSON.parse(responseBody || '{}');
            errorMessage = parsed.error?.message || parsed.message || errorMessage;
          } catch (error) {
            // ignore json parse error
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
        } catch (error) {
          const parseError = unprocessableError('AI Provider 返回非 JSON 数据');
          parseError.details = { raw: responseBody };
          parseError.durationMs = durationMs;
          return reject(parseError);
        }

        const requestId = res.headers['x-request-id'] || res.headers['request-id'] || res.headers['openai-request-id'];
        logger.info('AI Provider 调用成功', {
          requestHash,
          requestId,
          model,
          durationMs,
        });

        resolve({
          data,
          statusCode: res.statusCode,
          model: data.model || model,
          requestId,
          durationMs,
        });
      });
    });

    req.on('error', (error) => {
      const durationMs = Date.now() - startedAt;
      logger.error('AI Provider 网络错误', {
        requestHash,
        message: error.message,
      });
      const err = new HttpError(500, `AI Provider 网络错误: ${error.message}`, 'AIProviderNetworkError');
      err.durationMs = durationMs;
      reject(err);
    });

    const effectiveTimeout = timeoutMs || DEFAULT_TIMEOUT_MS;
    req.setTimeout(effectiveTimeout, () => {
      req.destroy();
      const durationMs = Date.now() - startedAt;
      logger.error('AI Provider 调用超时', { requestHash, durationMs });
      const err = timeoutError(`AI Provider 超时 (${effectiveTimeout}ms)`);
      err.durationMs = durationMs;
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

async function createRiskAssessment(params) {
  const model = params.model;
  if (!model) {
    throw internalError('AI Provider 模型未配置');
  }

  let attempt = 0;
  let lastError = null;

  while (attempt < MAX_RETRIES) {
    attempt += 1;
    try {
      return await requestOnce({ ...params, model });
    } catch (error) {
      lastError = error;

      const isClientError = error.statusCode && error.statusCode < 500 && error.statusCode !== 429;
      const isTimeout = error.statusCode === 504;
      const shouldRetry = attempt < MAX_RETRIES && !isClientError;

      if (!shouldRetry) {
        throw error;
      }

      const delayMs = Math.pow(2, attempt) * 200;
      logger.warn('AI Provider 调用失败，准备重试', {
        attempt,
        delayMs,
        requestHash: params.requestHash,
        reason: error.message,
        timeout: isTimeout,
      });
      await delay(delayMs);
    }
  }

  throw lastError || internalError('AI Provider 调用失败');
}

module.exports = {
  createRiskAssessment,
};
