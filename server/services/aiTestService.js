/**
 * AI 连接测试服务（OpenAI 兼容，使用完整 URL）
 * 发送固定 prompt：“你是什么模型？”
 */

const crypto = require('crypto');
const { selectProvider } = require('../providers/ai/providerSelector');
const aiFileLogger = require('./aiFileLogger');
const aiAssessmentLogModel = require('../models/aiAssessmentLogModel');
const { validationError } = require('../utils/errors');

const TEST_PROMPT = '你是什么模型？';

function ensureTestPayload(config = {}) {
  const { api_host, api_key, model_name, timeout = 30, max_tokens } = config;
  if (!api_host || !api_key || !model_name) {
    throw validationError('缺少必填字段：api_host, api_key, model_name');
  }
  const timeoutSec = Number(timeout);
  const maxTokensNum = Number(max_tokens);
  return {
    api_host,
    api_key,
    model: model_name,
    timeoutMs: Number.isFinite(timeoutSec) ? Math.max(5000, timeoutSec * 1000) : undefined,
    maxTokens: Number.isFinite(maxTokensNum) && maxTokensNum > 0 ? maxTokensNum : undefined,
  };
}

async function testConnection(config) {
  const startedAt = Date.now();
  const payload = ensureTestPayload(config);
  const providerLabel = config.provider || 'openai-compatible';
  const { impl: providerImpl, key: providerKey } = selectProvider(providerLabel);
  const requestHash = crypto.createHash('sha256').update(`${payload.model}:${startedAt}`).digest('hex');

  let providerRaw = null;

  try {
    const providerResult = await providerImpl.createRiskAssessment({
      prompt: TEST_PROMPT,
      model: payload.model,
      api_host: payload.api_host,
      api_key: payload.api_key,
      requestHash,
      timeoutMs: payload.timeoutMs,
      maxTokens: payload.maxTokens,
    });

    const rawSource = providerResult.data || providerResult;
    providerRaw = rawSource;
    const choices = rawSource?.choices || [];
    const content =
      Array.isArray(choices) && choices.length > 0
        ? choices[0]?.message?.content || choices[0]?.text || ''
        : '';

    const success = Boolean(content) || providerResult.statusCode < 300;
    const duration = providerResult.durationMs || Date.now() - startedAt;

    try {
      await aiAssessmentLogModel.insertLog({
        promptId: 'test',
        modelUsed: providerResult.model || payload.model,
        requestHash,
        durationMs: duration,
        status: success ? 'success' : 'fail',
        step: 'model-test',
        route: '/api/config/ai-models/test',
      });
    } catch (e) {}

    const logDir = await aiFileLogger.save({
      step: 'model-test',
      route: '/api/config/ai-models/test',
      requestHash,
      promptTemplateId: 'test',
      modelProvider: providerLabel,
      modelName: providerResult.model || payload.model,
      status: success ? 'success' : 'fail',
      durationMs: duration,
      providerTimeoutMs: payload.timeoutMs,
      serviceTimeoutMs: payload.timeoutMs ? payload.timeoutMs + 2000 : undefined,
      request: {
        prompt: TEST_PROMPT,
        api_host: payload.api_host,
        model: payload.model,
      },
      responseRaw: JSON.stringify(rawSource),
      responseParsed: { content },
        notesLines: [
        `[provider] ${providerKey}(${providerLabel}) model=${providerResult.model || payload.model}`,
        `[timing] durationMs=${duration} providerTimeoutMs=${payload.timeoutMs}`,
      ],
    });

    try {
      await aiAssessmentLogModel.updateLogDir({
        requestHash,
        step: 'model-test',
        route: '/api/config/ai-models/test',
        logDir,
      });
    } catch (e) {}

    if (success) {
      const answerText =
        typeof content === 'string'
          ? content
          : typeof content === 'object'
            ? JSON.stringify(content)
            : '';
      const displayContent = answerText ? answerText.slice(0, 150) : '（无内容）';

      return {
        success: true,
        message: `模型 ${providerResult.model || payload.model}：${displayContent}`,
        duration,
        details: {
          model: providerResult.model || payload.model,
          answer: answerText,
        },
      };
    }

    return {
      success: false,
      message: '请求未返回有效内容',
      duration,
      error: 'Empty response',
    };
  } catch (error) {
    const duration = Date.now() - startedAt;

    try {
      await aiAssessmentLogModel.insertLog({
        promptId: 'test',
        modelUsed: payload.model,
        requestHash,
        durationMs: duration,
        status: error.statusCode === 504 ? 'timeout' : 'fail',
        errorMessage: error.message,
        step: 'model-test',
        route: '/api/config/ai-models/test',
      });
    } catch (e) {}

    try {
      const logDir = await aiFileLogger.save({
        step: 'model-test',
        route: '/api/config/ai-models/test',
        requestHash,
        promptTemplateId: 'test',
        modelProvider: providerLabel,
        modelName: payload.model,
        status: error.statusCode === 504 ? 'timeout' : 'fail',
        durationMs: duration,
        providerTimeoutMs: payload.timeoutMs,
        serviceTimeoutMs: payload.timeoutMs ? payload.timeoutMs + 2000 : undefined,
        request: {
          prompt: TEST_PROMPT,
          api_host: payload.api_host,
          model: payload.model,
        },
        responseRaw: providerRaw ? JSON.stringify(providerRaw) : undefined,
        responseParsed: providerRaw ? { _raw_text: JSON.stringify(providerRaw) } : undefined,
        notesLines: [`[error] ${error.message}`],
      });

      try {
        await aiAssessmentLogModel.updateLogDir({
          requestHash,
          step: 'model-test',
          route: '/api/config/ai-models/test',
          logDir,
        });
      } catch (e) {}
    } catch (e) {}

    return {
      success: false,
      message: error.message || '测试失败',
      duration,
      error: error.message,
    };
  }
}

module.exports = {
  testConnection,
};
