const sqlite3 = require('sqlite3').verbose();

/**
 * Risk assessment items derived from docs/csv/项目评分.csv
 * Scores follow three tiers to ensure:
 *  - 全部选择最低分时总分 < 200 → 高风险
 *  - 全部选择最高分时总分 > 500 → 低风险
 */
const riskItems = [
  {
    category: '项目管理',
    item_name: '项目阶段 (project_phase)',
    options: [
      { label: '需求不明确或频繁变更', score: 10 },
      { label: '需求已明确，处于规划阶段', score: 35 },
      { label: '需求冻结且具备完整功能设计', score: 60 },
    ],
  },
  {
    category: '业务范围',
    item_name: '目标用户群体 (user_group_complexity)',
    options: [
      { label: '多角色、多部门外部用户', score: 10 },
      { label: '部分外部或跨部门用户', score: 35 },
      { label: '主要为单一内部用户群体', score: 60 },
    ],
  },
  {
    category: '售前支持',
    item_name: '售前支持复杂性 (pre_sales_complexity)',
    options: [
      { label: '需求不完整且缺乏文档', score: 10 },
      { label: '需求文档基本齐备但需补充', score: 35 },
      { label: '需求文档详尽且具备场景说明', score: 60 },
    ],
  },
  {
    category: '技术环境',
    item_name: '部署环境 (deployment_complexity)',
    options: [
      { label: '需跨多云/多端复杂部署', score: 10 },
      { label: '混合部署，需对接多种装置', score: 35 },
      { label: '单一环境部署，依赖清晰', score: 60 },
    ],
  },
  {
    category: '用户体验',
    item_name: '用户体验要求 (user_experience_requirement)',
    options: [
      { label: '需高度定制与沉浸式体验', score: 10 },
      { label: '需多图表与交互但标准控件可覆盖', score: 35 },
      { label: '标准界面即可满足核心诉求', score: 60 },
    ],
  },
  {
    category: '质量要求',
    item_name: '验收标准复杂度 (acceptance_criteria_complexity)',
    options: [
      { label: '指标模糊且多方利益相关', score: 10 },
      { label: '指标明确但需多轮复核', score: 35 },
      { label: '验收标准清晰且量化可验证', score: 60 },
    ],
  },
  {
    category: '业务复杂度',
    item_name: '业务问题复杂度 (business_problem_complexity)',
    options: [
      { label: '跨行业、多流程重塑', score: 10 },
      { label: '跨部门流程整合', score: 35 },
      { label: '单部门流程优化', score: 60 },
    ],
  },
  {
    category: '数据源',
    item_name: '数据源复杂度 (data_source_complexity)',
    options: [
      { label: '多来源异构数据需实时同步', score: 10 },
      { label: '混合数据源（自动采集 + 手工）', score: 35 },
      { label: '单一数据源且结构稳定', score: 60 },
    ],
  },
  {
    category: '数据处理',
    item_name: '数据处理复杂度 (main_data_processing)',
    options: [
      { label: '复杂模型与预测算法且实时计算', score: 10 },
      { label: '需要批处理与基础模型分析', score: 35 },
      { label: '主要为汇总统计与规则引擎', score: 60 },
    ],
  },
  {
    category: '技术架构',
    item_name: '后端架构复杂度 (backend_architecture_complexity)',
    options: [
      { label: '需高并发微服务与弹性伸缩', score: 10 },
      { label: '需要分布式架构与多节点支持', score: 35 },
      { label: '单体/模块化架构即可支撑', score: 60 },
    ],
  },
  {
    category: '团队协作',
    item_name: '负责人重要性 (leader_importance)',
    options: [
      { label: '关键负责人无法持续参与', score: 10 },
      { label: '负责人可阶段性参与', score: 35 },
      { label: '核心负责人全程参与与协调', score: 60 },
    ],
  },
  {
    category: '文档要求',
    item_name: '文档要求 (documentation_requirements)',
    options: [
      { label: '需多语言、多合规制式文档', score: 10 },
      { label: '需满足行业标准模板', score: 35 },
      { label: '内部模板即可覆盖', score: 60 },
    ],
  },
  {
    category: '项目管理',
    item_name: '项目管理复杂度 (project_management_complexity)',
    options: [
      { label: '多供应商协同且流程不稳定', score: 10 },
      { label: '需跨部门协调并同步计划', score: 35 },
      { label: '单团队执行，节奏可控', score: 60 },
    ],
  },
];

const db = new sqlite3.Database('./ppa.db', (err) => {
  if (err) {
    console.error('无法连接 SQLite 数据库:', err.message);
    process.exit(1);
  }
  console.log('已连接 SQLite 数据库，开始初始化风险评估项数据...');
});

db.serialize(() => {
  db.run('DELETE FROM config_risk_items', (deleteErr) => {
    if (deleteErr) {
      console.error('清空旧的风险评估项失败:', deleteErr.message);
      process.exit(1);
    }

    const stmt = db.prepare('INSERT INTO config_risk_items (category, item_name, options_json, is_active) VALUES (?, ?, ?, 1)');

    riskItems.forEach(({ category, item_name, options }) => {
      stmt.run(category, item_name, JSON.stringify(options), (insertErr) => {
        if (insertErr) {
          console.error(`写入风险项 “${item_name}” 失败:`, insertErr.message);
        }
      });
    });

    stmt.finalize((finalizeErr) => {
      if (finalizeErr) {
        console.error('提交风险评估项失败:', finalizeErr.message);
      } else {
        console.log(`已写入 ${riskItems.length} 条风险评估项。`);
      }
      db.close((closeErr) => {
        if (closeErr) {
          console.error('关闭数据库连接失败:', closeErr.message);
        } else {
          console.log('风险评估项初始化完成，数据库连接已关闭。');
        }
      });
    });
  });
});
