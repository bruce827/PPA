# Server API Reference (Smoke Tested)

- **服务基准地址**：`http://localhost:3001`
- **统一前缀**：所有接口均通过 `server/routes/index.js` 挂载在 `/api` 或 `/api/<module>` 下。
- **认证**：当前版本无认证拦截。
- **响应格式**：除导出接口外，均返回 JSON；导出接口返回二进制文件流。

| 模块 | 基础路径 / 关键接口 | 关键能力概要 |
| --- | --- | --- |
| 健康检查 | `GET /api/health` | 数据库连通性与服务存活检查 |
| 角色配置 | `/api/config/roles` (GET/POST/PUT/DELETE) | 角色单价 CRUD，供成本计算引用 |
| 风险评估项 | `/api/config/risk-items` (GET/POST/PUT/DELETE) | 风险打分项配置，支持 JSON 选项维护 |
| 差旅成本 | `/api/config/travel-costs` (GET/POST/PUT/DELETE) | 差旅费用参数维护，参与成本模型 |
| 聚合配置 | `GET /api/config/all` | 一次性获取角色、风险项、差旅成本合集 |
| AI 模型配置 | `/api/config/ai-models` + 子接口 | 模型 CRUD、当前模型切换、连通性测试（含 `test` 与 `test-temp`） |
| 提示词模板 | `/api/config/prompts` + 子接口 | 提示词模板分页查询、复制、状态维护 |
| 实时计算 | `POST /api/calculate` | 根据评估数据返回成本与风险计算结果 |
| 项目管理 | `/api/projects` + 子接口 | 项目/模板 CRUD、成本持久化、PDF/Excel 导出 |
| 模板别名 | `/api/templates` | 与项目路由共用，实现模板接口兼容 |
| 仪表盘 | `/api/dashboard/*` | 提供 summary、risk-distribution 等分析数据接口 |

## 健康检查

| Method | Path | 描述 | 请求体 | 响应示例 |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | 检测服务与数据库状态 | - | `{ "status": "ok", "message": "Backend is healthy and connected to database" }` |

## 配置管理

### 角色配置

| Method | Path | 描述 | 请求体关键字段 | 响应结构 |
| --- | --- | --- | --- | --- |
| GET | `/api/config/roles` | 获取角色列表 | - | `{ "data": Role[] }` |
| POST | `/api/config/roles` | 新建角色 | `{ "role_name": string, "unit_price": number }` | `{ "id": number }` |
| PUT | `/api/config/roles/:id` | 更新角色 | 同 POST | `{ "updated": number }` |
| DELETE | `/api/config/roles/:id` | 删除角色 | - | `{ "deleted": number }` |

### 风险评估项

| Method | Path | 描述 | 请求体关键字段 | 响应结构 |
| --- | --- | --- | --- | --- |
| GET | `/api/config/risk-items` | 获取风险项列表 | - | `{ "data": RiskItem[] }` |
| POST | `/api/config/risk-items` | 新建风险项 | `{ "category": string, "item_name": string, "options_json": string(JSON) }` | `{ "id": number }` |
| PUT | `/api/config/risk-items/:id` | 更新风险项 | 同 POST | `{ "updated": number }` |
| DELETE | `/api/config/risk-items/:id` | 删除风险项 | - | `{ "deleted": number }` |

### 差旅成本

| Method | Path | 描述 | 请求体关键字段 | 响应结构 |
| --- | --- | --- | --- | --- |
| GET | `/api/config/travel-costs` | 获取差旅成本列表 | - | `{ "data": TravelCost[] }` |
| POST | `/api/config/travel-costs` | 新建差旅成本 | `{ "item_name": string, "cost_per_month": number }` | `{ "id": number }` |
| PUT | `/api/config/travel-costs/:id` | 更新差旅成本 | 同 POST | `{ "updated": number }` |
| DELETE | `/api/config/travel-costs/:id` | 删除差旅成本 | - | `{ "deleted": number }` |

### 聚合配置

| Method | Path | 描述 | 响应结构 |
| --- | --- | --- | --- |
| GET | `/api/config/all` | 获取角色、风险项、差旅成本聚合数据 | `{ "data": { roles: Role[], risk_items: RiskItem[], travel_costs: TravelCost[] } }` |

### AI 模型配置

| Method | Path | 描述 | 请求体关键字段 | 响应结构 |
| --- | --- | --- | --- | --- |
| GET | `/api/config/ai-models` | 列出全部模型 | - | `{ "success": true, "data": AIModle[] }` |
| GET | `/api/config/ai-models/current` | 获取当前模型 | - | `{ "success": true, "data": AIModel }` |
| GET | `/api/config/ai-models/:id` | 获取模型详情 | - | `{ "success": true, "data": AIModel }` |
| POST | `/api/config/ai-models` | 创建模型 | `config_name, provider, api_key, api_host, model_name`(+可选字段) | `{ "success": true, "data": AIModel }` |
| PUT | `/api/config/ai-models/:id` | 更新模型 | 同 POST | `{ "success": true, "data": AIModel }` |
| DELETE | `/api/config/ai-models/:id` | 删除模型 | - | `{ "success": true, "message": string }` |
| POST | `/api/config/ai-models/:id/set-current` | 设置当前模型 | - | `{ "success": true, "data": AIModel }` |
| POST | `/api/config/ai-models/:id/test` | 测试模型连接并记录结果 | - | `{ "success": boolean, "message": string, "data": { duration, status, details? } }` |
| POST | `/api/config/ai-models/test-temp` | 临时测试模型（不落库） | `provider, api_key, api_host, model_name` | 同上 |

### 提示词模板

| Method | Path | 描述 | 请求体关键字段 | 响应结构 |
| --- | --- | --- | --- | --- |
| GET | `/api/config/prompts` | 分页查询模板，可接收 `current,pageSize,category,is_system,is_active,search` | Query 参数 | `{ data: Template[], total, current, pageSize }` |
| GET | `/api/config/prompts/:id` | 获取模板详情 | - | `Template` |
| POST | `/api/config/prompts` | 创建模板 | `template_name, category, system_prompt, user_prompt_template` | `Template` |
| PUT | `/api/config/prompts/:id` | 更新模板（系统模板禁止） | 同 POST + `is_active` | `Template` |
| DELETE | `/api/config/prompts/:id` | 删除模板（系统模板禁止） | - | `{ message: string }` |
| POST | `/api/config/prompts/:id/copy` | 复制模板 | - | `Template` |

## 计算服务

| Method | Path | 描述 | 请求体关键字段 | 响应结构 |
| --- | --- | --- | --- | --- |
| POST | `/api/calculate` | 执行完整成本评估计算 | `assessmentData` (见 `server/tests/api-smoke-runner.js` 示例) | `{ "data": CalculationResult }` |

## 项目与模板管理

| Method | Path | 描述 | 请求体关键字段 | 响应结构 |
| --- | --- | --- | --- | --- |
| POST | `/api/projects` | 创建项目或模板（`is_template` 控制） | `{ name, description, is_template, assessmentData }` | `{ id: number }` |
| GET | `/api/projects` | 获取项目列表，支持 `is_template` 过滤 | Query: `is_template?` | `{ data: ProjectSummary[] }` |
| GET | `/api/projects/:id` | 获取项目详情 | - | `{ data: Project }` |
| PUT | `/api/projects/:id` | 更新项目 | 同 POST | `{ updated: number }` |
| DELETE | `/api/projects/:id` | 删除项目 | - | `{ deleted: number }` |
| GET | `/api/projects/:id/export/pdf` | 导出 PDF 报告 | - | `application/pdf` |
| GET | `/api/projects/:id/export/excel` | 导出 Excel 报告 | - | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

> `router.use('/api/templates', projectRoutes)` 使得以下接口与 `/api/projects` 行为一致：
>
> - `/api/templates`（GET、POST 等）
> - `/api/templates/:id`
> - `/api/templates/templates`

## 仪表盘数据

| Method | Path | 描述 | 响应结构 |
| --- | --- | --- | --- |
| GET | `/api/dashboard/summary` | 获取项目概览（数量、平均成本） | `{ totalProjects: number, averageCost: string }` |
| GET | `/api/dashboard/risk-distribution` | 风险评分分布 | `Array<{ final_risk_score, count }>` |
| GET | `/api/dashboard/cost-composition` | 成本构成（按业务字段聚合） | `{ softwareDevelopment, systemIntegration, operations, travel, risk }` |
| GET | `/api/dashboard/role-cost-distribution` | 角色成本分布 | `{ [role_name: string]: number }` |
| GET | `/api/dashboard/cost-trend` | 月度成本趋势 | `Array<{ month: string, totalCost: number }>` |
| GET | `/api/dashboard/risk-cost-correlation` | 风险-成本散点数据 | `Array<{ final_risk_score, final_total_cost }>` |

## 测试记录

- **执行时间**：2025-11-01 13:25 (UTC+8)
- **执行脚本**：`node server/tests/api-smoke-runner.js`
- **结果摘要**：共 54 个请求全部返回 2xx；最长响应来自 `POST /api/config/ai-models/:id/test`（约 2.46s），其余接口均 < 0.5s。
- **详细结果**：`docs/test/api-test-results.json`

| 模块 | 覆盖请求数 | 通过数 | 说明 |
| --- | --- | --- | --- |
| 健康检查 | 1 | 1 | 数据库连通性正常 |
| 角色配置 | 4 | 4 | 完成完整 CRUD 链路 |
| 风险评估项 | 4 | 4 | 验证 JSON 字段更新与清理 |
| 差旅成本 | 4 | 4 | 费用更新后成功删除 |
| 聚合配置 | 1 | 1 | 返回空集结构符合预期 |
| AI 模型配置 | 12 | 12 | 包含设置/取消当前模型、连通性测试 |
| 提示词模板 | 7 | 7 | 覆盖复制与删除流程 |
| 实时计算 | 1 | 1 | 返回完整成本、工作量字段 |
| 项目 / 模板 | 13 | 13 | 项目与模板 CRUD、别名路由、导出均成功 |
| 仪表盘 | 6 | 6 | 所有数据面板接口返回结构完整 |

> 提示：AI 模型连接测试使用示例域名 `https://example.com`，脚本仅验证请求流程与状态码，不代表真实模型连通性。
