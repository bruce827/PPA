---
title: '项目机会智能评估服务 MVP'
slug: 'opportunity-intelligence-mvp-service'
created: '2026-03-14'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'Python 3.11+'
  - 'FastAPI'
  - 'Pydantic v2'
  - 'httpx'
  - 'Node.js'
  - 'Express'
  - 'Jest'
  - 'Supertest'
files_to_modify:
  - 'server/config/opportunityIntelligence.js'
  - 'server/controllers/opportunityIntelligenceController.js'
  - 'server/routes/index.js'
  - 'server/routes/opportunityIntelligence.js'
  - 'server/services/opportunityIntelligenceClient.js'
  - 'server/tests/'
  - 'docs/opportunity-intelligence/'
  - 'services/opportunity_intelligence/pyproject.toml'
  - 'services/opportunity_intelligence/.env.example'
  - 'services/opportunity_intelligence/README.md'
  - 'services/opportunity_intelligence/app/'
  - 'services/opportunity_intelligence/tests/'
code_patterns:
  - 'Node 端使用 routes/controller/service 分层'
  - 'Express API 统一返回 {success, data, error}'
  - '服务层负责业务逻辑，controller 只做入参与响应封装'
  - 'Jest + Supertest 进行后端集成测试'
  - 'Python 服务使用 schema -> service -> provider_adapter 分层'
test_patterns:
  - 'server/tests 下按接口写集成测试'
  - 'Python 服务使用 pytest + TestClient'
---

# Tech-Spec: 项目机会智能评估服务 MVP

**Created:** 2026-03-14

## Overview

### Problem Statement

当前 PPA 已经具备历史项目评估数据、项目标签和业绩库推荐能力，但还没有一个专门面向“全网每日新增招标机会”的独立分析服务。现状导致以下问题：

1. 招标信息进入系统后没有统一的标准化入口。
2. 外部 AI 文档理解能力无法稳定映射到内部历史项目与业绩资产。
3. 推荐判断仍缺少一层可复算、可解释、可复用的服务化评分逻辑。
4. 当前仓库没有 Python 智能服务骨架，无法承载后续模型编排、向量化和规则评分演进。

### Solution

在当前仓库中新增一个独立的 Python FastAPI 服务目录 `services/opportunity_intelligence/`，实现 MVP 级“机会分析 + 推荐评分”闭环，并通过 Node 网关最小接入现有 PPA。

MVP 只做一条最小闭环：

1. 接收原始招标机会输入
2. 输出统一 `opportunity_snapshot`
3. 复用历史项目与 CSV 业绩数据做候选匹配
4. 通过规则评分器输出 `fit_score / fit_level / reasons`
5. 由现有 Node 后端转发调用该服务

### Scope

**In Scope:**

- 新建独立 Python 服务骨架
- 定义 MVP 输入输出 schema
- 实现 `GET /health`
- 实现 `POST /api/v1/analyze`
- 实现 `POST /api/v1/recommend`
- 实现 `POST /api/v1/analyze-and-recommend`
- 实现基础 provider 抽象，先支持 mock 和 HTTP provider
- 实现历史项目与 CSV 业绩库的只读加载
- 实现规则评分器 v1
- 在现有 Node 后端增加代理接口
- 补齐 Python 与 Node 侧最小测试

**Out of Scope:**

- 全量批处理调度系统
- 向量库落地与 embedding 检索正式版
- 学习排序或模型微调
- 完整 UI 页面
- 结果持久化查询接口
- 多租户、鉴权、外部 API 配额治理

## Context for Development

### Codebase Patterns

当前代码调查结果如下：

1. Node 后端使用 `routes -> controllers -> services -> models` 分层。
2. 接口统一挂在 `/api/*` 前缀下，主入口在 `server/routes/index.js`。
3. 现有服务风格可参考：
   - `server/services/contractsService.js`
   - `server/controllers/contractsController.js`
   - `server/services/aiProjectTaggingService.js`
4. Node 测试模式采用 `Jest + Supertest`，直接对 Express app 发请求。
5. 当前仓库不存在现成 Python 服务骨架，也未发现 `pyproject.toml`、`requirements.txt` 或 `project-context.md`。
6. 当前机会相关路由只覆盖 `招标网站管理`，还没有“机会智能评估服务”路由。

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `server/routes/index.js` | 现有 API 总路由挂载方式 |
| `server/index.js` | Express 启动方式与中间件顺序 |
| `server/controllers/contractsController.js` | 简洁 controller 模式参考 |
| `server/services/contractsService.js` | 历史业绩 CSV 读取与推荐匹配参考 |
| `server/services/projectService.js` | 历史项目数据、标签与评估快照写入逻辑 |
| `server/services/calculationService.js` | 评分因子、风险和成本结构参考 |
| `server/tests/contractsAPI.test.js` | 现有集成测试模式 |
| `docs/opportunity-intelligence/prd.md` | 本功能产品边界与需求基准 |
| `docs/opportunity-intelligence/architecture.md` | 本功能技术架构基准 |

### Technical Decisions

1. **新服务目录位置**
   - 采用 `services/opportunity_intelligence/` 作为仓库根目录下的新服务目录。
   - 不将 Python 代码塞入 `server/`，避免 Node 与 Python 运行时混杂。

2. **MVP 服务边界**
   - Python 服务负责智能分析与推荐。
   - Node 服务只负责网关转发和与现有 PPA 集成。

3. **数据策略**
   - MVP 阶段不引入正式向量库。
   - MVP 阶段以结构化结果 + 规则评分为主。
   - 历史项目与 CSV 业绩库先使用只读文件/SQLite 读取。
   - Python 访问 SQLite 时必须使用只读连接，禁止写入现有 `server/ppa.db`。
   - Python 读取失败时必须优雅降级为空候选，而不是中断整个分析流程。

4. **模型策略**
   - MVP 不强依赖真实多模态模型。
   - 先支持 `mock provider` 和统一 provider 抽象。
   - 真实 Gemini / Claude / OpenAI provider 在下一轮接入时替换。

5. **集成策略**
   - 先提供 Node 代理接口：
     - `POST /api/opportunity-intelligence/analyze`
     - `POST /api/opportunity-intelligence/recommend`
     - `POST /api/opportunity-intelligence/analyze-and-recommend`

6. **SQLite 只读访问策略**
   - Python 服务通过单独的 repository 层读取 `server/ppa.db`。
   - 连接参数必须显式声明为只读。
   - 必须设置连接超时/忙等待策略，避免与 Node 主服务并发访问时直接失败。
   - 若数据库文件不存在或读取失败，返回结构化 warning 并继续输出无候选结果。

7. **历史特征回填策略**
   - 如果 `tags_json` 缺失或为空，必须从 `assessment_details_json` 回填最小特征。
   - 回填顺序：
     1. 项目名称与描述关键词
     2. `assessment_details_json.tags`
     3. `development_workload` / `integration_workload` 中的 `module1/module2/module3`
     4. `risk_scores` 高分项名称
   - 该 fallback 是 MVP 检索质量的必要前置，不允许省略。

8. **CSV 解析一致性策略**
   - Python 端的合同仓储必须遵循与 `server/services/contractsService.js` 等价的业务规则：
     - 自动识别 header 行
     - 将整行字段拼接为可搜索文本
     - 保留动态列
     - 空文件/坏文件容错
   - 必须用共享 fixture 做“行为一致性测试”，而不是仅写 Python 自己的 happy path 测试。

9. **Provider 输入抽象**
   - Provider 不得只接收单一字符串。
   - 必须统一输入为 `DocumentInputEnvelope`：
     - `title`
     - `text_content`
     - `attachments[]`
     - `images[]`
     - `source_metadata`
   - 后续接 Gemini / Claude / OpenAI 时只允许在 adapter 层做 provider-specific 映射。

10. **评分常量与等级阈值**
    - MVP 评分区间固定为 `0-100`。
    - 初始权重：
      - `industry_match_score`: 0-20
      - `capability_match_score`: 0-25
      - `project_shape_score`: 0-15
      - `historical_similarity_score`: 0-20
      - `contract_hit_score`: 0-10
      - `risk_penalty`: 0 至 -20
      - `timeline_penalty`: 0 至 -10
    - 等级阈值：
      - `>= 75`: `highly_recommended`
      - `55-74`: `recommended`
      - `35-54`: `cautious`
      - `< 35`: `not_recommended`
    - 所有权重与阈值必须集中定义在独立常量文件，不允许散落在 service 逻辑中。

11. **脱敏与裁剪策略**
    - 发送到外部 provider 的内部证据必须先经过裁剪与脱敏。
    - 默认仅允许发送：
      - 当前招标机会文本
      - Top-K 历史项目摘要卡片
      - Top-K 业绩摘要卡片
    - 禁止直接发送：
      - 完整 `assessment_details_json`
      - 完整合同原始行所有字段
      - 未裁剪的内部敏感备注

12. **Node 配置管理策略**
    - `OPPORTUNITY_INTELLIGENCE_BASE_URL` 不应散落在 `server/index.js`。
    - 必须新增 `server/config/opportunityIntelligence.js` 统一读取和导出配置。

13. **本地联调约定**
    - Python 服务默认端口：`8010`
    - Node 服务默认端口：`3001`
    - Node 通过 `OPPORTUNITY_INTELLIGENCE_BASE_URL=http://127.0.0.1:8010` 访问 Python 服务

## API Contracts

### Contract Version

所有 Python 服务主响应都必须包含：

- `schema_version: "v1"`

### Analyze Request

```json
{
  "title": "智慧工厂数字孪生平台建设项目",
  "text_content": "招标公告正文",
  "source_metadata": {
    "source_site": "xx招标网",
    "url": "https://example.com/bid/1",
    "published_at": "2026-03-14T09:00:00+08:00"
  },
  "attachments": [
    {
      "name": "招标文件.pdf",
      "content_type": "application/pdf",
      "path": "/abs/path/file.pdf"
    }
  ],
  "images": []
}
```

### Analyze Response

```json
{
  "schema_version": "v1",
  "snapshot": {
    "basic_info": {
      "title": "智慧工厂数字孪生平台建设项目",
      "source_site": "xx招标网",
      "url": "https://example.com/bid/1",
      "published_at": "2026-03-14T09:00:00+08:00"
    },
    "tags": ["数字孪生", "智慧工厂"],
    "industry_signals": ["工业", "制造"],
    "technology_signals": ["三维可视化", "数据接入"],
    "delivery_signals": ["平台建设"],
    "budget_signals": {
      "budget_text": "",
      "budget_level": "unknown"
    },
    "time_signals": {
      "timeline_text": "",
      "timeline_pressure": "medium"
    },
    "risk_signals": ["多系统对接"],
    "capability_signals": ["物联网平台", "可视化平台"],
    "provider_meta": {
      "provider": "mock",
      "model": "mock-v1"
    }
  },
  "warnings": []
}
```

### Recommend Request

```json
{
  "snapshot": {
    "basic_info": {
      "title": "智慧工厂数字孪生平台建设项目"
    },
    "tags": ["数字孪生", "智慧工厂"],
    "industry_signals": ["工业"],
    "technology_signals": ["三维可视化"]
  },
  "options": {
    "top_k_projects": 5,
    "top_k_contracts": 5
  }
}
```

### Recommend Response

```json
{
  "schema_version": "v1",
  "fit_score": 78,
  "fit_level": "highly_recommended",
  "sub_scores": {
    "industry_match_score": 18,
    "capability_match_score": 22,
    "project_shape_score": 12,
    "historical_similarity_score": 16,
    "contract_hit_score": 8,
    "risk_penalty": -4,
    "timeline_penalty": -2
  },
  "matched_projects": [],
  "matched_contracts": [],
  "reasons": [],
  "warnings": []
}
```

### Analyze-and-Recommend Response

```json
{
  "schema_version": "v1",
  "snapshot": {},
  "fit_score": 78,
  "fit_level": "highly_recommended",
  "sub_scores": {},
  "matched_projects": [],
  "matched_contracts": [],
  "reasons": [],
  "warnings": []
}
```

## Implementation Plan

### Tasks

- [ ] Task 1: 创建 Python 服务基础目录与运行配置
  - File: `services/opportunity_intelligence/pyproject.toml`
  - Action: 新建 Python 项目配置，声明 `fastapi`、`uvicorn`、`pydantic`、`httpx`、`pytest` 等依赖。
  - Notes: 使用最小依赖集，不提前引入向量库和复杂模型框架。

- [ ] Task 2: 新建 Python 服务说明与环境模板
  - File: `services/opportunity_intelligence/README.md`
  - Action: 写明安装、启动、测试、端口和本地联调方式。
  - Notes: 必须给出可直接运行的命令，避免 spec 仍然缺少启动编排。

- [ ] Task 3: 新建 Python 环境变量模板
  - File: `services/opportunity_intelligence/.env.example`
  - Action: 定义 `PORT`、`PPA_DB_PATH`、`CONTRACTS_DIR`、`PROVIDER_TYPE`、`PROVIDER_TIMEOUT_MS` 等变量。
  - Notes: 与 `README.md` 保持一致。

- [ ] Task 4: 创建 Python 服务入口与应用装配
  - File: `services/opportunity_intelligence/app/main.py`
  - Action: 创建 FastAPI 应用入口，注册 `GET /health` 和 API v1 路由。
  - Notes: 保持 `create_app()` 模式，便于测试。

- [ ] Task 5: 定义配置与环境变量读取
  - File: `services/opportunity_intelligence/app/core/config.py`
  - Action: 使用 Pydantic Settings 定义服务配置，包括 Node DB 路径、contracts 目录、provider 类型、超时等。
  - Notes: 默认读取当前仓库的 `server/ppa.db` 与 `server/contracts/`。

- [ ] Task 6: 定义 MVP 输入输出 schema
  - File: `services/opportunity_intelligence/app/schemas/opportunity.py`
  - Action: 定义 `DocumentInputEnvelope`、`OpportunitySnapshot`、`RecommendRequest`、`RecommendResponse`、`AnalyzeAndRecommendResponse` 等模型。
  - Notes: 字段必须严格对齐本 spec 的 API Contracts，禁止自由扩展隐式字段。

- [ ] Task 7: 实现 provider 抽象层
  - File: `services/opportunity_intelligence/app/providers/base.py`
  - Action: 定义文档理解 provider 接口，包括 `analyze_document(envelope)`。
  - Notes: 抽象必须接受统一 envelope，而不是裸文本。

- [ ] Task 8: 实现 mock provider
  - File: `services/opportunity_intelligence/app/providers/mock_provider.py`
  - Action: 根据输入文本生成稳定的假结构化结果，用于开发和测试。
  - Notes: 结果必须可预测，避免测试依赖外部模型。

- [ ] Task 9: 实现 provider 工厂
  - File: `services/opportunity_intelligence/app/providers/factory.py`
  - Action: 根据配置返回 mock provider 或 HTTP provider。
  - Notes: MVP 先落 mock，HTTP provider 只做骨架。

- [ ] Task 10: 实现外发脱敏与裁剪服务
  - File: `services/opportunity_intelligence/app/services/privacy_service.py`
  - Action: 实现内部证据摘要卡片生成、敏感字段剔除和 provider 输入裁剪逻辑。
  - Notes: 所有真实 provider 请求都必须先经过该服务。

- [ ] Task 11: 实现机会标准化服务
  - File: `services/opportunity_intelligence/app/services/analyze_service.py`
  - Action: 将原始机会输入和 provider 输出合并成统一 `opportunity_snapshot`。
  - Notes: 需包含基本信息、标签、风险信号、能力信号、预算/时间线索。

- [ ] Task 12: 实现历史项目读取仓储
  - File: `services/opportunity_intelligence/app/repositories/project_repository.py`
  - Action: 从 `server/ppa.db` 读取标准项目的 `name / description / tags_json / assessment_details_json / final_*` 等字段。
  - Notes: 必须使用只读连接；对历史 JSON 解析失败要做兜底。

- [ ] Task 13: 实现历史特征回填器
  - File: `services/opportunity_intelligence/app/services/historical_feature_extractor.py`
  - Action: 当 `tags_json` 不足时，从 `assessment_details_json` 提取最小可检索特征。
  - Notes: 这是 MVP 必须项，不允许把无标签项目全部丢弃。

- [ ] Task 14: 实现业绩库读取仓储
  - File: `services/opportunity_intelligence/app/repositories/contracts_repository.py`
  - Action: 读取 `server/contracts/*.csv`，实现与 Node `contractsService` 行为一致的 header 识别、动态列保留和搜索文本构造。
  - Notes: 必须配合 parity fixture 测试，确保与 Node 侧行为一致。

- [ ] Task 15: 实现内部匹配服务
  - File: `services/opportunity_intelligence/app/services/retrieval_service.py`
  - Action: 基于标签、关键词、项目名称、技术词等对历史项目与合同条目做基础匹配，返回 Top N 候选。
  - Notes: MVP 为关键词/标签匹配，不做 embedding；无候选时返回空数组与 warning。

- [ ] Task 16: 定义评分常量
  - File: `services/opportunity_intelligence/app/core/scoring_constants.py`
  - Action: 定义固定权重、惩罚上限和等级阈值。
  - Notes: 评分常量必须集中管理。

- [ ] Task 17: 实现规则评分器 v1
  - File: `services/opportunity_intelligence/app/services/scoring_service.py`
  - Action: 根据固定常量计算 `fit_score`、`fit_level` 与 `sub_scores`。
  - Notes: 分数必须 clamp 到 `0-100`。

- [ ] Task 18: 实现解释服务
  - File: `services/opportunity_intelligence/app/services/explanation_service.py`
  - Action: 将评分依据与命中证据整理为结构化 `reasons` 与 `warnings`。
  - Notes: 解释必须可被 PPA 前端直接展示。

- [ ] Task 19: 实现 Python API 路由
  - File: `services/opportunity_intelligence/app/api/routes.py`
  - Action: 提供 `POST /api/v1/analyze`、`POST /api/v1/recommend`、`POST /api/v1/analyze-and-recommend`。
  - Notes: `analyze-and-recommend` 负责串联 analyze -> retrieval -> scoring -> explanation。

- [ ] Task 20: 新增 Node 侧配置文件
  - File: `server/config/opportunityIntelligence.js`
  - Action: 统一读取 `OPPORTUNITY_INTELLIGENCE_BASE_URL`、超时等配置并导出。
  - Notes: 禁止散落在 controller 或 `server/index.js`。

- [ ] Task 21: 新增 Node 侧客户端服务
  - File: `server/services/opportunityIntelligenceClient.js`
  - Action: 使用 Node 内置 `fetch` 或轻量 HTTP 调用 Python 服务，并统一处理超时和错误包装。
  - Notes: 返回值遵循现有 `{ success, data, error }` 风格。

- [ ] Task 22: 新增 Node 控制器
  - File: `server/controllers/opportunityIntelligenceController.js`
  - Action: 新建 controller，转发前端请求到 Python 服务。
  - Notes: 记录 route、耗时、状态码与失败原因。

- [ ] Task 23: 新增 Node 路由
  - File: `server/routes/opportunityIntelligence.js`
  - Action: 暴露三条网关接口：
    - `POST /api/opportunity-intelligence/analyze`
    - `POST /api/opportunity-intelligence/recommend`
    - `POST /api/opportunity-intelligence/analyze-and-recommend`
  - Notes: 参数校验先做最小必填校验。

- [ ] Task 24: 挂载 Node 路由
  - File: `server/routes/index.js`
  - Action: 注册 `opportunityIntelligence` 路由。
  - Notes: 保持与现有 `/api/opportunity` 并行，不覆盖招标网站模块。

- [ ] Task 25: 增加 Python 侧测试
  - File: `services/opportunity_intelligence/tests/test_api.py`
  - Action: 使用 `pytest + TestClient` 覆盖 health、analyze、recommend、analyze-and-recommend。
  - Notes: provider 采用 mock，测试必须稳定。

- [ ] Task 26: 增加 Python 侧仓储与 parity 测试
  - File: `services/opportunity_intelligence/tests/test_repositories.py`
  - Action: 使用临时 SQLite 和 CSV fixture 覆盖项目读取、特征回填、CSV 行为一致性。
  - Notes: 必须覆盖空库、坏 JSON、空 CSV、异常 header 等边界。

- [ ] Task 27: 增加 Node 侧集成测试
  - File: `server/tests/opportunityIntelligenceAPI.test.js`
  - Action: 模拟 Python 服务返回，验证 Node 网关接口的成功、失败、超时和参数错误路径。
  - Notes: 测试风格对齐现有 `contractsAPI.test.js`。

- [ ] Task 28: 增加 Node-Python contract fixture
  - File: `docs/opportunity-intelligence/fixtures/opportunity-intelligence-contract-v1.json`
  - Action: 固化一份 analyze 和 recommend 的样例响应，用作两端 contract fixture。
  - Notes: Python 与 Node 测试都要引用这份 fixture，避免接口漂移。

### Acceptance Criteria

- [ ] AC 1: Given Python 服务已启动, when 请求 `GET /health`, then 服务返回 200 且包含可识别的健康状态字段。

- [ ] AC 2: Given 输入包含招标标题、正文和来源信息, when 请求 `POST /api/v1/analyze`, then 服务返回结构合法的 `opportunity_snapshot`。

- [ ] AC 3: Given provider 配置为 mock, when 调用 analyze 接口, then 输出结果稳定可预测且不依赖外部模型网络请求。

- [ ] AC 4: Given 历史项目库中存在无 `tags_json` 但有 `assessment_details_json` 的标准项目, when 调用 recommend 或 analyze-and-recommend, then 系统仍能通过 fallback 特征生成候选列表。

- [ ] AC 5: Given `server/contracts/` 下存在 CSV 文件, when 调用 recommend 或 analyze-and-recommend, then 结果中包含合同/业绩候选列表或明确的空列表。

- [ ] AC 6: Given 输入机会具有明显的行业词、技术词和时间压力信号, when 调用评分接口, then 返回 `fit_score`、`fit_level`、`reasons` 和 `warnings`。

- [ ] AC 7: Given 推荐输入缺少必填字段, when 调用 Python 服务接口, then 返回 4xx 和结构化错误信息。

- [ ] AC 8: Given Node 网关已配置 Python 服务地址, when 调用 `/api/opportunity-intelligence/analyze`, then Node 后端成功转发并保持 `{ success, data }` 响应结构。

- [ ] AC 9: Given Python 服务不可用或超时, when 调用 Node 网关接口, then 返回失败响应且包含可追踪错误信息，不导致 Express 进程崩溃。

- [ ] AC 10: Given `POST /api/opportunity-intelligence/analyze-and-recommend` 输入有效, when 请求完成, then 返回中同时包含 `snapshot`、`matched_projects`、`matched_contracts`、`fit_score`、`fit_level`、`reasons`。

- [ ] AC 11: Given provider 返回不完整或不合法结构, when 调用 analyze 接口, then 服务返回结构化错误或 warning，而不是未处理异常。

- [ ] AC 12: Given `server/contracts/` 为空目录或存在坏文件, when 调用 recommend, then 服务返回空候选与 warning，不中断主流程。

- [ ] AC 13: Given 真实 provider 模式开启, when 发送内部历史证据给 provider, then 请求体中不包含完整 `assessment_details_json` 或完整合同原始行。

- [ ] AC 14: Given Python 侧测试执行, when 运行测试命令, then health、analyze、recommend 三类主流程测试通过。

- [ ] AC 15: Given Node 侧集成测试执行, when 运行 `npm test` 中新增用例, then 网关成功路径、失败路径和超时路径均被覆盖。

- [ ] AC 16: Given Node 与 Python 都引用 contract fixture, when 任一侧接口 shape 发生变化, then 测试失败并暴露 contract drift。

## Additional Context

### Dependencies

- Python 依赖：
  - `fastapi`
  - `uvicorn`
  - `pydantic`
  - `pydantic-settings`
  - `httpx`
  - `pytest`
  - `pytest-asyncio` 或 `anyio`

- Node 依赖：
  - 现有 `express`
  - 现有 `jest`
  - 现有 `supertest`
  - 如需 HTTP client，可优先使用 Node 18+ 原生 `fetch`

- 数据依赖：
  - `server/ppa.db`
  - `server/contracts/*.csv`

### Testing Strategy

1. Python 服务
   - 单测 schema 校验
   - API 测试覆盖 health / analyze / recommend / analyze-and-recommend
   - 仓储层使用临时 SQLite 和临时 CSV fixture

2. Node 网关
   - 使用 Jest mock 掉 Python HTTP 调用
   - 覆盖 200、400、502/504 等路径

3. 手工验证
   - 本地启动 Python 服务
   - 本地启动 Node 服务
   - 用真实样例招标数据打一次 analyze-and-recommend
   - 验证输出字段是否满足 PPA 后续展示需要
   - 验证 Python 在 `server/ppa.db` 被 Node 占用时仍能完成只读查询

### Local Run Commands

- Python 服务：
  - `cd services/opportunity_intelligence && python -m uvicorn app.main:create_app --factory --reload --port 8010`
- Node 服务：
  - `cd server && OPPORTUNITY_INTELLIGENCE_BASE_URL=http://127.0.0.1:8010 node index.js`

### Notes

1. 这是一个 **MVP 服务骨架 quick spec**，目标是先建立稳定的输入输出和集成边界，不追求第一版模型能力最强。
2. MVP 阶段刻意不引入向量库，是为了降低复杂度并保证结构化主链先成立。
3. 若后续验证通过，再在 Python 服务内引入：
   - embedding
   - reranker
   - provider 真正接 Gemini / Claude / OpenAI
4. 当前仓库没有 Python 服务历史包袱，属于“确认 clean slate”，可以直接按本文档目录结构新建。
