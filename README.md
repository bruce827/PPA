# PPA V2 - Project Portfolio Assessment

PPA（Project Portfolio Assessment，软件项目评估系统）最初用于替代 Excel 评估表，完成软件项目的风险、工作量、成本与报价评估。当前项目已进入 **V2**：在保留 V1 单项目评估能力的基础上，正在向云端数据底座、机会情报、多人评估和 SaaS 平台化方向演进。

## 当前定位

- **V1 基础能力**：标准项目评估、Web3D 项目评估、AI 辅助风险/模块/工作量分析、PDF/Excel 导出、Dashboard 可视化。
- **V2 当前重点**：SQLite 到 Supabase PostgreSQL 的数据底座迁移、项目附件与静态文件治理、公开机会/招标数据处理、性能与回归测试体系建设。
- **V2 后续方向**：公开项目池、多人参与评估、群体判断聚合、奖励机制、付费报告和运营后台。

V2 产品规划主入口见 [docs/prd2.0/prd.md](docs/prd2.0/prd.md)。

## 核心能力

- **标准项目评估**：分步录入项目基础信息、风险评分、角色工作量、差旅/运维/风险成本，并通过统一计算引擎生成报价。
- **Web3D 专项评估**：独立的 Web3D 风险项、工作量模板、项目创建、详情和历史记录流程。
- **AI 辅助评估**：支持风险自动评估、风险名称归一、模块拆解、工作量建议、项目标签生成与提示词模板管理。
- **模型与 Prompt 管理**：通过配置页面维护 AI 模型、视觉模型、提示词模板、模块标签和 Web3D 场景提示词。
- **机会情报与招标数据**：支持招标网站配置、候选项目暂存、字段解析、去重、联网搜索、推送记录和数据质量验证。
- **Dashboard 与监控**：展示项目数量、成本区间、趋势、关键词、DNA 雷达、Top 角色、Top 风险、AI 调用日志与统计。
- **导出与文档资产**：支持 PDF、内部版/外部版 Excel 导出；支持合同 CSV 检索、Wiki 关系和表单设计相关能力。
- **测试与性能治理**：新增项目级 `tests/` 测试工作区，用于集中存放测试计划、脚本、报告和测试产物。

## 技术栈

### 前端

- UmiJS Max 4 + React 18 + TypeScript
- Ant Design 5 + ProComponents
- @ant-design/charts
- Yarn 作为前端包管理器
- Playwright 用于 E2E/Smoke 测试

### 后端

- Node.js + Express 5
- SQLite3 本地兼容模式
- PostgreSQL/Supabase V2 数据底座模式
- Jest + Supertest
- PDFKit、ExcelJS
- OpenAPI 3.0 代码派生 API 契约（zod → openapi）
- OpenAI / Doubao 等 AI Provider 统一封装

## 快速启动

### 后端

```bash
cd server
npm install

# SQLite 本地模式首次初始化
node init-db.js
cd seed-data
node seed-all.js
cd ..

# 启动后端，默认 http://localhost:3001
node index.js
```

如果使用 V2 PostgreSQL/Supabase 模式，请先配置 `server/.env`：

```bash
DB_TYPE=postgres
DATABASE_URL=postgresql://...
PORT=3001
```

SQLite 本地模式可使用：

```bash
DB_TYPE=sqlite
```

### 前端

```bash
cd frontend/ppa_frontend
yarn install
yarn dev
```

默认前端地址为 `http://localhost:8000`，API 代理到后端 `http://localhost:3001`。

## 测试目录说明

项目现在新增根目录 [tests/](tests)，作为 **项目级测试工作区**。以后新的测试专题应优先在这里建立独立目录，把测试计划、复测脚本、测试报告和测试产物集中归档。

目录约定：

- `tests/<topic>/plan.md`：测试计划或修复计划。
- `tests/<topic>/scripts/`：可重复执行的测试、验证或采样脚本。
- `tests/<topic>/reports/`：人工可读的测试报告、基线报告和复测结论。
- `tests/<topic>/artifacts/`：机器生成的 JSON、原始采样结果或较大的测试产物。

当前已有专题：

- [tests/postgresql-query-performance/](tests/postgresql-query-performance)：PostgreSQL 慢接口优化测试包，包含计划、索引脚本入口、只读性能采样脚本、基线报告和本次修复测试报告。

`tests/` 不替代框架自身的测试目录：

- `server/tests/`：后端 Jest/Supertest 自动化测试源码仍放在这里，避免破坏 Jest 的现有发现规则。
- `frontend/ppa_frontend/tests/`：前端 Playwright/E2E 测试目录。
- `_bmad-output/test-artifacts/`：历史或自动化运行生成的测试产物目录。
- `docs/test/`、`docs/testing/`：测试过程文档和测试策略文档。

常用测试命令：

```bash
# 后端全部 Jest 测试
cd server
npm test

# PostgreSQL 慢接口优化聚焦验证
tests/postgresql-query-performance/scripts/run-focused-verification.sh

# Dashboard 只读性能采样
node tests/postgresql-query-performance/scripts/run-dashboard-readonly-sampling.js

# 前端 smoke E2E
cd frontend/ppa_frontend
yarn test:e2e:smoke
```

注意：完整 PostgreSQL regression 可能会写入和清理测试数据；如果只有一个真实业务库，不要直接在该库执行完整回归。

## 项目结构

```text
PPA/
├── frontend/
│   ├── ppa_frontend/              # V1/V2 Web 前端，UmiJS Max + React + Ant Design
│   └── ppa_miniapp/               # 小程序相关前端目录
├── server/                        # 后端 API、服务、模型、迁移、OpenAPI 契约、测试
│   ├── controllers/               # HTTP Controller
│   ├── routes/                    # API 路由：projects/config/dashboard/web3d/opportunity 等
│   ├── services/                  # 业务服务、AI 服务、导出、监控、schema warmup
│   ├── models/                    # 数据访问层，兼容 SQLite/PostgreSQL
│   ├── migrations/                # 数据库迁移
│   ├── scripts/                   # 迁移、文档、API 契约构建、数据处理脚本
│   ├── tests/                     # 后端 Jest/Supertest 测试
│   ├── openapi/                   # 代码派生 OpenAPI 契约（registry + paths）
│   ├── logs/                      # AI/导出/运行日志，默认不应提交
│   └── uploads/                   # 本地上传文件，V2 逐步迁移到云端 Storage
├── tests/                         # 项目级测试工作区：计划、脚本、报告、产物
├── docs/                          # 产品、PRD、数据库、API、测试、Bugfix 文档
│   ├── prd/                       # V1 历史需求与功能说明
│   ├── prd2.0/                    # V2 主 PRD、商业模式、奖励、融资叙事等
│   ├── prd3.0/                    # 后续版本规划
│   ├── database/                  # PostgreSQL/Supabase/静态文件治理文档
│   ├── api/                       # API 盘点与文档
│   ├── bugfix/                    # 缺陷与修复记录
│   ├── test/                      # 测试过程文档
│   └── testing/                   # 测试策略和相关说明
├── _bmad/                         # BMad 配置、流程和 Agent 工作流
├── _bmad-output/                  # BMad 生成的计划、实施、测试产物
├── design-artifacts/              # WDS/设计流程产物
├── spider/                        # 爬虫、招标数据抓取和报告相关脚本
├── scripts/                       # 项目级工具脚本
├── data/                          # 表单、静态数据等辅助数据
└── output/                        # 本地输出产物
```

## 文档导航

- V2 主 PRD：[docs/prd2.0/prd.md](docs/prd2.0/prd.md)
- V2 文档目录：[docs/prd2.0/README.md](docs/prd2.0/README.md)
- V1/历史需求：[docs/prd/](docs/prd)
- 数据库与存储迁移：[docs/database/](docs/database)
- PostgreSQL 慢接口优化计划：[docs/postgresql-query-performance-optimization-plan.md](docs/postgresql-query-performance-optimization-plan.md)
- 测试工作区说明：[tests/README.md](tests/README.md)
- 后端说明：[server/README.md](server/README.md)
- API 文档：启动后端后访问 `http://localhost:3001/api-docs`（Swagger UI）或 `http://localhost:3001/api-docs.json`（OpenAPI JSON）
- 开发/Agent 指南：[AGENTS.md](AGENTS.md)、[WARP.md](WARP.md)、[GEMINI.md](GEMINI.md)、[IFLOW.md](IFLOW.md)

## AI 日志与调试

后端会在调用 AI 模型时记录完整请求、响应和解析结果，便于回放、对比和排障。

- 默认目录：`server/logs/ai/{step}/YYYY-MM-DD/{HHmmss}_{requestHash}/`
- 常见文件：`index.json`、`request.json`、`response.raw.txt`、`response.parsed.json`、`notes.log`
- 成功写入后控制台会打印：`[AI File Logger] saved to: ...`

可选环境变量：

```bash
AI_LOG_ENABLED=true
AI_LOG_DIR=/absolute/path/to/logs
EXPORT_LOG_ENABLED=true
EXPORT_LOG_DIR=/absolute/path/to/export/logs
```

## 版本里程碑

- ✅ V1：标准项目评估、配置、计算、模板、导出、AI 辅助、Dashboard。
- ✅ V1.x：Web3D 评估、AI 模型/Prompt 管理、监控日志、导出增强。
- 🚧 V2 方向一：Supabase PostgreSQL 数据底座、文件治理、性能优化、回归测试体系。
- 🧭 V2 方向二：公开项目池、多人评估、聚合判断、奖励机制、付费报告和运营后台。
