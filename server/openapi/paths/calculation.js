const { z } = require('zod');
const { registerRoute } = require('../registry');
const { dataResponse } = require('../../schemas/common.schema');

// The calculation engine accepts a rich assessment payload (roles, risk
// scores, scope/tech factors, travel, etc.) and returns the five-part cost
// breakdown. The full field reference lives in
// docs/prd/calculation-logic-spec.md; the contract documents the envelope and
// tolerates the detailed assessment fields.
const CalculationInput = z
  .object({})
  .passthrough()
  .openapi('CalculationInput', {
    description: '项目评估输入（角色/风险/范围/技术/差旅等），详见计算逻辑规格',
  });

registerRoute({
  method: 'post',
  path: '/api/calculate',
  tags: ['Calculation'],
  summary: '实时计算项目成本（核心报价引擎）',
  body: CalculationInput,
  response: dataResponse(z.any(), 'CalculationResult'),
  responseDescription: '五大成本构成与汇总结果',
});
