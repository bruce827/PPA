/* eslint-disable */
// 配置管理相关 API
import { request } from '@umijs/max';

// ==================== 角色配置管理 ====================

/** 获取角色配置列表 GET /api/config/roles */
export async function getRoleList(options?: { [key: string]: any }) {
  return request<API.RoleListResponse>('/api/config/roles', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建角色配置 POST /api/config/roles */
export async function createRole(
  data: API.RoleParams,
  options?: { [key: string]: any },
) {
  return request<{
    data: API.RoleConfig;
    success: boolean;
  }>('/api/config/roles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data,
    ...(options || {}),
  });
}

/** 更新角色配置 PUT /api/config/roles/${id} */
export async function updateRole(
  id: number,
  data: API.RoleParams,
  options?: { [key: string]: any },
) {
  return request<{
    data: API.RoleConfig;
    success: boolean;
  }>(`/api/config/roles/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data,
    ...(options || {}),
  });
}

/** 删除角色配置 DELETE /api/config/roles/${id} */
export async function deleteRole(id: number, options?: { [key: string]: any }) {
  return request<{
    success: boolean;
  }>(`/api/config/roles/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}

// ==================== 风险项配置管理 ====================

/** 获取风险项配置列表 GET /api/config/risk-items */
export async function getRiskItemList(options?: { [key: string]: any }) {
  return request<API.RiskItemListResponse>('/api/config/risk-items', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建风险项配置 POST /api/config/risk-items */
export async function createRiskItem(
  data: API.RiskItemParams,
  options?: { [key: string]: any },
) {
  return request<{
    data: API.RiskItemConfig;
    success: boolean;
  }>('/api/config/risk-items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data,
    ...(options || {}),
  });
}

/** 更新风险项配置 PUT /api/config/risk-items/${id} */
export async function updateRiskItem(
  id: number,
  data: API.RiskItemParams,
  options?: { [key: string]: any },
) {
  return request<{
    data: API.RiskItemConfig;
    success: boolean;
  }>(`/api/config/risk-items/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data,
    ...(options || {}),
  });
}

/** 删除风险项配置 DELETE /api/config/risk-items/${id} */
export async function deleteRiskItem(
  id: number,
  options?: { [key: string]: any },
) {
  return request<{
    success: boolean;
  }>(`/api/config/risk-items/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}

// ==================== 差旅成本配置管理 ====================

/** 获取差旅成本配置列表 GET /api/config/travel-costs */
export async function getTravelCostList(options?: { [key: string]: any }) {
  return request<API.TravelCostListResponse>('/api/config/travel-costs', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建差旅成本配置 POST /api/config/travel-costs */
export async function createTravelCost(
  data: API.TravelCostParams,
  options?: { [key: string]: any },
) {
  return request<{
    data: API.TravelCostConfig;
    success: boolean;
  }>('/api/config/travel-costs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data,
    ...(options || {}),
  });
}

/** 更新差旅成本配置 PUT /api/config/travel-costs/${id} */
export async function updateTravelCost(
  id: number,
  data: API.TravelCostParams,
  options?: { [key: string]: any },
) {
  return request<{
    data: API.TravelCostConfig;
    success: boolean;
  }>(`/api/config/travel-costs/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data,
    ...(options || {}),
  });
}

/** 删除差旅成本配置 DELETE /api/config/travel-costs/${id} */
export async function deleteTravelCost(
  id: number,
  options?: { [key: string]: any },
) {
  return request<{
    success: boolean;
  }>(`/api/config/travel-costs/${id}`, {
    method: 'DELETE',
    ...(options || {}),
  });
}
