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

function buildPayload(prompt) {
  const systemPrompt =
    process.env.AI_PROVIDER_SYSTEM_PROMPT ||
    'You are a senior project risk analyst. Return JSON results only.';

  const finalPrompt = `${systemPrompt}\n\n${prompt}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: finalPrompt }],
      },
    ],
  };

  return JSON.stringify(body);
}

function extractTextFromGeminiResponse(data) {
  try {
    if (!data || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      return '';
    }
    const candidate = data.candidates[0] || {};
    const content = candidate.content || {};
    const parts = Array.isArray(content.parts) ? content.parts : [];
    const texts = parts
      .map((part) => {
        if (!part) return '';
        if (typeof part === 'string') return part;
        if (typeof part.text === 'string') return part.text;
        if (part.inlineData && typeof part.inlineData.data === 'string') {
          return part.inlineData.data;
        }
        return '';
      })
      .filter(Boolean);
    return texts.join('\n');
  } catch (error) {
    return '';
  }
}

function normalizeToOpenAIShape(data, model) {
  const text = extractTextFromGeminiResponse(data);

  const usage = data && data.usageMetadata ? data.usageMetadata : {};

  return {
    id: data.responseId,
    model: data.modelVersion || model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: text || JSON.stringify(data),
        },
        finish_reason:
          (Array.isArray(data.candidates) &&
            data.candidates[0] &&
            (data.candidates[0].finishReason || '').toLowerCase()) ||
          'stop',
      },
    ],
    usage: {
      prompt_tokens: usage.promptTokenCount,
      completion_tokens: usage.candidatesTokenCount,
      total_tokens: usage.totalTokenCount,
    },
    raw_gemini: data,
  };
}

function requestOnce({ prompt, model, requestHash, api_host, api_key, timeoutMs }) {
  if (!api_key) {
    return Promise.reject(internalError('Gemini API Key 未配置'));
  }

  if (!api_host) {
    return Promise.reject(internalError('Gemini API Host 未配置'));
  }

  let url;
  try {
    url = new URL(`/v1/models/${encodeURIComponent(model)}:generateContent`, api_host);
    url.searchParams.set('key', api_key);
  } catch (error) {
    return Promise.reject(internalError('Gemini API Host 配置不正确'));
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
          let errorMessage = `Gemini 响应错误 (${res.statusCode})`;
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
          const parseError = unprocessableError('Gemini 返回非 JSON 数据');
          parseError.details = { raw: responseBody };
          parseError.durationMs = durationMs;
          return reject(parseError);
        }

        const normalized = normalizeToOpenAIShape(data, model);

        logger.info('Gemini 调用成功', {
          requestHash,
          model: normalized.model,
          durationMs,
        });

        resolve({
          data: normalized,
          statusCode: res.statusCode,
          model: normalized.model,
          requestId: data.responseId,
          durationMs,
        });
      });
    });

    req.on('error', (error) => {
      const durationMs = Date.now() - startedAt;
      logger.error('Gemini 网络错误', {
        requestHash,
        message: error.message,
      });
      const err = new HttpError(500, `Gemini 网络错误: ${error.message}`, 'GeminiNetworkError');
      err.durationMs = durationMs;
      reject(err);
    });

    const effectiveTimeout = timeoutMs || DEFAULT_TIMEOUT_MS;
    req.setTimeout(effectiveTimeout, () => {
      req.destroy();
      const durationMs = Date.now() - startedAt;
      logger.error('Gemini 调用超时', { requestHash, durationMs });
      const err = timeoutError(`Gemini 超时 (${effectiveTimeout}ms)`);
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
    throw internalError('Gemini 模型未配置');
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
      logger.warn('Gemini 调用失败，准备重试', {
        attempt,
        delayMs,
        requestHash: params.requestHash,
        reason: error.message,
        timeout: isTimeout,
      });
      await delay(delayMs);
    }
  }

  throw lastError || internalError('Gemini 调用失败');
}

module.exports = {
  createRiskAssessment,
};

