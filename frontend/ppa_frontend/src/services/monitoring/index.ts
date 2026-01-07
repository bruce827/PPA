import { request } from '@umijs/max';

export async function getMonitoringLogs(
  params?: Record<string, any>,
  options?: { [key: string]: any },
) {
  return request<API.MonitoringLogsResponse>('/api/monitoring/logs', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

export async function getMonitoringStats(
  params?: Record<string, any>,
  options?: { [key: string]: any },
) {
  return request<API.MonitoringStatsResponse>('/api/monitoring/stats', {
    method: 'GET',
    params,
    ...(options || {}),
  });
}

export async function getMonitoringLogDetail(
  requestHash: string,
  options?: { [key: string]: any },
) {
  return request<API.MonitoringLogDetailResponse>(
    `/api/monitoring/logs/${requestHash}`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}
