const { z } = require('zod');
const { registerRoute } = require('../registry');
const { apiResponse } = require('../../schemas/common.schema');

const TAGS = ['Contracts'];

registerRoute({
  method: 'get',
  path: '/api/contracts/files',
  tags: TAGS,
  summary: '列出可用的合同数据文件',
  response: apiResponse(
    z.object({ files: z.array(z.any()) }),
    'ContractFileList'
  ),
});

registerRoute({
  method: 'get',
  path: '/api/contracts/file',
  tags: TAGS,
  summary: '读取单个合同数据文件（支持搜索与行数限制）',
  query: z.object({
    name: z.string().openapi({ description: '文件名' }),
    search: z.string().optional(),
    maxRows: z.coerce.number().int().optional(),
  }),
  response: apiResponse(z.any(), 'ContractFileContent'),
});

registerRoute({
  method: 'post',
  path: '/api/contracts/recommend',
  tags: TAGS,
  summary: '基于标签推荐相关合同',
  body: z.object({
    tags: z.array(z.string()).optional(),
    topN: z.number().int().optional(),
    maxRowsPerFile: z.number().int().optional(),
  }),
  response: apiResponse(z.any(), 'ContractRecommendation'),
});
