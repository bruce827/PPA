// 变量安全化：仅小写字母/数字/下划线
const toSafeVar = (s: string): string =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

// 常见中文角色 → 英文slug（精确映射）
const ROLE_NAME_DICT: Record<string, string> = {
  '项目经理': 'project_manager',
  '技术经理': 'technical_manager',
  '产品经理': 'product_manager',
  '架构师': 'architect',
  '后端': 'backend',
  '后端开发': 'backend',
  '前端': 'frontend',
  '前端开发': 'frontend',
  '测试': 'qa',
  '测试工程师': 'qa_engineer',
  '测试经理': 'qa_manager',
  '实施': 'implementation',
  '实施工程师': 'implementation_engineer',
  '算法工程师': 'algorithm_engineer',
  '数据工程师': 'data_engineer',
  '数据分析师': 'data_analyst',
  '运维': 'ops',
  '运维工程师': 'ops_engineer',
  '高级开发': 'senior_developer',
  '中级开发': 'mid_developer',
  '初级开发': 'junior_developer',
  '开发': 'developer',
  'UI': 'ui',
  'UX': 'ux',
  'DBA': 'dba',
};

// 关键词规则（模糊匹配）
const ROLE_KEYWORD_RULES: Array<{ kw: string; slug: string }> = [
  { kw: '项目经理', slug: 'project_manager' },
  { kw: '技术经理', slug: 'technical_manager' },
  { kw: '产品经理', slug: 'product_manager' },
  { kw: '后端', slug: 'backend' },
  { kw: '前端', slug: 'frontend' },
  { kw: '测试工程师', slug: 'qa_engineer' },
  { kw: '测试', slug: 'qa' },
  { kw: '实施工程师', slug: 'implementation_engineer' },
  { kw: '实施', slug: 'implementation' },
  { kw: '算法', slug: 'algorithm_engineer' },
  { kw: '数据分析', slug: 'data_analyst' },
  { kw: '数据工程', slug: 'data_engineer' },
  { kw: '运维', slug: 'ops' },
  { kw: '架构', slug: 'architect' },
  { kw: '高级开发', slug: 'senior_developer' },
  { kw: '中级开发', slug: 'mid_developer' },
  { kw: '初级开发', slug: 'junior_developer' },
];

// 极简拼音映射（覆盖常见角色称谓）
const HZ_TO_PY: Record<string, string> = {
  '项': 'xiang', '目': 'mu', '经': 'jing', '理': 'li',
  '技': 'ji', '术': 'shu', '产': 'chan', '品': 'pin',
  '架': 'jia', '构': 'gou',
  '后': 'hou', '前': 'qian', '端': 'duan',
  '测': 'ce', '试': 'shi',
  '工': 'gong', '程': 'cheng', '师': 'shi',
  '实': 'shi', '施': 'shi',
  '算': 'suan', '法': 'fa',
  '数': 'shu', '据': 'ju', '分': 'fen', '析': 'xi',
  '运': 'yun', '维': 'wei',
  '高': 'gao', '中': 'zhong', '初': 'chu', '级': 'ji', '开': 'kai', '发': 'fa',
};

const toPinyinSlug = (s: string): string => {
  if (!s) return '';
  const parts: string[] = [];
  for (const ch of s) {
    // ASCII 直接保留
    const ascii = ch.replace(/[^\x00-\x7F]/g, '');
    if (ascii) {
      parts.push(ascii.toLowerCase());
      continue;
    }
    const py = HZ_TO_PY[ch];
    if (py) parts.push(py);
  }
  return toSafeVar(parts.join('_'));
};

export const translateRoleToSlug = (rawName: string): string => {
  const name = String(rawName || '').trim();
  if (!name) return '';
  if (ROLE_NAME_DICT[name]) return ROLE_NAME_DICT[name];
  for (const rule of ROLE_KEYWORD_RULES) {
    if (name.includes(rule.kw)) return rule.slug;
  }
  const py = toPinyinSlug(name);
  if (py) return py;
  return toSafeVar(name);
};

