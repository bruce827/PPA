/**
 * 提示词模板模块标签（module_tag）
 *
 * 分类本质是"哪个模块的 AI 调用用这个模板"，用于在模板列表中过滤查找。
 * 不再是枚举硬编码——可以自由输入，但推荐使用以下标准值。
 */

const RECOMMENDED_MODULE_TAGS = [
  {
    value: 'assessment',
    label: '评估流程',
    description: '评估流程中的 AI 分析（风险/工作量/模块分析）',
  },
  {
    value: 'web3d',
    label: '3D 模块',
    description: 'Web3D 模块的 AI 分析（Step4 图片分析等）',
  },
  {
    value: 'tender',
    label: '招标信息',
    description: '招标信息的解析、字段提取等',
  },
  {
    value: 'bidding_search',
    label: '全网招标检索',
    description: '全网招标信息的搜索与处理',
  },
  {
    value: 'report',
    label: '报告生成',
    description: '评估报告的生成',
  },
  {
    value: 'general',
    label: '通用',
    description: '通用模板，无特定模块归属',
  },
];

/**
 * 历史遗留分类名的迁移映射（旧值 → 新值）
 * 仅在 migration 脚本中使用
 */
const LEGACY_CATEGORY_MAP = {
  risk_analysis: 'assessment',
  workload_evaluation: 'assessment',
  module_analysis: 'assessment',
  web3d_step4_analysis: 'web3d',
  project_tagging: 'tender',
  report_generation: 'report',
  web_search: 'bidding_search',
  tender_field_parse: 'tender',
  custom: 'general',
};

/**
 * 规范化 module_tag：去除首尾空格，小写化
 */
function normalizeModuleTag(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim().toLowerCase();
}

/**
 * 校验 module_tag 是否合法（只做非空校验）
 */
function validateModuleTag(value) {
  const normalized = normalizeModuleTag(value);
  if (!normalized) {
    throw new Error('module_tag 不能为空');
  }
  return normalized;
}

/**
 * 校验 module_tag 是否为推荐值（非强制，仅提示）
 */
function isRecommendedModuleTag(value) {
  return RECOMMENDED_MODULE_TAGS.some((t) => t.value === value);
}

// ============ 以下为旧迁移兼容函数（保留给已执行的迁移使用）============

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
  RECOMMENDED_MODULE_TAGS,
  LEGACY_CATEGORY_MAP,
  normalizeModuleTag,
  validateModuleTag,
  isRecommendedModuleTag,
  // 旧迁移兼容
  CANONICAL_PROMPT_TEMPLATE_CATEGORIES,
  PROMPT_TEMPLATE_CATEGORY_ALIASES,
  normalizePromptTemplateCategory,
  normalizePromptTemplateCategoryFilter,
  isValidPromptTemplateCategory,
  coercePromptTemplateCategoryForStorage,
  getPromptTemplateCategorySqlList,
};
