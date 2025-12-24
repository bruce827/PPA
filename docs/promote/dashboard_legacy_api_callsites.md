# Dashboard 旧接口调用点清单（用于后续删除）

> 目的：梳理当前代码库中仍在使用的 **Legacy Dashboard** 接口调用点，方便你在前端切换完成后，按 PRD Step 1.6 Phase C 批量删除旧接口及其相关代码/文档。

## 1. 旧接口列表（Legacy Endpoints）

- `GET /api/dashboard/summary`
- `GET /api/dashboard/risk-distribution`
- `GET /api/dashboard/cost-composition`
- `GET /api/dashboard/role-cost-distribution`
- `GET /api/dashboard/cost-trend`
- `GET /api/dashboard/risk-cost-correlation`

## 2. 前端调用点（需要优先替换）

### 2.1 前端 Service 封装

文件：`frontend/ppa_frontend/src/services/dashboard/index.ts`

- `getDashboardSummary()`
  - **调用**：`/api/dashboard/summary`
  - **位置**：第 5-11 行
- `getRiskDistribution()`
  - **调用**：`/api/dashboard/risk-distribution`
  - **位置**：第 13-22 行
- `getCostComposition()`
  - **调用**：`/api/dashboard/cost-composition`
  - **位置**：第 24-30 行
- `getRoleCostDistribution()`
  - **调用**：`/api/dashboard/role-cost-distribution`
  - **位置**：第 32-43 行
- `getCostTrend()`
  - **调用**：`/api/dashboard/cost-trend`
  - **位置**：第 45-51 行
- `getRiskCostCorrelation()`
  - **调用**：`/api/dashboard/risk-cost-correlation`
  - **位置**：第 53-62 行

### 2.2 前端页面

文件：`frontend/ppa_frontend/src/pages/Dashboard.tsx`

- **imports**：第 1-8 行从 `@/services/dashboard` 引入旧接口封装
- **Promise.all 调用旧接口**：第 40-54 行
  - `getDashboardSummary()`
  - `getRiskDistribution()`
  - `getCostComposition()`
  - `getRoleCostDistribution()`
  - `getCostTrend()`
  - `getRiskCostCorrelation()`

> 说明：该页面是旧版 Dashboard 页面实现，后续若采用新 Dashboard 设计，应整体替换为新接口：
>
> - `/api/dashboard/overview`
> - `/api/dashboard/trend`
> - `/api/dashboard/cost-range`
> - `/api/dashboard/keywords`
> - `/api/dashboard/dna`
> - `/api/dashboard/top-roles`
> - `/api/dashboard/top-risks`

## 3. 后端路由（Legacy 仍保留但已 Deprecated）

文件：`server/routes/dashboard.js`

- 旧路由仍存在（Legacy 区块），并已添加 `Deprecated` 注释，待前端切换完成后删除。

## 4. 测试与脚本调用点

### 4.1 Jest 集成测试

文件：`server/tests/dashboardAPI.test.js`

- 仍包含旧接口的测试用例：
  - `GET /api/dashboard/summary`
  - `GET /api/dashboard/risk-distribution`
  - `GET /api/dashboard/cost-composition`
  - `GET /api/dashboard/role-cost-distribution`
  - `GET /api/dashboard/cost-trend`
  - `GET /api/dashboard/risk-cost-correlation`

> 建议：当你进入 Phase C 删除旧接口时，同步删除/调整这些旧接口测试用例。

### 4.2 API Smoke Runner

文件：`server/tests/api-smoke-runner.js`

- 旧接口调用（约第 626-672 行）：
  - `Dashboard Summary` → `/api/dashboard/summary`
  - `Dashboard Risk Distribution` → `/api/dashboard/risk-distribution`
  - `Dashboard Cost Composition` → `/api/dashboard/cost-composition`
  - `Dashboard Role Cost Distribution` → `/api/dashboard/role-cost-distribution`
  - `Dashboard Cost Trend` → `/api/dashboard/cost-trend`
  - `Dashboard Risk-Cost Correlation` → `/api/dashboard/risk-cost-correlation`

> 建议：当新 Dashboard 前端完成切换后，可在 smoke runner 中新增/替换为新接口的检查项。

## 5. 文档中的旧接口引用（建议更新/标注过期）

### 5.1 后端 README

文件：`server/README.md`

- Dashboard API 总览表仍列出了旧接口（约第 249-254 行）：
  - `/api/dashboard/summary`
  - `/api/dashboard/risk-distribution`
  - `/api/dashboard/cost-composition`
  - `/api/dashboard/role-cost-distribution`
  - `/api/dashboard/cost-trend`
  - `/api/dashboard/risk-cost-correlation`

### 5.2 IFLOW 说明

文件：`IFLOW.md`

- 旧接口引用：
  - `GET /api/dashboard/summary`（约第 244 行）
  - `GET /api/dashboard/risk-distribution`（约第 246 行）
- 额外注意：文档中出现 `GET /api/dashboard/cost-breakdown`（约第 245 行），该路径当前并非后端路由（可能为历史命名或文档未更新）。

### 5.3 bugfix 文档

文件：`docs/bugfix/BACKEND-BUGFIX-CONSOLIDATED.md`

- 旧接口示例/排障命令引用：
  - `/api/dashboard/role-cost-distribution`（约第 664、816 行）

## 6. 删除建议顺序（Phase C 执行时）

1. 前端切换到新接口（确保 Dashboard 页面不再调用旧 service）。
2. 更新/移除 `frontend/ppa_frontend/src/services/dashboard/index.ts` 中旧接口封装。
3. 更新/移除旧 `Dashboard.tsx` 页面或将其迁移为新 Dashboard 页面。
4. 删除后端 Legacy 路由与 Controller/Service/Model 旧方法。
5. 删除/更新：
   - `server/tests/dashboardAPI.test.js` 中旧接口测试
   - `server/tests/api-smoke-runner.js` 中旧接口检查
   - `server/README.md`、`IFLOW.md`、`docs/bugfix/*` 中旧接口引用
