const { z } = require('zod');
const { registerRoute } = require('../registry');
const { apiResponse, IdParam } = require('../../schemas/common.schema');
const {
  DataMetricsProject,
  DataMetric,
  DataMetricCategory,
} = require('../../schemas/entities.schema');

const TAGS = ['DataMetrics'];
const AGENT_TAGS = ['DataMetrics', 'Agent'];

const idDeleted = apiResponse(z.object({ id: z.number().int() }));

// ===== 数据指标设计项目 ====================================================
registerRoute({
  method: 'get',
  path: '/api/data-metrics/projects',
  tags: TAGS,
  summary: '获取数据指标设计项目列表',
  response: apiResponse(z.array(DataMetricsProject)),
});
registerRoute({
  method: 'get',
  path: '/api/data-metrics/projects/{id}',
  tags: TAGS,
  summary: '获取单个数据指标设计项目',
  params: IdParam,
  response: apiResponse(DataMetricsProject),
});
registerRoute({
  method: 'post',
  path: '/api/data-metrics/projects',
  tags: TAGS,
  summary: '创建数据指标设计项目',
  body: DataMetricsProject.partial().required({ project_name: true }),
  response: apiResponse(DataMetricsProject),
  status: 201,
});
registerRoute({
  method: 'put',
  path: '/api/data-metrics/projects/{id}',
  tags: TAGS,
  summary: '更新数据指标设计项目',
  params: IdParam,
  body: DataMetricsProject.partial().required({ project_name: true }),
  response: apiResponse(DataMetricsProject),
});
registerRoute({
  method: 'delete',
  path: '/api/data-metrics/projects/{id}',
  tags: TAGS,
  summary: '删除数据指标设计项目',
  params: IdParam,
  response: idDeleted,
});

// ===== 统计 / 筛选 / 关联项目 ==============================================
registerRoute({
  method: 'get',
  path: '/api/data-metrics/stats',
  tags: TAGS,
  summary: '获取数据指标统计',
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'get',
  path: '/api/data-metrics/filter-options',
  tags: TAGS,
  summary: '获取筛选选项',
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'get',
  path: '/api/data-metrics/linked-projects',
  tags: TAGS,
  summary: '获取可关联的历史项目',
  response: apiResponse(z.any()),
});

// ===== 指标 CRUD（根路径） =================================================
registerRoute({
  method: 'get',
  path: '/api/data-metrics',
  tags: TAGS,
  summary: '获取指标列表（分页）',
  query: z
    .object({
      dm_project_id: z.coerce.number().int().optional(),
      module_name: z.string().optional(),
      scene_l1: z.string().optional(),
      scene_l2: z.string().optional(),
      display_type: z.string().optional(),
      keyword: z.string().optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(10000).optional(),
    })
    .partial(),
  response: apiResponse(
    z.object({
      list: z.array(DataMetric),
      total: z.number().int(),
      page: z.number().int().optional(),
      pageSize: z.number().int().optional(),
    })
  ),
});
registerRoute({
  method: 'get',
  path: '/api/data-metrics/{id}',
  tags: TAGS,
  summary: '获取单个指标',
  params: IdParam,
  response: apiResponse(DataMetric),
});
registerRoute({
  method: 'post',
  path: '/api/data-metrics',
  tags: TAGS,
  summary: '新增指标',
  body: DataMetric.partial().required({
    dm_project_id: true,
    module_name: true,
    scene_l1: true,
    scene_l2: true,
    metric_name: true,
    display_type: true,
  }),
  response: apiResponse(DataMetric),
  status: 201,
});
registerRoute({
  method: 'put',
  path: '/api/data-metrics/{id}',
  tags: TAGS,
  summary: '更新指标',
  params: IdParam,
  body: DataMetric.partial(),
  response: apiResponse(DataMetric),
});
registerRoute({
  method: 'delete',
  path: '/api/data-metrics/{id}',
  tags: TAGS,
  summary: '删除指标',
  params: IdParam,
  response: idDeleted,
});
registerRoute({
  method: 'post',
  path: '/api/data-metrics/batch',
  tags: TAGS,
  summary: '批量删除/更新指标',
  body: z.object({
    action: z.enum(['delete', 'update']),
    ids: z.array(z.number().int()).min(1),
  }).passthrough(),
  response: apiResponse(z.any()),
});

// ===== Excel 导入导出 ======================================================
registerRoute({
  method: 'post',
  path: '/api/data-metrics/import/preview',
  tags: TAGS,
  summary: '导入预览（multipart/form-data，字段名 file，.xlsx）',
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/data-metrics/import',
  tags: TAGS,
  summary: '确认导入',
  body: z.object({
    dm_project_id: z.number().int(),
    mode: z.enum(['append', 'overwrite']),
    data: z.array(z.any()).min(1),
  }).passthrough(),
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'get',
  path: '/api/data-metrics/export',
  tags: TAGS,
  summary: '导出指标为 Excel',
  query: z
    .object({
      dm_project_id: z.coerce.number().int().optional(),
      module_name: z.string().optional(),
      scene_l1: z.string().optional(),
      display_type: z.string().optional(),
    })
    .partial(),
  rawResponse: {
    description: 'Excel 文件流',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  },
});

// ===== 场景分类 ============================================================
registerRoute({
  method: 'get',
  path: '/api/data-metrics/categories/tree',
  tags: TAGS,
  summary: '获取场景分类树',
  query: z.object({ dm_project_id: z.coerce.number().int().optional() }).partial(),
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/data-metrics/categories',
  tags: TAGS,
  summary: '新增场景分类',
  body: z.object({
    dm_project_id: z.number().int(),
    type: z.enum(['module', 'scene_l1', 'scene_l2']),
    name: z.string(),
    parent_id: z.number().int().nullable().optional(),
  }).passthrough(),
  response: apiResponse(DataMetricCategory),
  status: 201,
});
registerRoute({
  method: 'put',
  path: '/api/data-metrics/categories/{id}',
  tags: TAGS,
  summary: '更新场景分类',
  params: IdParam,
  body: z.object({ name: z.string() }).passthrough(),
  response: apiResponse(DataMetricCategory),
});
registerRoute({
  method: 'delete',
  path: '/api/data-metrics/categories/{id}',
  tags: TAGS,
  summary: '删除场景分类',
  params: IdParam,
  response: idDeleted,
});

// ===== Agent 安全网关接口（需 X-Agent-API-Key 请求头） =====================
registerRoute({
  method: 'get',
  path: '/api/data-metrics/projects/{id}/agent-context',
  tags: AGENT_TAGS,
  summary: 'Agent 绘制大纲（需 X-Agent-API-Key；format=markdown 时返回 text/markdown）',
  params: IdParam,
  query: z.object({ format: z.enum(['markdown', 'json']).optional() }).partial(),
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'get',
  path: '/api/data-metrics/projects/{id}/agent-layout',
  tags: AGENT_TAGS,
  summary: 'Agent 12 栅格 Canvas 坐标 DSL（需 X-Agent-API-Key）',
  params: IdParam,
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/data-metrics/projects/{id}/agent-feedback',
  tags: AGENT_TAGS,
  summary: 'Agent 回写排版布局与 3D 关联参数（需 X-Agent-API-Key）',
  params: IdParam,
  body: z.object({}).passthrough(),
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/data-metrics/projects/{id}/convert-to-ppa-template',
  tags: AGENT_TAGS,
  summary: '一键转化为 PPA 成本估算模板（需 X-Agent-API-Key）',
  params: IdParam,
  body: z.object({}).passthrough(),
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'get',
  path: '/api/data-metrics/projects/{id}/export/json',
  tags: AGENT_TAGS,
  summary: '导出完整平铺指标 JSON（需 X-Agent-API-Key）',
  params: IdParam,
  response: apiResponse(z.any()),
});
