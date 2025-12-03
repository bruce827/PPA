// 中文类别到英文 slug 的映射（可按需扩展）
const CATEGORY_NAME_MAP: Record<string, string> = {
  项目管理: 'project_management',
  业务范围: 'business_scope',
  售前支持: 'pre_sales_support',
  技术环境: 'technical_environment',
  用户体验: 'user_experience',
  质量要求: 'quality_requirements',
  业务复杂度: 'business_complexity',
  数据源: 'data_sources',
  数据处理: 'data_processing',
  技术架构: 'technical_architecture',
  团队协作: 'team_collaboration',
  文档要求: 'documentation_requirements',
  安全合规: 'security_compliance',
  运维保障: 'operations_support',
  集成接口: 'integration_interfaces',
  性能要求: 'performance_requirements',
  可用性: 'availability',
  可维护性: 'maintainability',
  交付管理: 'delivery_management',
  客户参与: 'customer_participation',
  预算约束: 'budget_constraints',
  时间进度: 'schedule_timeline',
  测试保障: 'testing_assurance',
  部署策略: 'deployment_strategy',
};

// 变量安全化：仅小写字母/数字/下划线
export const toSafeVar = (s: string): string =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

// 提取评估项括号内英文 slug，例如 "项目阶段 (project_phase)" -> "project_phase"
export const extractItemEnSlug = (name: string): string | null => {
  const m = name?.match(/\(([^)]+)\)/);
  return m ? m[1].trim() : null;
};

// 去掉括号部分，保留中文用于显示
export const stripParen = (name: string): string => (name || '').replace(/\(.*\)/, '').trim();

// 类别中文转 slug，未知类别做兜底
export const categoryToSlug = (cn: string, fallbackIndex: number): string => {
  const mapped = CATEGORY_NAME_MAP[cn];
  if (mapped) return mapped;
  const rough = toSafeVar(cn);
  return rough || `category_${fallbackIndex}`;
};

