# 📊 项目功能架构更新（当前实现）

本文档已根据最新代码同步更新。系统为 **软件项目评估系统（PPA - Project Portfolio Assessment）**，当前除“项目成本 / 风险 / 工作量”在线评估外，也已包含“项目机会 / 待推送招标 / 招标网站 / 小程序推送”等运营能力。

## 🏗️ 系统架构

```text
┌─────────────────────────────────────┐
│         前端 (React + Ant Design)    │
│              端口: 8000              │
├─────────────────────────────────────┤
│         后端 (Node.js + Express)     │
│              端口: 3001              │
├─────────────────────────────────────┤
│         数据库 (SQLite3)             │
│            ppa.db                   │
└─────────────────────────────────────┘
```

## 📁 核心功能模块

### 1. **数据看板** (`/dashboard`)

- 项目总体成本构成（开发 / 集成 / 差旅 / 维护 / 风险）占比
- 风险评分与评分因子 (Rating Factor) 概览
- 历史评估统计与模板使用频率（规划中）

### 2. **项目评估** (`/assessment`)

- 实时计算支持：填写评估表单时调用 `/api/calculate` 返回动态成本/工作量拆解
- **新建评估** (`/assessment/new`)
   - 分步式向导：风险 → 开发工作量 → 系统对接工作量 → 维护/差旅/风险成本 → 总结
   - 风险评分自动映射为评分因子 (Rating Factor)，影响开发 & 集成成本
   - 工作量多角色分摊（按角色单价 + 交付、范围、技术复杂度因子）
   - 模板复用：可从模板预填所有结构化字段
   - 评估过程中的实时总计（天 / 万元）
- **历史项目** (`/assessment/history`)
   - 项目列表（`id, name, final_total_cost, final_risk_score, created_at`）
   - 搜索与筛选（按名称/风险分数，后续扩展）
   - 编辑 / 删除
   - 模板标识区分显示
- **模板管理**（复用 `projects` 路由 `/api/templates`）
   - 列出所有模板（`id, name, description`）
   - 从模板创建评估（前端表单预填）
- **项目详情** (`/assessment/detail/:id`)
   - 保存的结构化评估明细（JSON）回显
   - 导出：PDF (`/api/projects/:id/export/pdf`)、Excel (`/api/projects/:id/export/excel`)

### 3. **参数配置** (`/config`)

- 角色与单价管理（`/api/config/roles` CRUD）
- 风险评估项管理（`/api/config/risk-items` CRUD，支持选项 JSON 化，决定最大风险分值）
- 差旅成本配置（`/api/config/travel-costs` CRUD + 是否激活，用于月度差旅总额聚合）
- 聚合获取：`/api/config/all` 一次返回全部配置（前端初始化加速）

### 4. **导出与报告**

- 单项目 PDF / Excel 导出（服务端聚合评估详情 + 成本拆分）
- 导出数据字段与计算结果保持一致（避免前端重复推导）

### 5. **健康与基础**

- 健康检查：`GET /api/health` / 根路由 `/`
- 优雅关闭（SIGINT 捕获 + 数据库连接关闭）

### 6. **项目机会** (`/opportunity`)

- **招标网站管理**
   - 招标网站列表、筛选、编辑、删除、URL 校验、脚本挂载
   - 后端接口：`/api/opportunity/bidding-sites`
- **待推送招标**
   - 页面：`/opportunity/tender-push`
   - 本地数据同步：`POST /api/opportunity/tender-staging/sync`
   - staging 列表：`GET /api/opportunity/tender-staging`
   - 单条推送到小程序：`POST /api/opportunity/tender-staging/:id/push`
   - 单条全网检索：`GET/POST /api/opportunity/tender-staging/:id/web-search`
- **同步规则（当前实现）**
   - `spider/data` 顶层 `.json` 文件被视为当前真源
   - 支持站点级 JSON 与聚合 JSON 混合同步
   - 聚合文件按 `source + source_id` 做来源识别与业务主键归一化
   - 同步后会自动清理当前目录中已经不存在的 staging 旧记录
   - 建议仅保留聚合文件在 `spider/data` 根目录，旧文件移入备份目录
- **小程序推送链路**
   - server 调用 CloudBase 云函数 `upsertTenderBySourceId`
   - 成功后回写 `push_status = pushed`
   - 失败后保留 `push_error` 便于重试与排障

### 7. **小程序会员支付（一期）** (`frontend/ppa_miniapp`)

- **核心目标**
   - 在现有招标快报小程序上建立“列表浏览 -> 详情拦截 -> 会员开通 / 续费 -> 会员内容消费”的最小闭环
- **当前能力**
   - 微信登录与用户档案初始化
   - 会员三态识别：`inactive / active / expired`
   - 详情页会员拦截与开通 / 续费入口
   - 月会员订单创建与支付发起
   - 支付后会员状态刷新与生效
   - 续费顺延、过期重开、订单留痕与人工修正
   - 会员状态页、站内提醒、经营分析
   - 人工评估结果、Excel 成果物与 Web 服务导流
- **运行架构**
   - 小程序会员能力运行在 `微信原生小程序 + CloudBase 云函数 + CloudBase 文档数据库`
   - 不直接复用当前 `server/ppa.db` 作为运行时主数据源
- **详细设计**
   - 详见 `docs/prd/miniapp-membership-payment-spec.md`

## 💾 数据模型（当前表）

1. **projects**
   - `id, name, description, is_template`
   - `final_total_cost`（最终总成本，万元）
   - `final_risk_score`（风险总分）
   - `final_workload_days`（总工作量天数）
   - `assessment_details_json`（原始评估结构：角色、分项工作量、风险选项、计算结果快照）
   - 创建时间 `created_at`
2. **config_roles**
   - `role_name, unit_price`（元/人/天）
3. **config_risk_items**
   - `category, item_name, options_json`（每个选项含 score/value，用于动态计算最大风险分值）
4. **config_travel_costs**
   - `item_name, cost_per_month, is_active`（仅激活项参与聚合：`SUM(cost_per_month)`）
5. **opportunity_bidding_sites**
   - 招标网站主数据
   - 包含 `name, url, normalized_url, source_level, province, city, platform_type`
   - 支持校验结果字段：`validation_status, validation_summary, final_url, redirect_chain`
   - 支持脚本挂接字段：`has_script, script_filename, script_uploaded_at`
6. **opportunity_tender_staging**
   - 待推送招标 staging 表
   - 包含 `source_item_id, title, issuer, source_platform, source_url`
   - 保存公告正文：`announcement_html, announcement_plain_text, detail_payload_json`
   - 保存同步状态：`last_synced_at`
   - 保存推送状态：`push_status, push_error, pushed_at`
   - `source_item_id` 为唯一业务键
7. **tender_staging_web_search_results**
   - 待推送招标单条全网检索结果
   - 包含 `tender_staging_id, model_config_id, prompt_template_id`
   - 保存 `summary, results_json, meta_json, searched_at`
8. （预留）**用户 / 权限**（尚未实现，计划用于多用户评估与审计）
9. **小程序 CloudBase 集合（会员一期）**
   - `miniapp_users`
   - `tenders`
   - `miniapp_memberships`
   - `miniapp_membership_orders`
   - `miniapp_membership_ops_log`
   - `miniapp_membership_activity_logs`
   - `miniapp_tender_evaluations`

### 计算结果字段（实时计算返回）

```text
software_dev_cost,
system_integration_cost,
travel_cost,
maintenance_cost,
risk_cost,
total_cost_exact, total_cost,
software_dev_workload_days,
system_integration_workload_days,
maintenance_workload_days,
total_workload_days,
risk_score,
rating_factor,
rating_ratio,
risk_max_score
```

### 评分因子（Rating Factor）机制

根据风险得分 / 最大可达风险分值计算比例 (ratio)，再按阈值区间（0.8 / 1.0 / 1.2）插值获得放缩因子：

- 低于 0.8：因子 = 1.0
- 0.8 ~ 1.0：线性增至 1.2
- 1.0 ~ 1.2：继续增至封顶 1.5

该因子乘于角色成本形成风险敏感的开发与集成成本。（逻辑见 `utils/rating.js`）

## 🚀 核心特性（已落地）

1. **实时评估计算**：后端统一算法，减少前端重复逻辑 & 确保口径一致
2. **动态参数配置**：风险项 / 角色 / 差旅费用均可在线维护
3. **风险驱动成本调节**：评分 → 因子 → 成本放缩透明可解释
4. **模板化复用**：加速多项目评估，减少重复输入
5. **结构化持久化**：评估明细 JSON 全量存储，支持再分析 / 回放 / 导出
6. **专业导出**：PDF & Excel 一键生成（后续可加水印、版本号）
7. **统一聚合加载**：`/api/config/all` 降低前端初始化请求开销
8. **本地招标真源同步**：`spider/data` 到 staging 的全量收敛可视化执行
9. **来源感知主键归一化**：聚合文件与旧站点文件可按业务键自动对齐
10. **小程序桥接推送**：待推送招标可由运营端按条推送到微信小程序
11. **全网检索补充判断**：支持对单条待推送招标发起结构化联网检索

## 📈 开发进度

已完成里程碑（M0-M7）：

1. 数据与表结构初始化
2. 架构与基础服务搭建
3. 参数配置模块完成（角色 / 风险 / 差旅）
4. 核心评估流程初版 → 引入实时计算 API
5. 模板化与评估持久化完善
6. 导出功能与成本计算算法增强（风险因子插值 + 成本拆解）
7. Bug 修复与测试优化（目录：`docs/bugfix/`）
8. 项目机会域能力补齐（招标网站、待推送招标、小程序推送、全网检索）

后续规划（草案）：

- 用户与权限（多评估人协作）
- 成本版本差异追踪（审计 / 迭代报价）
- Dashboard 增强（趋势、模板使用分析）
- 自动化测试覆盖提升（回归脚本完善）

## 📚 相关文档

- 用户手册：`user-manual.md`
- Bug 修复记录：`bugfix/`（按 Sprint 分类）
- 评估算法与计算细节：`prd/calculation-logic-spec.md`
- 模型配置说明：`prd/model-config-spec.md`
- 评估流程规格：`prd/assessment-spec.md`
- 项目机会-招标网站规格：`prd/opportunity-bidding-sites-spec.md`
- 项目机会-待推送招标规格：`prd/opportunity-tender-staging-spec.md`
- 小程序会员支付一期规格：`prd/miniapp-membership-payment-spec.md`
- 数据样本：`csv/`

## 🎯 系统定位

面向技术服务 / 软件交付组织的项目预评估与报价支持平台：

- 用统一算法替代分散 Excel 与主观经验
- 通过风险量化驱动成本防线与议价空间控制
- 支撑工作量拆分透明化与复用（模板化）
- 为后续投标、资源规划与交付预算提供可追溯基线

## 🔧 技术特点

- 前后端分离 + 统一 API 网关（Express 路由分层）
- 轻量级 SQLite：零运维启动，开发迭代快
- 成本与风险计算集中后端：保证规则一致性 & 可版本化
- 评分因子插值算法：区间线性 + 封顶控制（平衡敏感度与上限）
- 评估详情 JSON 持久化：为后续分析 / 回归测试提供基础
- 可扩展的配置聚合接口：减少前端请求次序耦合
- 来源感知的本地 JSON 收敛逻辑：兼容站点级文件与聚合文件并存过渡
- CloudBase 云函数桥接：避免前端直接持有小程序写入鉴权
- staging 全量收敛模式：让本地目录状态可直接映射为可推送数据集

---
（最后更新日期：2026-03-30）
