const { z } = require('zod');
const { registerRoute } = require('../registry');
const { dataResponse } = require('../../schemas/common.schema');

const TAGS = ['Dashboard'];

// Dashboard endpoints return pre-aggregated visualisation payloads with shapes
// driven by the charting layer. They are documented as `{ data }` envelopes
// with endpoint-specific summaries; the inner shape is aggregate data.
const endpoints = [
  ['/api/dashboard/overview', 'Header 概览指标'],
  ['/api/dashboard/trend', '月度趋势数据'],
  ['/api/dashboard/cost-range', '成本区间分布'],
  ['/api/dashboard/keywords', '词云数据'],
  ['/api/dashboard/dna', '项目 DNA 雷达图数据'],
  ['/api/dashboard/top-roles', 'Top 角色统计'],
  ['/api/dashboard/top-risks', 'Top 风险统计'],
];

endpoints.forEach(([path, summary]) => {
  registerRoute({
    method: 'get',
    path,
    tags: TAGS,
    summary,
    response: dataResponse(z.any()),
    responseDescription: summary,
  });
});
