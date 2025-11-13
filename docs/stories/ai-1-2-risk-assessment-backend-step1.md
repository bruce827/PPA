# Story 1.2 AI风险评估后端接口 Step1

Status: in-progress

## Story

作为负责AI风控功能的后端开发人员,
我想要实现提示词查询和风险评估接口,
以便前端AI风险评估弹窗可以调用真实服务并返回结构化结果。

- 后端需提供 `/api/ai/prompts` 与 `/api/ai/assess-risk` 两个核心接口, 覆盖提示词拉取、变量替换、AI调用与结果解析能力 [Source: docs/prd/ai-risk-assessment-backend-step1.md#4-功能需求]
- 交付物必须满足日志、超时、重试与输入校验要求, 与既有 Express + SQLite 架构保持一致 [Source: docs/prd/ai-risk-assessment-backend-step1.md#5-非功能需求]
- 返回结构需要贴合前端期望的风险评分、缺失项和总体建议展示格式 [Source: docs/new-assessment-ai-design-step1.md#3-后端api设计]

## Acceptance Criteria

1. 提示词查询接口 `GET /api/ai/prompts` 返回 `success` 字段与提示词数组, 字段包含 `id`, `name`, `description`, `content`, `variables`, `model_hint`, 并在 200ms 内响应, 支持 5 分钟内存缓存与错误时 500 响应 [Source: docs/prd/ai-risk-assessment-backend-step1.md#41-api-ai-prompts]
2. 风险评估接口 `POST /api/ai/assess-risk` 对文档长度、提示词存在性和变量完整性做校验, 构造完整 prompt 并携带 `currentRiskItems` 与 `currentScores`, 非法输入返回 400, 缺少模板返回 400 [Source: docs/prd/ai-risk-assessment-backend-step1.md#42-api-ai-assess-risk]
3. 风险评估调用封装统一 AI Provider, 配置 20 秒超时与一次指数退避重试, 超时返回 504, 其他内部错误返回 500 且记录日志 [Source: docs/prd/ai-risk-assessment-backend-step1.md#5-非功能需求]
4. 成功响应解析 `risk_scores`、`missing_risks`, `overall_suggestion`, `confidence`, 并确保 `risk_scores` 非空, 同时记录模型名称、时间戳与原始响应哈希, 解析失败返回 422 [Source: docs/prd/ai-risk-assessment-backend-step1.md#42-api-ai-assess-risk]
5. 为两个接口补充单元与集成测试覆盖成功、参数错误、解析失败、超时四类场景, 并在 README 或现有文档补充使用说明 [Source: docs/prd/ai-risk-assessment-backend-step1.md#8-开发任务拆分]

## Tasks / Subtasks

- [x] Task 1: 数据层与种子数据准备 (AC: 1)
  - [x] 创建 `ai_prompts` 迁移脚本, 包含字段与索引定义 [Source: docs/prd/ai-risk-assessment-backend-step1.md#61-sqlite-表-ai-prompts]
  - [x] 初始化默认提示词种子, 确保空表场景有回退数据 [Source: docs/prd/ai-risk-assessment-backend-step1.md#41-api-ai-prompts]
- [ ] Task 2: Prompt Service 与查询接口实现 (AC: 1)
  - [x] 编写 `aiPromptService` 读取数据库并维护 5 分钟缓存 [Source: docs/prd/ai-risk-assessment-backend-step1.md#41-api-ai-prompts]
  - [x] 在 `routes/ai.js` 新增 `GET /api/ai/prompts` 路由与控制器, 标准化响应结构 [Source: docs/new-assessment-ai-design-step1.md#3-后端api设计]
- [ ] Task 3: 风险评估 Service 与 Provider (AC: 2, 3, 4)
  - [x] 实现 `aiRiskAssessmentService` 参数校验、prompt 拼装与结果解析 [Source: docs/prd/ai-risk-assessment-backend-step1.md#42-api-ai-assess-risk]
  - [x] 封装 `providers/ai/openaiProvider` 调用, 加入超时、重试与错误分类 [Source: docs/prd/ai-risk-assessment-backend-step1.md#5-非功能需求]
- [ ] Task 4: 控制器与日志监控 (AC: 2, 3, 4)
  - [x] 实现 `aiController` 输入验证, 落日志、hash 文档并映射状态码 [Source: docs/prd/ai-risk-assessment-backend-step1.md#7-模块与职责划分]
  - [x] 可选写入 `ai_assessment_logs` 表, 记录模型、耗时、状态 [Source: docs/prd/ai-risk-assessment-backend-step1.md#62-可选表-ai-assessment-logs]
- [ ] Task 5: 测试与文档 (AC: 5)
  - [ ] 编写 Service 单测和 API 集成测试覆盖四类场景 [Source: docs/prd/ai-risk-assessment-backend-step1.md#8-开发任务拆分]
  - [ ] 更新 README 或 API 文档说明新接口、环境变量配置 [Source: docs/prd/ai-risk-assessment-backend-step1.md#9-验收标准]

## Dev Notes

### Requirements Context

- PRD 明确首批后端能力集中在提示词查询和风险评估接口, 输出需与前端 Step1 模块对齐 [Source: docs/prd/ai-risk-assessment-backend-step1.md#2-范围]
- 前端已实现的 Modal 期望后端提供提示词变量与结构化评估结果, 需保持字段命名一致 [Source: docs/stories/ai-1-1-risk-assessment-ai-modal.md#Dev-Notes]
- 风险评估故事要求提供建议评分与缺失风险提示, 与 Epic 2 风险识别目标一致 [Source: docs/epics.md#story-23-风险项评分建议和缺失识别]

### Learnings from Previous Story

#### 来自 Story ai-1-1-risk-assessment-ai-modal (Status: done)

- 新增前端组件 `frontend/ppa_frontend/src/pages/Assessment/components/AIAssessmentModal.tsx` 和样式文件, 直接消费 `/api/ai/prompts` 与 `/api/ai/assess-risk` [Source: docs/stories/ai-1-1-risk-assessment-ai-modal.md#Dev-Agent-Record]
- 风险评估结果解析逻辑已在前端落地, 需保证后端返回字段 `risk_scores`, `missing_risks`, `overall_suggestion`, `confidence` 与 Modal 展示一致 [Source: docs/stories/ai-1-1-risk-assessment-ai-modal.md#Dev-Notes]
- 当前接口调用仍使用 mock, 完成后端后需更新前端 fetch 逻辑以启用真实服务 [Source: docs/stories/ai-1-1-risk-assessment-ai-modal.md#Dev-Notes]

### Architecture & Observability Notes

- 使用现有 Express 5 pipeline 与 `middleware/errorHandler.js`, 确保新路由按顺序注册 [Source: docs/prd/ai-risk-assessment-backend-step1.md#7-模块与职责划分]
- Provider 需从配置读取 `AI_PROVIDER_API_KEY` 与 `AI_PROVIDER_BASE_URL`, 并为每次调用记录 request_id、耗时、模型名称 [Source: docs/prd/ai-risk-assessment-backend-step1.md#5-非功能需求]
- 建议通过 `crypto.createHash('sha256')` 记录文档摘要, 避免日志泄露敏感信息 [Source: docs/prd/ai-risk-assessment-backend-step1.md#5-非功能需求]

### Testing Strategy

- Service 层使用 Jest 对提示词缓存、prompt 拼装、响应解析进行单测, 模拟 AI Provider 的成功、超时与解析失败分支 [Source: docs/prd/ai-risk-assessment-backend-step1.md#8-开发任务拆分]
- 集成测试基于 Supertest 构造 `/api/ai/prompts` 与 `/api/ai/assess-risk` 请求, 使用 SQLite 测试数据库 `ppa.test.db` [Source: docs/prd/ai-risk-assessment-backend-step1.md#5-非功能需求]
- 性能校验确保 `/api/ai/prompts` 在缓存命中时 <200ms, `/api/ai/assess-risk` 在 8 秒内返回或超时报 504 [Source: docs/prd/ai-risk-assessment-backend-step1.md#4-功能需求]

### Project Structure Notes

- 新增后端文件建议放置于 `server/routes/ai.js`, `server/controllers/aiController.js`, `server/services/` 与 `server/providers/ai/`, 遵循现有分层 [Source: docs/prd/ai-risk-assessment-backend-step1.md#7-模块与职责划分]
- 迁移与种子脚本置于 `server/migrations/` 与 `server/seed-data/`, 与数据库初始化流程兼容 [Source: docs/prd/ai-risk-assessment-backend-step1.md#6-数据结构与存储]
- 注意与现有 `frontend` 目录耦合, 发布后需协调前端切换到真实端点 [Source: docs/stories/ai-1-1-risk-assessment-ai-modal.md#Dev-Notes]

### References

- docs/prd/ai-risk-assessment-backend-step1.md
- docs/stories/ai-1-1-risk-assessment-ai-modal.md
- docs/new-assessment-ai-design-step1.md
- docs/epics.md

## Dev Agent Record

### Context Reference

- docs/stories/ai-1-2-risk-assessment-backend-step1.context.xml

### Agent Model Used

待定

### Debug Log References

- 2025-11-12 09:15 实施规划：
  - 数据层：新增 `ai_prompts` / `ai_assessment_logs` 数据表及种子，更新初始化与 seed-all 流程。
  - 服务层：实现 `aiPromptService` 缓存查询、`aiRiskAssessmentService` 参数校验/Prompt 构建/解析逻辑。
  - Provider：封装 `openaiProvider`，提供超时与重试控制，并暴露给 Service。
  - 控制层与路由：新增 `aiController`、`routes/ai`，在主路由注册 `/api/ai`，设置 JSON 请求大小限制。
  - 工具：新增 `logger`、`errors` 工具。
  - 测试与文档：补充 Jest + Supertest 覆盖四类场景，更新 README API 说明。
- 2025-11-12 10:45 Task 2 路由计划：整理 `aiController` 与 `routes/ai` 结构，复用 `aiPromptService` 输出 success/data 响应，异常交由全局 errorHandler，完成后在 `routes/index.js` 挂载 `/api/ai` 前缀并补充日志上下文。
- 2025-11-12 11:05 Task 4 控制器实现计划：`aiController` 新增 assessRisk，提前校验请求体、hash 文档日志、调用 `aiRiskAssessmentService`、根据错误类型映射 400/422/504/500，路由层注册 POST `/api/ai/assess-risk`。
- 2025-11-12 11:25 Task 4 控制器落地：`aiController` 集成 `assessRisk`，对请求体进行哈希日志、调用 service 处理、捕获并透传标准化错误，`routes/ai` 注册 POST 端点并复用全局 errorHandler。

### Completion Notes List

- [ ] 实现提示词查询接口并通过缓存验证 (AC1)
- [ ] 完成风险评估接口及 Provider 封装 (AC2, AC3, AC4)
- [ ] 通过单元与集成测试, 更新文档 (AC5)

### File List

#### Planned New Files

- server/routes/ai.js
- server/controllers/aiController.js
- server/services/aiPromptService.js
- server/services/aiRiskAssessmentService.js
- server/providers/ai/openaiProvider.js
- server/migrations/YYYYMMDDHHmmss_create_ai_prompts_table.js

#### Planned Modified Files

- server/index.js (注册新路由)
- server/utils/logger.js (若需增强日志字段)
- README.md 或 docs/api/FILE.md (新增接口说明)

#### 当前迭代变更

- server/controllers/aiController.js (新增)
- server/routes/ai.js (新增)
- server/routes/index.js (更新)

