const { z } = require('zod');
const { registerRoute } = require('../registry');

const TAGS = ['Health'];

registerRoute({
  method: 'get',
  path: '/api/health',
  tags: TAGS,
  summary: '健康检查：返回服务与数据库连接状态',
  response: z
    .object({
      status: z.enum(['ok', 'error']),
      message: z.string(),
    })
    .openapi('HealthStatus'),
});
