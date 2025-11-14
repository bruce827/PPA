# 工作量估算 · 新功能开发 · 一键评估 交互流程说明

目标：沉淀“新建评估 → 工作量估算 → 新功能开发”Tab中“一键评估”功能的端到端交互与落地要点，便于后续实现/联调。

## 前端流程

- 触发入口
  - 表格操作列的“ 一键评估 ”按钮，触发单行评估。
  - 参考：`frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEstimation.tsx:631`

- 评估请求（当前为模拟）
  - 组装参数：`{ module1, module2, module3, description, template: 'workload-evaluation' }`
  - 函数：`handleSingleEvaluation(record, type)`
  - 参考：`frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEstimation.tsx:150`
  - 现状：未调用真实 API，使用 2s 延时与 mock 返回（各角色建议工作量、delivery_factor、confidence、complexity）。

- 结果展示与应用
  - 展示：`WorkloadEvaluationModal` 弹窗承载 AI 建议（逐角色人/天、复杂度、置信度、成本估算）。
  - 应用：点击“应用评估结果”后，写回该行的角色工作量与 `delivery_factor`，并重算 `workload = Σ角色天数 × delivery_factor`。
  - 应用按钮绑定：`frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEvaluationModal.tsx:127`
  - 写回逻辑：`frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEstimation.tsx:213`

## 已接通的相关 AI 能力（可复用模式）

- 模块梳理（生成模块清单）
  - 前端服务：`analyzeProjectModules` → POST `/api/ai/analyze-project-modules`
  - 参考：
    - `frontend/ppa_frontend/src/services/assessment/index.ts:227`
    - 路由：`server/routes/ai.js:11`
    - 控制器：`server/controllers/aiController.js:140`
    - 服务：`server/services/aiModuleAnalysisService.js:350`

- 风险评估（AIAssessmentModal）
  - 已有：POST `/api/ai/assess-risk`，含模板/变量、解析兜底、日志记录、模型选择等完整链路。
  - 参考：`server/services/aiRiskAssessmentService.js:327`

## 后端现状与缺口

- AI 路由前缀：`/api/ai`（参见 `server/routes/ai.js`）。
- 已有服务：提示词管理、模型选择、OpenAI/豆包 Provider、日志落库与文件、解析兜底（风险评估/模块梳理）。
- 缺失：工作量评估专用 API（建议新增 `/api/ai/evaluate-workload`）。

## 建议的后端对接设计

- 路由
  - POST `/api/ai/evaluate-workload` → `aiController.evaluateWorkload`

- 请求 Payload（建议）
  - 基础：`promptId: string`（工作量评估提示词模板）、`module1|module2|module3|description: string`
  - 可选：`variables?: Record<string,string>`（扩展变量，如复杂度提示、规模）
  - 可选：`roles?: string[]`（若服务端需要对齐/约束角色集合，可传）

- 响应数据（与前端渲染对齐）
  - `parsed: { role_workloads: Record<string, number>, delivery_factor?: number, complexity?: string, confidence?: number }`
  - 通用：`raw_response?: string, model_used?: string, timestamp?: string, duration_ms?: number`

- 提示词与分类
  - 统一走提示词模板：使用 `aiPromptService`；建议分类 `workload_evaluation`，通过 `getPromptsByCategory` 获取。
  - 模板变量至少包括：`module1/module2/module3/description`，可扩展 `roles/complexity_hint` 等。

- 服务实现要点（复用既有模式）
  - 从当前模型配置表获取：provider/api_host/api_key/model/timeout。
  - 生成 prompt（模板+变量），增加服务级超时保护；调用 OpenAI/豆包 Provider；
  - 解析兜底：支持 JSON 与纯文本（如“角色: 数值”行级匹配），产出 `role_workloads` 与 `delivery_factor/complexity/confidence`。
  - 角色名对齐：与 `config_roles` 做严格/宽松匹配（大小写/空白/全角半角），未识别角色可忽略或返回 0。
  - 记录数据库日志与文件日志（与风险评估/模块梳理一致）。

## 前端改造点

- 替换模拟为真实 API 调用
  - 在 `handleSingleEvaluation` 中调用新服务（示例）：
    - `const res = await aiService.evaluateWorkload({ promptId, module1, module2, module3, description, variables })`
  - 将 `res.data.parsed.role_workloads` 直接映射为弹窗的各角色工作量，读取 `delivery_factor/complexity/confidence`。

- 角色名一致性
  - 前端表格以“配置的角色列表”为基准显示，各角色建议值从 `evaluationResult[role.role_name]` 取值；后端需返回相同键名。

- 提示词选择
  - 与模块梳理一致：从 `GET /api/ai/prompts` 选择对应分类模板，或提供 `GET /api/ai/workload-prompts`（分类下的简化接口）。

## 端到端时序（建议）

1) 用户点击“一键评估”。
2) 前端校验模块信息 → 组装 payload（含 promptId/模块信息/variables）。
3) POST `/api/ai/evaluate-workload`。
4) 控制器 → 服务：读取模板与当前模型 → 调用 Provider → 解析建议 → 记录日志 → 返回。
5) 前端展示弹窗，用户点“应用评估结果”。
6) 将建议写回该行：逐角色天数、`delivery_factor`，并重算 `workload`；标注 `ai_evaluation_result`。

## 关键文件参考

- 触发按钮：`frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEstimation.tsx:631`
- 评估入口：`frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEstimation.tsx:150`
- 应用写回：`frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEstimation.tsx:213`
- 弹窗应用：`frontend/ppa_frontend/src/pages/Assessment/components/WorkloadEvaluationModal.tsx:127`
- 模块梳理（前端服务）：`frontend/ppa_frontend/src/services/assessment/index.ts:227`
- 模块梳理（路由）：`server/routes/ai.js:11`
- 模块梳理（控制器）：`server/controllers/aiController.js:140`
- 模块梳理（服务）：`server/services/aiModuleAnalysisService.js:350`
- 风险评估（服务入口）：`server/services/aiRiskAssessmentService.js:327`

## TODO（实现清单）

- 后端
  - [x] 新增路由：POST `/api/ai/evaluate-workload`
  - [x] 新增控制器：`aiController.evaluateWorkload`
  - [x] 新增服务：`aiWorkloadEvaluationService.evaluate(payload)`（复用解析/日志/超时模式）
  - [ ] 提示词分类：`workload_evaluation` 与模板变量定义（需在提示词管理中新增/启用对应模板）
  - [x] 角色名对齐策略（与 `config_roles`）

- 前端
  - [x] 新增前端服务方法：`evaluateWorkload(payload)`
  - [x] 在 `handleSingleEvaluation` 调用真实 API，移除 mock
  - [x] 映射响应为 `evaluationResult`，复用现有弹窗与应用逻辑
  - [x] 新增“提示词模板”按钮与弹窗：选择模板、编辑变量、预览提示词
  - [x] 详情弹窗内增加“AI评估”按钮，支持完善信息后再评估

- 测试/验证
  - [ ] 单模块评估端到端联调（200ms~3s 目标）
  - [ ] 角色名对齐与缺省处理用例
  - [ ] 超时/失败兜底与日志核对

### 交互补充

- 快速评估入口：保留表格操作栏“一键评估”按钮；当未配置模板或行数据不完整时，分别引导至“提示词模板”弹窗或“详情”弹窗。
- 稳妥评估入口：在“工作量详情”弹窗内提供“AI评估”按钮，使用当前表单值进行评估。
- 模板共用：新功能开发与系统对接共用同一套模板配置；系统对接 Tab 显示当前模板名 Tag，不重复放置按钮。
