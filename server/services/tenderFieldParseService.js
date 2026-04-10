const crypto = require('crypto');

const aiModelService = require('./aiModelService');
const aiFileLogger = require('./aiFileLogger');
const promptTemplateService = require('./promptTemplateService');
const aiAssessmentLogModel = require('../models/aiAssessmentLogModel');
const tenderStagingModel = require('../models/tenderStagingModel');
const tenderStagingService = require('./tenderStagingService');
const { selectProvider } = require('../providers/ai/providerSelector');
const logger = require('../utils/logger');
const {
  timeoutError,
  unprocessableError,
  validationError,
} = require('../utils/errors');

const MAX_CONTENT_LENGTH = 5000;
const PARSE_TIMEOUT_MS = 45000;
const PARSE_SERVICE_TIMEOUT_MS = PARSE_TIMEOUT_MS + 2000;
const ISSUER_CONFIDENCE_THRESHOLD = 0.6;
const DEADLINE_CONFIDENCE_THRESHOLD = 0.7;
const DEADLINE_MAX_FUTURE_YEARS = 3;
const INVALID_ISSUER_VALUES = new Set(['无', '未知', '详见公告', '见附件', '暂无']);
const PARSE_STEP = 'parse_tender_fields';
const PARSE_ROUTE = '/api/opportunity/tender-staging/:id/parse-fields';
const KEYWORD_PATTERNS = [
  /招标人/g,
  /采购人/g,
  /招标单位/g,
  /采购单位/g,
  /投标截止/g,
  /截止时间/g,
  /响应文件递交/g,
  /开标时间/g,
];

function ensureString(value, fallback = '') {
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function stripHtmlTags(value) {
  const text = ensureString(value).trim();
  if (!text) {
    return '';
  }

  return text
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeWhitespace(value) {
  return ensureString(value).replace(/\s+/g, ' ').trim();
}

function sliceText(value, maxLength) {
  const text = normalizeWhitespace(value);
  if (!text) {
    return '';
  }
  return text.slice(0, maxLength);
}

function normalizeOptionalInteger(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number.parseInt(String(value), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

function pickContentText(record) {
  const plainText = sliceText(record.announcement_plain_text, MAX_CONTENT_LENGTH);
  if (plainText) {
    return plainText;
  }

  return sliceText(stripHtmlTags(record.announcement_html), MAX_CONTENT_LENGTH);
}

function extractKeywordSnippets(text) {
  if (!text) {
    return [];
  }

  const snippets = [];
  KEYWORD_PATTERNS.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const start = Math.max(match.index - 60, 0);
      const end = Math.min(match.index + 160, text.length);
      snippets.push(text.slice(start, end).trim());
    }
    pattern.lastIndex = 0;
  });

  return Array.from(new Set(snippets)).slice(0, 8);
}

function buildContentExcerpt(record) {
  const contentText = pickContentText(record);
  if (!contentText) {
    return '';
  }

  const keywordSnippets = extractKeywordSnippets(contentText).join('\n');
  const headText = contentText.slice(0, 2200);

  return [keywordSnippets, headText]
    .filter(Boolean)
    .join('\n')
    .slice(0, MAX_CONTENT_LENGTH);
}

function applyTemplate(content, variables) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return ensureString(variables[key]);
    }
    return '';
  });
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

  return candidate.replace(/```json/gi, '').replace(/```/g, '').trim();
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

function normalizeDate(dateText) {
  const text = normalizeWhitespace(dateText);
  if (!text) {
    return '';
  }

  const normalized = text
    .replace(/年/g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
    .replace(/\//g, '-')
    .trim();

  const matched = normalized.match(/^(\d{4}-\d{1,2}-\d{1,2})/);
  const candidate = matched ? matched[1] : normalized;
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseStructuredResponse(rawResponse) {
  const rawContent = extractContentFromProviderResponse(rawResponse);
  const candidate = cleanJsonCandidate(rawContent);

  let parsed;
  try {
    parsed = typeof candidate === 'string' ? JSON.parse(candidate) : candidate;
  } catch (_error) {
    throw unprocessableError('招标字段解析响应不是合法 JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw unprocessableError('招标字段解析响应结构不合法');
  }

  return {
    issuer: normalizeWhitespace(parsed.issuer),
    deadline_date: normalizeDate(parsed.deadline_date),
    issuer_confidence: normalizeConfidence(parsed.issuer_confidence),
    deadline_date_confidence: normalizeConfidence(parsed.deadline_date_confidence),
    raw_text: typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent),
  };
}

function validateRequiredVariables(template, variableMap) {
  const required = parseVariablesJson(template.variables_json)
    .filter((item) => item && item.required)
    .map((item) => item.name)
    .filter(Boolean);

  const missing = required.filter((name) => !ensureString(variableMap[name]).trim());
  if (missing.length > 0) {
    throw validationError(`提示词模板缺少必填变量值：${missing.join('、')}`);
  }
}

function renderPrompt(template, variableMap) {
  const systemPrompt = applyTemplate(template.system_prompt || '', variableMap).trim();
  const userPrompt = applyTemplate(template.user_prompt_template || '', variableMap).trim();
  const finalPrompt = [systemPrompt, userPrompt].filter(Boolean).join('\n\n');

  if (!finalPrompt) {
    throw validationError('所选提示词模板内容为空，无法执行字段解析');
  }

  return {
    systemPrompt,
    userPrompt,
    finalPrompt,
  };
}

function buildVariableMap(record, contentExcerpt) {
  return {
    title: ensureString(record.title).trim(),
    summary: ensureString(record.summary).trim(),
    content_excerpt: contentExcerpt,
    published_date: ensureString(record.published_date || record.published_at).trim(),
    current_issuer: ensureString(record.issuer).trim(),
    current_deadline_date: ensureString(record.deadline_date || record.deadline_at).trim(),
    source_platform: ensureString(record.source_platform).trim(),
    source_url: ensureString(record.source_url).trim(),
  };
}

function buildParseQuery(record) {
  return [
    ensureString(record.title).trim(),
    ensureString(record.issuer).trim(),
    ensureString(record.source_platform).trim(),
  ]
    .filter(Boolean)
    .join(' ');
}

function buildFallbackRequestHash(recordId, stage = 'preflight') {
  return crypto
    .createHash('sha256')
    .update(`tender-parse:${recordId || 'unknown'}:${stage}:${Date.now()}`)
    .digest('hex');
}

async function logParseAssessment({
  promptId,
  modelUsed,
  requestHash,
  durationMs,
  status,
  errorMessage,
}) {
  try {
    await aiAssessmentLogModel.insertLog({
      promptId,
      modelUsed,
      requestHash,
      durationMs,
      status,
      errorMessage,
      step: PARSE_STEP,
      route: PARSE_ROUTE,
    });
  } catch (error) {
    logger.warn('写入招标字段解析 ai_assessment_logs 失败', {
      error: error.message,
      requestHash,
    });
  }
}

async function saveParseAiLog({
  requestHash,
  promptTemplateId,
  modelProvider,
  modelName,
  status,
  durationMs,
  providerTimeoutMs,
  serviceTimeoutMs,
  request,
  responseRaw,
  responseParsed,
  notesLines,
}) {
  try {
    const logDir = await aiFileLogger.save({
      step: PARSE_STEP,
      route: PARSE_ROUTE,
      requestHash,
      promptTemplateId: promptTemplateId ? String(promptTemplateId) : undefined,
      modelProvider,
      modelName,
      status,
      durationMs,
      providerTimeoutMs,
      serviceTimeoutMs,
      request,
      responseRaw,
      responseParsed,
      notesLines,
    });

    try {
      await aiAssessmentLogModel.updateLogDir({
        requestHash,
        step: PARSE_STEP,
        route: PARSE_ROUTE,
        logDir,
      });
    } catch (_error) {}
  } catch (_error) {}
}

function isIssuerWritable(record, parsedIssuer) {
  if (ensureString(record.issuer).trim()) {
    return { writable: false, reason: '招标单位已有值，默认不覆盖' };
  }

  if (!parsedIssuer) {
    return { writable: false, reason: '未识别到招标单位' };
  }

  if (INVALID_ISSUER_VALUES.has(parsedIssuer)) {
    return { writable: false, reason: '招标单位识别结果无效' };
  }

  if (parsedIssuer.length < 4 || parsedIssuer.length > 120) {
    return { writable: false, reason: '招标单位长度异常' };
  }

  return { writable: true };
}

function isDeadlineWritable(record, parsedDeadlineDate) {
  if (ensureString(record.deadline_date || record.deadline_at).trim()) {
    return { writable: false, reason: '截止日期已有值，默认不覆盖' };
  }

  if (!parsedDeadlineDate) {
    return { writable: false, reason: '未识别到截止日期' };
  }

  const parsedDate = new Date(`${parsedDeadlineDate}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return { writable: false, reason: '截止日期格式非法' };
  }

  const publishedDateText = normalizeDate(
    ensureString(record.published_date || record.published_at).trim()
  );
  if (publishedDateText) {
    const publishedDate = new Date(`${publishedDateText}T00:00:00.000Z`);
    if (!Number.isNaN(publishedDate.getTime()) && parsedDate < publishedDate) {
      return { writable: false, reason: '截止日期早于发布日期' };
    }
  }

  const now = new Date();
  const maxFutureDate = new Date(
    Date.UTC(now.getUTCFullYear() + DEADLINE_MAX_FUTURE_YEARS, now.getUTCMonth(), now.getUTCDate())
  );
  if (parsedDate > maxFutureDate) {
    return { writable: false, reason: '截止日期超出合理范围' };
  }

  return { writable: true };
}

async function executeTenderFieldParse(id, payload = {}) {
  await tenderStagingModel.ensureSchema();
  try {
    await aiAssessmentLogModel.ensureSchema();
  } catch (_error) {}

  const record = await tenderStagingService.getRequiredTenderStaging(id);
  let requestHash = buildFallbackRequestHash(record.id);
  let template = null;
  let model = null;
  let variableMap = null;
  let contentExcerpt = '';
  let systemPrompt = '';
  let userPrompt = '';
  let finalPrompt = '';
  let providerLabel = 'unknown';
  let providerKey = 'unknown';
  let providerRaw = null;
  let durationMs = 0;
  let modelUsed = '';
  const startedAt = Date.now();
  const promptTemplateId = normalizeOptionalInteger(
    payload.prompt_template_id ?? payload.promptTemplateId ?? payload.promptId
  );

  if (ensureString(record.issuer).trim() && ensureString(record.deadline_date || record.deadline_at).trim()) {
    return {
      record,
      parsed: {
        issuer: ensureString(record.issuer).trim(),
        deadline_date: ensureString(record.deadline_date || '').trim(),
      },
      updated_fields: [],
      skipped_fields: ['issuer', 'deadline_date'],
      warnings: ['字段已完整，无需解析'],
      meta: {
        state: 'already_complete',
      },
    };
  }

  try {
    contentExcerpt = buildContentExcerpt(record);
    if (!contentExcerpt) {
      throw validationError('当前记录缺少可供解析的正文内容');
    }

    model = await aiModelService.getCurrentModel();
    if (!promptTemplateId) {
      throw validationError('缺少必填参数：promptTemplateId');
    }

    template = await promptTemplateService.ensureActiveTemplateByCategory(
      promptTemplateId,
      'tender_field_parse',
      '招标字段解析'
    );
    variableMap = buildVariableMap(record, contentExcerpt);
    validateRequiredVariables(template, variableMap);
    ({ finalPrompt, systemPrompt, userPrompt } = renderPrompt(template, variableMap));

    requestHash = crypto
      .createHash('sha256')
      .update(`${record.id}:${model.id}:${template.id}:${finalPrompt}`)
      .digest('hex');

    providerLabel = model.provider || 'openai-compatible';
    const { impl: providerImpl, key } = selectProvider(providerLabel);
    providerKey = key;
    const providerParams = {
      prompt: finalPrompt,
      query: buildParseQuery(record),
      model: model.model_name,
      requestHash,
      api_host: model.api_host,
      api_key: model.api_key,
      maxTokens:
        Number.isFinite(Number.parseInt(model.max_tokens, 10)) &&
        Number.parseInt(model.max_tokens, 10) > 0
          ? Number.parseInt(model.max_tokens, 10)
          : undefined,
      timeoutMs: PARSE_TIMEOUT_MS,
    };

    if (!providerParams.model) {
      throw validationError('当前模型未配置模型名称');
    }
    if (!providerParams.api_host || !providerParams.api_key) {
      throw validationError('当前模型未配置完整的 API Host 或 API Key');
    }

    logger.info('Tender field parse provider selected', {
      providerLabel,
      providerKey,
      model: providerParams.model,
      timeoutMs: PARSE_TIMEOUT_MS,
    });

    const providerCall = providerImpl.createRiskAssessment(providerParams);
    const providerResult = await Promise.race([
      providerCall,
      new Promise((_, reject) =>
        setTimeout(() => reject(timeoutError('招标字段解析超时')), PARSE_SERVICE_TIMEOUT_MS)
      ),
    ]);

    providerRaw = providerResult.data || providerResult;
    durationMs = providerResult.durationMs || 0;
    modelUsed = providerResult.model || providerParams.model;

    const parsed = parseStructuredResponse(providerRaw);
    const updatedFields = [];
    const skippedFields = [];
    const warnings = [];
    const issuerCheck = isIssuerWritable(record, parsed.issuer);
    const deadlineCheck = isDeadlineWritable(record, parsed.deadline_date);
    const issuerConfidence = parsed.issuer_confidence;
    const deadlineConfidence = parsed.deadline_date_confidence;

    let nextIssuer = null;
    if (!issuerCheck.writable) {
      skippedFields.push('issuer');
      warnings.push(issuerCheck.reason);
    } else if (
      issuerConfidence !== null &&
      issuerConfidence < ISSUER_CONFIDENCE_THRESHOLD
    ) {
      skippedFields.push('issuer');
      warnings.push('招标单位置信度不足，未写入');
    } else {
      nextIssuer = parsed.issuer;
      updatedFields.push('issuer');
    }

    let nextDeadlineDate = null;
    if (!deadlineCheck.writable) {
      skippedFields.push('deadline_date');
      warnings.push(deadlineCheck.reason);
    } else if (
      deadlineConfidence !== null &&
      deadlineConfidence < DEADLINE_CONFIDENCE_THRESHOLD
    ) {
      skippedFields.push('deadline_date');
      warnings.push('截止日期置信度不足，未写入');
    } else {
      nextDeadlineDate = parsed.deadline_date;
      updatedFields.push('deadline_date');
    }

    const parseStatus = updatedFields.length > 0 ? 'parsed_ok' : 'parsed_empty';
    const searchedAt = new Date().toISOString();
    const parseMeta = {
      updated_fields: updatedFields,
      skipped_fields: Array.from(new Set(skippedFields)),
      model_used: modelUsed,
      prompt_template_id: template.id,
      issuer_confidence: issuerConfidence,
      deadline_date_confidence: deadlineConfidence,
    };

    const updatedRecord = await tenderStagingModel.updateTenderParseState(record.id, {
      issuer: nextIssuer,
      deadline_at: nextDeadlineDate ? `${nextDeadlineDate}T00:00:00.000Z` : null,
      deadline_date: nextDeadlineDate,
      last_parsed_at: searchedAt,
      parse_status: parseStatus,
      parse_error: null,
      parse_meta_json: JSON.stringify(parseMeta),
    });

    await logParseAssessment({
      promptId: template.id,
      modelUsed,
      requestHash,
      durationMs,
      status: 'success',
    });

    await saveParseAiLog({
      requestHash,
      promptTemplateId: template.id,
      modelProvider: providerLabel,
      modelName: modelUsed,
      status: 'success',
      durationMs,
      providerTimeoutMs: PARSE_TIMEOUT_MS,
      serviceTimeoutMs: PARSE_SERVICE_TIMEOUT_MS,
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
        parsed,
        parse_status: parseStatus,
        updated_fields: updatedFields,
        skipped_fields: skippedFields,
      },
      notesLines: [
        `[provider] ${providerLabel} model=${modelUsed}`,
        `[timing] durationMs=${durationMs} providerTimeoutMs=${PARSE_TIMEOUT_MS} serviceTimeoutMs=${PARSE_SERVICE_TIMEOUT_MS}`,
        `[updated_fields] ${updatedFields.join(',') || 'none'}`,
      ],
    });

    return {
      record: updatedRecord,
      parsed: {
        issuer: parsed.issuer || '',
        deadline_date: parsed.deadline_date || '',
      },
      updated_fields: updatedFields,
      skipped_fields: Array.from(new Set(skippedFields)),
      warnings: Array.from(new Set(warnings)).filter(Boolean),
      meta: parseMeta,
    };
  } catch (error) {
    durationMs = durationMs || (Date.now() - startedAt);
    await tenderStagingModel.updateTenderParseState(record.id, {
      last_parsed_at: new Date().toISOString(),
      parse_status: 'parsed_failed',
      parse_error: error.message || '招标字段解析失败',
      parse_meta_json: JSON.stringify({
        updated_fields: [],
        skipped_fields: [],
      }),
    });

    const logStatus = error.statusCode === 504 ? 'timeout' : 'fail';
    await logParseAssessment({
      promptId: template?.id,
      modelUsed: modelUsed || model?.model_name || null,
      requestHash,
      durationMs,
      status: logStatus,
      errorMessage: error.message || '招标字段解析失败',
    });

    await saveParseAiLog({
      requestHash,
      promptTemplateId: template?.id,
      modelProvider: providerLabel,
      modelName: modelUsed || model?.model_name || null,
      status: logStatus,
      durationMs,
      providerTimeoutMs: PARSE_TIMEOUT_MS,
      serviceTimeoutMs: PARSE_SERVICE_TIMEOUT_MS,
      request: {
        tender_staging_id: record.id,
        model_id: model?.id,
        prompt_template_id: template?.id,
        variables: variableMap || {
          title: ensureString(record.title).trim(),
          content_excerpt: contentExcerpt,
          published_date: ensureString(record.published_date || record.published_at).trim(),
        },
        system_prompt: systemPrompt || null,
        user_prompt: userPrompt || null,
        final_prompt: finalPrompt || null,
      },
      responseRaw: providerRaw ? JSON.stringify(providerRaw) : undefined,
      responseParsed: {
        error: error.message || '招标字段解析失败',
      },
      notesLines: [
        `[provider] ${providerLabel} model=${modelUsed || model?.model_name || 'unknown'} key=${providerKey}`,
        `[status] failed error=${error.message}`,
      ],
    });

    throw error;
  }
}

module.exports = {
  executeTenderFieldParse,
  buildContentExcerpt,
  normalizeDate,
};
