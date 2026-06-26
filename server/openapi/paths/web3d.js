const { z } = require('zod');
const { registerRoute } = require('../registry');
const { apiResponse, dataResponse, IdParam } = require('../../schemas/common.schema');
const {
  Web3dRiskItem,
  Web3dWorkloadTemplate,
  PromptTemplate,
} = require('../../schemas/entities.schema');

const TAGS = ['Web3D'];

const created = z.object({ id: z.number().int() });
const updated = z.object({ updated: z.number().int() });
const deleted = z.object({ deleted: z.number().int() });

// ===== Config: 风险项 / 工作量模板 =========================================
const configEntities = [
  ['risk-items', '风险项', Web3dRiskItem],
  ['workload-templates', '工作量模板', Web3dWorkloadTemplate],
];

configEntities.forEach(([slug, label, entity]) => {
  registerRoute({
    method: 'get',
    path: `/api/web3d/config/${slug}`,
    tags: TAGS,
    summary: `获取 Web3D ${label}列表`,
    response: dataResponse(z.array(entity)),
  });
  registerRoute({
    method: 'post',
    path: `/api/web3d/config/${slug}`,
    tags: TAGS,
    summary: `创建 Web3D ${label}`,
    body: entity.partial(),
    response: created,
  });
  registerRoute({
    method: 'put',
    path: `/api/web3d/config/${slug}/{id}`,
    tags: TAGS,
    summary: `更新 Web3D ${label}`,
    params: IdParam,
    body: entity.partial(),
    response: updated,
  });
  registerRoute({
    method: 'delete',
    path: `/api/web3d/config/${slug}/{id}`,
    tags: TAGS,
    summary: `删除 Web3D ${label}`,
    params: IdParam,
    response: deleted,
  });
});

// ===== AI: Step4 ===========================================================
registerRoute({
  method: 'get',
  path: '/api/web3d/ai/step4-prompts',
  tags: TAGS,
  summary: 'Web3D Step4 分析提示词列表',
  response: apiResponse(z.array(PromptTemplate)),
});
registerRoute({
  method: 'post',
  path: '/api/web3d/ai/step4-analyze',
  tags: TAGS,
  summary: 'Web3D Step4 图像分析（multipart/form-data，支持上传图片）',
  body: z
    .object({
      promptId: z.union([z.string(), z.number()]).optional(),
      variables_json: z.string().optional(),
      context_json: z.string().optional(),
      projectId: z.union([z.string(), z.number()]).optional(),
    })
    .passthrough(),
  response: apiResponse(z.any()),
});

// ===== Projects ============================================================
const Web3dProject = z.any().openapi('Web3dProject');
const Web3dCalculation = z.any().openapi('Web3dCalculation');

registerRoute({
  method: 'post',
  path: '/api/web3d/projects/calculate',
  tags: TAGS,
  summary: 'Web3D 实时计算（无项目上下文）',
  body: z.object({}).passthrough(),
  response: dataResponse(Web3dCalculation),
});
registerRoute({
  method: 'post',
  path: '/api/web3d/projects/{id}/calculate',
  tags: TAGS,
  summary: 'Web3D 项目计算',
  params: IdParam,
  body: z.object({}).passthrough(),
  response: dataResponse(Web3dCalculation),
});
registerRoute({
  method: 'get',
  path: '/api/web3d/projects/{id}/export',
  tags: TAGS,
  summary: 'Web3D 项目导出 Excel',
  params: IdParam,
  rawResponse: {
    description: 'Excel 文件流',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  },
});
registerRoute({
  method: 'get',
  path: '/api/web3d/projects/{id}',
  tags: TAGS,
  summary: '获取单个 Web3D 项目',
  params: IdParam,
  response: dataResponse(Web3dProject),
});
registerRoute({
  method: 'get',
  path: '/api/web3d/projects',
  tags: TAGS,
  summary: '获取 Web3D 项目列表',
  response: dataResponse(z.array(Web3dProject)),
});
registerRoute({
  method: 'post',
  path: '/api/web3d/projects',
  tags: TAGS,
  summary: '创建 Web3D 项目',
  body: z.object({}).passthrough(),
  response: created,
});
registerRoute({
  method: 'put',
  path: '/api/web3d/projects/{id}',
  tags: TAGS,
  summary: '更新 Web3D 项目',
  params: IdParam,
  body: z.object({}).passthrough(),
  response: updated,
});
registerRoute({
  method: 'delete',
  path: '/api/web3d/projects/{id}',
  tags: TAGS,
  summary: '删除 Web3D 项目',
  params: IdParam,
  response: deleted,
});
