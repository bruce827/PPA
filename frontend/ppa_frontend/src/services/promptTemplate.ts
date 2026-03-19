import { request } from '@umijs/max';

// 定义变量接口
export interface PromptVariable {
  name: string;
  description: string;
  help?: string;
  example: string;
  required: boolean;
}

export type PromptTemplateCategory =
  | 'risk_analysis'
  | 'workload_evaluation'
  | 'module_analysis'
  | 'project_tagging'
  | 'report_generation'
  | 'web_search'
  | 'custom';

export const PROMPT_TEMPLATE_CATEGORY_OPTIONS: Array<{
  label: string;
  value: PromptTemplateCategory;
}> = [
  { value: 'risk_analysis', label: '风险分析' },
  { value: 'workload_evaluation', label: '工作量评估' },
  { value: 'module_analysis', label: '模块梳理' },
  { value: 'project_tagging', label: '标签生成' },
  { value: 'report_generation', label: '报告生成' },
  { value: 'web_search', label: '联网搜索' },
  { value: 'custom', label: '自定义' },
];

export const PROMPT_TEMPLATE_CATEGORY_VALUE_ENUM = {
  risk_analysis: { text: '风险分析' },
  workload_evaluation: { text: '工作量评估' },
  module_analysis: { text: '模块梳理' },
  project_tagging: { text: '标签生成' },
  report_generation: { text: '报告生成' },
  web_search: { text: '联网搜索' },
  custom: { text: '自定义' },
} as const;

// 定义提示词模板接口
export interface PromptTemplate {
  id: number;
  template_name: string;
  category: PromptTemplateCategory;
  description?: string;
  system_prompt: string;
  user_prompt_template: string;
  variables_json?: string; // 存储变量定义的 JSON 字符串
  variables?: PromptVariable[]; // 解析后的变量数组
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  data: Partial<PromptTemplate>,
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
