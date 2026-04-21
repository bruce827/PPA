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
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    throw new Error('module_tag 只能包含小写字母、数字和下划线');
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

/**
 * @deprecated 旧版 `prompt_templates.category` CHECK 枚举约束的合法值列表。
 * 在 Migration 013 之前，category 列受 CHECK 约束限制，只能为以下值之一：
 * risk_analysis | workload_evaluation | module_analysis | web3d_step4_analysis |
 * project_tagging | report_generation | custom | web_search | tender_field_parse
 *
 * 该约束已在 Migration 013 中去除（改为自由的 module_tag），
 * 此数组仅保留用于：旧迁移脚本的兼容性校验 / 历史数据比对。
 * 新代码请勿依赖此常量。
 */
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

/**
 * @deprecated 旧版 category 的别名映射，用于将中文别名或缩写规范化为标准枚举值。
 * 例如用户或旧代码传入"成本估算" → 映射为 `workload_evaluation`。
 *
 * 在 CHECK 枚举时代，部分 API 接受中文名或习惯性缩写作为输入，
 * 由本映射表统一转换为数据库可存储的规范值。
 *
 * 自 Migration 013 起 module_tag 字段不再需要此映射，
 * 此对象仅保留用于旧迁移脚本的兼容性处理。
 */
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

/**
 * @deprecated 旧版 category 字段的规范化函数。
 * 功能：将任意 category 输入标准化为 CHECK 枚举中的合法值，
 *       若无法映射则返回原始输入（不做校验）。
 *
 * 废弃原因：category CHECK 枚举已废弃，改为自由的 module_tag 字段，
 *           新字段只做格式校验（normalizeModuleTag），不做枚举映射。
 * 此函数仅保留给已执行的 Migration 013 脚本使用，新代码不要调用。
 */
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

/**
 * @deprecated 旧版 category 过滤条件的规范化函数。
 * 功能：在查询列表时将 filter 参数中的 category 值统一做 normalizePromptTemplateCategory 映射，
 *       支持数组（多选）输入。
 *
 * 废弃原因：列表查询改用 module_tag 字段后，过滤由 normalizeModuleTag 处理，
 *           此函数仅保留用于 Migration 013 执行后的旧数据兼容路径。
 */
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

/**
 * @deprecated 旧版 category CHECK 枚举值的校验函数。
 * 功能：判断给定 category 值是否在 CANONICAL_PROMPT_TEMPLATE_CATEGORIES 枚举列表中。
 *
 * 废弃原因：module_tag 字段不再有枚举约束，任何非空字符串均可存储。
 *           新代码如需判断是否为推荐值，请使用 isRecommendedModuleTag()。
 * 此函数仅保留用于旧迁移脚本的校验逻辑。
 */
function isValidPromptTemplateCategory(value) {
  const normalized = normalizePromptTemplateCategory(value);
  return CANONICAL_PROMPT_TEMPLATE_CATEGORIES.includes(normalized);
}

/**
 * @deprecated 旧版 category 存储前的强制校验函数。
 * 功能：先将值规范化，再判断是否为合法枚举值；若非法则抛出异常。
 *
 * 废弃原因：module_tag 改为自由字段后，存储前只需 normalizeModuleTag + validateModuleTag，
 *           不再需要强制映射到枚举。此函数仅保留给 Migration 013 执行时的数据迁移逻辑。
 */
function coercePromptTemplateCategoryForStorage(value) {
  const normalized = normalizePromptTemplateCategory(value);
  if (!isValidPromptTemplateCategory(normalized)) {
    throw new Error(`Invalid prompt template category: ${value}`);
  }
  return normalized;
}

/**
 * @deprecated 生成旧版 category CHECK 枚举值的 SQL IN 子句。
 * 功能：返回形如 `'risk_analysis','workload_evaluation',...` 的字符串，
 *       用于 SQL 查询中限制 category 必须为合法枚举值。
 *
 * 废弃原因：module_tag 字段不再有枚举约束，不再需要此 IN 子句。
 *           新代码直接使用自由 tag 值即可。此函数仅保留用于旧迁移脚本的兼容性。
 */
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
