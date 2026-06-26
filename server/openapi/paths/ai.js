const { z } = require('zod');
const { registerRoute } = require('../registry');
const { apiResponse } = require('../../schemas/common.schema');
const { PromptTemplate } = require('../../schemas/entities.schema');

const TAGS = ['AI'];

// --- prompt template listings (by module_tag) -----------------------------
const promptListings = [
  ['/api/ai/prompts', '风险分析提示词列表'],
  ['/api/ai/module-prompts', '模块梳理提示词列表'],
  ['/api/ai/workload-prompts', '工作量评估提示词列表'],
  ['/api/ai/project-tag-prompts', '项目标签提示词列表'],
];

promptListings.forEach(([path, summary]) => {
  registerRoute({
    method: 'get',
    path,
    tags: TAGS,
    summary,
    response: apiResponse(z.array(PromptTemplate)),
    responseDescription: summary,
  });
});

// --- AI analysis actions ---------------------------------------------------
// Bodies carry a promptId plus task-specific assessment context; outputs are
// model-generated structures. Documented with known keys + passthrough.
const AiActionBody = z
  .object({ promptId: z.union([z.string(), z.number()]).optional() })
  .passthrough();

const aiActions = [
  ['/api/ai/assess-risk', 'AI 风险评估评分'],
  ['/api/ai/normalize-risk-names', '风险名称对齐到允许列表'],
  ['/api/ai/analyze-project-modules', '项目模块拆解分析'],
  ['/api/ai/evaluate-workload', '按角色估算工作量'],
  ['/api/ai/generate-project-tags', '生成项目标签'],
];

aiActions.forEach(([path, summary]) => {
  registerRoute({
    method: 'post',
    path,
    tags: TAGS,
    summary,
    body: AiActionBody,
    response: apiResponse(z.any()),
    responseDescription: summary,
  });
});
