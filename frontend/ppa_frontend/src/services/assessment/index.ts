/* eslint-disable */
// 项目评估相关 API
import { request } from '@umijs/max';

/** 获取所有配置数据（角色+风险项） GET /api/config/all */
export async function getConfigAll(options?: { [key: string]: any }) {
  return request<{
    data: {
      roles: API.RoleConfig[];
      risk_items: API.RiskItemConfig[];
    };
  }>('/api/config/all', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取项目详情 GET /api/projects/${projectId} */
export async function getProjectDetail(
  projectId: string,
  options?: { [key: string]: any },
) {
  return request<{
    data: API.ProjectInfo;
  }>(`/api/projects/${projectId}`, {
    method: 'GET',
    ...(options || {}),
  });
}

/** 计算项目报价 POST /api/calculate */
export async function calculateProjectCost(
  data: API.CalculateParams,
  options?: { [key: string]: any },
) {
  return request<{
    data: API.CalculationResult;
  }>('/api/calculate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data,
    ...(options || {}),
  });
}

/** 创建项目 POST /api/projects */
export async function createProject(
  data: API.CreateProjectParams,
  options?: { [key: string]: any },
) {
  return request<{
    id: number;
  }>('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data,
    ...(options || {}),
  });
}

/** 获取所有项目列表（用于模板选择） GET /api/projects */
export async function getAllProjects(options?: { [key: string]: any }) {
  return request<{
    data: API.ProjectInfo[];
  }>('/api/projects', {
    method: 'GET',
    ...(options || {}),
  });
}

/** ===================== AI 风险评估相关接口 ===================== */

export interface AiPromptVariable {
  name: string;
  display_name?: string;
  description?: string;
  default_value?: string;
  placeholder?: string;
}

export interface AiPrompt {
  id: string;
  name: string;
  description?: string;
  content: string;
  variables?: AiPromptVariable[];
  model_hint?: string;
  updated_at?: string;
}

export interface AiRiskScoreSuggestion {
  item_name: string;
  suggested_score: number;
  reason: string;
}

export interface AiMissingRisk {
  item_name: string;
  description: string;
}

export interface AiAssessmentResult {
  risk_scores: AiRiskScoreSuggestion[];
  missing_risks?: AiMissingRisk[];
  overall_suggestion: string;
  confidence?: number;
}

export interface AiAssessRiskResponseData {
  raw_response?: string;
  parsed?: AiAssessmentResult;
  model_used?: string;
  timestamp?: string;
  duration_ms?: number;
}

export interface AiAssessRiskPayload {
  document: string;
  promptId: string;
  variables?: Record<string, string>;
  currentRiskItems?: Array<{
    item_name: string;
    description?: string;
    current_score?: number;
  }>;
  currentScores?: Record<string, number>;
}

export interface AiGenerateProjectTagsPayload {
  promptId: string;
  projectId?: number;
  projectSnapshot: any;
  variables?: Record<string, string>;
}

export interface AiGenerateProjectTagsResponseData {
  tags: string[];
}

interface AiServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AiModuleAnalysisModule {
  module1: string;
  module2: string;
  module3: string;
  description: string;
  complexity: '简单' | '中等' | '复杂';
  confidence?: number;
  [key: string]: unknown;
}

export interface AiModuleAnalysisResult {
  project_analysis: string;
  modules: AiModuleAnalysisModule[];
  confidence?: number;
  raw_response?: string;
  [key: string]: unknown;
}

export interface AiAnalyzeModulesPayload {
  description: string;
  projectType?: string;
  projectScale?: string;
  promptId?: string;
  prompt?: AiPrompt | null;
  variables?: Record<string, string>;
  template?: string;
}

// ===================== AI 工作量评估 =====================
export interface AiEvaluateWorkloadPayload {
  promptId: string;
  module1: string;
  module2: string;
  module3: string;
  description: string;
  variables?: Record<string, string>;
  roles?: string[];
}

export interface AiEvaluateWorkloadParsed {
  role_workloads: Record<string, number>;
  delivery_factor?: number;
  complexity?: string;
  confidence?: number;
}

export interface AiEvaluateWorkloadResult {
  parsed: AiEvaluateWorkloadParsed;
  raw_response?: string;
  model_used?: string;
  timestamp?: string;
  duration_ms?: number;
}

/** 获取 AI 提示词模板 GET /api/ai/prompts */
export async function getAiPrompts(options?: { [key: string]: any }) {
  return request<AiServiceResponse<AiPrompt[]>>('/api/ai/prompts', {
    method: 'GET',
    ...(options || {}),
  });
}

export async function getProjectTagPrompts(options?: { [key: string]: any }) {
  return request<AiServiceResponse<AiPrompt[]>>('/api/ai/project-tag-prompts', {
    method: 'GET',
    ...(options || {}),
  });
}

export async function generateProjectTagsWithAI(
  data: AiGenerateProjectTagsPayload,
  options?: { [key: string]: any },
) {
  return request<AiServiceResponse<AiGenerateProjectTagsResponseData>>(
    '/api/ai/generate-project-tags',
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

/** 提交风险评估请求 POST /api/ai/assess-risk */
export async function assessRiskWithAI(
  data: AiAssessRiskPayload,
  options?: { [key: string]: any },
) {
  return request<AiServiceResponse<AiAssessRiskResponseData>>(
    '/api/ai/assess-risk',
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

/** 名称归一：将 AI 返回的 item_name 映射到表单配置的合法 item_name 列表 */
export interface NormalizeRiskNamesPayload {
  allowed_item_names: string[];
  risk_scores: AiRiskScoreSuggestion[];
}

export async function normalizeRiskNames(
  data: NormalizeRiskNamesPayload,
  options?: { [key: string]: any },
) {
  return request<AiServiceResponse<AiAssessRiskResponseData>>(
    '/api/ai/normalize-risk-names',
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

/** 获取模块分析提示词 GET /api/ai/module-prompts */
export async function getModuleAnalysisPrompts(
  options?: { [key: string]: any },
) {
  return request<AiServiceResponse<AiPrompt[]>>('/api/ai/module-prompts', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 执行项目模块分析 POST /api/ai/analyze-project-modules */
export async function analyzeProjectModules(
  data: AiAnalyzeModulesPayload,
  options?: { [key: string]: any },
) {
  return request<AiServiceResponse<AiModuleAnalysisResult>>(
    '/api/ai/analyze-project-modules',
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

/** 获取工作量评估提示词 GET /api/ai/workload-prompts */
export async function getWorkloadEvaluationPrompts(
  options?: { [key: string]: any },
) {
  return request<AiServiceResponse<AiPrompt[]>>('/api/ai/workload-prompts', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 执行工作量评估 POST /api/ai/evaluate-workload */
export async function evaluateWorkload(
  data: AiEvaluateWorkloadPayload,
  options?: { [key: string]: any },
) {
  return request<AiServiceResponse<AiEvaluateWorkloadResult>>(
    '/api/ai/evaluate-workload',
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
