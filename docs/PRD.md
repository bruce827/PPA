# PPA - Product Requirements Document

**Author:** bruce
**Date:** 2025-11-15
**Version:** 3.1

---

## Executive Summary

PPA（Project Portfolio Assessment）聚焦于帮助软件交付与技术服务团队把零散在 Excel 或个人经验中的评估流程，统一迁移到一套可复制、可追溯的在线化工作流中。系统当前版本已实现前后端联调与数据持久化，能够在一次评估会话内完成“风险 → 工作量 → 成本 → 导出”全链路操作。

- **统一算法**：所有成本、工作量与风险的计算都通过 `POST /api/calculate` 统一算子完成，确保评估口径一致，可追踪版本演进。
- **向导式体验**：前端在 `/assessment/new` 采用分步向导与实时回显，帮助评估人理解每次输入对总成本的影响。
- **模板与配置联动**：模板复用（基于 `projects` 表的 `is_template` 字段）与参数配置（角色、风险、差旅）联动，能够在不同项目间快速复制最佳实践。

### What Makes This Special

1. **实时数学魔法**：风险项与角色工作量一旦修改，会立即触发后端计算，前端在同一页面展示分项成本，评估人员无需再维护复杂的 Excel 公式。
2. **结构化知识沉淀**：每次评估都会将 `assessment_details_json` 保存到数据库，可用于后续复盘、导出和智能分析，真正让评估经验可继承。
3. **风险驱动的成本守护**：评分因子 (Rating Factor) 将主观风险映射为客观成本放大系数，既让决策者清楚风险溢价的来源，也提醒团队关注高风险点。
4. **专业导出能力**：支持一键生成 PDF 与 Excel 报告，与实时计算结果保持一致，为投标、复审或对外报价提供权威材料。

---

## Project Classification

**Technical Type:** SaaS B2B Web 应用（Umi Max + Ant Design 前端、Express + SQLite 后端）  
**Domain:** 企业级项目组合评估与报价管理  
**Complexity:** Level 2-3（多模块 + 实时算法 + 模板复用）

**Classification Details**
- **前端形态**：浏览器端单页应用，路由覆盖 Dashboard、项目评估向导、评估历史、系统配置、AI 模型配置等模块。  
- **核心业务线**：通过 `/assessment/new` 发起分步评估，过程中调用统一计算 API；完成后写入 `projects` 表并可在 `/assessment/history` 回看。  
- **辅助能力**：Dashboard 汇总成本构成与评分因子趋势，Config 页面维护角色、风险项、差旅参数，Model Config 管理豆包/OpenAI 等 AI 模型与提示词。  
- **运行方式**：本地开发端口 8000/3001，前端 `/api` 代理后端；SQLite 以 `ppa.db` 持久化评估结果和配置。  

此项目当前仅由我个人使用，主要服务于内部项目评估工作流，因此尚未搭建登录、权限或协同机制。随着用户范围扩展到团队或客户侧，再逐步引入多角色协作与合规能力。基于现状，复杂度保持在中等水平；未来如果接入权限、多组织或审计需求，复杂度会显著上升。

---

## Success Criteria

成功标准围绕“效率、准确性、沉淀复用”三大目标制定，且每项都包含明确测量方式与复盘触发阈值：

1. **端到端评估效率**
   - 新建→填写→导出全过程 ≤ 30 分钟，数据来自前端埋点；如 7 日滚动平均 > 35 分钟，触发流程复盘。
   - 实时计算接口 P95 响应时间 ≤ 500ms（APM 监控），连续 3 天超阈值即启动性能优化任务。
2. **评估一致性与透明度**
   - 同一项目由不同评估人执行，`final_total_cost` 与 `final_risk_score` 偏差 ≤ ±5%，每月抽样至少 3 个项目复测；若 ≥2 个项目超标则更新模板或培训。
   - `assessment_details_json` 必须记录完整风险选项与 Rating Factor 映射，抽检通过率 100%，否则阻止导出。
3. **组织复用与知识沉淀**
   - 月度新增评估中 ≥ 60% 来源于模板起步；若低于 50%，需在 2 周内提出模板优化方案。
   - PDF/Excel 导出一次性通过率 100%，任何手工修订需登记并在 48 小时内修复根因。
   - 角色/风险/差旅等核心配置按照版本号记录，半年至少一次审查，确保历史评估可重现。

### Business Metrics

| 维度 | 指标 | 目标 | 量化方式 |
| --- | --- | --- | --- |
| 成本节省 | 单项目评估人力成本下降 ≥ 40% | 对比历史 Excel 流程工时 | 工时记录 + 自动统计 |
| 实施质量 | 立项后需求变更或缺陷率下降 15% | 与上一年度平均值比 | 项目复盘报告 |
| 知识资产 | 每季度新增 ≥ 3 个高质量模板 | 模板评审通过数量 | 模板库与评审记录 |

---

## Product Scope

### MVP - Minimum Viable Product

| 范围项 | 描述 | 状态 |
| --- | --- | --- |
| 分步式评估流程 | `/assessment/new` 分段输入（风险→工时→差旅/维护→总结），实时调用 `/api/calculate` | ✅ 已实现 |
| 模板复用 | `projects` 表区分 `is_template`，支持从模板一键创建评估 | ✅ 已实现 |
| 配置中心 | `/config` 维护角色、风险、差旅；`/api/config/all` 一次性加载 | ✅ 已实现 |
| 评估历史与详情 | `/assessment/history` / `/assessment/detail/:id` 查询、编辑、删除、JSON 回显 | ✅ 已实现 |
| 导出能力 | `/api/projects/:id/export/pdf|excel` 与实时计算结果一致 | ✅ 已实现 |
| Dashboard 与可视化 | `/dashboard` 展示成本构成、评分因子、模板使用 | ✅ 已实现（持续优化） |
| AI 模型配置 | `/model-config` 管理模型/提示词，为 AI 辅助评估预热 | ✅ 已实现 |

### Growth Features (Post-MVP)

1. **多用户与权限体系**：引入登陆、角色权限、审计日志，确保跨团队协作与数据安全。  
2. **评估版本对比**：同一项目的多次评估可追踪差异，支持“重新计算”与差异化导出。  
3. **高级仪表板**：引入趋势分析、模板使用热度、风险分布等高级可视化。  
4. **自动化调度与提醒**：为超时评估或指标异常触发提醒，推动流程持续优化。  
5. **AI 辅助建议**：结合模型配置，为评估数据提供自动点评或风险提示。

### Vision (Future)

1. **组织级知识图谱**：将历史评估、模板、配置、导出记录串联，形成可追踪的“评估知识网络”。  
2. **生态接口**：开放 API/SDK，让 PPA 接入企业现有 PMO、预算或交付系统，实现自动化数据同步。  
3. **智能推荐引擎**：根据历史表现和项目特征自动推荐模板、风险项及报价策略，辅助售前决策。  
4. **多租户云化**：支持跨组织部署、项目隔离与计量计费，成为 SaaS 级评估平台。

---

## Domain-Specific Requirements

虽然 PPA 面向通用软件交付场景，但仍需在项目评估领域内满足以下行业特性：

1. **可追踪的估算依据**：每一个报价数字必须能追溯到风险项、角色工时及历史模板，支持售前或审计溯源。
2. **统一计量口径**：角色单价统一以“元/人/天”输入，系统输出统一换算为“万元”，并在导出中展示换算规则。
3. **评估与项目数据隔离**：评估阶段产生的数据不应直接写入项目交付系统，需通过模板或导出方式经人工确认后再触发后续流程。
4. **多角色协作（后续）**：当前为单人使用，暂不记录操作者；但随着团队参与，需要拓展为多角色协作并记录操作时间，方便责任界定。
5. **法规/采购流程对接**：虽然当前无强监管，但需要保留扩展点（如采购审批编号、客户签字附件）以适配大型组织的合规流程。

这些领域特性将直接影响后续的功能与非功能需求设计。

---

## Innovation & Novel Patterns

1. **风险因子驱动的成本调节**：通过 Rating Factor 将风险评估与成本放大系数挂钩，形成“风险透明 → 成本合理”的可解释路径。  
2. **模板 + 实时计算双轨并行**：模板负责结构化经验、实时计算负责即时反馈，两者结合既能提升效率，也能确保每次报价站得住脚。  
3. **结构化评估详情 JSON**：相比传统导出表格，系统保留了原始输入、计算快照以及导出版本号，让“重算 / 回放 / 对比”成为可能。  
4. **AI 模型配置内嵌**：在产品内置模型与提示词管理，为未来的 AI 辅助评估打下基础，避免零散脚本带来的安全与维护问题。

### Validation Approach

1. **因子回归验证**：定期抽样评估案例，检查风险因子与最终成本放大之间的统计相关性，如偏离预期则调整分段或参数。  
2. **模板实战验证**：每个模板上线前需完成至少一次真实项目复盘，确保字段覆盖与计算口径匹配。  
3. **导出对账**：导出文件中的金额与实时计算结果必须一致，通过自动化 smoke test 验证。  
4. **模型配置安全检查**：AI 模型调用需记录 API Key 使用情况，避免凭空调用导致的安全或成本风险。

---

## SaaS B2B Specific Requirements

### Platform Requirements
- 前端为 Umi Max + Ant Design 单页应用，必须在最新两个版本的 Chrome/Edge 中稳定运行，并兼容 Safari（方便管理层查看）。  
- `/dashboard`、`/assessment/*`、`/config`、`/model-config/*` 均需具备响应式布局，以便 1440px 管理大屏与 13" 笔记本之间切换。  
- 与后端通信统一走 `/api` 代理（默认 http://localhost:3001），需确保代理配置在多环境（dev/staging/prod）可快速切换。

### API Specification
- `GET /api/health`、`GET /`：健康检查，供前端启动探活。  
- `/api/config/*`：角色、风险项、差旅成本 CRUD；`/api/config/all` 作为聚合加载接口，前端初次进入必须调用。  
- `POST /api/calculate`：输入风险分、角色工作量、差旅/维护参数，返回成本拆解、工作量天数和 Rating Factor。  
- `/api/projects`：项目/模板 CRUD；`GET /api/projects/:id` 返回 `assessment_details_json` 供详情页回显。  
- `/api/projects/:id/export/pdf|excel`：导出报告接口，需保证输出数据与最新一次 `calculate` 结果一致。  
- `/api/ai/*`（预留）：模型配置与 prompt 管理接口，用于 AI 辅助模块。

### Authentication & Authorization
- 当前为单用户自用场景，未启用登录或权限管理，操作均在本地环境完成。  
- 当未来扩展到协作模式时，再逐步引入基础登录与权限分层。

### Multi-Tenancy & Tenant Readiness
- 现阶段单租户（所有评估共用一套配置），但数据模型需为多租户留钩子：`projects` 表保留 `owner_org` 或 `workspace` 字段。  
- 导出文件命名需包含组织或项目标识，防止跨客户混淆。

### Permissions & Roles
- 当前仅有本人使用，无需区分角色或权限。  
- 若未来团队化，可参考 PMO/售前/技术/管理等典型角色模板。

---

## User Experience Principles

1. **数据可解释性优先**：任何成本数字都需要旁边显示计算来源（角色单价 × 工作量 × 因子），避免“黑盒感”。  
2. **渐进式披露**：评估流程按风险→工作量→总结的顺序展开，每一步只呈现必要字段，减少用户一次性填表的心理负担。  
3. **实时反馈**：所有关键表单都与实时计算结果联动，在页面右侧或底部实时显示成本拆解、风险分和 Rating Factor。  
4. **模板即知识**：在新建评估入口突出“从模板创建”，并在模板列表展示最近一次使用时间，鼓励复用。  
5. **导出无惊喜**：导出按钮贴近实时结果，并提示“导出内容将与当前计算保持一致”，减少重复校验。

### Key Interactions

1. `Dashboard`：管理者快速浏览各类成本占比、模板使用频次；点击卡片可跳转到相应模块。  
2. `Assessment/New`：分步向导 + 实时计算；关键字段提供提示信息（例：角色单价输入单位提示）。  
3. `Assessment/History`：表格展示项目列表，支持按名称搜索、按模板/项目筛选，并可快捷导出。  
4. `Config`：以分栏的方式展示角色、风险、差旅配置，每个列表支持弹窗式新增/编辑与 JSON 结构提示。  
5. `Model Config`：分应用与提示词双列表，允许测试 prompt 输出并保存版本。

---

## Functional Requirements

### FR-2 项目评估流程
- **FR-2.1 (P0)** `/assessment/new` 路径提供分步向导：风险 → 开发工作量 → 集成工作量 → 维护/差旅 → 汇总。  
- **FR-2.2 (P0)** 每次字段变更调用 `POST /api/calculate`，响应 ≤500ms，若超时需提示“请稍后重试”。  
- **FR-2.3 (P1)** 支持从模板预填所有字段，并在顶部显示来源模板名称。  
- **FR-2.4 (P2)** 支持中途保存草稿（写入 `projects` 表并标记 `status=draft`）。  
- **FR-2.5 (P0)** 完成评估后写入 `projects` 表，`assessment_details_json` 必须包含：原始输入、实时计算响应、Rating Factor、各成本拆解、所用配置版本号、导出引用ID、保存时间戳。
- **FR-2.6 (P1)** 成本快照需支持“重新计算对比”：同一项目的多次快照可在详情页对比差异（先保留数据结构与 API，UI 逐步实现）。

### FR-3 历史与模板管理
- **FR-3.1 (P0)** `/assessment/history` 显示分页表格，支持按项目/模板筛选、按名称搜索。  
- **FR-3.2 (P1)** 项目详情页可查看结构化 JSON（可折叠）并允许编辑重新计算。  
- **FR-3.3 (P1)** 模板 CRUD：可设置描述、默认角色、默认风险项选项。  
- **FR-3.4 (P0)** 删除项目需二次确认，避免误删（单人使用无需记录操作者）。

### FR-4 配置中心
- **FR-4.1 (P0)** 角色配置：字段 `role_name, unit_price`, 需校验单价 > 0；修改后立即作用于下一次计算。  
- **FR-4.2 (P0)** 风险项配置：支持添加分类、名称、权重选项（JSON 编辑器 + 可视化表单），并自动更新最大风险分值。  
- **FR-4.3 (P0)** 差旅配置：每项包含 `item_name, cost_per_month, is_active`，仅激活项参与计算。  
- **FR-4.4 (P0)** 所有配置均可通过 `GET /api/config/all` 一次返回，前端需缓存并在 5 分钟内复用。

### FR-5 AI 模型配置
- **FR-5.1 (P1)** 支持管理多个模型供应商（豆包、OpenAI 等），字段含 `provider, apiKey, baseUrl, enabled`。  
- **FR-5.2 (P2)** 提示词管理：支持变量定义与示例输入，允许实时测试响应（个人使用场景，无需变更留痕）。

### FR-6 导出能力（重点规划）
- **FR-6.1 (P0)** 用户可在项目详情页或历史列表触发 PDF/Excel 导出，后端执行统一导出管线（数据准备 → 模板渲染 → 产出文件），单次导出 ≤ 5 秒；如超时需返回任务 ID 支持重试。  
- **FR-6.2 (P0)** 导出内容包含封面、指标概览、详尽成本拆解、配置截屏/摘要，且需标注“计算时间 + Rating Factor”；默认为最新快照，也可勾选历史快照。  
- **FR-6.3 (P0)** 导出文件元数据需携带 `snapshot_id`、`config_version`、`exported_at`，便于外部对账与回溯。  
- **FR-6.4 (P1)** Excel 导出包含 Summary（关键指标/备注）与 Breakdown（角色、风险、差旅等明细）两个工作表，同时输出静态数值与可编辑公式。  
- **FR-6.5 (P1)** 支持异步导出模式：大文件或多任务时推入队列，前端显示进度与完成通知，失败可重新提交。  
- **FR-6.6 (P1)** 导出模板可配置（JSON/Markdown），未来可上线模板管理界面以便调整封面样式、语言或品牌元素。

### FR-7 系统基础
- **FR-7.4 (P0)** API 错误信息统一由 `middleware/errorHandler.js` 输出 JSON，包含错误码与定位信息（保留未来扩展钩子）。

---

## Non-Functional Requirements

### Performance
- 实时计算 `POST /api/calculate`：P95 ≤ 500ms，P99 ≤ 800ms；若超过阈值自动记录慢查询日志。  
- 列表接口（projects/config）返回 < 300ms；分页大小默认 20。  
- 前端导航切换时间 < 200ms，首次加载使用 MFSU 关闭但需开启路由级懒加载。

### Security
- 所有写操作需校验输入合法性，禁止任何 SQL 注入风险（使用参数化查询）。  
- 敏感配置（API Key）仅存储加密后的值，并通过 `.env` 注入；接口返回时永不回显原文。  
- 导出接口只需校验项目存在性与文件可读性（当前单用户，无额外权限校验），但在代码结构上预留扩展点。  
- 日志中避免记录完整的机密信息，仅记录摘要。

### Scalability
- SQLite 目前满足单节点需求，需设计迁移路径（例如切换到 Postgres）：所有 SQL 语句遵循标准语法，避免 SQLite 专属特性。  
- 后端服务应支持无状态部署，数据库连接由单例管理，未来可替换为连接池。  
- 评估详情 JSON 可能逐渐增大，需限制字段大小（推荐不超过 200KB）并考虑压缩策略。

### Accessibility
- 关键颜色遵循 WCAG AA 对比度；风险警示色需配合图标/文本说明。  
- 表单控件提供键盘导航与 aria-label。  
- Dashboard 图表提供数据表格切换，方便无法读取图形的用户。

### Integration
- 所有 API 前缀为 `/api`，通过 `.umirc.ts` 代理到后端；部署时可通过环境变量替换目标地址。  
- 导出结果可供外部系统直接引用（文件命名包含项目 ID + 时间戳）。  
- 未来若接入第三方 PMO/ERP，需要提供 Webhook/REST Hook，当前在 PRD 中保留扩展点。

---

## Implementation Planning

### Epic Breakdown Required

Requirements must be decomposed into epics and bite-sized stories (200k context limit).

**Next Step:** Run `workflow epics-stories` to create the implementation breakdown.

---

## References

- Product Brief: `docs/prd/project-overview.md`
- Domain Brief: 暂无正式文档（预留给行业合规总结）
- Research: 暂无外部市场/行业研究，当前以内部经验为主

---

## Next Steps

1. **Epic & Story Breakdown** - Run: `workflow epics-stories`
2. **UX Design** (if UI) - Run: `workflow ux-design`
3. **Architecture** - Run: `workflow create-architecture`

---

_This PRD captures the essence of PPA - 把复杂评估公式、模板经验与实时导出串成一次可解释、可复用、可沉淀的在线体验_

_Created through collaborative discovery between bruce and AI facilitator._
