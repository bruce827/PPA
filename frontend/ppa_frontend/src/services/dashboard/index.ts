/* eslint-disable */
// 仪表盘相关 API
import { request } from '@umijs/max';

/** 获取仪表盘概览数据 GET /api/dashboard/summary */
export async function getDashboardSummary(options?: { [key: string]: any }) {
  return request<API.DashboardSummary>('/api/dashboard/summary', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取风险等级分布 GET /api/dashboard/risk-distribution */
export async function getRiskDistribution(options?: { [key: string]: any }) {
  return request<API.RiskDistributionItem[]>(
    '/api/dashboard/risk-distribution',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

/** 获取成本构成分析 GET /api/dashboard/cost-composition */
export async function getCostComposition(options?: { [key: string]: any }) {
  return request<API.CostComposition>('/api/dashboard/cost-composition', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取角色成本占比 GET /api/dashboard/role-cost-distribution */
export async function getRoleCostDistribution(options?: {
  [key: string]: any;
}) {
  return request<API.RoleCostDistribution>(
    '/api/dashboard/role-cost-distribution',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

/** 获取项目成本趋势 GET /api/dashboard/cost-trend */
export async function getCostTrend(options?: { [key: string]: any }) {
  return request<API.CostTrendItem[]>('/api/dashboard/cost-trend', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取风险因子与成本关联 GET /api/dashboard/risk-cost-correlation */
export async function getRiskCostCorrelation(options?: { [key: string]: any }) {
  return request<API.RiskCostCorrelationItem[]>(
    '/api/dashboard/risk-cost-correlation',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

/** 获取仪表盘数据（实际使用项目列表） GET /api/projects */
export async function getDashboardData(options?: { [key: string]: any }) {
  return request<{
    data: API.ProjectInfo[];
    success: boolean;
  }>('/api/projects', {
    method: 'GET',
    ...(options || {}),
  });
}

// --- New Dashboard Refactor APIs ---

/** 获取仪表盘概览数据 GET /api/dashboard/overview */
export async function getOverview(options?: { [key: string]: any }) {
  return request<API.DashboardOverview>('/api/dashboard/overview', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取月度趋势数据 GET /api/dashboard/trend */
export async function getTrend(options?: { [key: string]: any }) {
  return request<API.DashboardTrendItem[]>('/api/dashboard/trend', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取成本区间分布 GET /api/dashboard/cost-range */
export async function getCostRange(options?: { [key: string]: any }) {
  return request<API.DashboardCostRangeItem[]>('/api/dashboard/cost-range', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取关键词云数据 GET /api/dashboard/keywords */
export async function getKeywords(options?: { [key: string]: any }) {
  return request<API.DashboardKeywordItem[]>('/api/dashboard/keywords', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取项目基因(DNA)数据 GET /api/dashboard/dna */
export async function getDNA(options?: { [key: string]: any }) {
  return request<API.DashboardDNA>('/api/dashboard/dna', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取核心投入角色 GET /api/dashboard/top-roles */
export async function getTopRoles(options?: { [key: string]: any }) {
  return request<API.DashboardTopRoleItem[]>('/api/dashboard/top-roles', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取高频风险项 GET /api/dashboard/top-risks */
export async function getTopRisks(options?: { [key: string]: any }) {
  return request<API.DashboardTopRiskItem[]>('/api/dashboard/top-risks', {
    method: 'GET',
    ...(options || {}),
  });
}
