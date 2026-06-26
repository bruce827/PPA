const { z } = require('zod');
const { registerRoute } = require('../registry');
const {
  apiResponse,
  dataResponse,
  IdParam,
} = require('../../schemas/common.schema');
const { Project, PushRecord, Flag } = require('../../schemas/entities.schema');

const TAGS = ['Projects'];

const binary = (mime, description) => ({
  description,
  content: { [mime]: { schema: { type: 'string', format: 'binary' } } },
});

const ProjectCreateBody = z
  .object({
    name: z.string(),
    description: z.string().nullable().optional(),
    is_template: Flag.optional(),
    final_total_cost: z.number().nullable().optional(),
    final_risk_score: z.number().nullable().optional(),
    final_workload_days: z.number().nullable().optional(),
    assessment_details_json: z.string().nullable().optional(),
    tags_json: z.string().nullable().optional(),
  })
  .passthrough()
  .openapi('ProjectCreateBody');

const ListQuery = z
  .object({
    is_template: z.string().optional(),
    name: z.string().optional(),
    sort_by: z.enum(['final_total_cost', 'final_risk_score', 'created_at']).optional(),
    sort_order: z.string().optional(),
    final_risk_score: z.string().optional(),
    final_total_cost_min: z.coerce.number().optional(),
    final_total_cost_max: z.coerce.number().optional(),
    has_business_quote: z.string().optional(),
    created_at_start: z.string().optional(),
    created_at_end: z.string().optional(),
  })
  .partial();

// --- templates & exports (declared before :id in the router) --------------
registerRoute({
  method: 'get',
  path: '/api/projects/templates',
  tags: TAGS,
  summary: '获取所有模板项目',
  response: dataResponse(z.array(Project)),
});

registerRoute({
  method: 'get',
  path: '/api/projects/{id}/export/pdf',
  tags: TAGS,
  summary: '导出项目为 PDF（已废弃）',
  params: IdParam,
  rawResponse: binary('application/pdf', 'PDF 文件流'),
});

registerRoute({
  method: 'get',
  path: '/api/projects/{id}/export/excel',
  tags: TAGS,
  summary: '导出项目为 Excel',
  params: IdParam,
  query: z.object({ version: z.enum(['internal', 'external']).optional() }).partial(),
  rawResponse: binary(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Excel 文件流'
  ),
});

registerRoute({
  method: 'get',
  path: '/api/projects/{id}/business-quote',
  tags: TAGS,
  summary: '获取商务报价上下文',
  params: IdParam,
  response: dataResponse(z.any(), 'BusinessQuoteContext'),
});

registerRoute({
  method: 'post',
  path: '/api/projects/{id}/business-quote',
  tags: TAGS,
  summary: '保存商务报价快照',
  params: IdParam,
  body: z.object({}).passthrough(),
  response: dataResponse(z.any()),
});

// --- project CRUD ----------------------------------------------------------
registerRoute({
  method: 'get',
  path: '/api/projects/{id}',
  tags: TAGS,
  summary: '获取单个项目',
  params: IdParam,
  response: dataResponse(Project),
});

registerRoute({
  method: 'get',
  path: '/api/projects',
  tags: TAGS,
  summary: '获取项目列表（支持筛选与排序）',
  query: ListQuery,
  response: dataResponse(z.array(Project)),
});

registerRoute({
  method: 'post',
  path: '/api/projects',
  tags: TAGS,
  summary: '创建项目',
  body: ProjectCreateBody,
  response: z.object({ id: z.number().int() }).openapi('CreatedId'),
});

registerRoute({
  method: 'put',
  path: '/api/projects/{id}',
  tags: TAGS,
  summary: '更新项目',
  params: IdParam,
  body: ProjectCreateBody.partial(),
  response: z.object({ updated: z.number().int() }).openapi('UpdatedResult'),
});

registerRoute({
  method: 'delete',
  path: '/api/projects/{id}',
  tags: TAGS,
  summary: '删除项目',
  params: IdParam,
  response: z.object({ deleted: z.number().int() }).openapi('DeletedResult'),
});

// --- attachments (attachment router mounted at /api/projects) --------------
const AttachmentMeta = z
  .object({
    filename: z.string(),
    originalname: z.string(),
    size: z.number().int(),
    uploadedAt: z.string(),
  })
  .openapi('AttachmentMeta');

registerRoute({
  method: 'post',
  path: '/api/projects/{id}/attachments/upload',
  tags: TAGS,
  summary: '上传项目附件（multipart/form-data, 字段名 file）',
  params: IdParam,
  response: apiResponse(AttachmentMeta),
});

registerRoute({
  method: 'get',
  path: '/api/projects/{id}/attachments',
  tags: TAGS,
  summary: '列出项目附件',
  params: IdParam,
  response: apiResponse(z.array(AttachmentMeta)),
});

registerRoute({
  method: 'get',
  path: '/api/projects/{id}/attachments/download/{filename}',
  tags: TAGS,
  summary: '下载项目附件',
  params: z.object({ id: z.coerce.number().int(), filename: z.string() }),
  rawResponse: binary('application/octet-stream', '附件文件流'),
});

registerRoute({
  method: 'delete',
  path: '/api/projects/{id}/attachments/{filename}',
  tags: TAGS,
  summary: '删除项目附件',
  params: z.object({ id: z.coerce.number().int(), filename: z.string() }),
  response: z
    .object({ success: z.boolean(), message: z.string() })
    .openapi('DeleteAttachmentResult'),
});

registerRoute({
  method: 'get',
  path: '/api/projects/{id}/attachments/check',
  tags: TAGS,
  summary: '检查项目是否有附件',
  params: IdParam,
  response: apiResponse(z.object({ hasAttachments: z.boolean() })),
});

// --- push (push router mounted at /api/projects) ---------------------------
registerRoute({
  method: 'post',
  path: '/api/projects/{id}/push/validate',
  tags: TAGS,
  summary: '推送前置校验',
  params: IdParam,
  body: z.object({ customerBudget: z.number() }),
  response: apiResponse(
    z.object({ hasBusinessQuote: z.boolean(), attachmentCount: z.number().int() })
  ),
});

registerRoute({
  method: 'post',
  path: '/api/projects/{id}/push',
  tags: TAGS,
  summary: '执行项目推送',
  params: IdParam,
  body: z.object({ customerBudget: z.number() }),
  response: apiResponse(z.object({ pushId: z.number().int() })),
});

registerRoute({
  method: 'get',
  path: '/api/projects/{id}/push-history',
  tags: TAGS,
  summary: '查询项目推送历史',
  params: IdParam,
  response: apiResponse(z.array(PushRecord)),
});

// --- /api/templates alias (projectRoutes is also mounted at /api/templates) -
// Same handlers as /api/projects/* (CRUD + templates listing + export +
// business-quote); attachment/push routers are NOT mounted here.
const TEMPLATE_TAGS = ['Templates'];

registerRoute({
  method: 'get',
  path: '/api/templates/templates',
  tags: TEMPLATE_TAGS,
  summary: '获取所有模板项目（templates 挂载点）',
  response: dataResponse(z.array(Project)),
});
registerRoute({
  method: 'get',
  path: '/api/templates/{id}/export/pdf',
  tags: TEMPLATE_TAGS,
  summary: '导出模板为 PDF（已废弃）',
  params: IdParam,
  rawResponse: binary('application/pdf', 'PDF 文件流'),
});
registerRoute({
  method: 'get',
  path: '/api/templates/{id}/export/excel',
  tags: TEMPLATE_TAGS,
  summary: '导出模板为 Excel',
  params: IdParam,
  query: z.object({ version: z.enum(['internal', 'external']).optional() }).partial(),
  rawResponse: binary(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Excel 文件流'
  ),
});
registerRoute({
  method: 'get',
  path: '/api/templates/{id}/business-quote',
  tags: TEMPLATE_TAGS,
  summary: '获取商务报价上下文（templates 挂载点）',
  params: IdParam,
  response: dataResponse(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/templates/{id}/business-quote',
  tags: TEMPLATE_TAGS,
  summary: '保存商务报价快照（templates 挂载点）',
  params: IdParam,
  body: z.object({}).passthrough(),
  response: dataResponse(z.any()),
});
registerRoute({
  method: 'get',
  path: '/api/templates/{id}',
  tags: TEMPLATE_TAGS,
  summary: '获取单个项目（templates 挂载点）',
  params: IdParam,
  response: dataResponse(Project),
});
registerRoute({
  method: 'get',
  path: '/api/templates',
  tags: TEMPLATE_TAGS,
  summary: '获取项目列表（templates 挂载点）',
  query: ListQuery,
  response: dataResponse(z.array(Project)),
});
registerRoute({
  method: 'post',
  path: '/api/templates',
  tags: TEMPLATE_TAGS,
  summary: '创建项目（templates 挂载点）',
  body: ProjectCreateBody,
  response: z.object({ id: z.number().int() }),
});
registerRoute({
  method: 'put',
  path: '/api/templates/{id}',
  tags: TEMPLATE_TAGS,
  summary: '更新项目（templates 挂载点）',
  params: IdParam,
  body: ProjectCreateBody.partial(),
  response: z.object({ updated: z.number().int() }),
});
registerRoute({
  method: 'delete',
  path: '/api/templates/{id}',
  tags: TEMPLATE_TAGS,
  summary: '删除项目（templates 挂载点）',
  params: IdParam,
  response: z.object({ deleted: z.number().int() }),
});
