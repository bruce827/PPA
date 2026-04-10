const CANONICAL_PROMPT_TEMPLATE_CATEGORIES = [
  'risk_analysis',
  'workload_evaluation',
  'module_analysis',
  'web3d_step4_analysis',
  'project_tagging',
  'report_generation',
  'custom',
  'web_search',
  'tender_field_parse',
];

const PROMPT_TEMPLATE_CATEGORY_ALIASES = {
  cost_estimation: 'workload_evaluation',
  成本估算: 'workload_evaluation',
  工作量评估: 'workload_evaluation',
  project_tags: 'project_tagging',
  项目标签: 'project_tagging',
  标签生成: 'project_tagging',
  联网搜索: 'web_search',
  招标字段解析: 'tender_field_parse',
};

function normalizePromptTemplateCategory(value) {
  if (value === undefined || value === null) {
    return value;
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return '';
  }

  return PROMPT_TEMPLATE_CATEGORY_ALIASES[normalized] || normalized;
}

function normalizePromptTemplateCategoryFilter(value) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => normalizePromptTemplateCategory(item))
          .filter(Boolean)
      )
    );
  }

  return normalizePromptTemplateCategory(value);
}

function isValidPromptTemplateCategory(value) {
  const normalized = normalizePromptTemplateCategory(value);
  return CANONICAL_PROMPT_TEMPLATE_CATEGORIES.includes(normalized);
}

function coercePromptTemplateCategoryForStorage(value) {
  const normalized = normalizePromptTemplateCategory(value);
  if (!isValidPromptTemplateCategory(normalized)) {
    throw new Error(`Invalid prompt template category: ${value}`);
  }
  return normalized;
}

function getPromptTemplateCategorySqlList() {
  return CANONICAL_PROMPT_TEMPLATE_CATEGORIES.map((category) => `'${category}'`).join(', ');
}

module.exports = {
  CANONICAL_PROMPT_TEMPLATE_CATEGORIES,
  PROMPT_TEMPLATE_CATEGORY_ALIASES,
  normalizePromptTemplateCategory,
  normalizePromptTemplateCategoryFilter,
  isValidPromptTemplateCategory,
  coercePromptTemplateCategoryForStorage,
  getPromptTemplateCategorySqlList,
};
