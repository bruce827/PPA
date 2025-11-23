# 风险评分与风险成本数据源拆分计划

（已阅读 WARP.md：根目录与 `frontend/ppa_frontend/WARP.md`，遵循前后端约定。当前假设：不保留旧数据，不做兼容层，不新增表。）

## 目标与原则
- 目标：将“风险评分”的数据来源与“风险成本/其他成本”的数据来源解耦，后端存储与计算、前端表单与显示均分离。
- 不新增数据库表，复用现有 `config_risk_items`（仅用于评分项配置），风险成本为自由列表字段存入 `assessment_details_json`。
- 不兼容旧 `assessment_details_json`，可以通过 `init-db` 重新录入。
- 评分因子只取自风险评分；风险成本不再乘以评分因子（已确认）。

## 命名与数据结构（建议）
- 评分：`risk_scores`（Record<string, number|string>），继续从 `/api/config/risk-items` 配置驱动。
- 风险成本：`risk_cost_items`（数组，字段 `{ id?, description|content: string, cost: number }`）。
- 其他成本字段保持：`travel_months/headcount`、`maintenance_months/headcount/daily_cost`、`development_workload`、`integration_workload`、`roles`。
- 计算接口与项目保存接口请求体：使用上述字段；响应保持当前报价字段名不变。

## 待办列表
- [x] 确认命名与计算口径：使用 `risk_cost_items`，风险成本不乘评分因子。
- [x] 后端数据路径调整  
  - 更新 `/api/calculate`、`projectService`、`calculationService` 读取 `risk_cost_items`；移除对旧 `risk_items` 成本用途的依赖。  
  - 更新 `configModel.getAll` 返回结构（如需暴露新字段）；`assessment_details_json` 序列化/反序列化。  
  - 更新导出（`services/export/*`）使用新字段渲染风险成本与评分明细。  
  - 更新 Dashboard/统计若有成本/风险关联依赖旧字段。
- [ ] 前端表单与类型调整  
  - `API.AssessmentData` 拆分成本与评分字段；`RiskScoringForm` 仅消费评分字段；`OtherCostsForm` 改用 `risk_cost_items`。  
  - `New.tsx`、`Overview`、`Detail`、模板导入/重新评估流程改为读写新字段；评分因子显示与计算保持一致。  
  - 服务层请求体/响应类型更新（`services/assessment` 等）。
- [ ] 种子/示例与测试更新  
  - 如需保留示例/种子数据，更新为新字段；Jest+Supertest 用例请求体调整。  
  - 运行/修复测试。
- [ ] 验证与文档  
  - 手工流：新建评估 → 填评分与风险成本 → 计算报价 → 保存 → 详情页/导出校验。  
  - 看板与 AI 相关功能冒烟。  
  - 更新 README/ARCHITECTURE（如字段变化说明）。

## 风险与副作用
- 报价口径变动：风险成本是否乘因子需确认，否则总价会不同。
- 字段重命名导致前后端 payload 不匹配（需同步发布）。
- 导出/看板若遗漏字段替换会显示空数据或抛错。

## 测试计划（覆盖副作用）
- 后端：`npm test`；手工 `POST /api/calculate` 与 `POST /api/projects` 用新字段跑通。
- 前端：完整向导流程、模板导入/重新评估、详情页、导出按钮；看板页面刷新。
- 数据重置：`node init-db.js`（必要时 `seed-all.js`）后再跑流程，确认无旧字段依赖。
