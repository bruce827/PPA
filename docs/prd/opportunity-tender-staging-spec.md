---
workflowType: 'prd'
workflow: 'edit'
classification:
  domain: '项目机会'
  projectType: 'webapp'
  complexity: 'moderate'
inputDocuments:
  - 'docs/prd/opportunity-tender-staging-spec.md legacy content'
  - 'frontend/ppa_frontend/src/pages/Opportunity/TenderPush.tsx'
  - 'server/services/tenderStagingService.js'
  - 'server/services/tenderDedupeService.js'
stepsCompleted:
  - 'step-e-01-discovery'
  - 'step-e-01b-legacy-conversion'
  - 'step-e-02-review'
  - 'step-e-03-edit'
lastEdited: '2026-05-05'
editHistory:
  - date: '2026-05-05'
    changes: 'Converted legacy tender staging specification to BMAD PRD format and added filtering, sorting, archive-source, dedupe, and no-manual-delete requirements.'
---

# 项目机会-待推送招标 PRD

## Executive Summary

“待推送招标”是 PPA 项目机会域的运营工作台。运营人员把本地 Spider 产出的招标公告 JSON 同步到 staging 表，在表格中筛选、排序、解析、检索、整理重复数据，并按条推送到微信小程序。

本次改造解决两个问题：

1. staging 数据量增长后，运营人员缺少足够的筛选和排序能力，难以快速定位待处理、临期、失败、字段不完整的数据。
2. 页面已有 `归档源文件` 和 `整理数据` 按钮，但缺少产品语义边界，用户容易把它们误解为通用删除能力。

产品决策：

- 本次增加筛选和排序，提升数据定位效率。
- 本次不提供人工单条删除。
- `归档源文件` 只归档本地 JSON 源文件，不删除 staging 数据。
- `整理数据` 只清理高置信重复 staging 数据，必须先预览再确认执行。
- 后续若需要移除无关数据，优先设计“忽略/隐藏”，不直接做硬删除。

## Success Criteria

| ID | Criterion | Measurement |
|---|---|---|
| SC-1 | 运营人员可以按关键词、状态、来源、日期、解析状态、数据完整性筛选 staging 数据 | 每个筛选项在 `GET /api/opportunity/tender-staging` 返回结果中生效，且分页总数与筛选条件一致 |
| SC-2 | 运营人员可以按处理优先级查看数据 | 默认排序为待推送 > 推送失败 > 已推送，同状态内发布日期倒序 |
| SC-3 | 运营人员可以按截止日期优先处理临期招标 | 截止日期升序排序可把有截止日期且最早截止的数据排在前面 |
| SC-4 | 页面清楚区分归档、整理、删除 | 页面按钮文案、确认弹窗或说明文案能说明 `归档源文件` 不删 staging，`整理数据` 只处理重复数据 |
| SC-5 | 系统不提供人工单条删除入口 | `/opportunity/tender-push` 页面不出现自由删除按钮；后端不新增人工删除接口 |
| SC-6 | 筛选排序不会降低列表可用性 | 常规数据量下列表查询响应时间保持在 500ms 内 |
| SC-7 | 重复数据清理可追溯且可预览 | 执行清理前展示扫描数量、可清理分组、候选删除数量、保留记录原因 |

## Product Scope

### MVP Scope

- 增加待推送招标列表筛选：
  - 关键词
  - 推送状态
  - 来源平台
  - 来源文件
  - 发布日期范围
  - 截止日期范围
  - 截止状态
  - 解析状态
  - 数据完整性
- 增加列表排序：
  - 默认处理优先级排序
  - 截止日期升序
  - 发布日期升序/倒序
  - 更新时间倒序
  - 推送时间倒序
- 澄清现有按钮语义：
  - `同步本地数据`
  - `归档源文件`
  - `整理数据`
- 保留现有单条能力：
  - 评估
  - 解析
  - 全网检索
  - 原文跳转
  - 推送/重试/重新推送
- 更新后端列表接口以支持新增筛选和排序。
- 补充测试覆盖筛选、排序、边界状态和按钮语义。

### Later Scope

- 保存常用筛选视图。
- 批量推送。
- 批量解析。
- “忽略/隐藏”无关招标数据。
- 筛选条件导出。
- 来源平台下拉选项自动聚合计数。

### Out of Scope

- 人工单条硬删除 staging 数据。
- 批量硬删除非重复数据。
- 把 staging 表改造成历史仓库。
- 递归同步 `spider/data` 子目录。
- 递归归档备份目录。
- 改造微信小程序展示结构。
- 改造 Spider 抓取逻辑。

## User Journeys

### UJ-1 同步并确认数据规模

1. 运营人员进入 `/opportunity/tender-push`。
2. 点击 `同步本地数据`。
3. 系统读取 `spider/data` 顶层 JSON 文件，并把当前目录状态收敛到 staging 表。
4. 页面提示文件数、有效记录数、新增、更新、清理、保留和告警数量。
5. 列表刷新，统计卡展示总数、待推送、已推送、失败。

### UJ-2 聚焦待处理数据

1. 运营人员选择推送状态 `待推送`。
2. 输入关键词或来源平台。
3. 选择截止状态 `未截止`。
4. 按截止日期升序排序。
5. 页面显示最需要处理的有效招标。

### UJ-3 定位字段不完整数据

1. 运营人员选择数据完整性筛选。
2. 可选择 `缺招标单位`、`缺截止日期`、`缺正文`。
3. 页面只展示对应字段缺失的数据。
4. 运营人员对可解析记录执行 `解析`，或进入 `全网检索` 补充信息。

### UJ-4 整理重复数据

1. 运营人员点击 `整理数据`。
2. 系统扫描 active staging 数据。
3. 页面展示重复分组、保留记录、候选删除记录、匹配原因和跳过原因。
4. 运营人员确认后，系统只删除高置信自动清理分组中的重复记录。
5. 有推送、解析、全网检索痕迹的多条重复记录不会被自动硬删。

### UJ-5 归档源文件

1. 运营人员确认当前 `spider/data` 顶层 JSON 已同步。
2. 点击 `归档源文件`。
3. 系统把 `spider/data/*.json` 移动到 `_backup_YYYYMMDD_HHMMSS/`。
4. 页面提示归档文件数和备份目录。
5. staging 数据保持不变。

### UJ-6 推送到小程序

1. 运营人员在筛选后的列表中点击 `推送`。
2. 后端读取 staging 记录并调用 CloudBase 云函数。
3. 推送成功后记录状态变为 `已推送`。
4. 推送失败后记录状态变为 `推送失败`，并保留错误信息。
5. 运营人员可按失败状态筛选并重试。

## Domain Requirements

- 数据来源为本地 Spider 文件和 staging 表，系统必须保留来源文件、来源平台、来源 URL、原始 payload，支持问题排查。
- staging 表代表当前真源快照，不代表历史归档。历史源文件通过 `_backup_*` 文件夹保存。
- 清理重复数据必须避免误删已操作记录。已有推送、解析、全网检索痕迹的数据优先保留。
- 同步告警必须指向数据质量问题，如 JSON 解析失败、缺少业务主键、缺少标题。

## Project-Type Requirements

- 前端为 Ant Design ProTable 页面，筛选项必须和后端查询参数一致。
- 列表接口必须支持服务端分页、筛选和排序。
- 排序字段必须使用白名单，不能把前端传入字段直接拼接 SQL。
- 日期范围筛选必须按 `YYYY-MM-DD` 字段比较，不依赖前端本地时区。
- 查询响应必须返回 `items`、`total`、`page`、`pageSize`、`stats`。

## Functional Requirements

### FR-1 同步本地数据

系统必须从 `spider/data` 顶层读取 `.json` 文件，不递归读取子目录。

系统必须支持以下 JSON 结构：

1. 数组 `[...]`
2. 对象包裹 `{"items": [...]}`
3. 对象包裹 `{"data": [...]}`
4. 对象包裹 `{"records": [...]}`
5. 单对象 `{...}`

系统必须把输入字段归一化到 staging 字段：

- `source_item_id`
- `source_origin_id`
- `source_record_id`
- `title`
- `notice_type`
- `published_at` / `published_date`
- `deadline_at` / `deadline_date`
- `issuer`
- `budget_amount`
- `region`
- `source_platform`
- `source_url`
- `summary`
- `detail_excerpt`
- `announcement_html`
- `announcement_plain_text`
- `detail_payload_json`
- `source_file`
- `raw_payload_json`

### FR-2 业务主键归一化

`source_item_id` 是 staging 表和小程序推送的业务唯一键。

系统必须按以下优先级生成 `source_item_id`：

1. 显式 `source_item_id` 或 `sourceItemId`
2. 站点稳定业务 ID，如 `source_id`、`rowGuid`、`goodsId`、`businessId`、`tender_id`、`list_id`、`list_notice_id`、`ggGuid`
3. 带来源作用域的稳定主键：`${source}:${id}`

系统必须避免不同来源的同名 ID 互相覆盖。

### FR-3 全量收敛

`spider/data` 顶层 JSON 是当前真源。

每次同步必须执行：

1. 新记录插入 staging
2. 已存在且 payload 变化的记录更新 staging
3. 当前目录中不存在、且无操作痕迹的旧记录软删除
4. 当前目录中不存在、但有推送、解析或全网检索痕迹的旧记录保留

### FR-4 同步状态保留

如果记录 payload 未变化，系统必须保留：

- `push_status`
- `push_error`
- `pushed_at`
- `last_parsed_at`
- `parse_status`
- `parse_error`
- `parse_meta_json`

如果记录 payload 变化，系统必须把推送状态重置为：

- `push_status = pending`
- `push_error = null`
- `pushed_at = null`

### FR-5 同步结果反馈

前端同步成功提示必须展示：

- 文件数
- 当前目录有效记录数
- 新增数量
- 更新数量
- 清理数量
- 保留数量
- 告警数量

如果告警数量大于 0，页面必须提示用户查看服务端返回或后续详情入口。

### FR-6 归档源文件

`归档源文件` 必须只移动 `spider/data` 顶层 `.json` 文件到 `_backup_YYYYMMDD_HHMMSS/`。

`归档源文件` 不得删除、软删除或修改 `opportunity_tender_staging` 数据。

归档成功后，页面必须提示：

- 归档文件数
- 备份目录

如果没有可归档 JSON 文件，页面必须提示“当前没有可归档的 JSON 文件”。

### FR-7 整理数据

`整理数据` 必须先执行重复数据预览。

预览必须展示：

- 扫描记录数
- 重复分组总数
- 可自动清理分组数
- 可删除候选记录数
- 疑似重复但跳过分组数
- 每组保留记录
- 每组删除候选
- 匹配原因
- 跳过原因

执行整理时，系统只能删除 `auto_delete` 分组中的候选记录。

系统不得自动硬删以下情况：

- 仅命中标题或链接候选、未达到强匹配条件
- 同一重复组内存在多条有操作痕迹的数据

### FR-8 列表筛选

`GET /api/opportunity/tender-staging` 必须支持以下筛选参数：

| Filter | Behavior |
|---|---|
| `keyword` | 模糊匹配项目名称、招标单位、业务主键、来源文件、来源平台 |
| `title` | 模糊匹配项目名称 |
| `issuer` | 模糊匹配招标单位 |
| `push_status` | 精确匹配 `pending`、`pushed`、`failed` |
| `source_platform` | 模糊或精确匹配来源平台 |
| `source_file` | 模糊匹配来源文件 |
| `published_date_from` / `published_date_to` | 筛选发布日期范围 |
| `deadline_date_from` / `deadline_date_to` | 筛选截止日期范围 |
| `deadline_status` | 支持 `not_expired`、`expired`、`missing` |
| `parse_status` | 精确匹配解析状态 |
| `data_quality` | 支持 `missing_issuer`、`missing_deadline`、`missing_content` |

数据完整性第一版仅支持：

- 缺招标单位
- 缺截止日期
- 缺正文

### FR-9 列表排序

默认排序必须为：

1. 待推送
2. 推送失败
3. 已推送
4. 同状态内发布日期倒序
5. 更新时间倒序
6. ID 倒序

列表必须支持以下用户排序：

| Sort Field | Direction |
|---|---|
| `deadline_date` | 升序、倒序 |
| `published_date` | 升序、倒序 |
| `updated_at` | 倒序、升序 |
| `pushed_at` | 倒序、升序 |

排序参数无效时，系统必须回退默认排序。

### FR-10 状态统计

页面统计卡必须展示当前 active staging 数据的：

- 总数
- 待推送
- 已推送
- 推送失败

统计卡不受当前筛选条件影响，表示全局 active staging 状态。

### FR-11 推送到小程序

单条推送必须沿用服务端调用 CloudBase 云函数的方式。

推送链路：

1. 前端点击 `推送`
2. 后端读取 staging 记录
3. 后端构造小程序写入 payload
4. 后端调用 `upsertTenderBySourceId`
5. 后端回写 staging 状态

推送成功后：

- `push_status = pushed`
- `push_error = null`
- `pushed_at = 当前时间`

推送失败后：

- `push_status = failed`
- `push_error = 失败原因`

### FR-12 无人工删除

本次改造不得新增人工单条删除按钮。

本次改造不得新增批量删除按钮。

本次改造不得新增面向用户的非重复数据硬删除接口。

如果运营人员需要减少无关数据干扰，第一版必须通过筛选、排序、归档源文件和重复整理解决。

## Non-Functional Requirements

### NFR-1 性能

`GET /api/opportunity/tender-staging` 在常规本地 SQLite 数据量下响应时间必须小于 500ms。

新增筛选和排序不得导致页面首次列表加载明显慢于当前版本。

### NFR-2 数据安全

排序字段必须使用服务端白名单。服务端不得把前端传入的 `sortField` 直接拼接到 SQL。

筛选参数必须做长度限制和类型归一化。

### NFR-3 误删防护

除重复整理确认动作外，页面不得提供硬删除入口。

重复整理必须先预览再执行。

自动整理不得删除有多条操作痕迹的重复组。

### NFR-4 可追溯性

每条 staging 记录必须保留来源文件、来源平台、来源 URL 和原始 payload。

同步、归档、整理动作的前端提示必须包含足够信息支持人工排查。

### NFR-5 可维护性

新增筛选字段必须在前端类型定义、后端查询归一化、模型查询和测试中保持一致。

新增排序字段必须有测试覆盖。

## Existing Data and API Contracts

### 页面入口

- 页面：`/opportunity/tender-push`
- 页面名称：待推送招标

### 后端接口

- `GET /api/opportunity/tender-staging`
- `POST /api/opportunity/tender-staging/sync`
- `POST /api/opportunity/tender-staging/archive-source-files`
- `POST /api/opportunity/tender-staging/dedupe/preview`
- `POST /api/opportunity/tender-staging/dedupe/execute`
- `POST /api/opportunity/tender-staging/:id/parse-fields`
- `GET /api/opportunity/tender-staging/:id/web-search`
- `POST /api/opportunity/tender-staging/:id/web-search`
- `POST /api/opportunity/tender-staging/:id/push`

### Staging 表

表名：`opportunity_tender_staging`

核心字段：

- `source_item_id`
- `source_origin_id`
- `source_record_id`
- `title`
- `notice_type`
- `published_at`
- `published_date`
- `deadline_at`
- `deadline_date`
- `issuer`
- `budget_amount`
- `region`
- `source_platform`
- `source_url`
- `summary`
- `detail_excerpt`
- `announcement_html`
- `announcement_plain_text`
- `detail_payload_json`
- `source_file`
- `raw_payload_json`
- `push_status`
- `push_error`
- `last_synced_at`
- `pushed_at`
- `last_parsed_at`
- `parse_status`
- `parse_error`
- `parse_meta_json`
- `deleted_at`
- `delete_reason`

索引要求：

- `source_item_id` 唯一索引
- `push_status` 普通索引
- `published_date` 普通索引
- `source_file` 普通索引
- `deadline_date` 普通索引
- `source_platform` 普通索引

## Acceptance Criteria

1. 页面支持按关键词筛选，关键词可命中项目名称、招标单位、业务主键、来源文件、来源平台。
2. 页面支持按推送状态筛选。
3. 页面支持按来源平台和来源文件筛选。
4. 页面支持按发布日期范围筛选。
5. 页面支持按截止日期范围筛选。
6. 页面支持按截止状态筛选：未截止、已截止、无截止日期。
7. 页面支持按解析状态筛选。
8. 页面支持按数据完整性筛选：缺招标单位、缺截止日期、缺正文。
9. 默认排序为待推送 > 推送失败 > 已推送，同状态内发布日期倒序。
10. 页面支持截止日期升序排序。
11. 页面支持发布日期升序和倒序排序。
12. 页面支持更新时间倒序排序。
13. 页面支持推送时间倒序排序。
14. `归档源文件` 执行后只移动源 JSON 文件，不改变 staging 记录数量。
15. `整理数据` 执行前展示预览，确认后只删除高置信重复数据。
16. 页面不出现人工单条删除按钮。
17. 后端不新增人工删除 staging 记录接口。
18. 非法排序字段回退默认排序。
19. 列表接口新增筛选和排序测试通过。
20. 推送到小程序链路不受筛选排序改造影响。
