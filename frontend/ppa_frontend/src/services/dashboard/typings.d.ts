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
}
