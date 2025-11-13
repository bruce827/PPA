const https = require('https');
const { URL } = require('url');
const logger = require('../../utils/logger');
const {
  HttpError,
  internalError,
  timeoutError,
  unprocessableError,
} = require('../../utils/errors');

// 默认配置（可被调用方覆盖）
const DEFAULT_TIMEOUT_MS = parseInt(process.env.AI_PROVIDER_TIMEOUT_MS || '20000', 10);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPayload(prompt, model) {
  // Doubao（火山方舟 Ark）兼容 OpenAI Chat Completions 的消息结构
  // 使用 json_object 响应格式，便于后续解析
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
    max_tokens: Number(process.env.AI_PROVIDER_MAX_TOKENS || '800'),
    response_format: { type: 'json_object' },
  };

  return JSON.stringify(body);
}

function requestOnce({ prompt, model, requestHash, api_host, api_key, timeoutMs }) {
  if (!api_key) {
    return Promise.reject(internalError('Doubao API Key 未配置'));
  }

  if (!api_host) {
    return Promise.reject(internalError('Doubao API Host 未配置'));
  }

  let url;
  try {
    // Ark v3 chat completions
    url = new URL('/api/v3/chat/completions', api_host);
  } catch (error) {
    return Promise.reject(internalError('Doubao API Host 配置不正确'));
  }

  const payload = buildPayload(prompt, model);

  const options = {
    hostname: url.hostname,
    port: url.port || 443,
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
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        const durationMs = Date.now() - startedAt;

        if (res.statusCode >= 400) {
          let errorMessage = `Doubao 响应错误 (${res.statusCode})`;
          try {
            const parsed = JSON.parse(responseBody || '{}');
            errorMessage = parsed.error?.message || parsed.message || errorMessage;
          } catch (error) {
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
        } catch (error) {
          const parseError = unprocessableError('Doubao 返回非 JSON 数据');
          parseError.details = { raw: responseBody };
          parseError.durationMs = durationMs;
          return reject(parseError);
        }

        const requestId = res.headers['x-request-id'] || res.headers['request-id'];
        logger.info('Doubao 调用成功', {
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
      logger.error('Doubao 网络错误', { requestHash, message: error.message });
      const err = new HttpError(500, `Doubao 网络错误: ${error.message}`, 'DoubaoNetworkError');
      err.durationMs = durationMs;
      reject(err);
    });

    req.setTimeout(timeoutMs || DEFAULT_TIMEOUT_MS, () => {
      req.destroy();
      const durationMs = Date.now() - startedAt;
      logger.error('Doubao 调用超时', { requestHash, durationMs });
      const err = timeoutError(`Doubao 超时 (${timeoutMs || DEFAULT_TIMEOUT_MS}ms)`);
      err.durationMs = durationMs;
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

async function createRiskAssessment(params) {
  const model = params.model;
  const timeoutMs = params.timeoutMs || DEFAULT_TIMEOUT_MS;

  let attempt = 0;
  const MAX_RETRIES = 2;
  let lastError = null;

  while (attempt < MAX_RETRIES) {
    attempt += 1;
    try {
      return await requestOnce({ ...params, model, timeoutMs });
    } catch (error) {
      lastError = error;
      const isClientError = error.statusCode && error.statusCode < 500 && error.statusCode !== 429;
      const isTimeout = error.statusCode === 504;
      const shouldRetry = attempt < MAX_RETRIES && !isClientError;
      if (!shouldRetry) {
        throw error;
      }
      const delayMs = Math.pow(2, attempt) * 200;
      logger.warn('Doubao 调用失败，准备重试', {
        attempt,
        delayMs,
        requestHash: params.requestHash,
        reason: error.message,
        timeout: isTimeout,
      });
      await delay(delayMs);
    }
  }

  throw lastError || internalError('Doubao 调用失败');
}

module.exports = {
  createRiskAssessment,
};

