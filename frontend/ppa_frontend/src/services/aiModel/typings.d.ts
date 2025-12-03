declare namespace API {
  /**
   * AI 模型配置
   */
  export interface AIModelConfig {
    id: number;
    config_name: string;
    description?: string;
    provider: string;
    api_key: string;
    api_host: string;
    model_name: string;
    temperature: number;
    max_tokens: number;
    timeout: number;
    is_current: number;
    is_active: number;
    last_test_time?: string;
    test_status?: string;
    created_at: string;
    updated_at: string;
  }

  /**
   * 创建 AI 模型配置参数
   */
  export interface CreateAIModelParams {
    config_name: string;
    description?: string;
    provider: string;
    api_key: string;
    api_host: string;
    model_name: string;
    temperature?: number;
    max_tokens?: number;
    timeout?: number;
    is_current?: number;
    is_active?: number;
  }

  /**
   * 更新 AI 模型配置参数
   */
  export interface UpdateAIModelParams {
    config_name?: string;
    description?: string;
    provider?: string;
    api_key?: string;
    api_host?: string;
    model_name?: string;
    temperature?: number;
    max_tokens?: number;
    timeout?: number;
    is_current?: number;
    is_active?: number;
  }

  /**
   * AI 模型配置响应
   */
  export interface AIModelResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
  }
}
