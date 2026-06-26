const { z } = require('zod');
const { registerRoute } = require('../registry');
const { apiResponse } = require('../../schemas/common.schema');

const TAGS = ['Monitoring'];

registerRoute({
  method: 'get',
  path: '/api/monitoring/logs',
  tags: TAGS,
  summary: 'AI 调用日志列表（支持过滤/分页查询）',
  query: z
    .object({
      status: z.string().optional(),
      model: z.string().optional(),
      prompt_id: z.string().optional(),
      page: z.coerce.number().int().optional(),
      pageSize: z.coerce.number().int().optional(),
    })
    .partial(),
  response: apiResponse(z.any(), 'MonitoringLogList'),
});

registerRoute({
  method: 'get',
  path: '/api/monitoring/stats',
  tags: TAGS,
  summary: 'AI 调用统计聚合',
  response: apiResponse(z.any(), 'MonitoringStats'),
});

registerRoute({
  method: 'get',
  path: '/api/monitoring/logs/{requestHash}',
  tags: TAGS,
  summary: '单条 AI 调用日志详情',
  params: z.object({ requestHash: z.string() }),
  response: apiResponse(z.any(), 'MonitoringLogDetail'),
});
