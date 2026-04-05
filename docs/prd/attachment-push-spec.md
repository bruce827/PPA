# 附件管理与项目推送功能规格

> **版本**: 1.0
> **日期**: 2026-04-03
> **状态**: ✅ 已实现

---

## 1. 附件管理

### 1.1 功能概述

项目详情页新增"附件管理"Tab，允许用户上传、查看、下载、删除与项目相关的文档（需求说明书、合同、技术方案等）。附件完整性也是项目推送的前置条件之一。

### 1.2 技术架构

| 层级 | 组件 | 说明 |
|------|------|------|
| 前端 | `AttachmentManager.tsx` | React 组件，拖拽上传 + 文件列表 + 下载/删除 |
| 路由 | `POST /api/projects/:projectId/attachments` | 上传入口 |
| 控制器 | `attachmentController.js` | 处理 HTTP 请求 |
| 服务 | `attachmentService.js` | 文件存储、元数据管理、中文文件名编码修复 |

### 1.3 文件存储规则

- **存储路径**: `server/uploads/project-attachments/{projectId}/{filename}`
- **文件命名**: `{projectId}_{timestamp}_{sanitizedName}`
  - `projectId`: 项目 ID
  - `timestamp`: 上传时间戳（毫秒）
  - `sanitizedName`: 清理后的原始文件名（保留中文、字母、数字、`.`、`-`、`()`）
- **中文文件名处理**: Multer 2.x 存在 UTF-8→Latin-1 编码 bug，通过 `Buffer.from(str, 'latin1').toString('utf8')` 还原

### 1.4 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/projects/:projectId/attachments` | 上传附件（multipart/form-data） |
| GET | `/api/projects/:projectId/attachments` | 获取附件列表 |
| GET | `/api/projects/:projectId/attachments/download/:attachmentId` | 下载附件 |
| DELETE | `/api/projects/:projectId/attachments/:attachmentId` | 删除附件 |

### 1.5 前端集成

- 详情页新增 Tab 7 "附件管理"
- 组件: `<AttachmentManager projectId={id} />`
- 支持拖拽上传、点击选择、文件列表展示（文件名 + 大小 + 时间）、下载、删除

---

## 2. 项目推送至小程序

### 2.1 功能概述

历史项目可一键推送到微信小程序内部渠道。推送前自动校验商务报价、附件完整性、预算格式，推送结果记录可追溯。

### 2.2 推送流程

```
用户点击"推送"
  ↓
打开 PushModal（展示项目摘要）
  ↓
自动触发前置校验（validatePush）
  ├─ 商务报价已生成且 quote_total_wan > 0
  ├─ 至少上传 1 个附件
  └─ 客户预算格式正确（> 0 或留空/0）
  ↓
用户输入客户预算（可选）
  ↓
执行推送（executePush）
  ├─ 1. 校验（再次）
  ├─ 2. 构建推送数据快照（buildPushSnapshot）
  ├─ 3. 上传附件至 CloudBase 云存储
  ├─ 4. 调用云函数 upsertInternalProject
  ├─ 5. 写入 project_push_records 表
  └─ 6. 返回结果
  ↓
Modal 显示成功/失败状态
```

### 2.3 推送数据快照结构

| 字段 | 类型 | 来源 |
|------|------|------|
| `projectName` | string | `projects.name` |
| `projectDescription` | string | `projects.description` |
| `ourQuote` | number | `business_quote_json.amounts.quote_total_wan` 或 `.quote_total_wan` |
| `implementationCost` | number | `business_quote_json.amounts.base_cost_wan` 或 `.base_cost_wan` |
| `customerBudget` | number | 用户输入 |
| `budgetDifference` | number | `ourQuote - customerBudget` |
| `riskTotalScore` | number | `projects.final_risk_score` |
| `riskLevel` | string | 根据分值: ≥70 高风险, ≥40 中风险, >0 低风险 |
| `totalWorkloadDays` | number | `projects.final_workload_days` |
| `newDevWorkloadDays` | number | `assessment_details_json.development_workload` 总和 |
| `travelCostTotal` | number | `travel_months × travel_headcount × 7500 / 10000` |
| `top3RiskScores` | array | `assessment_details_json.risk_scores` TOP 3 |
| `attachmentFileIds` | array | CloudBase 云存储 fileID 列表 |

### 2.4 前置校验规则

| 校验项 | 规则 | 错误提示 |
|--------|------|----------|
| 商务报价 | 已生成且总额 > 0 | "请先在历史页或详情页生成商务报价" |
| 附件数量 | 至少 1 个 | "请至少上传 1 个附件后再推送" |
| 客户预算 | > 0（推送时） | "请输入有效的客户预算金额（大于0）" |

### 2.5 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/projects/:id/push/validate` | 前置校验 |
| POST | `/api/projects/:id/push` | 执行推送 |
| GET | `/api/projects/:id/push-history` | 推送历史 |

### 2.6 数据库表

**`project_push_records`** 表结构：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `project_id` | INTEGER | 项目 ID |
| `push_time` | DATETIME | 推送时间 |
| `push_status` | TEXT | success / failed |
| `our_quote` | REAL | 我方报价（万元） |
| `customer_budget` | REAL | 客户预算（万元） |
| `budget_difference` | REAL | 差额（万元） |
| `risk_level` | TEXT | 风险等级 |
| `risk_total_score` | INTEGER | 风险总分 |
| `total_workload_days` | REAL | 总工作量（人天） |
| `new_dev_workload_days` | REAL | 新开发工作量（人天） |
| `travel_cost_total` | REAL | 差旅成本（万元） |
| `top3_risk_scores_json` | TEXT | TOP 3 风险 JSON |
| `attachment_file_ids_json` | TEXT | 附件 fileID JSON |
| `cost_breakdown_json` | TEXT | 商务报价完整 JSON |
| `project_name` | TEXT | 项目名称（冗余） |
| `project_description` | TEXT | 项目描述（冗余） |
| `error_message` | TEXT | 失败原因 |
| `push_source` | TEXT | 推送来源（manual / auto） |

索引：`idx_push_project_id(project_id)`, `idx_push_time(push_time)`

### 2.7 前端集成

- 历史页操作列增加"推送"按钮
- 组件: `<PushModal projectId={id} projectName={name} />`
- 多阶段加载动画: validating → uploading → pushing → success/failed

### 2.8 CloudBase 云函数

**`upsertInternalProject`**:
- 使用 `MINIAPP_PUSH_SECRET_KEY` 认证
- 写入/更新 `internal_projects` 集合
- 自动创建集合（若不存在）

### 2.9 已知问题与修复记录

| 问题 | 根因 | 修复 |
|------|------|------|
| `ourQuote` 为 null | 商务报价 JSON 中 `quote_total_wan` 嵌套在 `amounts` 内 | 优先查 `amounts.quote_total_wan` |
| 工作量为 null | 字段名拼写错误 `assessment_data_json` | 改为 `assessment_details_json` |
| 差旅成本为 null | 实际数据为 `travel_months + travel_headcount` | 改为公式计算 |
| 环境变量冲突 | `MINIAPP_PUSH_FUNCTION_NAME` 被招标推送占用 | 改用 `INTERNAL_PUSH_FUNCTION_NAME` |
| 预算 0 校验失败 | `validateBudget` 拒绝 ≤ 0 | 预算 0 时跳过校验 |
| 中文文件名乱码 | Multer 2.x UTF-8→Latin-1 错误 | `Buffer.from(str, 'latin1').toString('utf8')` |

---

_本文档为 PPA PRD 的补充规格，对应主 PRD 中的 FR-8（附件管理）和 FR-9（项目推送）。_
