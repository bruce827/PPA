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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPayload(prompt, model, maxTokens, images = []) {
  const fallbackMaxTokens = Number(process.env.AI_PROVIDER_MAX_TOKENS || '1200');
  const resolvedMaxTokens = Number.isFinite(Number(maxTokens))
    ? Number(maxTokens)
    : fallbackMaxTokens;

  const content = [
    { type: 'text', text: prompt },
    ...(Array.isArray(images)
      ? images
          .filter((image) => image?.dataUrl)
          .map((image) => ({
            type: 'image_url',
            image_url: {
              url: image.dataUrl,
            },
          }))
      : []),
  ];

  const body = {
    model,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
    temperature: Number(process.env.AI_PROVIDER_TEMPERATURE || '0.2'),
  };

  if (Number.isFinite(resolvedMaxTokens) && resolvedMaxTokens > 0) {
    body.max_tokens = resolvedMaxTokens;
  }

  return JSON.stringify(body);
}

function requestOnce({
  prompt,
  model,
  requestHash,
  api_host,
  api_key,
  timeoutMs,
  maxTokens,
  images = [],
}) {
  if (!api_key) {
    return Promise.reject(internalError('MiniMax API Key 未配置'));
  }

  if (!api_host) {
    return Promise.reject(internalError('MiniMax API Host 未配置'));
  }

  let url;
  try {
    url = new URL(api_host);
  } catch (_error) {
    return Promise.reject(internalError('MiniMax API Host 配置不正确'));
  }

  const normalizedImages = (Array.isArray(images) ? images : []).map((image) => ({
    ...image,
    dataUrl:
      image?.dataUrl ||
      (image?.buffer && image?.mimeType
        ? `data:${image.mimeType};base64,${image.buffer.toString('base64')}`
        : undefined),
  }));

  const payload = buildPayload(prompt, model, maxTokens, normalizedImages);

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
          let errorMessage = `MiniMax 响应错误 (${res.statusCode})`;
          try {
            const parsed = JSON.parse(responseBody || '{}');
            errorMessage = parsed.error?.message || parsed.message || errorMessage;
          } catch (_error) {}

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
          const parseError = unprocessableError('MiniMax 返回非 JSON 数据');
          parseError.details = { raw: responseBody };
          parseError.durationMs = durationMs;
          return reject(parseError);
        }

        logger.info('MiniMax Vision 调用成功', {
          requestHash,
          model: data.model || model,
          durationMs,
          imageCount: normalizedImages.length,
        });

        resolve({
          data,
          statusCode: res.statusCode,
          model: data.model || model,
          requestId: res.headers['x-request-id'] || res.headers['request-id'],
          durationMs,
        });
      });
    });

    req.on('error', (error) => {
      const durationMs = Date.now() - startedAt;
      logger.error('MiniMax Vision 网络错误', {
        requestHash,
        message: error.message,
      });
      const err = new HttpError(500, `MiniMax Vision 网络错误: ${error.message}`, 'MiniMaxVisionNetworkError');
      err.durationMs = durationMs;
      reject(err);
    });

    const effectiveTimeout = timeoutMs || DEFAULT_TIMEOUT_MS;
    req.setTimeout(effectiveTimeout, () => {
      req.destroy();
      const durationMs = Date.now() - startedAt;
      logger.error('MiniMax Vision 调用超时', { requestHash, durationMs });
      const err = timeoutError(`MiniMax Vision 超时 (${effectiveTimeout}ms)`);
      err.durationMs = durationMs;
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

async function createVisionCompletion(params) {
  const model = params.model;
  if (!model) {
    throw internalError('MiniMax Vision 模型未配置');
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
      if (attempt >= MAX_RETRIES || isClientError) {
        throw error;
      }

      const delayMs = Math.pow(2, attempt) * 200;
      logger.warn('MiniMax Vision 调用失败，准备重试', {
        attempt,
        delayMs,
        requestHash: params.requestHash,
        reason: error.message,
      });
      await delay(delayMs);
    }
  }

  throw lastError || internalError('MiniMax Vision 调用失败');
}

module.exports = {
  createVisionCompletion,
};
