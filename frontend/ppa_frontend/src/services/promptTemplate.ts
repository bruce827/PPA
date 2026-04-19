import { request } from '@umijs/max';

export interface PromptVariable {
  name: string;
  description: string;
  help?: string;
  example: string;
  required: boolean;
}

export interface PromptModuleTagOption {
  value: string;
  label: string;
  description?: string;
  is_recommended?: number;
}

// 查询推荐模块标签（用于前端下拉）
export async function getPromptModuleTags() {
  return request<{ success: boolean; data: PromptModuleTagOption[] }>(
    '/api/config/prompt-module-tags',
    { method: 'GET' }
  );
}

// 定义提示词模板接口
export interface PromptTemplate {
  id: number;
  template_name: string;
  module_tag: string;
  description?: string;
  system_prompt: string;
  user_prompt_template: string;
  variables_json?: string;
  variables?: PromptVariable[];
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 模块标签 CRUD
export async function createPromptModuleTag(data: {
  value: string;
  label: string;
  description?: string;
}) {
  return request<PromptModuleTagOption>('/api/config/prompt-module-tags', {
    method: 'POST',
    data,
  });
}

export async function updatePromptModuleTag(
  id: number,
  data: { label?: string; description?: string; sort_order?: number },
) {
  return request<PromptModuleTagOption>(`/api/config/prompt-module-tags/${id}`, {
    method: 'PUT',
    data,
  });
}

export async function deletePromptModuleTag(id: number) {
  return request(`/api/config/prompt-module-tags/${id}`, {
    method: 'DELETE',
  });
}

// 查询提示词模板列表
export async function getPromptTemplates(params: { [key: string]: any }) {
  return request<API.RequestData<PromptTemplate[]>>('/api/config/prompts', {
    method: 'GET',
    params,
  });
}

// 查询单个提示词模板
export async function getPromptTemplateById(id: number) {
  return request<PromptTemplate>(`/api/config/prompts/${id}`, {
    method: 'GET',
  });
}

// 创建提示词模板
export async function createPromptTemplate(data: Partial<PromptTemplate>) {
  return request<PromptTemplate>('/api/config/prompts', {
    method: 'POST',
    data,
  });
}

// 更新提示词模板
export async function updatePromptTemplate(
  id: number,
  data: Partial<PromptTemplate>
) {
  return request<PromptTemplate>(`/api/config/prompts/${id}`, {
    method: 'PUT',
    data,
  });
}

// 删除提示词模板
export async function deletePromptTemplate(id: number) {
  return request(`/api/config/prompts/${id}`, {
    method: 'DELETE',
  });
}

// 复制提示词模板
export async function copyPromptTemplate(id: number) {
  return request<PromptTemplate>(`/api/config/prompts/${id}/copy`, {
    method: 'POST',
  });
}

// 预览提示词模板
export interface PreviewRequest {
  variable_values: { [key: string]: string };
}

export interface PreviewResponse {
  system_prompt: string;
  user_prompt: string;
  missing_required: string[];
  unused_variables: string[];
}

export async function previewPromptTemplate(id: number, data: PreviewRequest) {
  return request<PreviewResponse>(`/api/config/prompts/${id}/preview`, {
    method: 'POST',
    data,
  });
}
