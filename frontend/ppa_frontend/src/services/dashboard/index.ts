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
