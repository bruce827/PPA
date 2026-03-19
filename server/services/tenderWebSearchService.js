const crypto = require('crypto');

const { selectProvider } = require('../providers/ai/providerSelector');
const logger = require('../utils/logger');
const {
  timeoutError,
  unprocessableError,
  validationError,
} = require('../utils/errors');
const aiFileLogger = require('./aiFileLogger');
const aiModelService = require('./aiModelService');
const tenderStagingService = require('./tenderStagingService');
const tenderWebSearchResultModel = require('../models/tenderWebSearchResultModel');

const WEB_SEARCH_TIMEOUT_MS = 180000;
const WEB_SEARCH_SERVICE_TIMEOUT_MS = WEB_SEARCH_TIMEOUT_MS + 2000;
const DEFAULT_MAX_RESULTS = 5;
const MAX_ALLOWED_RESULTS = 20;
const CONTENT_TYPE_ALLOWLIST = new Set([
  '招标公告',
  '采购公告',
  '中标结果',
  '变更公告',
  '项目新闻',
  '官网介绍',
  '企业动态',
  '政策通知',
  '其他',
]);
const OFFICIAL_SOURCE_PATTERNS = [
  /gov\.cn/i,
  /ccgp/i,
  /公共资源/i,
  /政府采购/i,
  /招标/i,
  /交易中心/i,
  /官网/i,
];

function ensureString(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function normalizeMaxResults(value) {
  const nextValue = Number.parseInt(value, 10);
  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    return DEFAULT_MAX_RESULTS;
  }
  return Math.min(nextValue, MAX_ALLOWED_RESULTS);
}

function parseVariablesJson(variablesJson) {
  if (!variablesJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(variablesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function applyTemplate(content, variables) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return ensureString(variables[key]);
    }
    return '';
  });
}

function extractContentFromProviderResponse(response) {
  if (!response) {
    return '';
  }

  if (typeof response === 'string') {
    return response;
  }

  const { choices } = response;
  if (Array.isArray(choices) && choices.length > 0) {
    const message = choices[0].message || {};
    if (message.content) {
      return message.content;
    }
    if (choices[0].text) {
      return choices[0].text;
    }
  }

  return JSON.stringify(response);
}

function cleanJsonCandidate(candidate) {
  if (typeof candidate !== 'string') {
    return candidate;
  }

  return candidate
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function getSearchPayloadContainer(parsed) {
  const containers = [parsed, parsed?.data, parsed?.result, parsed?.output].filter(Boolean);

  for (const container of containers) {
    if (
      container &&
      typeof container === 'object' &&
      (Array.isArray(container.results) || typeof container.summary === 'string')
    ) {
      return container;
    }
  }

  return parsed;
}

function normalizeConfidence(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (numeric > 1 && numeric <= 100) {
    return Number((numeric / 100).toFixed(4));
  }

  if (numeric < 0 || numeric > 1) {
    return null;
  }

  return Number(numeric.toFixed(4));
}

function normalizeContentType(value) {
  const text = ensureString(value).trim();
  if (!text) {
    return '其他';
  }
  return CONTENT_TYPE_ALLOWLIST.has(text) ? text : '其他';
}

function normalizePublishedAt(value) {
  const text = ensureString(value).trim();
  if (!text) {
    return '';
  }
  return text.slice(0, 32);
}

function isOfficialLikeSource(item) {
  const haystack = [
    ensureString(item.site_name),
    ensureString(item.site_url),
    ensureString(item.page_title),
  ].join(' ');

  return OFFICIAL_SOURCE_PATTERNS.some((pattern) => pattern.test(haystack));
}

function normalizeSearchResultItem(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const site_name = ensureString(item.site_name || item.siteName).trim();
  const site_url = ensureString(item.site_url || item.siteUrl).trim();
  const page_title = ensureString(item.page_title || item.pageTitle).trim();
  const snippet = ensureString(item.snippet).trim();
  const relevance_reason = ensureString(
    item.relevance_reason || item.relevanceReason
  ).trim();

  if (!site_name || !site_url || !page_title || !snippet || !relevance_reason) {
    return null;
  }

  if (!/^https?:\/\//i.test(site_url)) {
    return null;
  }

  const confidence = normalizeConfidence(item.confidence);
  if (confidence !== null && confidence < 0.35) {
    return null;
  }

  return {
    site_name,
    site_url,
    page_title,
    content_type: normalizeContentType(item.content_type || item.contentType),
    published_at: normalizePublishedAt(item.published_at || item.publishedAt),
    snippet,
    relevance_reason,
    confidence,
  };
}

function compareSearchResults(a, b) {
  const officialDelta = Number(isOfficialLikeSource(b)) - Number(isOfficialLikeSource(a));
  if (officialDelta !== 0) {
    return officialDelta;
  }

  const confidenceDelta = (b.confidence ?? -1) - (a.confidence ?? -1);
  if (confidenceDelta !== 0) {
    return confidenceDelta;
  }

  const timeA = Date.parse(a.published_at || '');
  const timeB = Date.parse(b.published_at || '');
  if (Number.isFinite(timeA) && Number.isFinite(timeB) && timeA !== timeB) {
    return timeB - timeA;
  }

  return a.site_name.localeCompare(b.site_name, 'zh-CN');
}

function parseStructuredSearchResponse(rawResponse, maxResults) {
  const rawContent = extractContentFromProviderResponse(rawResponse);
  const jsonCandidate = cleanJsonCandidate(rawContent);

  let parsed;
  try {
    parsed = typeof jsonCandidate === 'string' ? JSON.parse(jsonCandidate) : jsonCandidate;
  } catch (_error) {
    throw unprocessableError('联网搜索响应不是合法 JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw unprocessableError('联网搜索响应结构不合法');
  }

  const payload = getSearchPayloadContainer(parsed);
  const rawResults = Array.isArray(payload?.results) ? payload.results : [];
  const results = rawResults
    .map((item) => normalizeSearchResultItem(item))
    .filter(Boolean)
    .sort(compareSearchResults)
    .slice(0, maxResults);

  const rawSummary = ensureString(payload?.summary).trim();
  const summary =
    rawSummary ||
    (results.length > 0
      ? `共找到 ${results.length} 条高相关结果。`
      : '未检索到高相关结果。');

  return {
    summary,
    results,
    raw_text: typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent),
  };
}

function normalizeExecutionInput(payload = {}) {
  return {
    modelId: payload.modelId ?? payload.model_id,
    promptTemplateId:
      payload.promptTemplateId ??
      payload.prompt_template_id ??
      payload.promptId ??
      payload.prompt_id,
    focusKeywords: ensureString(payload.focusKeywords ?? payload.focus_keywords).trim(),
    excludeKeywords: ensureString(payload.excludeKeywords ?? payload.exclude_keywords).trim(),
    maxResults: normalizeMaxResults(payload.maxResults ?? payload.max_results),
  };
}

function buildVariableMap(record, input) {
  return {
    project_title: ensureString(record.title).trim(),
    issuer: ensureString(record.issuer).trim(),
    published_date: ensureString(record.published_date || record.published_at).trim(),
    deadline_date: ensureString(record.deadline_date || record.deadline_at).trim(),
    source_platform: ensureString(record.source_platform).trim(),
    source_url: ensureString(record.source_url).trim(),
    summary: ensureString(record.summary || record.announcement_plain_text).trim(),
    search_goal: '查找该项目的官方公告、新闻报道、建设背景和相关企业信息',
    max_results: String(input.maxResults),
    focus_keywords: input.focusKeywords,
    exclude_keywords: input.excludeKeywords,
  };
}

function buildSearchQuery(record, input) {
  const includeParts = [
    ensureString(record.title).trim(),
    ensureString(record.issuer).trim(),
    ensureString(record.source_platform).trim(),
    ensureString(input.focusKeywords).trim(),
  ].filter(Boolean);

  const exclude = ensureString(input.excludeKeywords).trim();
  if (exclude) {
    includeParts.push(`排除：${exclude}`);
  }

  return includeParts.join(' ');
}

function validateRequiredVariables(template, variableMap) {
  const requiredVariables = parseVariablesJson(template.variables_json)
    .filter((item) => item && item.required)
    .map((item) => item.name)
    .filter(Boolean);

  const missingRequired = requiredVariables.filter(
    (name) => !ensureString(variableMap[name]).trim()
  );

  if (missingRequired.length > 0) {
    throw validationError(
      `提示词模板缺少必填变量值：${missingRequired.join('、')}`
    );
  }
}

function renderPrompt(template, variableMap) {
  const systemPrompt = applyTemplate(template.system_prompt || '', variableMap).trim();
  const userPrompt = applyTemplate(template.user_prompt_template || '', variableMap).trim();
  const finalPrompt = [systemPrompt, userPrompt].filter(Boolean).join('\n\n');

  if (!finalPrompt) {
    throw validationError('所选提示词模板内容为空，无法执行联网搜索');
  }

  return {
    systemPrompt,
    userPrompt,
    finalPrompt,
  };
}

function resolveProviderParams(model, prompt, requestHash, options = {}) {
  const providerLabel = model?.provider || 'openai-compatible';
  const { impl: providerImpl, key: providerKey } = selectProvider(providerLabel);
  const configuredMaxTokens = Number.parseInt(model?.max_tokens, 10);
  const maxTokens =
    Number.isFinite(configuredMaxTokens) && configuredMaxTokens > 0
      ? configuredMaxTokens
      : undefined;

  if (!model?.model_name) {
    throw validationError('当前模型未配置模型名称');
  }

  if (!model?.api_host || !model?.api_key) {
    throw validationError('当前模型未配置完整的 API Host 或 API Key');
  }

  return {
    providerLabel,
    providerImpl,
    providerKey,
    providerParams: {
      prompt,
      query: options.query || prompt,
      model: model.model_name,
      requestHash,
      api_host: model.api_host,
      api_key: model.api_key,
      maxTokens,
      maxResults: options.maxResults,
      timeoutMs: WEB_SEARCH_TIMEOUT_MS,
    },
  };
}

function buildSavedResultPayload(record, model, template, searchedAt, parsed) {
  const state = parsed.results.length > 0 ? 'fresh_result' : 'empty_result';

  return {
    tender_staging_id: record.id,
    model_config_id: model.id,
    prompt_template_id: template.id,
    searched_at: searchedAt,
    summary: parsed.summary,
    results: parsed.results,
    state,
    meta: {
      state,
      result_count: parsed.results.length,
    },
  };
}

async function getTenderWebSearchContext(id) {
  const record = await tenderStagingService.getRequiredTenderStaging(id);
  const savedResult = await tenderWebSearchResultModel.getByTenderStagingId(record.id);

  return {
    record,
    has_saved_result: Boolean(savedResult),
    saved_result: savedResult,
    state: savedResult ? 'has_saved_result' : 'empty',
  };
}

async function executeTenderWebSearch(id, payload = {}) {
  const record = await tenderStagingService.getRequiredTenderStaging(id);
  const input = normalizeExecutionInput(payload);

  if (!input.modelId) {
    throw validationError('缺少必填参数：modelId');
  }

  if (!input.promptTemplateId) {
    throw validationError('缺少必填参数：promptTemplateId');
  }

  const { model, template } = await aiModelService.validateWebSearchRuntimeConfig({
    modelId: input.modelId,
    promptTemplateId: input.promptTemplateId,
  });

  const variableMap = buildVariableMap(record, input);
  validateRequiredVariables(template, variableMap);
  const { finalPrompt, systemPrompt, userPrompt } = renderPrompt(template, variableMap);

  const requestHash = crypto
    .createHash('sha256')
    .update(`${record.id}:${model.id}:${template.id}:${finalPrompt}`)
    .digest('hex');

  const { providerLabel, providerImpl, providerKey, providerParams } = resolveProviderParams(
    model,
    finalPrompt,
    requestHash,
    {
      query: buildSearchQuery(record, input),
      maxResults: input.maxResults,
    }
  );

  logger.info('Tender web search provider selected', {
    providerLabel,
    providerKey,
    model: providerParams.model,
    timeoutMs: WEB_SEARCH_TIMEOUT_MS,
  });

  let providerRaw = null;
  let durationMs = 0;
  let modelUsed = providerParams.model;

  try {
    const providerCall = providerImpl.createRiskAssessment(providerParams);
    const providerResult = await Promise.race([
      providerCall,
      new Promise((_, reject) =>
        setTimeout(() => reject(timeoutError('联网搜索超时')), WEB_SEARCH_SERVICE_TIMEOUT_MS)
      ),
    ]);

    providerRaw = providerResult.data || providerResult;
    durationMs = providerResult.durationMs || 0;
    modelUsed = providerResult.model || providerParams.model;

    const parsed = parseStructuredSearchResponse(providerRaw, input.maxResults);
    const searchedAt = new Date().toISOString();

    await aiFileLogger.save({
      step: 'web_search_tender',
      route: '/api/opportunity/tender-staging/:id/web-search',
      requestHash,
      promptTemplateId: String(template.id),
      modelProvider: providerLabel,
      modelName: modelUsed,
      status: 'success',
      durationMs,
      providerTimeoutMs: WEB_SEARCH_TIMEOUT_MS,
      serviceTimeoutMs: WEB_SEARCH_SERVICE_TIMEOUT_MS,
      request: {
        tender_staging_id: record.id,
        model_id: model.id,
        prompt_template_id: template.id,
        variables: variableMap,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        final_prompt: finalPrompt,
      },
      responseRaw: JSON.stringify(providerRaw),
      responseParsed: {
        summary: parsed.summary,
        results: parsed.results,
        searched_at: searchedAt,
      },
      notesLines: [
        `[provider] ${providerLabel} model=${modelUsed}`,
        `[timing] durationMs=${durationMs} providerTimeoutMs=${WEB_SEARCH_TIMEOUT_MS} serviceTimeoutMs=${WEB_SEARCH_SERVICE_TIMEOUT_MS}`,
        `[results] count=${parsed.results.length}`,
      ],
    });

    return tenderWebSearchResultModel.saveLatestResult(
      buildSavedResultPayload(record, model, template, searchedAt, parsed)
    );
  } catch (error) {
    await aiFileLogger.save({
      step: 'web_search_tender',
      route: '/api/opportunity/tender-staging/:id/web-search',
      requestHash,
      promptTemplateId: String(template.id),
      modelProvider: providerLabel,
      modelName: modelUsed,
      status: 'failed',
      durationMs,
      providerTimeoutMs: WEB_SEARCH_TIMEOUT_MS,
      serviceTimeoutMs: WEB_SEARCH_SERVICE_TIMEOUT_MS,
      request: {
        tender_staging_id: record.id,
        model_id: model.id,
        prompt_template_id: template.id,
        variables: variableMap,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        final_prompt: finalPrompt,
      },
      responseRaw: providerRaw ? JSON.stringify(providerRaw) : null,
      notesLines: [
        `[provider] ${providerLabel} model=${modelUsed}`,
        `[status] failed error=${error.message}`,
      ],
    });

    throw error;
  }
}

module.exports = {
  getTenderWebSearchContext,
  executeTenderWebSearch,
};
