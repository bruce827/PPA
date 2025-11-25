const crypto = require('crypto');
const aiPromptService = require('./aiPromptService');
const aiModelModel = require('../models/aiModelModel');
const { selectProvider } = require('../providers/ai/providerSelector');
const aiAssessmentLogModel = require('../models/aiAssessmentLogModel');
const aiFileLogger = require('./aiFileLogger');
const logger = require('../utils/logger');
const {
  validationError,
  unprocessableError,
  timeoutError,
  internalError,
} = require('../utils/errors');

const MAX_DESCRIPTION_LENGTH = 3000;
// 默认 90s（可通过环境变量覆盖）
const DEFAULT_TIMEOUT_MS = parseInt(process.env.AI_ASSESS_TIMEOUT_MS || '90000', 10);

function ensureString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function previewText(text, max = 1200) {
  try {
    const s = ensureString(text, '');
    if (s.length <= max) return s;
    return s.slice(0, max) + `... (truncated, ${s.length} chars total)`;
  } catch {
    return '';
  }
}

function sanitizeModelHint(modelHint) {
  if (modelHint && typeof modelHint === 'string') return modelHint;
  return '';
}

function extractContentFromProviderResponse(response) {
  if (!response) return '';
  if (typeof response === 'string') return response;
  const { choices } = response;
  if (Array.isArray(choices) && choices.length > 0) {
    const message = choices[0].message || {};
    if (message.content) return message.content;
    if (choices[0].text) return choices[0].text;
  }
  return JSON.stringify(response);
}

function cleanJsonCandidate(candidate) {
  if (typeof candidate !== 'string') return candidate;
  return candidate.replace(/```json/gi, '').replace(/```/g, '').trim();
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw validationError('请求体不能为空');
  }
  const { description, promptId, variables } = payload;
  // description 设为必填
  if (!description || typeof description !== 'string' || !description.trim()) {
    throw validationError('description 为必填字段');
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw validationError(`description 字数超出限制 (最大 ${MAX_DESCRIPTION_LENGTH})`);
  }
  if (!promptId || typeof promptId !== 'string') {
    throw validationError('promptId 为必填字段');
  }
  if (variables && typeof variables !== 'object') {
    throw validationError('variables 必须为对象');
  }
}

function applyTemplate(content, variables) {
  if (!content || typeof content !== 'string') return '';
  return content.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return ensureString(variables[key]);
    }
    return '';
  });
}

function normalizeComplexity(raw) {
  const text = ensureString(raw).toLowerCase();
  if (!text) return '中等';
  if (text.includes('简单') || text.includes('simple')) return '简单';
  if (text.includes('复杂') || text.includes('complex')) return '复杂';
  return '中等';
}

function ensureModules(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw unprocessableError('AI 响应无法解析为对象');
  }

  const candidates = [parsed, parsed.data, parsed.result, parsed.output].filter(Boolean);

  let modules = null;
  let projectAnalysis = '';
  let confidence;

  const pickArray = (obj) => obj.modules || obj.items || obj.list;

  for (const obj of candidates) {
    const maybe = pickArray(obj);
    if (Array.isArray(maybe)) {
      modules = maybe;
      break;
    }
  }

  for (const obj of candidates) {
    const a = obj.project_analysis || obj.summary || obj.overall || obj.overview || '';
    if (a) {
      projectAnalysis = ensureString(a);
      break;
    }
  }

  for (const obj of candidates) {
    const c = obj.confidence ?? obj.confidence_score ?? obj.confidenceRatio;
    if (c !== undefined) {
      confidence = Number(c);
      break;
    }
  }

  // 提升健壮性：支持层级 children 结构与常见中文键名，递归拍平
  const getField = (obj, names = []) => {
    for (const n of names) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, n) && obj[n] != null) {
        const v = obj[n];
        if (typeof v === 'string' || typeof v === 'number') return ensureString(v);
      }
    }
    return '';
  };

  const pickModule1 = (obj) =>
    getField(obj, ['module1', 'level1', 'l1', 'group', 'category', '一级模块']);
  const pickModule2 = (obj) =>
    getField(obj, ['module2', 'level2', 'l2', 'subgroup', 'subcategory', '二级模块']);
  const pickModule3 = (obj) => getField(obj, ['module3', 'level3', 'l3', 'name', 'title', '三级模块']);
  const pickDesc = (obj) => ensureString(obj?.description || obj?.desc || obj?.explain || obj?.note || '');
  const pickComp = (obj) => normalizeComplexity(obj?.complexity || obj?.level || obj?.degree || '中等');
  const pickConf = (obj) => (obj?.confidence !== undefined ? Number(obj.confidence) : undefined);

  const out = [];
  function walk(item, ctx) {
    if (!item || typeof item !== 'object') return;
    const m1 = pickModule1(item) || ctx.m1 || '';
    const m2 = pickModule2(item) || ctx.m2 || '';
    const m3 = pickModule3(item);
    const ch = item.children || item.modules || item.items || item.list;

    if (Array.isArray(ch) && ch.length > 0) {
      // 继续向下传递上下文
      ch.forEach((child) => walk(child, { m1, m2 }));
    }

    // 当前节点若已具备三级信息，则收集
    if (m1 && m2 && m3) {
      out.push({
        module1: m1,
        module2: m2,
        module3: m3,
        description: pickDesc(item),
        complexity: pickComp(item),
        confidence: pickConf(item),
      });
    }
  }

  let normalized = [];
  if (Array.isArray(modules)) {
    modules.forEach((it) => walk(it, { m1: '', m2: '' }));
    // 如果递归未产出，回退到平铺解析
    if (out.length === 0) {
      normalized = modules
        .map((item) => {
          const m1 = pickModule1(item);
          const m2 = pickModule2(item);
          const m3 = pickModule3(item);
          if (!m1 || !m2 || !m3) return null;
          return {
            module1: m1,
            module2: m2,
            module3: m3,
            description: pickDesc(item),
            complexity: pickComp(item),
            confidence: pickConf(item),
          };
        })
        .filter(Boolean);
    } else {
      normalized = out;
    }
  }

  if (!normalized || normalized.length === 0) {
    throw unprocessableError('AI 响应缺少 modules 列表');
  }

  return {
    project_analysis: projectAnalysis,
    modules: normalized,
    confidence,
  };
}

function parseProviderResult(rawResponse) {
  let candidate = extractContentFromProviderResponse(rawResponse);
  candidate = cleanJsonCandidate(candidate);

  if (typeof candidate === 'string') {
    try {
      const parsed = JSON.parse(candidate);
      let ensured = ensureModules(parsed);
      // 保护性增强：若解析结果模块过少，但原文本中包含更丰富的 modules 片段，则尝试二次提取
      try {
        const roughHit = (candidate.match(/\"module1\"\s*:/g) || []).length;
        if (Array.isArray(ensured?.modules) && ensured.modules.length < Math.max(roughHit, 5)) {
          const rescued = rescueModulesFromText(candidate);
          if (rescued && rescued.modules && rescued.modules.length > ensured.modules.length) {
            ensured = rescued;
          }
          if ((!rescued || !rescued.modules || rescued.modules.length === 0)) {
            const scraped = scrapeModulesLooseJson(candidate);
            if (scraped && scraped.modules && scraped.modules.length > ensured.modules.length) {
              ensured = scraped;
            }
          }
        }
      } catch (e) {}
      return ensured;
    } catch (error) {
      // 文本兜底优先：尝试直接从文本抠出 modules 数组
      const rescued = rescueModulesFromText(candidate);
      if (rescued && rescued.modules && rescued.modules.length > 0) {
        return rescued;
      }
      // 尝试从文本中扫描包含 module1/module2/module3 的对象片段
      const scraped = scrapeModulesLooseJson(candidate);
      if (scraped && scraped.modules && scraped.modules.length > 0) {
        return scraped;
      }
      // 若失败，使用行级正则再尝试从纯文本提取 1/2/3 级
      const text = String(candidate);
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      const modules = [];
      const re = /^(.*?)\s*(?:>|->|\u2192)\s*(.*?)\s*(?:>|->|\u2192)\s*(.*?)(?:[:：]\s*(.*))?(?:\s*\((简单|中等|复杂)\))?$/;
      for (const line of lines) {
        const m = line.match(re);
        if (m) {
          modules.push({
            module1: m[1],
            module2: m[2],
            module3: m[3],
            description: m[4] || '',
            complexity: m[5] || '中等',
          });
        }
      }
      if (modules.length > 0) {
        return ensureModules({ modules });
      }
      logger.warn('解析 AI 文本响应失败(模块梳理)', { reason: '无法提取模块' });
      throw unprocessableError('AI 响应不是有效 JSON');
    }
  }

  return ensureModules(candidate);
}

// 从原始文本中尽量抠出 modules 数组并解析
function rescueModulesFromText(text) {
  try {
    const s = ensureString(text, '');
    const keyIdx = s.indexOf('"modules"');
    if (keyIdx === -1) return null;
    const arrStart = s.indexOf('[', keyIdx);
    if (arrStart === -1) return null;
    // 括号配对，找到对应的 ]
    let depth = 0;
    let end = -1;
    for (let i = arrStart; i < s.length; i++) {
      const ch = s[i];
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) return null;
    const arrayJson = s.slice(arrStart, end + 1);
    const wrapper = `{"modules": ${arrayJson}}`;
    const parsed = JSON.parse(wrapper);
    return ensureModules(parsed);
  } catch (e) {
    return null;
  }
}

// 扫描文本中形如 {"module1":"..","module2":"..","module3":"..", ...} 的对象片段
function scrapeModulesLooseJson(text) {
  try {
    const s = ensureString(text, '');
    const regex = /\{[^{}]*\"module1\"\s*:\s*\"[^\"]+\"[^{}]*\"module2\"\s*:\s*\"[^\"]+\"[^{}]*\"module3\"\s*:\s*\"[^\"]+\"[^{}]*\}/g;
    const objs = [];
    let m;
    while ((m = regex.exec(s))) {
      try {
        const obj = JSON.parse(m[0]);
        objs.push(obj);
      } catch (e) {
        // ignore broken fragment
      }
    }
    if (objs.length > 0) {
      return ensureModules({ modules: objs });
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function logAssessment({ promptId, modelUsed, requestHash, durationMs, status, errorMessage }) {
  try {
    await aiAssessmentLogModel.insertLog({
      promptId,
      modelUsed,
      requestHash,
      durationMs,
      status,
      errorMessage,
    });
  } catch (error) {
    logger.warn('写入 ai_assessment_logs 失败(模块梳理)', { error: error.message });
  }
}

async function analyzeProjectModules(payload) {
  validatePayload(payload);

  const { description, promptId, variables = {}, projectType, projectScale } = payload;

  // 读取提示词
  const promptDefinition = await aiPromptService.getPromptById(promptId);
  const variableDefaults = {};
  (promptDefinition?.variables || []).forEach((v) => {
    variableDefaults[v.name] = v.default_value || '';
  });
  const variableMap = {
    ...variableDefaults,
    ...variables,
    // description 必填，已在 validatePayload 校验
    description: ensureString(description, ''),
    project_type: ensureString(projectType || ''),
    project_scale: ensureString(projectScale || ''),
  };

  const content = promptDefinition?.content || '';
  const containsDescToken = /\{\{\s*description\s*\}\}/i.test(content);
  let promptText = applyTemplate(content, variableMap);
  // 兜底：若模板未包含 description 变量占位符，自动在末尾追加项目描述，确保两者均发送到模型
  if (!containsDescToken && variableMap.description) {
    promptText = [
      promptText,
      '',
      '项目描述:',
      ensureString(variableMap.description),
    ].join('\n');
  }

  // 记录请求入参（裁剪后的预览，避免日志过长；不包含密钥）
  try {
    const variablesSnapshot = (() => {
      try {
        const raw = JSON.stringify(variableMap) || '';
        return previewText(raw, 1200);
      } catch {
        return undefined;
      }
    })();
    logger.info('AI 模块梳理请求参数', {
      promptId,
      promptLength: promptText.length,
      promptPreview: previewText(promptText, 1200),
      variablesKeys: Object.keys(variableMap || {}),
      variablesSnapshot,
    });
  } catch (e) {}

  // 模型应用管理（当前模型）
  let currentModel = null;
  try {
    currentModel = await aiModelModel.getCurrentModel();
  } catch (e) {
    currentModel = null;
  }

  if (!currentModel) {
    throw internalError('未配置当前可用的AI模型，请在模型应用管理中设置');
  }

  const providerLabel = currentModel?.provider || 'openai-compatible';
  const { impl: providerImpl, key: providerKey } = selectProvider(providerLabel);
  const modelFromDb = currentModel?.model_name;
  const apiHostFromDb = currentModel?.api_host;
  const apiKeyFromDb = currentModel?.api_key;
  const configuredTimeoutSec = parseInt(currentModel?.timeout, 10);
  const providerTimeoutMs = Number.isFinite(configuredTimeoutSec)
    ? Math.max(5000, configuredTimeoutSec * 1000)
    : DEFAULT_TIMEOUT_MS;
  // 额外服务缓冲：在模型超时基础上再增加 10s，避免边界抖动
  const serviceTimeoutMs = providerTimeoutMs + 10000;

  const requestHash = crypto
    .createHash('sha256')
    .update(`modules:${modelFromDb || 'model'}:${Date.now()}`)
    .digest('hex');

  const providerParams = {
    prompt: promptText,
    model: sanitizeModelHint(modelFromDb),
    requestHash,
    api_host: apiHostFromDb,
    api_key: apiKeyFromDb,
  };

  if (!providerParams.model) {
    throw validationError('当前模型未配置模型名称');
  }
  if (!providerParams.api_host || !providerParams.api_key) {
    throw validationError('当前模型未配置完整的 API Host 或 API Key');
  }

  try {
    logger.info('AI Module Provider 选择结果', {
      providerLabel,
      providerKey,
      apiHost: apiHostFromDb,
      model: providerParams.model,
      providerTimeoutMs,
      serviceTimeoutMs,
    });
  } catch (e) {}

  let status = 'success';
  let errorMessage = '';
  let providerRaw = null;
  let providerContent = null;
  let providerModelUsed = null;

  try {
    const providerCall = providerImpl.createRiskAssessment({
      ...providerParams,
      timeoutMs: providerTimeoutMs,
    });

    const providerResult = await Promise.race([
      providerCall,
      new Promise((_, reject) => {
        setTimeout(() => reject(timeoutError('AI 调用超时')), serviceTimeoutMs);
      }),
    ]);

    providerModelUsed = providerResult.model || providerParams.model;
    const rawSource = providerResult.data || providerResult;
    providerRaw = rawSource;
    const rawContent = extractContentFromProviderResponse(rawSource);
    providerContent = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
    const parsed = parseProviderResult(rawSource);

    const durationMs = providerResult.durationMs || 0;
    await logAssessment({
      promptId,
      modelUsed: providerModelUsed,
      requestHash,
      durationMs,
      status,
    });

    // 记录响应回参（裁剪后的预览）
      try {
        const modules = Array.isArray(parsed?.modules) ? parsed.modules : [];
        logger.info('AI 模块梳理响应', {
          promptId,
          model: providerModelUsed,
        durationMs,
        rawLength: ensureString(rawContent).length,
        rawPreview: previewText(rawContent, 1200),
        modulesCount: modules.length,
        modulesHead: modules.slice(0, 5).map((m) => `${ensureString(m.module1)}/${ensureString(m.module2)}/${ensureString(m.module3)}`),
      });
    } catch (e) {}

    // 文件日志保存（成功）
    try {
      await aiFileLogger.save({
        step: 'modules',
        route: '/api/ai/analyze-project-modules',
        requestHash,
        promptTemplateId: String(promptId),
        modelProvider: providerLabel,
        modelName: providerModelUsed,
        status: 'success',
        durationMs,
        providerTimeoutMs,
        serviceTimeoutMs,
        request: {
          promptId,
          template_content: content,
          variables: variableMap,
          description,
          final_prompt: promptText,
        },
        responseRaw: JSON.stringify(providerRaw),
        responseParsed: {
          project_analysis: parsed.project_analysis || '',
          modules: parsed.modules || [],
          _raw_text: providerContent,
        },
        notesLines: [
          `[provider] ${providerLabel} model=${providerModelUsed}`,
          `[timing] durationMs=${durationMs} providerTimeoutMs=${providerTimeoutMs} serviceTimeoutMs=${serviceTimeoutMs}`,
          `[counts] modules=${Array.isArray(parsed.modules) ? parsed.modules.length : 0}`,
        ],
      });
    } catch (e) {}

    return {
      project_analysis: parsed.project_analysis || '',
      modules: parsed.modules || [],
      raw_response: providerContent || (providerRaw ? JSON.stringify(providerRaw) : ''),
      model_used: providerModelUsed || providerParams.model,
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
    };
  } catch (error) {
    status = error.statusCode === 504 ? 'timeout' : 'fail';
    errorMessage = error.message;

    const durationMs = 0;
    await logAssessment({
      promptId,
      modelUsed: providerModelUsed || sanitizeModelHint(currentModel?.model_name),
      requestHash,
      durationMs,
      status,
      errorMessage,
    });

    // 文件日志保存（失败/超时）
    try {
      await aiFileLogger.save({
        step: 'modules',
        route: '/api/ai/analyze-project-modules',
        requestHash,
        promptTemplateId: String(promptId),
        modelProvider: providerLabel,
        modelName: providerModelUsed || providerParams.model,
        status,
        durationMs: 0,
        providerTimeoutMs,
        serviceTimeoutMs,
        request: {
          promptId,
          template_content: content,
          variables: variableMap,
          description,
          final_prompt: promptText,
        },
        responseRaw: providerRaw ? JSON.stringify(providerRaw) : undefined,
        responseParsed: providerContent ? { _raw_text: providerContent } : undefined,
        notesLines: [
          `[error] ${error.message}`,
        ],
      });
    } catch (e) {}

    if (error.statusCode) throw error;
    throw internalError(error.message || 'AI 模块梳理失败');
  }
}

module.exports = {
  analyzeProjectModules,
};
