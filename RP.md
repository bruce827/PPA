# 版本规划与提交梳理（RP）

**项目名称**: 软件项目评估系统 (PPA - Project Portfolio Assessment)  
**当前版本**: V1.0.0-alpha（基于 `feat_server_refactor` 分支）  
**最后更新**: 2025-11-18

---

## 1. 分支与阶段性里程碑

本仓库主要使用功能分支 + 主干 (`main`) 的方式迭代，关键分支如下：

- `main`  
  - 作为稳定主干分支，承载完成的里程碑（M0-M7）、核心评估流程、Dashboard、导出等功能的稳定版本。  
  - 代表当前对外可用的“稳定基线”，文档与 PRD 也主要围绕该分支整理。

- `fix_request`  
  - 以“请求处理与后端重构”为目标的技术分支。  
  - 关键提交：`13050d5 Refactor server structure and add controllers`。  
  - 主要工作：  
    - 将原有 `server/index.js` 中的路由处理拆分为 `controllers/` + `services/` + `routes/` 三层结构。  
    - 引入统一错误处理中间件 (`middleware/errorHandler.js`) 与响应工具 (`utils/response.js`)。  
    - 抽离数据库配置到 `config/database.js` 与 `config/server.js`，为后续扩展与测试打基础。

- `feat_cal`  
  - 负责“项目评估计算逻辑升级”的功能分支。  
  - 关键提交：`4e48a0c Implement calculation logic improvements and refactor rating factor`、`8a8ddce Update project docs and server README for new features`。  
  - 主要工作：  
    - 重构成本与风险评分因子算法，细化为可配置、可解释的评分与成本拆解逻辑。  
    - 同步更新 `docs/prd/calculation-logic-spec.md`，补充公式推导、样例场景与边界测试建议。  
    - 更新 `server/README.md` 以记录新的计算字段和 API 行为。

- `feat_agent`  
  - 聚焦 AI 能力与模型配置的功能分支。  
  - 关键提交：  
    - `54df25f 风险AI自动评估`  
    - `5ab32ee 第一步、第二步ai功能实现`  
    - `5a70a4a Add AI workload evaluation API and service`  
  - 主要工作：  
    - 引入 AI 风险评估、模块分析、一键工作量评估相关的 `aiController`、`ai*Service` 与 `/api/ai/...` 路由。  
    - 新增/完善 AI 日志记录 (`aiFileLogger`)，将请求与响应写入文件，便于回放与对比。  
    - 补充 AI 功能 PRD（如工作量一键评估、风险评估后端 step1）与 bugfix 文档。

- `feat_server_refactor`（当前 HEAD）  
  - 在 `fix_request`、`feat_cal`、`feat_agent` 等分支的基础上，继续迭代导出能力与服务端重构。  
  - 关键提交：  
    - `1121775 文件导出`（导出能力与日志完善）  
    - `a2dc5aa 导出prd文档完善`（导出规格 PRD 更新）  
    - `6cc6e67 Refactor AI model and prompt template controllers to use services`（模型与提示词模板控制器服务化）  
  - 主要工作：  
    - 将导出逻辑拆分为专门的 `exportService`、`exportValidator` 与 Excel 渲染/格式化模块。  
    - 完善 `server/README.md` 与 `docs/prd/export-spec.md`，明确内部版/外部版 Excel 的结构与校验策略。  
    - 对 AI 模型配置与提示词模板管理进行 controller → service 抽象，增强可维护性。

- `copilot/update-agents-documentation`（远程分支）  
  - 针对 AGENTS / 工具集成类文档的小幅更新，不影响核心业务逻辑。

---

## 2. 提交历史梳理（按时间主线）

以下按时间顺序梳理从项目初始化到当前 V1.0 alpha 的关键提交，仅列出对架构与功能有代表性的节点：

1. **项目初始化阶段**
   - `f777602 Initial commit`  
   - `1d690da 项目初始化`  
   - 说明：搭建基础目录结构（`server/` + `frontend/ppa_frontend/`）、初始化 SQLite、基础路由与前端框架接入。

2. **核心评估流程与参数配置**
   - `d4eda7e 完善新项目评估模块`  
   - `ee04532 参数配置数据初始化`  
   - `4c984b9 完善数据初始化脚本`  
   - 说明：完成新建评估流程（风险、工作量、其他成本步骤）以及角色/风险项/差旅等参数配置与初始化脚本（`seed-data/`）。

3. **成本计算与修正**
   - `28a05ba 优化功能`  
   - `8879cb3 修复成本计算`  
   - `817f8c8 补充bugfix`  
   - 说明：针对早期成本计算逻辑的问题进行修复与优化，在 `docs/bugfix/` 中记录差旅成本、计算精度等 BUG 与修复方案。

4. **请求重构与三层架构建立**
   - `13050d5 Refactor server structure and add controllers`（`fix_request`）  
   - 说明：  
     - 引入 Controller、Service、Model 三层结构与统一错误处理中间件。  
     - 为后续复杂计算、AI 集成和导出功能提供清晰的扩展点。

5. **评估计算算法升级**
   - `4e48a0c Implement calculation logic improvements and refactor rating factor`（`feat_cal`）  
   - `8a8ddce Update project docs and server README for new features`  
   - 说明：  
     - 将工作量成本拆解为“角色成本 × 交付系数 × 范围系数 × 技术系数 × 评分因子”，并明确所有单位转换规则（元/人/天 → 万元）。  
     - 在 `docs/prd/calculation-logic-spec.md` 中完整记录算法、公式与样例，作为“独有项目评估算法”的权威来源。

6. **AI 能力与模型配置集成**
   - `a2afb93 story-1.3`（引入 AI 相关故事与规格）  
   - `54df25f 风险AI自动评估`  
   - `5ab32ee 第一步、第二步ai功能实现`  
   - `5a70a4a Add AI workload evaluation API and service`（`feat_agent`）  
   - `6cc6e67 Refactor AI model and prompt template controllers to use services`  
   - 说明：  
     - 引入 AI 风险评估、模块分析、一键工作量评估等后端服务及路由，配套文件级 AI 日志与 bugfix 文档。  
     - 增加 ModelConfig 与 Prompt 模板管理能力，将 AI 相关 controller 服务化，增强扩展与调试体验。

7. **文档体系与测试完善**
   - `e5cb64d Update PRD, add WARP and workflow docs, clean up tests`  
   - `c76d0da 更新文档`  
   - `37fc12e 优化提示词模范管理`、`8b4715b 提示词模板管理`  
   - 说明：  
     - 补齐 PRD、Tech Spec、测试计划、BMM workflow 等文档，形成完整的 `docs/` 体系。  
     - 整理 server 测试脚本、API 回归用例，提升回归与自动化测试的可操作性。

8. **导出能力与当前 alpha 版本**
   - `1121775 文件导出`（当前 HEAD）  
   - `a2dc5aa 导出prd文档完善`  
   - 说明：  
     - 实现项目评估结果导出为 Excel（内部版/外部版），并记录导出日志，方便审计与问题排查。  
     - 在 `docs/prd/export-spec.md` 中补充导出字段、工作表结构与校验逻辑，使导出行为可测试、可对齐。

> 如需查看完整的逐条提交记录，可使用：  
> `git log --oneline --decorate --graph --all` 进行详细追踪，本 RP 文档聚焦对架构与需求有代表性的提交。
