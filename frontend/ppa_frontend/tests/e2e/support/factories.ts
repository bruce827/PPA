export const uniqueName = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const createAssessmentData = () => ({
  risk_scores: {
    '需求不确定': 20,
  },
  ai_unmatched_risks: [],
  custom_risk_items: [
    {
      description: '第三方接口依赖',
      score: 20,
    },
  ],
  roles: [
    {
      role_name: '前端工程师',
      unit_price: 1800,
    },
    {
      role_name: '后端工程师',
      unit_price: 2000,
    },
  ],
  development_workload: [
    {
      module_name: '核心业务模块',
      delivery_factor: 1,
      scope_factor: 1,
      tech_factor: 1,
      前端工程师: 8,
      后端工程师: 10,
    },
  ],
  integration_workload: [
    {
      module_name: '系统集成',
      delivery_factor: 1,
      scope_factor: 1,
      tech_factor: 1,
      前端工程师: 2,
      后端工程师: 3,
    },
  ],
  travel_months: 0,
  travel_headcount: 0,
  maintenance_months: 1,
  maintenance_headcount: 1,
  maintenance_daily_cost: 1600,
  risk_cost_items: [
    {
      description: '风险预留',
      cost: 1,
    },
  ],
});

export const createStandardProjectPayload = (name = uniqueName('E2E标准项目')) => ({
  name,
  description: 'Playwright smoke project',
  is_template: 0,
  tags: ['e2e', 'smoke'],
  assessmentData: createAssessmentData(),
});

export const createWeb3dProjectPayload = (name = uniqueName('E2E-Web3D项目')) => ({
  name,
  description: 'Playwright Web3D smoke project',
  is_template: 0,
  assessment: {
    risk_selections: [],
    workload_items: [
      {
        category: 'core_dev',
        item_name: '场景搭建与基础交互',
        quantity: 1,
        role_name: '前端工程师',
        base_days: 5,
        unit_price_yuan: 1800,
        reason: 'E2E smoke baseline',
      },
    ],
    mix_tech: false,
  },
});
