/* eslint-disable */
// 仪表盘相关 API
import { request } from '@umijs/max';

type DashboardRequestOptions = { [key: string]: any };
type WrappedDashboardResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
};
type DashboardHealthResponse = WrappedDashboardResponse<{
  database?: {
    connected?: boolean;
    type?: string;
  };
}>;

const DASHBOARD_READY_MAX_ATTEMPTS = 8;
const DASHBOARD_READY_BASE_DELAY_MS = 500;
const DASHBOARD_READY_MAX_DELAY_MS = 1500;
let dashboardBackendReady = false;
let dashboardBackendReadyPromise: Promise<void> | null = null;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isAbortError = (error: any) => {
  const name = String(error?.name || '');
  const message = String(error?.message || '');
  return name === 'AbortError' || message.toLowerCase().includes('aborted');
};

const getErrorStatus = (error: any) => {
  const status =
    error?.response?.status ?? error?.data?.status ?? error?.status ?? null;
  const numericStatus = Number(status);
  return Number.isFinite(numericStatus) ? numericStatus : null;
};

const isRetryableReadinessError = (error: any) => {
  if (isAbortError(error)) {
    return false;
  }

  const status = getErrorStatus(error);
  if (status === null) {
    return true;
  }

  return status === 408 || status === 425 || status === 429 || status >= 500;
};

const getReadinessRetryDelay = (attempt: number) =>
  Math.min(
    DASHBOARD_READY_BASE_DELAY_MS * (attempt + 1),
    DASHBOARD_READY_MAX_DELAY_MS,
  );

const waitForDashboardBackendReady = async (options?: DashboardRequestOptions) => {
  if (dashboardBackendReady) {
    return;
  }

  if (!dashboardBackendReadyPromise) {
    dashboardBackendReadyPromise = (async () => {
      let lastError: any;

      for (let attempt = 0; attempt < DASHBOARD_READY_MAX_ATTEMPTS; attempt += 1) {
        try {
          const response = await request<DashboardHealthResponse>('/api/health', {
            method: 'GET',
            signal: options?.signal,
          });

          if (response?.success === false) {
            throw new Error(
              response.message || response.error || 'Backend is not ready',
            );
          }

          dashboardBackendReady = true;
          return;
        } catch (error) {
          lastError = error;

          if (
            attempt >= DASHBOARD_READY_MAX_ATTEMPTS - 1 ||
            !isRetryableReadinessError(error)
          ) {
            throw error;
          }

          await delay(getReadinessRetryDelay(attempt));
        }
      }

      throw lastError;
    })().finally(() => {
      if (!dashboardBackendReady) {
        dashboardBackendReadyPromise = null;
      }
    });
  }

  return dashboardBackendReadyPromise;
};

const dashboardRequest = async <T>(
  url: string,
  options?: DashboardRequestOptions,
) => {
  await waitForDashboardBackendReady(options);
  return request<T | WrappedDashboardResponse<T>>(url, {
    method: 'GET',
    ...(options || {}),
  });
};

/** 获取仪表盘概览数据 GET /api/dashboard/summary */
export async function getDashboardSummary(options?: DashboardRequestOptions) {
  return dashboardRequest<API.DashboardSummary>(
    '/api/dashboard/summary',
    options,
  );
}

/** 获取风险等级分布 GET /api/dashboard/risk-distribution */
export async function getRiskDistribution(options?: DashboardRequestOptions) {
  return dashboardRequest<API.RiskDistributionItem[]>(
    '/api/dashboard/risk-distribution',
    options,
  );
}

/** 获取成本构成分析 GET /api/dashboard/cost-composition */
export async function getCostComposition(options?: DashboardRequestOptions) {
  return dashboardRequest<API.CostComposition>(
    '/api/dashboard/cost-composition',
    options,
  );
}

/** 获取角色成本占比 GET /api/dashboard/role-cost-distribution */
export async function getRoleCostDistribution(options?: {
  [key: string]: any;
}) {
  return dashboardRequest<API.RoleCostDistribution>(
    '/api/dashboard/role-cost-distribution',
    options,
  );
}

/** 获取项目成本趋势 GET /api/dashboard/cost-trend */
export async function getCostTrend(options?: DashboardRequestOptions) {
  return dashboardRequest<API.CostTrendItem[]>(
    '/api/dashboard/cost-trend',
    options,
  );
}

/** 获取风险因子与成本关联 GET /api/dashboard/risk-cost-correlation */
export async function getRiskCostCorrelation(options?: DashboardRequestOptions) {
  return dashboardRequest<API.RiskCostCorrelationItem[]>(
    '/api/dashboard/risk-cost-correlation',
    options,
  );
}

/** 获取仪表盘数据（实际使用项目列表） GET /api/projects */
export async function getDashboardData(options?: DashboardRequestOptions) {
  return dashboardRequest<{
    data: API.ProjectInfo[];
    success: boolean;
  }>('/api/projects', {
    ...(options || {}),
  });
}

// --- New Dashboard Refactor APIs ---

/** 获取仪表盘概览数据 GET /api/dashboard/overview */
export async function getOverview(options?: DashboardRequestOptions) {
  return dashboardRequest<API.DashboardOverview>(
    '/api/dashboard/overview',
    options,
  );
}

/** 获取月度趋势数据 GET /api/dashboard/trend */
export async function getTrend(options?: DashboardRequestOptions) {
  return dashboardRequest<API.DashboardTrendItem[]>(
    '/api/dashboard/trend',
    options,
  );
}

/** 获取成本区间分布 GET /api/dashboard/cost-range */
export async function getCostRange(options?: DashboardRequestOptions) {
  return dashboardRequest<API.DashboardCostRangeItem[]>(
    '/api/dashboard/cost-range',
    options,
  );
}

/** 获取关键词云数据 GET /api/dashboard/keywords */
export async function getKeywords(options?: DashboardRequestOptions) {
  return dashboardRequest<API.DashboardKeywordItem[]>(
    '/api/dashboard/keywords',
    options,
  );
}

/** 获取项目基因(DNA)数据 GET /api/dashboard/dna */
export async function getDNA(options?: DashboardRequestOptions) {
  return dashboardRequest<API.DashboardDNA>('/api/dashboard/dna', options);
}

/** 获取核心投入角色 GET /api/dashboard/top-roles */
export async function getTopRoles(options?: DashboardRequestOptions) {
  return dashboardRequest<API.DashboardTopRoleItem[]>(
    '/api/dashboard/top-roles',
    options,
  );
}

/** 获取高频风险项 GET /api/dashboard/top-risks */
export async function getTopRisks(options?: DashboardRequestOptions) {
  return dashboardRequest<API.DashboardTopRiskItem[]>(
    '/api/dashboard/top-risks',
    options,
  );
}
