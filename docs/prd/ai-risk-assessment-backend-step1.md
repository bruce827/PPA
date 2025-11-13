# AI一键风险评估后端接口 PRD（Step 1）

## 1. 背景与目标

- 前端 `Story AI-1.1` 已实现风险评分弹窗与 UI 流程，目前仅依赖 mock 数据；缺少真实后端接口支撑。
- 本 PRD 聚焦实现 Step1 所需的后端能力：提供提示词模板查询与 AI 风险评估调用，保证前端可用并具备扩展性。
- 目标：在保持现有 Express + SQLite 架构的前提下，交付可上线的 `/api/ai/prompts` 与 `/api/ai/assess-risk` 接口，满足性能、容错与审计要求。

## 2. 范围

### 包含

1. 新增 `/api/ai/prompts` 接口，返回提示词模板列表。
2. 新增 `/api/ai/assess-risk` 接口，接收用户文档与提示词配置，调用 AI 模型并返回结构化结果。
3. 数据层支持（SQLite 表 / 配置读取）、Service 分层及 Provider 封装。
4. 错误处理、日志记录、基础安全校验。

### 不包含

- 模型训练或提示词后台管理页面。
- AI 日志可视化、计费、权限系统。
- 后续 Step（如模块梳理、单模块评估）相关接口。

## 3. 用户故事（后端视角）

1. **作为前端 AI 风险评估弹窗**，当我请求 `/api/ai/prompts` 时，需要获得最新的提示词列表（包含变量定义与模型提示），以便渲染选择项与动态表单。
2. **作为前端 AI 风险评估弹窗**，当我提交文档、提示词及风险项信息到 `/api/ai/assess-risk` 时，需要得到结构化的评估结果（风险项评分、缺失项、总体建议等），以便展示给用户并回填表单。
3. **作为运维/管理者**，当 AI 调用失败或返回异常时，需要明确的错误日志和响应状态，便于追踪问题并提示用户重试。

## 4. 功能需求

### 4.1 `/api/ai/prompts`

- **请求方式**: GET
- **功能说明**: 返回所有可用提示词模板，支持描述、变量列表、默认值、模型建议等元信息。
- **数据源**: `ai_prompts` 数据表（若表为空，可落至默认种子数据）。
- **响应格式**:

  ```json
  {
    "success": true,
    "data": [
      {
        "id": "risk-general",
        "name": "通用风险评估",
        "description": "适用于大多数招标场景",
        "content": "...",
        "variables": [
          { "name": "risk_items", "display_name": "风险项列表", "default_value": "技术风险,团队风险" }
        ],
        "model_hint": "gpt-4"
      }
    ]
  }
  ```

- **错误响应**: `{ "success": false, "error": "获取提示词失败" }`，HTTP 500。
- **约束**: 响应需在 200ms 内返回，建议增加内存缓存（5 分钟）。

### 4.2 `/api/ai/assess-risk`

- **请求方式**: POST
- **请求体**:

  ```json
  {
    "document": "<string, ≤5000 字符>",
    "promptId": "risk-general",
    "variables": { "risk_items": "技术风险,团队风险" },
    "currentRiskItems": [
      { "item_name": "技术风险", "description": "技术栈复杂度" }
    ],
    "currentScores": { "技术风险": 3 }
  }
  ```

- **功能说明**:
  1. 校验必填字段与长度，确认 `promptId` 合法。
  2. 根据提示词模板替换变量，拼装完整 prompt（含风险项、当前评分、评估要求）。
  3. 调用后端 AI Provider（可对接 OpenAI/自建模型），设置超时与重试策略。
  4. 解析模型返回 JSON（或半结构文本），保证 `risk_scores` 至少为非空数组。
  5. 统一返回结构化数据，并记录调用日志（不存储原文档）。
- **成功响应**:

  ```json
  {
    "success": true,
    "data": {
      "raw_response": "{...}",
      "parsed": {
        "risk_scores": [
          { "item_name": "技术风险", "suggested_score": 4, "reason": "核心技术首次落地" }
        ],
        "missing_risks": [
          { "item_name": "法律风险", "description": "未评估合同条款", "suggested_score": 3 }
        ],
        "overall_suggestion": "建议增加技术预研与合规审查",
        "confidence": 0.82
      },
      "model_used": "gpt-4-turbo",
      "timestamp": "2025-11-12T10:00:00Z"
    }
  }
  ```

- **错误响应**:
  - 400：参数缺失、提示词不存在、文档超长。
  - 422：AI 返回无法解析为有效结果。
  - 504：AI 调用超时。
  - 500：其他内部错误（具体信息写入日志）。
- **性能要求**: API 响应 ≤ 500ms（模型调用除外，整体控制在 8s 内，超时返回 504）。

## 5. 非功能需求

1. **安全**: 限制请求体大小（≤ 20KB）、过滤脚本标签、防止 prompt 注入；日志只记录哈希/摘要。
2. **可靠性**: Provider 层增加 1 次重试与指数退避；引入超时控制（如 20s）。
3. **可观测性**: 使用现有 `logger` 输出请求 ID、提示词 ID、模型名称、耗时、错误栈；必要时写入 `ai_assessment_logs` 表（可选）。
4. **可维护性**: 控制器、服务、Provider 分层清晰；新增单元测试覆盖成功、参数错误、解析失败、超时四类场景。
5. **部署**: 与现有 server 共用端口，无额外基础设施；需新增环境变量（如 `AI_PROVIDER_API_KEY`、`AI_PROVIDER_BASE_URL`）。

## 6. 数据结构与存储

### 6.1 SQLite 表 `ai_prompts`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | TEXT PRIMARY KEY | 提示词唯一标识 |
| name | TEXT | 展示名称 |
| description | TEXT | 描述 |
| content | TEXT | 模板正文（支持变量占位） |
| variables_json | TEXT | 存储变量数组 JSON |
| model_hint | TEXT | 推荐模型（可选） |
| created_at / updated_at | TEXT | ISO8601 时间戳 |

### 6.2 可选表 `ai_assessment_logs`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | INTEGER PRIMARY KEY | 自增 ID |
| prompt_id | TEXT | 使用的提示词 |
| model_used | TEXT | 实际调用模型 |
| request_hash | TEXT | 文档内容哈希（例如 SHA256） |
| duration_ms | INTEGER | 调用耗时 |
| status | TEXT | success / fail / timeout |
| error_message | TEXT | 失败信息（可选） |
| created_at | TEXT | 时间戳 |

## 7. 模块与职责划分

| 模块 | 职责 |
| --- | --- |
| `routes/ai.js` | 定义路由；绑定控制器 |
| `controllers/aiController.js` | 输入校验、调用 Service、标准化响应 |
| `services/aiPromptService.js` | 读取/缓存提示词数据，返回 DTO |
| `services/aiRiskAssessmentService.js` | 组合 prompt、调用 Provider、解析响应 |
| `providers/ai/openaiProvider.js` | 封装具体模型调用，处理超时/重试 |
| `middleware/errorHandler.js` | 统一错误返回（已有，中间件链尾部） |

## 8. 开发任务拆分

1. **数据准备**
   - 创建 `ai_prompts` 表及迁移脚本，导入种子数据。
   - （可选）创建 `ai_assessment_logs` 表。
2. **提示词接口**
   - 实现 PromptService，支持缓存。
   - 实现 `/api/ai/prompts` Controller + 路由。
3. **评估接口**
   - 实现参数校验（express-validator / 自定义）。
   - 实现 RiskAssessmentService（prompt 构建、AI 调用、解析）。
   - 封装 AI Provider（含超时、重试、错误分类）。
   - 实现 `/api/ai/assess-risk` Controller + 路由。
4. **测试与验证**
   - 单元测试：PromptService、RiskAssessmentService。
   - 集成测试：两个接口 + 错误场景。
   - 更新 `docs/api`（若有）和 README。

## 9. 验收标准

1. 两个接口均返回结构与前端对接一致，支持模拟与真实模型调用。
2. 提示词查询响应时间 ≤ 200ms；评估接口对 AI 超时有 graceful fallback。
3. API 响应包含 `success` 字段；错误状态码符合约定。
4. 单元与集成测试覆盖率 ≥ 80%（针对新增模块）。
5. 配置项（模型 API Key、Base URL 等）通过 `.env` 管理，且 README 有使用说明。

## 10. 未来规划（非本次范围）

- 提示词后台管理界面与版本控制。
- AI 评估调用审计面板（支撑 Story AI-1.4 透明化）。
- 多模型策略（根据项目类型选择不同模型）。
- AI 响应质量监控与指标看板。

---
**PRD Owner**: bruce（SM）  
**更新日期**: 2025-11-12
