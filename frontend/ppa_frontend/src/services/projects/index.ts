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

/** 导出项目为 PDF GET /api/projects/${id}/export/pdf */
export function exportProjectToPDF(id: string | number) {
  return `/api/projects/${id}/export/pdf`;
}

/** 导出项目为 Excel GET /api/projects/${id}/export/excel */
export function exportProjectToExcel(id: string | number) {
  return `/api/projects/${id}/export/excel`;
}
