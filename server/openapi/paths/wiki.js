const { z } = require('zod');
const { registerRoute } = require('../registry');
const { apiResponse, OkResponse } = require('../../schemas/common.schema');

const TAGS = ['Wiki'];

registerRoute({
  method: 'get',
  path: '/api/wiki',
  tags: TAGS,
  summary: '获取 Wiki 目录树',
  query: z
    .object({
      project: z.string().optional(),
      refresh: z.string().optional(),
    })
    .partial(),
  response: z
    .object({
      success: z.boolean(),
      data: z.any(),
      projects: z.any().optional(),
      currentProject: z.any().optional(),
    })
    .openapi('WikiTree'),
});

registerRoute({
  method: 'get',
  path: '/api/wiki/content',
  tags: TAGS,
  summary: '获取指定 Wiki 文档正文',
  query: z.object({
    path: z.string().openapi({ description: 'wiki 目录下的相对路径' }),
    refresh: z.string().optional(),
  }),
  response: apiResponse(z.any(), 'WikiContent'),
});

registerRoute({
  method: 'get',
  path: '/api/wiki/relations',
  tags: TAGS,
  summary: '获取 Wiki 与项目的绑定关系',
  query: z
    .object({
      wiki_key: z.string().optional(),
      project_id: z.coerce.number().int().optional(),
    })
    .partial(),
  response: apiResponse(z.any(), 'WikiRelations'),
});

registerRoute({
  method: 'post',
  path: '/api/wiki/relations',
  tags: TAGS,
  summary: '覆盖保存 Wiki 与项目的绑定关系',
  body: z
    .object({
      wiki_key: z.string(),
      project_ids: z.array(z.number().int()),
    })
    .passthrough(),
  response: OkResponse,
});
