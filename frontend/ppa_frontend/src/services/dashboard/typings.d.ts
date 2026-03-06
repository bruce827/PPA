/* eslint-disable */

declare namespace API {
  /** 仪表盘概览数据 */
  type DashboardSummary = {
    totalProjects: number;
    averageCost: string;
  };

  /** 风险分布数据项 */
  type RiskDistributionItem = {
    final_risk_score: number;
    count: number;
  };

  /** 成本构成数据 */
  type CostComposition = {
    softwareDevelopment: number;
    systemIntegration: number;
    operations: number;
    travel: number;
    risk: number;
  };

  /** 角色成本分布数据 */
  type RoleCostDistribution = Record<string, number>;

  /** 成本趋势数据项 */
  type CostTrendItem = {
    month: string;
    totalCost: number;
  };

  /** 风险成本关联数据项 */
  type RiskCostCorrelationItem = {
    final_risk_score: number;
    final_total_cost: number;
  };

  /** 仪表盘统计数据（旧，保留兼容性） */
  type DashboardStats = {
    totalProjects: number;
    averageCost: number;
    riskDistribution: RiskDistributionItem[];
  };

  // --- New Dashboard Refactor Types ---

  type DashboardOverview = {
    recent_30d: number;
    saas_count: number;
    web3d_count: number;
    contracts_count: number;
    knowledge_assets: {
      risk_count: number;
      role_count: number;
      web3d_risk_count: number;
      web3d_workload_template_count: number;
    };
    ai_models: {
      total: number;
      current_name: string | null;
    };
  };

  type DashboardTrendItem = {
    month: string;
    project_count: number;
    avg_total_cost_wan: number;
    avg_risk_score: number;
  };

  type DashboardCostRangeItem = {
    range: string;
    count: number;
  };

  type DashboardKeywordItem = {
    word: string;
    weight: number;
  };

  type DashboardDNA = {
    avg_total_cost_wan: number;
    avg_risk_score: number;
    avg_workload_days: number;
    avg_tech_factor: number;
    avg_delivery_factor: number;
  };

  type DashboardTopRoleItem = {
    role_name: string;
    workload_days: number;
  };

  type DashboardTopRiskItem = {
    risk_name: string;
    count: number;
  };
}
