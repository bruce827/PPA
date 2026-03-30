/* eslint-disable */
// 项目管理相关 API
import { request } from '@umijs/max';

/** 获取项目列表 GET /api/projects */
export async function getProjectList(options?: { [key: string]: any }) {
  return request<API.ProjectListResponse>('/api/projects', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取项目详情 GET /api/projects/${id} */
export async function getProjectDetail(
  id: string | number,
  options?: { [key: string]: any },
) {
  return request<API.ProjectDetailResponse>(`/api/projects/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 删除项目 DELETE /api/projects/${id} */
export async function deleteProject(
  id: string | number,
  options?: { [key: string]: any },
) {
  return request<API.DeleteProjectResponse>(`/api/projects/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}

export async function updateProject(
  id: string | number,
  data: any,
  options?: { [key: string]: any },
) {
  return request<any>(`/api/projects/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data,
    ...(options || {}),
  });
}

/** 获取项目商务报价上下文 GET /api/projects/${id}/business-quote */
export async function getProjectBusinessQuote(
  id: string | number,
  options?: { [key: string]: any },
) {
  return request<{ data: API.BusinessQuoteContext }>(
    `/api/projects/${id}/business-quote`,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

/** 保存项目商务报价快照 POST /api/projects/${id}/business-quote */
export async function saveProjectBusinessQuote(
  id: string | number,
  data: API.BusinessQuoteFormValues,
  options?: { [key: string]: any },
) {
  return request<{ data: API.BusinessQuoteSnapshot }>(
    `/api/projects/${id}/business-quote`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data,
      ...(options || {}),
    },
  );
}

/** 导出项目为 PDF GET /api/projects/${id}/export/pdf */
export function exportProjectToPDF(id: string | number) {
  return `/api/projects/${id}/export/pdf`;
}

/** 导出项目为 Excel GET /api/projects/${id}/export/excel */
export function exportProjectToExcel(id: string | number) {
  return `/api/projects/${id}/export/excel`;
}
