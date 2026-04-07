const crypto = require('crypto');
const path = require('path');

const aiAssessmentLogModel = require('../models/aiAssessmentLogModel');
const aiFileLogger = require('./aiFileLogger');
const aiModelModel = require('../models/aiModelModel');
const configModel = require('../models/configModel');
const promptTemplateModel = require('../models/promptTemplateModel');
const web3dConfigModel = require('../models/web3dConfigModel');
const { selectVisionProvider } = require('../providers/ai/visionProviderSelector');
const logger = require('../utils/logger');
const {
  internalError,
  timeoutError,
  unprocessableError,
  validationError,
} = require('../utils/errors');

const STEP = 'web3d_step4';
const ROUTE = '/api/web3d/ai/step4-analyze';
const MAX_IMAGE_COUNT = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = parseInt(process.env.AI_ASSESS_TIMEOUT_MS || '90000', 10);

function ensureString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function sanitizeFilename(name, fallback = 'image') {
  const ext = path.extname(String(name || ''));
  const basename = path.basename(String(name || fallback), ext);
  const safeBase = basename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
  return `${safeBase || fallback}${safeExt || ''}`;
}

function parseTemplateVariables(variablesJson) {
  if (!variablesJson) return [];
  try {
    const parsed = JSON.parse(variablesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
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

function normalizeApplicability(value, recommendedBaseDays) {
  const text = ensureString(value).trim().toLowerCase();
  if (
    text === 'required' ||
    text.includes('必需') ||
    text.includes('必须') ||
    text.includes('需要')
  ) {
    return 'required';
  }
  if (
    text === 'optional' ||
    text.includes('可选') ||
    text.includes('按需')
  ) {
    return 'optional';
  }
  if (
    text === 'not_applicable' ||
    text === 'na' ||
    text === 'n/a' ||
    text.includes('不适用') ||
    text.includes('无需') ||
    text.includes('不需要')
  ) {
    return 'not_applicable';
  }

  const numericBaseDays = Number(recommendedBaseDays);
  if (Number.isFinite(numericBaseDays) && numericBaseDays > 0) {
    return 'required';
  }

  return 'not_applicable';
}

function normalizeKey(key) {
  return ensureString(key)
    .toLowerCase()
    .replace(/[\s:：，,.。;；_\-]/g, '')
    .trim();
}

function normalizeRoleNames(roleNames, configRoles) {
  const configuredRoles = Array.isArray(configRoles) ? configRoles : [];
  const roleMap = configuredRoles.map((role) => ({
    original: role.role_name,
    normalized: normalizeKey(role.role_name),
  }));

  const source = Array.isArray(roleNames)
    ? roleNames
    : roleNames
      ? [roleNames]
      : [];

  const matched = [];
  source.forEach((roleName) => {
    const normalizedRoleName = normalizeKey(roleName);
    if (!normalizedRoleName) return;
    const hit = roleMap.find(
      (role) =>
        role.normalized === normalizedRoleName ||
        role.normalized.includes(normalizedRoleName) ||
        normalizedRoleName.includes(role.normalized)
    );
    if (hit && !matched.includes(hit.original)) {
      matched.push(hit.original);
    }
  });

  return matched;
}

function normalizeImageInput(file) {
  const originalName = ensureString(file?.originalname || file?.originalName, 'image');
  const buffer = Buffer.isBuffer(file?.buffer) ? file.buffer : null;
  const mimeType = ensureString(file?.mimetype || file?.mimeType);
  const size = Number(file?.size || (buffer ? buffer.length : 0));

  if (!buffer || buffer.length === 0) {
    throw validationError('图片内容不能为空');
  }

  if (!mimeType.startsWith('image/')) {
    throw validationError(`仅支持图片文件，收到类型：${mimeType || 'unknown'}`);
  }

  if (size > MAX_IMAGE_SIZE) {
    throw validationError(`单张图片不能超过 ${Math.round(MAX_IMAGE_SIZE / 1024 / 1024)}MB`);
  }

  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  return {
    originalName,
    mimeType,
    size,
    buffer,
    sha256,
    dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
  };
}

function buildPromptContextText({
  context,
  workloadTemplates,
  roles,
  images,
}) {
  const imageSummary = (Array.isArray(images) ? images : []).map((image, index) => ({
    index: index + 1,
    original_name: image.originalName,
    mime_type: image.mimeType,
    size: image.size,
    sha256: image.sha256,
  }));

  return [
    '【Web3D Step4 上下文】',
    JSON.stringify(
      {
        project_name: context?.project_name || context?.step1?.name || '',
        project_description:
          context?.project_description || context?.step1?.description || '',
        step1: context?.step1 || {},
        step2: context?.step2 || {},
        step3: context?.step3 || {},
        risk_summary: context?.risk_summary || {},
      },
      null,
      2
    ),
    '',
    '【可用工作量模板（必须逐项覆盖，不允许遗漏，也不允许新增不存在的 category/item_name）】',
    JSON.stringify(workloadTemplates, null, 2),
    '',
    '【可用角色配置（recommended_role_names 必须只从这里选择）】',
    JSON.stringify(roles, null, 2),
    '',
    '【图片输入元数据】',
    JSON.stringify(imageSummary, null, 2),
    '',
    '【输出要求】',
    `1. 必须返回 JSON 对象，且 coverage 数组长度必须等于 ${workloadTemplates.length}。`,
    '2. coverage 中每一项都必须唯一对应一个现有工作量模板项，字段至少包含 category、item_name、applicability、recommended_base_days、recommended_delivery_factor、recommended_role_names、reason。',
    '3. applicability 仅允许 required、optional、not_applicable。',
    '4. 不适用项也必须返回，但 recommended_base_days 可以为 0，recommended_role_names 可以为空数组。',
    '5. step4_rows 仅保留需要覆盖到 Step4 表格的项，即 required 或 recommended_base_days > 0 的项。',
    '6. 不允许输出任何解释性前缀、Markdown 标记或代码块，只输出 JSON。',
  ].join('\n');
}

function buildVariableMap(template, variables, context) {
  const defaults = {};
  parseTemplateVariables(template.variables_json).forEach((item) => {
    defaults[item.name] = item.default_value || '';
  });

  return {
    ...defaults,
    ...(variables || {}),
    project_name: ensureString(context?.project_name || context?.step1?.name),
    project_description: ensureString(
      context?.project_description || context?.step1?.description
    ),
  };
}

function buildPromptText(template, variables, contextText) {
  const templateContent = [template.system_prompt, template.user_prompt_template]
    .filter(Boolean)
    .join('\n\n');
  const renderedTemplate = applyTemplate(templateContent, variables);
  return [renderedTemplate, '', contextText].filter(Boolean).join('\n');
}

function pickResponseRoot(parsed) {
  if (parsed?.coverage) return parsed;
  if (parsed?.data?.coverage) return parsed.data;
  if (parsed?.result?.coverage) return parsed.result;
  if (parsed?.output?.coverage) return parsed.output;
  return parsed;
}

function ensureNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function buildTemplateKey(category, itemName) {
  return `${ensureString(category).trim()}::${ensureString(itemName).trim()}`;
}

function createUnmappedItem({
  source,
  category,
  item_name,
  reason,
  failure_reason,
}) {
  return {
    source,
    category: ensureString(category).trim(),
    item_name: ensureString(item_name).trim(),
    reason: ensureString(reason),
    failure_reason,
  };
}

function parseCoverage(rawParsed, workloadTemplates, configRoles) {
  const parsed = pickResponseRoot(rawParsed);
  const coverage = Array.isArray(parsed?.coverage) ? parsed.coverage : null;
  if (!coverage) {
    throw unprocessableError('AI 响应缺少 coverage 列表');
  }

  const templateMap = new Map(
    workloadTemplates.map((template) => [buildTemplateKey(template.category, template.item_name), template])
  );
  const seen = new Set();
  const unmappedItems = [];

  const normalizedCoverage = coverage.reduce((acc, item) => {
    const category = ensureString(item?.category).trim();
    const itemName = ensureString(item?.item_name).trim();
    const key = buildTemplateKey(category, itemName);
    const itemReason = ensureString(item?.reason || item?.analysis || item?.note);

    if (!templateMap.has(key)) {
      unmappedItems.push(
        createUnmappedItem({
          source: 'coverage',
          category,
          item_name: itemName,
          reason: itemReason,
          failure_reason: 'template_not_found',
        })
      );
      return acc;
    }

    if (seen.has(key)) {
      unmappedItems.push(
        createUnmappedItem({
          source: 'coverage',
          category,
          item_name: itemName,
          reason: itemReason,
          failure_reason: 'duplicate_item',
        })
      );
      return acc;
    }

    const recommendedBaseDays = ensureNumber(
      item?.recommended_base_days ?? item?.base_days,
      0
    );
    const recommendedDeliveryFactor = ensureNumber(
      item?.recommended_delivery_factor ?? item?.delivery_factor,
      recommendedBaseDays > 0 ? 1 : 0
    );
    const applicability = normalizeApplicability(
      item?.applicability,
      recommendedBaseDays
    );
    const roleNames = normalizeRoleNames(
      item?.recommended_role_names ?? item?.role_names,
      configRoles
    );

    if (applicability !== 'not_applicable' && recommendedBaseDays > 0 && roleNames.length === 0) {
      unmappedItems.push(
        createUnmappedItem({
          source: 'coverage',
          category,
          item_name: itemName,
          reason: itemReason,
          failure_reason: 'invalid_roles',
        })
      );
      return acc;
    }

    if (recommendedBaseDays < 0) {
      unmappedItems.push(
        createUnmappedItem({
          source: 'coverage',
          category,
          item_name: itemName,
          reason: itemReason,
          failure_reason: 'invalid_base_days',
        })
      );
      return acc;
    }

    if (recommendedDeliveryFactor < 0) {
      unmappedItems.push(
        createUnmappedItem({
          source: 'coverage',
          category,
          item_name: itemName,
          reason: itemReason,
          failure_reason: 'invalid_delivery_factor',
        })
      );
      return acc;
    }

    seen.add(key);
    acc.push({
      category,
      item_name: itemName,
      applicability,
      recommended_base_days: recommendedBaseDays,
      recommended_delivery_factor: recommendedDeliveryFactor,
      recommended_role_names: roleNames,
      reason: itemReason,
    });
    return acc;
  }, []);

  const missing = workloadTemplates
    .map((template) => buildTemplateKey(template.category, template.item_name))
    .filter((key) => !seen.has(key));

  return {
    summary: ensureString(parsed?.summary || parsed?.overall || parsed?.project_analysis),
    coverage: normalizedCoverage,
    unmapped_items: unmappedItems,
    missing_template_items: missing.map((key) => {
      const [category, itemName] = key.split('::');
      return {
        category,
        item_name: itemName,
      };
    }),
  };
}

function deriveStep4RowsFromCoverage(coverage) {
  return coverage
    .filter(
      (item) =>
        item.applicability === 'required' ||
        ensureNumber(item.recommended_base_days, 0) > 0
    )
    .map((item) => ({
      category: item.category,
      item_name: item.item_name,
      base_days: item.recommended_base_days,
      delivery_factor: item.recommended_delivery_factor || 1,
      role_names: item.recommended_role_names,
      reason: item.reason,
    }));
}

function parseStep4Rows(rawParsed, mappedCoverage, workloadTemplates, configRoles) {
  const parsed = pickResponseRoot(rawParsed);
  const templateMap = new Map(
    workloadTemplates.map((template) => [buildTemplateKey(template.category, template.item_name), template])
  );
  const coverageMap = new Map(
    mappedCoverage.map((item) => [buildTemplateKey(item.category, item.item_name), item])
  );
  const seen = new Set();
  const unmappedItems = [];
  const rawRows = Array.isArray(parsed?.step4_rows) ? parsed.step4_rows : null;
  const sourceRows =
    rawRows && rawRows.length > 0 ? rawRows : deriveStep4RowsFromCoverage(mappedCoverage);

  const step4Rows = sourceRows.reduce((acc, item) => {
    const category = ensureString(item?.category).trim();
    const itemName = ensureString(item?.item_name).trim();
    const key = buildTemplateKey(category, itemName);
    const coverageHit = coverageMap.get(key);

    if (!templateMap.has(key)) {
      unmappedItems.push(
        createUnmappedItem({
          source: 'step4_rows',
          category,
          item_name: itemName,
          reason: ensureString(item?.reason || coverageHit?.reason),
          failure_reason: 'template_not_found',
        })
      );
      return acc;
    }

    if (seen.has(key)) {
      unmappedItems.push(
        createUnmappedItem({
          source: 'step4_rows',
          category,
          item_name: itemName,
          reason: ensureString(item?.reason || coverageHit?.reason),
          failure_reason: 'duplicate_item',
        })
      );
      return acc;
    }

    const baseDays = ensureNumber(
      item?.base_days ?? item?.recommended_base_days ?? coverageHit?.recommended_base_days,
      0
    );
    const deliveryFactor = ensureNumber(
      item?.delivery_factor ??
        item?.recommended_delivery_factor ??
        coverageHit?.recommended_delivery_factor,
      baseDays > 0 ? 1 : 0
    );
    const roleNames = normalizeRoleNames(
      item?.role_names ?? item?.recommended_role_names ?? coverageHit?.recommended_role_names,
      configRoles
    );

    if (baseDays <= 0) {
      unmappedItems.push(
        createUnmappedItem({
          source: 'step4_rows',
          category,
          item_name: itemName,
          reason: ensureString(item?.reason || coverageHit?.reason),
          failure_reason: 'invalid_base_days',
        })
      );
      return acc;
    }

    if (deliveryFactor < 0) {
      unmappedItems.push(
        createUnmappedItem({
          source: 'step4_rows',
          category,
          item_name: itemName,
          reason: ensureString(item?.reason || coverageHit?.reason),
          failure_reason: 'invalid_delivery_factor',
        })
      );
      return acc;
    }

    if (roleNames.length === 0) {
      unmappedItems.push(
        createUnmappedItem({
          source: 'step4_rows',
          category,
          item_name: itemName,
          reason: ensureString(item?.reason || coverageHit?.reason),
          failure_reason: 'invalid_roles',
        })
      );
      return acc;
    }

    seen.add(key);
    acc.push({
      category,
      item_name: itemName,
      base_days: baseDays,
      delivery_factor: deliveryFactor || 1,
      role_names: roleNames,
      reason: ensureString(item?.reason || coverageHit?.reason),
    });
    return acc;
  }, []);

  return {
    step4_rows: step4Rows,
    unmapped_items: unmappedItems,
  };
}

async function insertAssessmentLog(payload) {
  try {
    await aiAssessmentLogModel.insertLog(payload);
  } catch (error) {
    logger.warn('写入 ai_assessment_logs 失败(Web3D Step4)', {
      error: error.message,
    });
  }
}

async function updateAssessmentLogDir({ requestHash, logDir }) {
  try {
    await aiAssessmentLogModel.updateLogDir({
      requestHash,
      step: STEP,
      route: ROUTE,
      logDir,
    });
  } catch (_error) {}
}

async function getStep4Prompts() {
  const currentVisionModel = await aiModelModel.getCurrentVisionModel().catch(() => null);
  const templatesResult = await promptTemplateModel.getAll({
    is_active: 1,
    category: 'web3d_step4_analysis',
    pageSize: 1000,
  });

  const rows = Array.isArray(templatesResult?.data) ? templatesResult.data : [];
  const prompts = await Promise.all(
    rows.map(async (row) => {
      const fullTemplate = await promptTemplateModel.getById(row.id);
      const variables = parseTemplateVariables(fullTemplate?.variables_json).map((variable) => ({
        name: variable.name,
        display_name: variable.display_name || variable.name,
        description: variable.description || '',
        default_value:
          variable.default_value !== undefined && variable.default_value !== null
            ? String(variable.default_value)
            : '',
      }));

      return {
        id: String(fullTemplate.id),
        name: fullTemplate.template_name || '',
        description: fullTemplate.description || '',
        content: [fullTemplate.system_prompt, fullTemplate.user_prompt_template]
          .filter(Boolean)
          .join('\n\n'),
        variables,
        model_hint: currentVisionModel?.model_name || '',
        updated_at: fullTemplate.updated_at,
      };
    })
  );

  return prompts;
}

async function analyzeStep4(payload) {
  const startedAt = Date.now();
  const promptId = ensureString(payload?.promptId).trim();
  const variables = payload?.variables && typeof payload.variables === 'object' ? payload.variables : {};
  const context = payload?.context && typeof payload.context === 'object' ? payload.context : null;
  const rawImages = Array.isArray(payload?.images) ? payload.images : [];

  if (!promptId) {
    throw validationError('promptId 为必填字段');
  }

  if (!context) {
    throw validationError('context_json 为必填字段');
  }

  if (rawImages.length > MAX_IMAGE_COUNT) {
    throw validationError(`最多只能上传 ${MAX_IMAGE_COUNT} 张图片`);
  }

  const images = rawImages.map((image) => normalizeImageInput(image));

  const [template, currentVisionModel, workloadTemplates, configRoles] = await Promise.all([
    promptTemplateModel.getById(promptId),
    aiModelModel.getCurrentVisionModel(),
    web3dConfigModel.getWorkloadTemplates(),
    configModel.getAllRoles(),
  ]);

  if (!template) {
    throw validationError('提示词模板不存在');
  }

  if (template.is_active !== 1) {
    throw validationError('所选提示词模板未启用');
  }

  if (template.category !== 'web3d_step4_analysis') {
    throw validationError('所选提示词模板不属于 Web3D Step4 分析分类');
  }

  if (!currentVisionModel) {
    throw validationError('当前未配置视觉模型，请先在模型管理中设置当前视觉模型');
  }

  if (currentVisionModel.supports_vision !== 1) {
    throw validationError('当前视觉模型未开启 supports_vision');
  }

  const contextText = buildPromptContextText({
    context,
    workloadTemplates,
    roles: configRoles,
    images,
  });
  const variableMap = buildVariableMap(template, variables, context);
  const finalPrompt = buildPromptText(template, variableMap, contextText);

  const providerTimeoutMs = Number.isFinite(Number(currentVisionModel?.timeout))
    ? Math.max(5000, Number(currentVisionModel.timeout) * 1000)
    : DEFAULT_TIMEOUT_MS;
  const serviceTimeoutMs = providerTimeoutMs + 3000;
  const maxTokens = Number.isFinite(Number(currentVisionModel?.max_tokens))
    ? Number(currentVisionModel.max_tokens)
    : undefined;

  const requestHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        promptId,
        variables: variableMap,
        context,
        imageHashes: images.map((image) => image.sha256),
        currentVisionModel: currentVisionModel?.id,
      })
    )
    .digest('hex');

  const { impl: providerImpl, key: providerKey } = selectVisionProvider(
    currentVisionModel.provider
  );

  const providerParams = {
    prompt: finalPrompt,
    model: currentVisionModel.model_name,
    requestHash,
    api_host: currentVisionModel.api_host,
    api_key: currentVisionModel.api_key,
    timeoutMs: providerTimeoutMs,
    maxTokens,
    images,
  };

  let providerRaw = null;
  let providerContent = '';
  let modelUsed = currentVisionModel.model_name;

  try {
    logger.info('Web3D Step4 Vision Provider 选择结果', {
      provider: currentVisionModel.provider,
      providerKey,
      model: currentVisionModel.model_name,
      imageCount: images.length,
      providerTimeoutMs,
      serviceTimeoutMs,
    });

    const providerCall = providerImpl.createVisionCompletion(providerParams);
    const providerResult = await Promise.race([
      providerCall,
      new Promise((_, reject) =>
        setTimeout(() => reject(timeoutError('AI 调用超时')), serviceTimeoutMs)
      ),
    ]);

    providerRaw = providerResult.data || providerResult;
    providerContent = extractContentFromProviderResponse(providerRaw);
    modelUsed = providerResult.model || currentVisionModel.model_name;

    const cleaned = cleanJsonCandidate(providerContent);
    let parsedRaw;
    try {
      parsedRaw = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
    } catch (_error) {
      throw unprocessableError('AI 响应不是有效 JSON');
    }

    const parsedCoverage = parseCoverage(parsedRaw, workloadTemplates, configRoles);
    const parsedStep4Rows = parseStep4Rows(
      parsedRaw,
      parsedCoverage.coverage,
      workloadTemplates,
      configRoles
    );
    const step4Rows = parsedStep4Rows.step4_rows;
    const unmappedItems = [
      ...(parsedCoverage.unmapped_items || []),
      ...(parsedStep4Rows.unmapped_items || []),
    ];
    const resolvedTemplateKeys = new Set([
      ...(parsedCoverage.coverage || []).map((item) => buildTemplateKey(item.category, item.item_name)),
      ...step4Rows.map((item) => buildTemplateKey(item.category, item.item_name)),
    ]);
    const missingTemplateItems = workloadTemplates
      .filter(
        (template) => !resolvedTemplateKeys.has(buildTemplateKey(template.category, template.item_name))
      )
      .map((template) => ({
        category: template.category,
        item_name: template.item_name,
      }));

    if (parsedCoverage.coverage.length === 0 && step4Rows.length === 0) {
      throw unprocessableError('AI 未返回任何可映射的工作量项，请调整提示词或手动录入');
    }
    const durationMs = providerResult.durationMs || Date.now() - startedAt;

    await insertAssessmentLog({
      promptId,
      modelUsed,
      requestHash,
      durationMs,
      status: 'success',
      step: STEP,
      route: ROUTE,
      projectId: payload?.projectId,
    });

    const imageMetadata = images.map((image, index) => {
      const filename = `${String(index + 1).padStart(2, '0')}_${sanitizeFilename(
        image.originalName,
        'image'
      )}`;
      return {
        original_name: image.originalName,
        mime_type: image.mimeType,
        size: image.size,
        sha256: image.sha256,
        relative_path: `images/${filename}`,
      };
    });

    const logDir = await aiFileLogger.save({
      step: STEP,
      route: ROUTE,
      requestHash,
      promptTemplateId: String(promptId),
      modelProvider: currentVisionModel.provider,
      modelName: modelUsed,
      status: 'success',
      durationMs,
      providerTimeoutMs,
      serviceTimeoutMs,
      request: {
        promptId,
        template_content: [template.system_prompt, template.user_prompt_template]
          .filter(Boolean)
          .join('\n\n'),
        variables: variableMap,
        context_snapshot: context,
        workload_templates: workloadTemplates,
        roles: configRoles,
        images: imageMetadata,
        final_prompt: finalPrompt,
      },
      responseRaw:
        typeof providerRaw === 'string' ? providerRaw : JSON.stringify(providerRaw, null, 2),
      responseParsed: {
        summary: parsedCoverage.summary,
        coverage: parsedCoverage.coverage,
        step4_rows: step4Rows,
        unmapped_items: unmappedItems,
        missing_template_items: missingTemplateItems,
        _raw_text: providerContent,
      },
      notesLines: [
        `[provider] ${currentVisionModel.provider} key=${providerKey} model=${modelUsed}`,
        `[timing] durationMs=${durationMs} providerTimeoutMs=${providerTimeoutMs} serviceTimeoutMs=${serviceTimeoutMs}`,
        `[counts] images=${images.length} coverage=${parsedCoverage.coverage.length} step4Rows=${step4Rows.length} unmapped=${unmappedItems.length} missing=${missingTemplateItems.length}`,
      ],
      attachments: images.map((image, index) => ({
        relativePath: imageMetadata[index].relative_path,
        buffer: image.buffer,
      })),
    });

    await updateAssessmentLogDir({ requestHash, logDir });

    return {
      summary: parsedCoverage.summary,
      coverage: parsedCoverage.coverage,
      step4_rows: step4Rows,
      unmapped_items: unmappedItems,
      missing_template_items: missingTemplateItems,
      raw_response: providerContent,
      model_used: modelUsed,
      timestamp: new Date().toISOString(),
      duration_ms: durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const status = error.statusCode === 504 ? 'timeout' : 'fail';

    await insertAssessmentLog({
      promptId,
      modelUsed,
      requestHash,
      durationMs,
      status,
      errorMessage: error.message,
      step: STEP,
      route: ROUTE,
      projectId: payload?.projectId,
    });

    const fallbackImageMetadata = images.map((image, index) => ({
      original_name: image.originalName,
      mime_type: image.mimeType,
      size: image.size,
      sha256: image.sha256,
      relative_path: `images/${String(index + 1).padStart(2, '0')}_${sanitizeFilename(
        image.originalName,
        'image'
      )}`,
    }));

    const logDir = await aiFileLogger
      .save({
        step: STEP,
        route: ROUTE,
        requestHash,
        promptTemplateId: String(promptId),
        modelProvider: currentVisionModel?.provider,
        modelName: modelUsed,
        status,
        durationMs,
        providerTimeoutMs,
        serviceTimeoutMs,
        request: {
          promptId,
          template_content: template
            ? [template.system_prompt, template.user_prompt_template].filter(Boolean).join('\n\n')
            : '',
          variables: variableMap,
          context_snapshot: context,
          workload_templates: workloadTemplates,
          roles: configRoles,
          images: fallbackImageMetadata,
          final_prompt: finalPrompt,
        },
        responseRaw:
          typeof providerRaw === 'string'
            ? providerRaw
            : providerRaw
              ? JSON.stringify(providerRaw, null, 2)
              : undefined,
        responseParsed: providerContent ? { _raw_text: providerContent } : undefined,
        notesLines: [`[error] ${error.message}`],
        attachments: images.map((image, index) => ({
          relativePath: fallbackImageMetadata[index].relative_path,
          buffer: image.buffer,
        })),
      })
      .catch(() => null);

    await updateAssessmentLogDir({ requestHash, logDir });

    if (error.statusCode) {
      throw error;
    }

    throw internalError(error.message || 'Web3D Step4 AI 分析失败');
  }
}

module.exports = {
  MAX_IMAGE_COUNT,
  MAX_IMAGE_SIZE,
  getStep4Prompts,
  analyzeStep4,
};
