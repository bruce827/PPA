const { z } = require('zod');
const { registerRoute } = require('../registry');
const { apiResponse, IdParam } = require('../../schemas/common.schema');
const { BiddingSite, TenderStaging } = require('../../schemas/entities.schema');

const TAGS = ['Opportunity'];

// ===== 招标网站 ============================================================
registerRoute({
  method: 'get',
  path: '/api/opportunity/bidding-sites',
  tags: TAGS,
  summary: '获取招标网站列表',
  query: z.object({ status: z.string().optional(), keyword: z.string().optional() }).partial(),
  response: apiResponse(z.array(BiddingSite)),
});
registerRoute({
  method: 'get',
  path: '/api/opportunity/bidding-sites/{id}',
  tags: TAGS,
  summary: '获取单个招标网站',
  params: IdParam,
  response: apiResponse(BiddingSite),
});
registerRoute({
  method: 'post',
  path: '/api/opportunity/bidding-sites',
  tags: TAGS,
  summary: '创建招标网站',
  body: BiddingSite.partial(),
  response: apiResponse(BiddingSite),
});
registerRoute({
  method: 'put',
  path: '/api/opportunity/bidding-sites/{id}',
  tags: TAGS,
  summary: '更新招标网站',
  params: IdParam,
  body: BiddingSite.partial(),
  response: apiResponse(BiddingSite),
});
registerRoute({
  method: 'delete',
  path: '/api/opportunity/bidding-sites/{id}',
  tags: TAGS,
  summary: '删除招标网站',
  params: IdParam,
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/opportunity/bidding-sites/{id}/script',
  tags: TAGS,
  summary: '上传招标网站爬虫脚本（text/plain Python 源码）',
  params: IdParam,
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/opportunity/bidding-sites/{id}/validate',
  tags: TAGS,
  summary: '校验招标网站爬虫脚本',
  params: IdParam,
  body: z.object({}).passthrough(),
  response: apiResponse(z.any()),
});

// ===== 招标暂存 ============================================================
registerRoute({
  method: 'get',
  path: '/api/opportunity/tender-staging',
  tags: TAGS,
  summary: '获取招标暂存列表',
  query: z
    .object({ status: z.string().optional(), site_id: z.coerce.number().int().optional() })
    .partial(),
  response: apiResponse(z.array(TenderStaging)),
});
registerRoute({
  method: 'post',
  path: '/api/opportunity/tender-staging/dedupe/preview',
  tags: TAGS,
  summary: '招标暂存去重预览',
  body: z.object({}).passthrough(),
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/opportunity/tender-staging/dedupe/execute',
  tags: TAGS,
  summary: '执行招标暂存去重',
  body: z.object({}).passthrough(),
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/opportunity/tender-staging/archive-source-files',
  tags: TAGS,
  summary: '归档招标源文件',
  body: z.object({}).passthrough(),
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/opportunity/tender-staging/{id}/parse-fields',
  tags: TAGS,
  summary: '解析招标字段',
  params: IdParam,
  body: z.object({}).passthrough(),
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'get',
  path: '/api/opportunity/tender-staging/{id}/web-search',
  tags: TAGS,
  summary: '获取招标项目联网检索上下文',
  params: IdParam,
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/opportunity/tender-staging/{id}/web-search',
  tags: TAGS,
  summary: '执行招标项目联网检索',
  params: IdParam,
  body: z.object({}).passthrough(),
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/opportunity/tender-staging/sync',
  tags: TAGS,
  summary: '同步招标暂存数据',
  body: z.object({}).passthrough(),
  response: apiResponse(z.any()),
});
registerRoute({
  method: 'post',
  path: '/api/opportunity/tender-staging/{id}/push',
  tags: TAGS,
  summary: '推送招标暂存项目',
  params: IdParam,
  response: apiResponse(z.any()),
});
