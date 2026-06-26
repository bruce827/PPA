# PostgreSQL Regression Tests

本目录是 V2.0 PostgreSQL/Supabase 迁移后的接口回归测试入口。目标是覆盖项目内部 API，不再测试 SQLite 连接，不直接调用外部 AI 或外部网站。

## 范围

- 强制 `DB_TYPE=postgres`，缺少 `DATABASE_URL` 时快速失败。
- 覆盖 Express 已注册的内部数据库接口：配置、AI 模型配置 CRUD、提示词模板、项目/模板、附件、推送、导出、Dashboard、Web3D、表单设计、数据指标、Opportunity 基础 CRUD、Monitoring、Contracts、Wiki。
- 跳过外部调用接口：AI 评估/模型连接测试、Web3D 视觉分析、招标网站在线校验。
- 使用 `endpointCatalog.js` 明确记录每个 endpoint 的 included/skipped 状态、优先级和跳过原因。

## 并发策略

Supabase 免费方案连接数有限，因此采用文件级并行、文件内顺序执行：

- 默认 `PPA_REGRESSION_WORKERS=2`
- 默认 `PG_POOL_MAX=2`
- 每个测试文件使用唯一前缀创建数据
- 测试结束显式删除创建的记录
- 不使用单个长事务包住整批测试，避免 PostgreSQL 事务失败后连锁污染后续请求

## 运行

从项目根目录加载本地 `server/.env` 后运行：

```bash
set -a; . server/.env; set +a; PPA_REGRESSION_WORKERS=1 server/tests/postgresql-regression/run.sh
```

或显式传入 PostgreSQL 连接配置：

```bash
DB_TYPE=postgres \
DATABASE_URL="postgresql://..." \
PGSSLMODE=require \
server/tests/postgresql-regression/run.sh
```

也可以从 `server/` 目录直接运行 Jest：

```bash
cd server
DB_TYPE=postgres DATABASE_URL="postgresql://..." PGSSLMODE=require \
npx jest tests/postgresql-regression --watchman=false --maxWorkers=2
```

最近一次本地全量结果（2026-06-25）：

- 命令：`set -a; . server/.env; set +a; PPA_REGRESSION_WORKERS=1 server/tests/postgresql-regression/run.sh`
- 结果：6 个测试套件通过，23 个测试通过，用时约 285 秒。

## 性能报告

回归运行会自动采集每次 Supertest 请求的接口耗时，输出到：

- `_bmad-output/test-artifacts/postgresql-regression-performance/{runId}/summary.md`
- `_bmad-output/test-artifacts/postgresql-regression-performance/{runId}/summary.json`

默认 `runId` 是 `local`。需要保留多次运行结果时，可在命令前设置：

```bash
PPA_REGRESSION_RUN_ID=20260625-baseline \
set -a; . server/.env; set +a; PPA_REGRESSION_WORKERS=1 server/tests/postgresql-regression/run.sh
```

报告包含按 `method + route` 聚合的 `count/min/avg/p50/p95/max`，以及最慢 30 次单请求明细。

## 文件说明

- `endpointCatalog.js`：接口覆盖账本。
- `catalog.test.js`：校验覆盖账本本身，防止 endpoint 没有明确状态。
- `helpers.js`：PostgreSQL-only 初始化、Supertest agent、唯一前缀、显式清理。
- `config-core.test.js`：健康检查与核心配置。
- `ai-config-prompts.test.js`：AI 模型配置与提示词模板的数据库接口，不调用模型。
- `projects-dashboard.test.js`：项目、模板、商务报价、附件、推送、导出、Dashboard。
- `web3d-form-data.test.js`：Web3D、表单设计、数据指标。
- `opportunity-auxiliary.test.js`：Opportunity 基础 CRUD、Monitoring、Contracts、Wiki。

## 维护规则

新增后端路由时，先更新 `endpointCatalog.js`，再选择：

- `included`：补充到相应 spec，或说明已被现有 spec 覆盖。
- `skipped`：必须写 `reason`，只允许外部调用、专项文件/网络依赖或确有前置数据复杂度的接口。

不要在这些测试里初始化 SQLite 或创建临时 SQLite 数据库。

## 已修复的回归覆盖点

- `/api/health` 使用统一数据库适配器检查当前配置的数据库连接；`DB_TYPE=postgres` 时断言返回 PostgreSQL 状态。
- `server/routes/dataMetrics.js` 的静态路径注册在指标 `/:id` 动态路由之前，避免 `/export`、`/batch`、`/import`、`/categories/tree` 被错误捕获。
