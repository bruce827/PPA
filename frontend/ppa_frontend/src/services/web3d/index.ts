/* eslint-disable */
import { request } from '@umijs/max';

/** Web3D 风险项列表 GET /api/web3d/config/risk-items */
export async function getWeb3dRiskItems(options?: { [key: string]: any }) {
  return request<{ data: API_WEB3D.RiskItem[] }>('/api/web3d/config/risk-items', {
    method: 'GET',
    ...(options || {}),
  });
}

/** Web3D 工作量模板列表 GET /api/web3d/config/workload-templates */
export async function getWeb3dWorkloadTemplates(options?: { [key: string]: any }) {
  return request<{ data: API_WEB3D.WorkloadTemplate[] }>(
    '/api/web3d/config/workload-templates',
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

/** 新增风险项 POST /api/web3d/config/risk-items */
export async function createWeb3dRiskItem(
  data: Partial<API_WEB3D.RiskItem>,
  options?: { [key: string]: any },
) {
  return request<{ id: number }>('/api/web3d/config/risk-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data,
    ...(options || {}),
  });
}

/** 更新风险项 PUT /api/web3d/config/risk-items/${id} */
export async function updateWeb3dRiskItem(
  id: number | string,
  data: Partial<API_WEB3D.RiskItem>,
  options?: { [key: string]: any },
) {
  return request<{ updated: number }>(`/api/web3d/config/risk-items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    data,
    ...(options || {}),
  });
}

/** 删除风险项 DELETE /api/web3d/config/risk-items/${id} */
export async function deleteWeb3dRiskItem(
  id: number | string,
  options?: { [key: string]: any },
) {
  return request<{ deleted: number }>(`/api/web3d/config/risk-items/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}

/** 新增工作量模板 POST /api/web3d/config/workload-templates */
export async function createWeb3dWorkloadTemplate(
  data: Partial<API_WEB3D.WorkloadTemplate>,
  options?: { [key: string]: any },
) {
  return request<{ id: number }>('/api/web3d/config/workload-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data,
    ...(options || {}),
  });
}

/** 更新工作量模板 PUT /api/web3d/config/workload-templates/${id} */
export async function updateWeb3dWorkloadTemplate(
  id: number | string,
  data: Partial<API_WEB3D.WorkloadTemplate>,
  options?: { [key: string]: any },
) {
  return request<{ updated: number }>(`/api/web3d/config/workload-templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    data,
    ...(options || {}),
  });
}

/** 删除工作量模板 DELETE /api/web3d/config/workload-templates/${id} */
export async function deleteWeb3dWorkloadTemplate(
  id: number | string,
  options?: { [key: string]: any },
) {
  return request<{ deleted: number }>(`/api/web3d/config/workload-templates/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}

/** 获取角色单价（复用参数配置） GET /api/config/roles */
export async function getRoles(options?: { [key: string]: any }) {
  return request<{ data: API.RoleConfig[] }>('/api/config/roles', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 计算 Web3D 项目 POST /api/web3d/projects/calculate */
export async function calculateWeb3dProject(
  data: API_WEB3D.Assessment,
  options?: { [key: string]: any },
) {
  return request<{ data: API_WEB3D.CalculationResult }>(
    '/api/web3d/projects/calculate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data,
      ...(options || {}),
    },
  );
}

/** 创建 Web3D 项目 POST /api/web3d/projects */
export async function createWeb3dProject(
  data: { name: string; description?: string; assessment: API_WEB3D.Assessment },
  options?: { [key: string]: any },
) {
  return request<{ id: number }>('/api/web3d/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data,
    ...(options || {}),
  });
}

/** 更新 Web3D 项目 PUT /api/web3d/projects/${id} */
export async function updateWeb3dProject(
  id: number | string,
  data: { name: string; description?: string; assessment: API_WEB3D.Assessment },
  options?: { [key: string]: any },
) {
  return request<{ updated: number }>(`/api/web3d/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    data,
    ...(options || {}),
  });
}

/** 获取 Web3D 项目详情 GET /api/web3d/projects/${id} */
export async function getWeb3dProjectDetail(
  id: number | string,
  options?: { [key: string]: any },
) {
  return request<{ data: API_WEB3D.Project }>(`/api/web3d/projects/${id}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** Web3D 项目列表 GET /api/web3d/projects */
export async function getWeb3dProjects(options?: { [key: string]: any }) {
  return request<{ data: API_WEB3D.Project[] }>('/api/web3d/projects', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 删除 Web3D 项目 DELETE /api/web3d/projects/${id} */
export async function deleteWeb3dProject(
  id: number | string,
  options?: { [key: string]: any },
) {
  return request<{ deleted: number }>(`/api/web3d/projects/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}
