import { request } from '@umijs/max';

/**
 * 获取 AI 模型配置列表
 */
export async function getAIModels() {
  return request<API.AIModelResponse<API.AIModelConfig[]>>(
    '/api/config/ai-models',
    {
      method: 'GET',
    },
  );
}

/**
 * 获取单个 AI 模型配置详情
 */
export async function getAIModelById(id: number) {
  return request<API.AIModelResponse<API.AIModelConfig>>(
    `/api/config/ai-models/${id}`,
    {
      method: 'GET',
    },
  );
}

/**
 * 创建 AI 模型配置
 */
export async function createAIModel(data: API.CreateAIModelParams) {
  return request<API.AIModelResponse<API.AIModelConfig>>(
    '/api/config/ai-models',
    {
      method: 'POST',
      data,
    },
  );
}

/**
 * 更新 AI 模型配置
 */
export async function updateAIModel(id: number, data: API.UpdateAIModelParams) {
  return request<API.AIModelResponse<API.AIModelConfig>>(
    `/api/config/ai-models/${id}`,
    {
      method: 'PUT',
      data,
    },
  );
}

/**
 * 删除 AI 模型配置
 */
export async function deleteAIModel(id: number) {
  return request<API.AIModelResponse>(`/api/config/ai-models/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 测试 AI 模型连接
 */
export async function testAIModel(id: number) {
  return request<
    API.AIModelResponse<{ duration: number; status: string; details: any }>
  >(`/api/config/ai-models/${id}/test`, {
    method: 'POST',
  });
}

/**
 * 设置当前使用的模型
 */
export async function setCurrentModel(id: number) {
  return request<API.AIModelResponse<API.AIModelConfig>>(
    `/api/config/ai-models/${id}/set-current`,
    {
      method: 'POST',
    },
  );
}

/**
 * 获取当前使用的模型
 */
export async function getCurrentModel() {
  return request<API.AIModelResponse<API.AIModelConfig>>(
    '/api/config/ai-models/current',
    {
      method: 'GET',
    },
  );
}
