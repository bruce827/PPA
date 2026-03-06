declare namespace API {
  type MonitoringLogStatus = 'success' | 'fail' | 'timeout' | string;

  type MonitoringLogItem = {
    id: number;
    prompt_id?: string | null;
    model_used?: string | null;
    request_hash: string;
    duration_ms?: number | null;
    status: MonitoringLogStatus;
    error_message?: string | null;
    created_at: string;
    step?: string | null;
    route?: string | null;
    project_id?: number | null;
  };

  type MonitoringLogsData = {
    total: number;
    page: number;
    pageSize: number;
    list: MonitoringLogItem[];
  };

  type MonitoringLogsResponse = {
    success: boolean;
    data: MonitoringLogsData;
    error?: string;
  };

  type MonitoringStatsData = {
    totalCalls: number;
    successRate: number;
    avgDuration: number;
    errorDistribution: {
      timeout: number;
      parse: number;
      network: number;
      other: number;
    };
  };

  type MonitoringStatsResponse = {
    success: boolean;
    data: MonitoringStatsData;
    error?: string;
  };

  type MonitoringLogDetailMeta = {
    id: number | null;
    requestHash: string | null;
    status: MonitoringLogStatus | null;
    durationMs: number | null;
    errorMessage: string | null;
    step: string | null;
    route: string | null;
    promptId: string | null;
    modelUsed: string | null;
    projectId: number | null;
    createdAt: string | null;
    logDir: string | null;
  };

  type MonitoringLogDetailData = {
    meta: MonitoringLogDetailMeta;
    index: any | null;
    request: any | null;
    responseRaw: string | null;
    responseParsed: any | null;
    notes: string | null;
  };

  type MonitoringLogDetailResponse = {
    success: boolean;
    data: MonitoringLogDetailData;
    error?: string;
  };
}
