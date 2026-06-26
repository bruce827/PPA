const { z } = require('zod');
const { registerRoute } = require('../registry');
const {
  apiResponse,
  dataResponse,
  OkResponse,
  IdParam,
} = require('../../schemas/common.schema');
const {
  Role,
  RiskItem,
  TravelCost,
  BusinessPricing,
  PromptTemplate,
  PromptModuleTag,
  AIModelConfig,
} = require('../../schemas/entities.schema');

const TAGS = ['Config'];

const created = z.object({ id: z.number().int() });
const updated = z.object({ updated: z.number().int() });
const deleted = z.object({ deleted: z.number().int() });

// ===== AI 模型配置 =========================================================
registerRoute({
  method: 'get',
  path: '/api/config/ai-models',
  tags: TAGS,
  summary: '获取 AI 模型配置列表',
  query: z
    .object({ provider: z.string().optional(), is_active: z.string().optional() })
    .partial(),
  response: apiResponse(z.array(AIModelConfig)),
});
registerRoute({
  method: 'get',
  path: '/api/config/ai-models/current',
  tags: TAGS,
  summary: '获取当前使用的 AI 模型',
  response: apiResponse(AIModelConfig.nullable()),
});
registerRoute({
  method: 'get',
  path: '/api/config/ai-models/current-vision',
  tags: TAGS,
  summary: '获取当前视觉 AI 模型',
  response: apiResponse(AIModelConfig.nullable()),
});
registerRoute({
  method: 'get',
  path: '/api/config/ai-models/{id}',
  tags: TAGS,
  summary: '获取单个 AI 模型配置',
  params: IdParam,
  response: apiResponse(AIModelConfig),
});
registerRoute({
  method: 'post',
  path: '/api/config/ai-models',
  tags: TAGS,
  summary: '创建 AI 模型配置',
  body: AIModelConfig.partial().required({ config_name: true }),
  response: apiResponse(AIModelConfig),
  status: 201,
});
registerRoute({
  method: 'put',
  path: '/api/config/ai-models/{id}',
  tags: TAGS,
  summary: '更新 AI 模型配置',
  params: IdParam,
  body: AIModelConfig.partial(),
  response: apiResponse(AIModelConfig),
});
registerRoute({
  method: 'delete',
  path: '/api/config/ai-models/{id}',
  tags: TAGS,
  summary: '删除 AI 模型配置',
  params: IdParam,
  response: z.object({ success: z.boolean(), message: z.string() }),
});
registerRoute({
  method: 'post',
  path: '/api/config/ai-models/{id}/set-current',
  tags: TAGS,
  summary: '设置当前使用的 AI 模型',
  params: IdParam,
  response: apiResponse(AIModelConfig),
});
registerRoute({
  method: 'post',
  path: '/api/config/ai-models/{id}/set-current-vision',
  tags: TAGS,
  summary: '设置当前视觉 AI 模型',
  params: IdParam,
  response: apiResponse(AIModelConfig),
});
registerRoute({
  method: 'post',
  path: '/api/config/ai-models/{id}/test',
  tags: TAGS,
  summary: '测试已保存的 AI 模型连通性',
  params: IdParam,
  response: z
    .object({ success: z.boolean(), message: z.string(), data: z.any() })
    .partial({ data: true }),
});
registerRoute({
  method: 'post',
  path: '/api/config/ai-models/test-temp',
  tags: TAGS,
  summary: '测试临时 AI 模型配置（不保存）',
  body: z.object({}).passthrough(),
  response: z
    .object({ success: z.boolean(), message: z.string(), data: z.any() })
    .partial({ data: true }),
});

// ===== 提示词模板 ==========================================================
registerRoute({
  method: 'get',
  path: '/api/config/prompts',
  tags: TAGS,
  summary: '获取提示词模板列表',
  query: z
    .object({ module_tag: z.string().optional(), is_active: z.string().optional() })
    .partial(),
  response: z.array(PromptTemplate),
});
registerRoute({
  method: 'get',
  path: '/api/config/prompts/{id}',
  tags: TAGS,
  summary: '获取单个提示词模板',
  params: IdParam,
  response: PromptTemplate,
});
registerRoute({
  method: 'post',
  path: '/api/config/prompts',
  tags: TAGS,
  summary: '创建提示词模板',
  body: PromptTemplate.partial().required({
    template_name: true,
    system_prompt: true,
    user_prompt_template: true,
  }),
  response: PromptTemplate,
  status: 201,
});
registerRoute({
  method: 'put',
  path: '/api/config/prompts/{id}',
  tags: TAGS,
  summary: '更新提示词模板',
  params: IdParam,
  body: PromptTemplate.partial(),
  response: PromptTemplate,
});
registerRoute({
  method: 'delete',
  path: '/api/config/prompts/{id}',
  tags: TAGS,
  summary: '删除提示词模板',
  params: IdParam,
  response: z.object({ message: z.string() }),
});
registerRoute({
  method: 'post',
  path: '/api/config/prompts/{id}/copy',
  tags: TAGS,
  summary: '复制提示词模板',
  params: IdParam,
  response: PromptTemplate,
  status: 201,
});
registerRoute({
  method: 'post',
  path: '/api/config/prompts/{id}/preview',
  tags: TAGS,
  summary: '预览渲染后的提示词',
  params: IdParam,
  body: z.object({ variable_values: z.record(z.string(), z.any()).optional() }),
  response: z.any(),
});

// ===== 提示词模块标签 ======================================================
registerRoute({
  method: 'get',
  path: '/api/config/prompt-module-tags',
  tags: TAGS,
  summary: '获取提示词模块标签列表',
  response: apiResponse(z.array(PromptModuleTag)),
});
registerRoute({
  method: 'post',
  path: '/api/config/prompt-module-tags',
  tags: TAGS,
  summary: '创建提示词模块标签',
  body: PromptModuleTag.partial().required({ value: true, label: true }),
  response: apiResponse(PromptModuleTag),
});
registerRoute({
  method: 'put',
  path: '/api/config/prompt-module-tags/{id}',
  tags: TAGS,
  summary: '更新提示词模块标签',
  params: IdParam,
  body: PromptModuleTag.partial(),
  response: apiResponse(PromptModuleTag),
});
registerRoute({
  method: 'delete',
  path: '/api/config/prompt-module-tags/{id}',
  tags: TAGS,
  summary: '删除提示词模块标签',
  params: IdParam,
  response: OkResponse,
});

// ===== 角色 / 风险项 / 差旅成本 CRUD =======================================
const crudModules = [
  ['roles', '角色', Role],
  ['risk-items', '风险评估项', RiskItem],
  ['travel-costs', '差旅成本', TravelCost],
];

crudModules.forEach(([slug, label, entity]) => {
  registerRoute({
    method: 'get',
    path: `/api/config/${slug}`,
    tags: TAGS,
    summary: `获取${label}列表`,
    response: dataResponse(z.array(entity)),
  });
  registerRoute({
    method: 'post',
    path: `/api/config/${slug}`,
    tags: TAGS,
    summary: `创建${label}`,
    body: entity.partial(),
    response: created,
  });
  registerRoute({
    method: 'put',
    path: `/api/config/${slug}/{id}`,
    tags: TAGS,
    summary: `更新${label}`,
    params: IdParam,
    body: entity.partial(),
    response: updated,
  });
  registerRoute({
    method: 'delete',
    path: `/api/config/${slug}/{id}`,
    tags: TAGS,
    summary: `删除${label}`,
    params: IdParam,
    response: deleted,
  });
});

// ===== 商务报价配置 / 聚合 ==================================================
registerRoute({
  method: 'get',
  path: '/api/config/business-pricing',
  tags: TAGS,
  summary: '获取商务报价配置',
  response: dataResponse(BusinessPricing),
});
registerRoute({
  method: 'put',
  path: '/api/config/business-pricing',
  tags: TAGS,
  summary: '更新商务报价配置',
  body: BusinessPricing.partial(),
  response: dataResponse(z.any()),
});
registerRoute({
  method: 'get',
  path: '/api/config/all',
  tags: TAGS,
  summary: '获取聚合配置（角色/风险项/差旅成本/商务报价）',
  response: dataResponse(
    z.object({
      roles: z.array(Role),
      risk_items: z.array(RiskItem),
      travel_costs: z.array(TravelCost),
      business_pricing: BusinessPricing,
    })
  ),
});
