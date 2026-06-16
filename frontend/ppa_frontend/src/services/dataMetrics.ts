import { request } from '@umijs/max';

// ========== 类型定义 ==========

export interface DataMetricsProject {
  id: number;
  project_name: string;
  project_desc?: string;
  linked_project_id?: number;
  metric_count: number;
  created_at: string;
  updated_at: string;
}

export interface DataMetric {
  id: number;
  dm_project_id: number;
  application?: string;
  module_name: string;
  scene_l1: string;
  scene_l2: string;
  metric_name: string;
  display_type: string;
  data_source_logic?: string;
  algorithm?: string;
  collection_cycle?: string;
  source_system?: string;
  source_module?: string;
  integration_method?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

export interface DataMetricListParams {
  dm_project_id?: number;
  module_name?: string;
  scene_l1?: string;
  scene_l2?: string;
  display_type?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface DataMetricListResponse {
  items: DataMetric[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Category {
  id: number;
  dm_project_id: number;
  type: 'module' | 'scene_l1' | 'scene_l2';
  name: string;
  parent_id?: number;
  sort_order: number;
  children?: Category[];
}

export interface ImportPreviewResponse {
  sheetName: string;
  totalRows: number;
  validCount: number;
  errorCount: number;
  items: Partial<DataMetric>[];
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

export interface ImportConfirmResponse {
  imported: number;
  skipped: number;
}

export interface FilterOptions {
  modules: string[];
  scenesL1: string[];
  scenesL2: string[];
  displayTypes: string[];
  collectionCycles: string[];
  sourceSystems: string[];
}

export interface LinkedProject {
  id: number;
  name: string;
}

// ========== 项目 CRUD ==========

export async function getDataMetricsProjects() {
  return request<{ success: boolean; data: DataMetricsProject[] }>('/api/data-metrics/projects');
}

export async function getDataMetricsProjectById(id: number) {
  return request<{ success: boolean; data: DataMetricsProject }>(`/api/data-metrics/projects/${id}`);
}

export async function createDataMetricsProject(data: {
  project_name: string;
  project_desc?: string;
  linked_project_id?: number;
}) {
  return request<{ success: boolean; data: DataMetricsProject }>('/api/data-metrics/projects', {
    method: 'POST',
    data,
  });
}

export async function updateDataMetricsProject(id: number, data: {
  project_name: string;
  project_desc?: string;
  linked_project_id?: number;
}) {
  return request<{ success: boolean; data: DataMetricsProject }>(`/api/data-metrics/projects/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteDataMetricsProject(id: number) {
  return request<{ success: boolean; data: { id: number } }>(`/api/data-metrics/projects/${id}`, {
    method: 'DELETE',
  });
}

// ========== 统计 ==========

export async function getDataMetricsStats(dmProjectId?: number) {
  return request('/api/data-metrics/stats', { 
    params: dm_project_id ? { dm_project_id: dmProjectId } : undefined 
  });
}

// ========== 筛选选项 ==========

export async function getFilterOptions(dmProjectId?: number) {
  return request<{ success: boolean; data: FilterOptions }>('/api/data-metrics/filter-options', {
    params: dm_project_id ? { dm_project_id: dmProjectId } : undefined
  });
}

// ========== 历史项目 ==========

export async function getLinkedProjects() {
  return request<{ success: boolean; data: LinkedProject[] }>('/api/data-metrics/linked-projects');
}

// ========== 指标 CRUD ==========

export async function getDataMetrics(params: DataMetricListParams) {
  return request<{ success: boolean; data: DataMetricListResponse }>('/api/data-metrics', { params });
}

export async function getDataMetricById(id: number) {
  return request<{ success: boolean; data: DataMetric }>(`/api/data-metrics/${id}`);
}

export async function createDataMetric(data: Omit<DataMetric, 'id' | 'created_at' | 'updated_at'>) {
  return request<{ success: boolean; data: DataMetric }>('/api/data-metrics', {
    method: 'POST',
    data,
  });
}

export async function updateDataMetric(id: number, data: Partial<Omit<DataMetric, 'id' | 'created_at' | 'updated_at'>>) {
  return request<{ success: boolean; data: DataMetric }>(`/api/data-metrics/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteDataMetric(id: number) {
  return request<{ success: boolean; data: { id: number } }>(`/api/data-metrics/${id}`, {
    method: 'DELETE',
  });
}

export async function batchDataMetrics(action: 'delete' | 'update', ids: number[], data?: any) {
  return request('/api/data-metrics/batch', {
    method: 'POST',
    data: { action, ids, data },
  });
}

// ========== Excel导入导出 ==========

export async function previewImport(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request<{ success: boolean; data: ImportPreviewResponse }>('/api/data-metrics/import/preview', {
    method: 'POST',
    data: formData,
    requestType: 'form',
  });
}

export async function confirmImport(dmProjectId: number, mode: 'append' | 'overwrite', data: Partial<DataMetric>[]) {
  return request<{ success: boolean; data: ImportConfirmResponse }>('/api/data-metrics/import', {
    method: 'POST',
    data: { dm_project_id: dmProjectId, mode, data },
  });
}

export async function exportDataMetrics(params?: {
  dm_project_id?: number;
  module_name?: string;
  scene_l1?: string;
  display_type?: string;
}) {
  return request('/api/data-metrics/export', {
    params,
    responseType: 'blob',
  });
}

// ========== 场景分类 ==========

export async function getCategoryTree(dmProjectId: number) {
  return request<{ success: boolean; data: Category[] }>('/api/data-metrics/categories/tree', {
    params: { dm_project_id: dmProjectId }
  });
}

export async function createCategory(data: {
  dm_project_id: number;
  type: 'module' | 'scene_l1' | 'scene_l2';
  name: string;
  parent_id?: number;
  sort_order?: number;
}) {
  return request<{ success: boolean; data: Category }>('/api/data-metrics/categories', {
    method: 'POST',
    data,
  });
}

export async function updateCategory(id: number, data: {
  name?: string;
  sort_order?: number;
  parent_id?: number;
}) {
  return request<{ success: boolean; data: Category }>(`/api/data-metrics/categories/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deleteCategory(id: number) {
  return request<{ success: boolean; data: { id: number } }>(`/api/data-metrics/categories/${id}`, {
    method: 'DELETE',
  });
}
