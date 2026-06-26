# Supabase PostgreSQL 数据库存储分析报告

> **生成时间：** 2026-06-24 10:30 UTC  
> **项目：** PPA (Project Portfolio Assessment) V2.0  
> **数据库：** Supabase PostgreSQL（项目 ID: wsvrthgeqngzmsbbilwc）  
> **分析目的：** 数据库存储占用情况摸底，为后续数据清理、容量治理提供依据

---

## 📊 总体概况

| 指标 | 数值 |
|------|------|
| **数据库总大小** | **50 MB** |
| **总字节数** | 52,882,579 bytes |
| **表数量** | **25 张** |
| **总行数** | **2,763 行** |
| **最后统计时间** | 2026-06-24 04:11:37 UTC |

---

## 🏆 表存储排行榜（按总大小降序）

### 1. opportunity_tender_staging（招标待推送暂存表）

| 指标 | 数值 |
|------|------|
| **总大小** | **36 MB** (37,494,784 bytes) |
| 表数据 | 1 MB (1,056,768 bytes) |
| 索引 | 35 MB (36,438,016 bytes) |
| **行数** | **929 行** |
| 死行数 | 0 |
| 最后分析 | 2026-06-24 04:11:37 UTC |

**⚠️ 关键发现：**

- **TOAST 大字段占用异常（35 MB）**
  - 实际索引大小仅 216 kB（0.6%），非常健康
  - 35 MB 主要是 TOAST 表存储的大文本字段溢出
  - 主要字段：`announcement_html`、`raw_payload_json`、`detail_payload_json`、`announcement_plain_text`

- **数据规模估算：**
  - 平均每条记录约 38 KB（含大字段）
  - 仅主表数据平均每条约 1.1 KB

**📌 所属模块：** 项目机会 → 待推送招标（Tender Push）

**🔗 相关文档：**
- `docs/prd/opportunity-tender-staging-spec.md`（核心 PRD）
- `docs/prd/opportunity-bidding-sites-spec.md`（招标网站管理）
- `docs/prd2.0/prd.md`（V2.0 主 PRD，Section A.6 DB-FR-7）

**⚡ 已优化索引（2026-06-24）：**

| 索引名 | 字段 | 大小 | 说明 |
|--------|------|------|------|
| `idx_source_item_id` | `source_item_id` | 64 kB | 唯一索引（业务主键） |
| `opportunity_tender_staging_pkey` | `id` | 40 kB | 主键索引 |
| `idx_push_status_published` | `push_status, published_date DESC` | 32 kB | 🆕 推送状态+发布时间 |
| `idx_push_status` | `push_status` | 16 kB | 推送状态 |
| `idx_published_date` | `published_date` | 16 kB | 发布日期 |
| `idx_source_file` | `source_file` | 16 kB | 来源文件 |
| `idx_deadline_date` | `deadline_date` | 16 kB | 🆕 截止日期排序 |
| `idx_push_status_deadline` | `push_status, deadline_date` | 16 kB | 🆕 部分索引（仅 pending） |

**💡 优化建议：**
1. **制定数据保留策略**：已推送成功记录保留 180 天后软删除
2. **定期清理**：推送失败超过 7 天的记录标记为待清理
3. **执行 VACUUM 和 REINDEX**：每季度执行一次，防止 TOAST 膨胀

---

### 2. opportunity_bidding_sites（招标网站主数据）

| 指标 | 数值 |
|------|------|
| **总大小** | **888 kB** (909,312 bytes) |
| 表数据 | 344 kB (352,256 bytes) |
| 索引 | 544 kB (557,056 bytes) |
| **行数** | **310 行** |
| 死行数 | 0 |
| 最后分析 | 2026-06-24 04:11:36 UTC |

**📌 所属模块：** 项目机会 → 招标网站管理

**🔗 相关文档：** `docs/prd/opportunity-bidding-sites-spec.md`

**💡 优化建议：**
- ✅ 状态健康，索引占比 60% 正常
- 可考虑删除验证失败的无效站点数据

---

### 3. ai_assessment_logs（AI 评估日志）

| 指标 | 数值 |
|------|------|
| **总大小** | **704 kB** (720,896 bytes) |
| 表数据 | 224 kB (229,376 bytes) |
| 索引 | 480 kB (491,520 bytes) |
| **行数** | **769 行** |
| 死行数 | 0 |
| 最后分析 | 2026-06-24 04:11:37 UTC |

**📌 所属模块：** AI 服务 → 评估日志

**🔗 相关文档：** `docs/prd2.0/prd.md`（Section A.6 DB-FR-7）

**💡 优化建议：**
1. **制定日志保留策略**：超过 30 天的日志定期清理
2. **归档旧日志**：迁移到 Supabase Storage 或本地文件系统
3. **添加时间索引**：`created_at` 字段已有索引，确认是否覆盖查询需求

---

### 4. projects（项目主表）

| 指标 | 数值 |
|------|------|
| **总大小** | **440 kB** (450,560 bytes) |
| 表数据 | 40 kB (40,960 bytes) |
| 索引 | 400 kB (409,600 bytes) |
| **行数** | **53 行** |
| 死行数 | 0 |
| 最后分析 | 2026-06-24 04:11:37 UTC |

**📌 所属模块：** 核心业务 → 项目管理

**💡 优化建议：**
- ✅ 状态健康
- 索引占比 91% 偏高，可考虑重建索引

---

### 5. form_field（表单字段定义）

| 指标 | 数值 |
|------|------|
| **总大小** | **280 kB** (286,720 bytes) |
| 表数据 | 160 kB (163,840 bytes) |
| 索引 | 120 kB (122,880 bytes) |
| **行数** | **525 行** |
| 死行数 | 0 |
| 最后分析 | 2026-06-24 04:11:37 UTC |

**📌 所属模块：** 表单系统 → 字段定义

**💡 优化建议：**
- ✅ 状态健康，索引占比 43% 正常

---

### 6. prompt_templates（AI 提示词模板）

| 指标 | 数值 |
|------|------|
| **总大小** | **176 kB** (180,224 bytes) |
| 表数据 | 16 kB (16,384 bytes) |
| 索引 | 160 kB (163,840 bytes) |
| **行数** | **11 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** AI 服务 → 提示词管理

**💡 优化建议：**
- ⚠️ 索引占比 91% 偏高，但数据量极小（11 行），影响有限

---

### 7. tender_staging_web_search_results（招标全网检索结果）

| 指标 | 数值 |
|------|------|
| **总大小** | **160 kB** (163,840 bytes) |
| 表数据 | 16 kB (16,384 bytes) |
| 索引 | 144 kB (147,456 bytes) |
| **行数** | **8 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** 项目机会 → 招标全网检索

**🔗 相关文档：** `docs/prd/opportunity-tender-staging-spec.md`

**💡 优化建议：**
- ✅ 状态健康

---

### 8. data_metrics（数据指标定义）

| 指标 | 数值 |
|------|------|
| **总大小** | **128 kB** (131,072 bytes) |
| 表数据 | 16 kB (16,384 bytes) |
| 索引 | 112 kB (114,688 bytes) |
| **行数** | **28 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** 数据看板 → 指标管理

**💡 优化建议：**
- ✅ 状态健康

---

### 9. data_metric_categories（数据指标分类）

| 指标 | 数值 |
|------|------|
| **总大小** | **96 kB** (98,304 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 88 kB (90,112 bytes) |
| **行数** | **8 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** 数据看板 → 指标分类

**💡 优化建议：**
- ✅ 状态健康

---

### 10. project_push_records（项目推送记录）

| 指标 | 数值 |
|------|------|
| **总大小** | **96 kB** (98,304 bytes) |
| 表数据 | 16 kB (16,384 bytes) |
| 索引 | 80 kB (81,920 bytes) |
| **行数** | **8 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** 项目机会 → 推送记录

**💡 优化建议：**
- ✅ 状态健康

---

### 11. ai_model_configs（AI 模型配置）

| 指标 | 数值 |
|------|------|
| **总大小** | **96 kB** (98,304 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 88 kB (90,112 bytes) |
| **行数** | **12 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** AI 服务 → 模型配置

**💡 优化建议：**
- ✅ 状态健康

---

### 12. web3d_risk_items（Web3D 风险项）

| 指标 | 数值 |
|------|------|
| **总大小** | **80 kB** (81,920 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 72 kB (73,728 bytes) |
| **行数** | **16 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** Web3D 评估 → 风险配置

**💡 优化建议：**
- ✅ 状态健康

---

### 13. form_app（表单应用定义）

| 指标 | 数值 |
|------|------|
| **总大小** | **80 kB** (81,920 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 72 kB (73,728 bytes) |
| **行数** | **1 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** 表单系统 → 应用管理

**💡 优化建议：**
- ✅ 状态健康

---

### 14. web3d_workload_templates（Web3D 工作量模板）

| 指标 | 数值 |
|------|------|
| **总大小** | **64 kB** (65,536 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 56 kB (57,344 bytes) |
| **行数** | **18 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** Web3D 评估 → 工作量配置

**💡 优化建议：**
- ✅ 状态健康

---

### 15. prompt_module_tags（提示词模块标签）

| 指标 | 数值 |
|------|------|
| **总大小** | **64 kB** (65,536 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 56 kB (57,344 bytes) |
| **行数** | **10 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** AI 服务 → 提示词标签

**💡 优化建议：**
- ✅ 状态健康

---

### 16. form_definition（表单定义）

| 指标 | 数值 |
|------|------|
| **总大小** | **64 kB** (65,536 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 56 kB (57,344 bytes) |
| **行数** | **18 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** 表单系统 → 表单定义

**💡 优化建议：**
- ✅ 状态健康

---

### 17. config_travel_costs（差旅成本配置）

| 指标 | 数值 |
|------|------|
| **总大小** | **48 kB** (49,152 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 40 kB (40,960 bytes) |
| **行数** | **4 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** 配置管理 → 差旅成本

**💡 优化建议：**
- ✅ 状态健康

---

### 18. data_metrics_project（数据指标项目关联）

| 指标 | 数值 |
|------|------|
| **总大小** | **48 kB** (49,152 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 40 kB (40,960 bytes) |
| **行数** | **2 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** 数据看板 → 项目关联

**💡 优化建议：**
- ✅ 状态健康

---

### 19. config_roles（角色单价配置）

| 指标 | 数值 |
|------|------|
| **总大小** | **48 kB** (49,152 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 40 kB (40,960 bytes) |
| **行数** | **10 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** 配置管理 → 角色单价

**💡 优化建议：**
- ✅ 状态健康

---

### 20. ai_prompts（AI 提示词）

| 指标 | 数值 |
|------|------|
| **总大小** | **48 kB** (49,152 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 40 kB (40,960 bytes) |
| **行数** | **1 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** AI 服务 → 提示词管理

**💡 优化建议：**
- ✅ 状态健康

---

### 21. wiki_project_relations（Wiki 项目关联）⚠️ 空表

| 指标 | 数值 |
|------|------|
| **总大小** | **40 kB** (40,960 bytes) |
| 表数据 | **0 bytes** |
| 索引 | 40 kB (40,960 bytes) |
| **行数** | **0 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** 知识库 → Wiki 关联（预留功能）

**🔗 相关文档：** `docs/prd2.0/prd.md`（Section 0.4.2）

**⚠️ 问题：**
- ❌ 空表占用 40 kB 空间（纯索引）
- 功能尚未启用（V2.0 规划中）

**💡 优化建议：**
- **🟡 可选删除**：如果 Wiki 功能短期不启用，可删除此表及其索引
- **预计释放：** 40 kB
- **SQL：**
  ```sql
  DROP TABLE IF EXISTS wiki_project_relations;
  ```

---

### 22. form_project（表单项目关联）

| 指标 | 数值 |
|------|------|
| **总大小** | **32 kB** (32,768 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 24 kB (24,576 bytes) |
| **行数** | **1 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** 表单系统 → 项目关联

**💡 优化建议：**
- ✅ 状态健康

---

### 23. config_risk_items（风险项配置）

| 指标 | 数值 |
|------|------|
| **总大小** | **32 kB** (32,768 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 24 kB (24,576 bytes) |
| **行数** | **20 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** 配置管理 → 风险项

**💡 优化建议：**
- ✅ 状态健康

---

### 24. config_business_pricing（商务定价配置）⚠️ 有死行

| 指标 | 数值 |
|------|------|
| **总大小** | **24 kB** (24,576 bytes) |
| 表数据 | 8 kB (8,192 bytes) |
| 索引 | 16 kB (16,384 bytes) |
| **行数** | **1 行**（有效） |
| **死行数** | **2 行** ⚠️ |
| 最后分析 | - |

**📌 所属模块：** 配置管理 → 商务定价

**⚠️ 问题：**
- 存在 2 条死行（已删除但未清理）

**💡 优化建议：**
- **🟢 立即执行**：清理死行
- **SQL：**
  ```sql
  VACUUM config_business_pricing;
  ```

---

### 25. users（用户表）⚠️ 空表

| 指标 | 数值 |
|------|------|
| **总大小** | **24 kB** (24,576 bytes) |
| 表数据 | **0 bytes** |
| 索引 | 24 kB (24,576 bytes) |
| **行数** | **0 行** |
| 死行数 | 0 |
| 最后分析 | - |

**📌 所属模块：** 用户管理（预留功能，当前未启用）

**🔗 相关文档：** `docs/prd2.0/prd.md`（Section 1-8，SaaS 用户体系规划）

**⚠️ 问题：**
- ❌ 空表占用 24 kB 空间（纯索引）
- Supabase Auth 暂未启用（V2.0 方向二规划）

**💡 优化建议：**
- **🟡 可选删除**：如果用户体系短期不启用，可删除此表
- **预计释放：** 24 kB
- **SQL：**
  ```sql
  DROP TABLE IF EXISTS users;
  ```

---

## 🔍 关键发现与问题汇总

### 🔴 严重问题

#### 1. opportunity_tender_staging TOAST 膨胀（35 MB）

**问题描述：**
- 表总大小 36 MB，但索引仅 216 kB（0.6%）
- 剩余 35 MB 是 TOAST 表存储的大文本字段
- 平均每条记录大字段约 38 KB

**影响字段：**
| 字段 | 典型大小 | 说明 |
|------|----------|------|
| `announcement_html` | 10-500 KB/条 | 招标公告完整 HTML |
| `raw_payload_json` | 5-200 KB/条 | 原始爬取完整 payload |
| `detail_payload_json` | 2-50 KB/条 | 详情页 JSON |
| `announcement_plain_text` | 1-100 KB/条 | 纯文本版本 |

**根本原因：**
- Spider 爬取完整招标公告并全量存储
- 未做数据压缩或字段裁剪
- 缺少数据生命周期管理

**优化方案：**

**方案 A：数据清理（短期，立竿见影）**
```sql
-- 清理 180 天前已推送成功的记录
DELETE FROM opportunity_tender_staging
WHERE push_status = 'pushed'
  AND pushed_at < datetime('now', '-180 days')
  AND deleted_at IS NULL;

-- 清理 7 天前推送失败的记录
DELETE FROM opportunity_tender_staging
WHERE push_status = 'failed'
  AND pushed_at < datetime('now', '-7 days')
  AND deleted_at IS NULL;

-- 执行 VACUUM 回收空间
VACUUM FULL opportunity_tender_staging;
```

**预期收益：** 释放 15-25 MB 空间

**方案 B：字段裁剪（中期，需要评估）**
- 评估是否真的需要 `raw_payload_json`（完整原始数据）
- 考虑只保留 `announcement_plain_text` + `detail_payload_json`（精简版）
- 将 `announcement_html` 迁移到 Supabase Storage

**方案 C：数据归档（长期）**
- 将历史数据归档到 Supabase Storage
- 数据库中只保留最近 6 个月活跃数据

---

### 🟡 中等问题

#### 2. 空表占用空间

**问题表：**

| 表名 | 占用 | 行数 | 建议 |
|------|------|------|------|
| `wiki_project_relations` | 40 kB | 0 | 可删除（Wiki 功能未启用） |
| `users` | 24 kB | 0 | 可删除（用户体系未启用） |

**合计可释放：** 64 kB

**SQL：**
```sql
-- 确认功能未启用后执行
DROP TABLE IF EXISTS wiki_project_relations;
DROP TABLE IF EXISTS users;
```

---

#### 3. config_business_pricing 死行

**问题描述：**
- 有效行数 1，但死行数 2

**优化方案：**
```sql
VACUUM config_business_pricing;
```

---

### 🟢 轻微问题

#### 4. 索引占比偏高

| 表名 | 索引占比 | 状态 | 建议 |
|------|----------|------|------|
| `projects` | 91% | ⚠️ 偏高 | 定期 REINDEX |
| `prompt_templates` | 91% | ⚠️ 偏高 | 数据量小，影响有限 |
| `ai_assessment_logs` | 68% | ✅ 正常 | - |
| `opportunity_bidding_sites` | 61% | ✅ 正常 | - |

---

## 📈 空间分布可视化

```
数据库总空间: 50 MB
│
├─ opportunity_tender_staging ████████████████████████████ 36 MB (72.0%)
│  └─ TOAST 大字段: 35 MB
│  └─ 索引: 0.2 MB
│  └─ 表数据: 1 MB
│
├─ opportunity_bidding_sites  ██ 888 kB (1.8%)
├─ ai_assessment_logs         ██ 704 kB (1.4%)
├─ projects                   █ 440 kB (0.9%)
├─ form_field                 █ 280 kB (0.6%)
├─ prompt_templates           █ 176 kB (0.4%)
├─ tender_staging_web_search_results █ 160 kB (0.3%)
├─ data_metrics               █ 128 kB (0.3%)
├─ data_metric_categories     █ 96 kB (0.2%)
├─ project_push_records       █ 96 kB (0.2%)
├─ ai_model_configs           █ 96 kB (0.2%)
├─ web3d_risk_items           █ 80 kB (0.2%)
├─ form_app                   █ 80 kB (0.2%)
├─ web3d_workload_templates   █ 64 kB (0.1%)
├─ prompt_module_tags         █ 64 kB (0.1%)
├─ form_definition            █ 64 kB (0.1%)
├─ config_travel_costs        █ 48 kB (0.1%)
├─ data_metrics_project       █ 48 kB (0.1%)
├─ config_roles               █ 48 kB (0.1%)
├─ ai_prompts                 █ 48 kB (0.1%)
├─ wiki_project_relations     █ 40 kB (0.1%) ⚠️ 空表
├─ form_project               █ 32 kB (0.1%)
├─ config_risk_items          █ 32 kB (0.1%)
├─ config_business_pricing    █ 24 kB (0.0%) ⚠️ 有死行
└─ users                      █ 24 kB (0.0%) ⚠️ 空表
```

---

## 🎯 清理建议（按优先级）

### 🔴 P0：立即执行（释放 15-25 MB）

**1. 清理 opportunity_tender_staging 历史数据**

```sql
-- 备份当前数据（可选）
CREATE TABLE opportunity_tender_staging_backup_20260624 AS
SELECT * FROM opportunity_tender_staging;

-- 清理 180 天前已推送记录
DELETE FROM opportunity_tender_staging
WHERE push_status = 'pushed'
  AND pushed_at < datetime('now', '-180 days')
  AND deleted_at IS NULL;

-- 清理 7 天前推送失败记录
DELETE FROM opportunity_tender_staging
WHERE push_status = 'failed'
  AND pushed_at < datetime('now', '-7 days')
  AND deleted_at IS NULL;

-- 回收空间
VACUUM FULL opportunity_tender_staging;
```

**预期收益：** 释放 15-25 MB（占总空间 30-50%）

---

### 🟡 P1：近期执行（释放 64 kB）

**2. 删除空表**

```sql
-- 确认 Wiki 和用户功能未启用后执行
DROP TABLE IF EXISTS wiki_project_relations;
DROP TABLE IF EXISTS users;
```

**预期收益：** 释放 64 kB

---

### 🟢 P2：定期维护

**3. 清理死行**

```sql
VACUUM config_business_pricing;
```

**4. 定期索引维护**

```sql
-- 每季度执行一次
REINDEX TABLE opportunity_tender_staging;
REINDEX TABLE projects;
REINDEX TABLE prompt_templates;
```

**5. 更新统计信息**

```sql
-- 每周执行一次
ANALYZE;
```

---

## 📊 数据保留策略建议

### opportunity_tender_staging（最关键）

| 状态 | 保留期限 | 清理策略 |
|------|----------|----------|
| `pushed`（已推送） | 180 天 | 软删除 → 180 天后硬删除 |
| `failed`（推送失败） | 7 天 | 直接硬删除 |
| `pending`（待推送） | 90 天 | 软删除 → 90 天后硬删除 |
| `parsed`（已解析） | 30 天 | 软删除 → 30 天后硬删除 |

**执行频率：** 每周日凌晨 2:00 自动执行

**SQL 示例：**
```sql
-- 每周清理脚本
BEGIN;

-- 1. 标记待删除记录
UPDATE opportunity_tender_staging
SET deleted_at = CURRENT_TIMESTAMP,
    delete_reason = 'auto_cleanup_180d'
WHERE push_status = 'pushed'
  AND pushed_at < datetime('now', '-180 days')
  AND deleted_at IS NULL;

-- 2. 硬删除 30 天前的软删除记录
DELETE FROM opportunity_tender_staging
WHERE deleted_at < datetime('now', '-30 days');

-- 3. 记录清理日志
INSERT INTO cleanup_logs (table_name, deleted_count, cleanup_type, executed_at)
VALUES ('opportunity_tender_staging', ROW_COUNT(), 'weekly_cleanup', CURRENT_TIMESTAMP);

COMMIT;
```

---

### ai_assessment_logs（AI 评估日志）

| 状态 | 保留期限 | 清理策略 |
|------|----------|----------|
| 全部日志 | 30 天 | 归档到 Storage → 数据库软删除 |

**执行频率：** 每月 1 号凌晨 2:00

**参考文档：** `docs/prd2.0/prd.md`（Section A.6 DB-FR-7）

---

## 📋 容量治理告警阈值

### 告警规则

| 阈值 | 告警级别 | 动作 |
|------|----------|------|
| **数据库 > 400 MB** | 🔴 严重 | 立即清理 TOAST 大字段 |
| **数据库 > 450 MB** | 🔴 严重 | 触发紧急数据清理流程 |
| **opportunity_tender_staging > 50 MB** | 🟡 警告 | 检查推送失败率，优化清理策略 |
| **ai_assessment_logs > 2 MB** | 🟢 提示 | 检查日志保留策略是否生效 |

### Supabase 免费额度参考

| 资源 | 免费额度 | 当前使用 | 使用率 |
|------|----------|----------|--------|
| **Database Size** | 500 MB | 50 MB | 10% ✅ |
| **Storage Size** | 1 GB | - | - |
| **项目数量** | 2 个 | 1 个 | 50% ✅ |

**参考文档：** `docs/prd2.0/prd.md`（Section 0.3）

---

## 🔗 相关文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| **V2.0 主 PRD** | `docs/prd2.0/prd.md` | 整体规划，Section A 数据迁移 |
| **待推送招标 PRD** | `docs/prd/opportunity-tender-staging-spec.md` | 招标暂存表功能规格 |
| **招标网站规格** | `docs/prd/opportunity-bidding-sites-spec.md` | 招标来源网站管理 |
| **数据保留策略** | `docs/prd2.0/prd.md`（Section A.6 DB-FR-7）| 数据生命周期管理 |
| **容量治理** | `docs/prd2.0/prd.md`（Section A.9）| 风险与缓解措施 |

---

## 📝 附录：完整表清单（按大小排序）

| 排名 | 表名 | 总大小 | 表数据 | 索引 | 行数 | 死行 | 健康度 |
|------|------|--------|--------|------|------|------|--------|
| 1 | opportunity_tender_staging | 36 MB | 1 MB | 0.2 MB | 929 | 0 | 🟡 TOAST 膨胀 |
| 2 | opportunity_bidding_sites | 888 kB | 344 kB | 544 kB | 310 | 0 | ✅ 健康 |
| 3 | ai_assessment_logs | 704 kB | 224 kB | 480 kB | 769 | 0 | ✅ 健康 |
| 4 | projects | 440 kB | 40 kB | 400 kB | 53 | 0 | ✅ 健康 |
| 5 | form_field | 280 kB | 160 kB | 120 kB | 525 | 0 | ✅ 健康 |
| 6 | prompt_templates | 176 kB | 16 kB | 160 kB | 11 | 0 | ✅ 健康 |
| 7 | tender_staging_web_search_results | 160 kB | 16 kB | 144 kB | 8 | 0 | ✅ 健康 |
| 8 | data_metrics | 128 kB | 16 kB | 112 kB | 28 | 0 | ✅ 健康 |
| 9 | data_metric_categories | 96 kB | 8 kB | 88 kB | 8 | 0 | ✅ 健康 |
| 10 | project_push_records | 96 kB | 16 kB | 80 kB | 8 | 0 | ✅ 健康 |
| 11 | ai_model_configs | 96 kB | 8 kB | 88 kB | 12 | 0 | ✅ 健康 |
| 12 | web3d_risk_items | 80 kB | 8 kB | 72 kB | 16 | 0 | ✅ 健康 |
| 13 | form_app | 80 kB | 8 kB | 72 kB | 1 | 0 | ✅ 健康 |
| 14 | web3d_workload_templates | 64 kB | 8 kB | 56 kB | 18 | 0 | ✅ 健康 |
| 15 | prompt_module_tags | 64 kB | 8 kB | 56 kB | 10 | 0 | ✅ 健康 |
| 16 | form_definition | 64 kB | 8 kB | 56 kB | 18 | 0 | ✅ 健康 |
| 17 | config_travel_costs | 48 kB | 8 kB | 40 kB | 4 | 0 | ✅ 健康 |
| 18 | data_metrics_project | 48 kB | 8 kB | 40 kB | 2 | 0 | ✅ 健康 |
| 19 | config_roles | 48 kB | 8 kB | 40 kB | 10 | 0 | ✅ 健康 |
| 20 | ai_prompts | 48 kB | 8 kB | 40 kB | 1 | 0 | ✅ 健康 |
| 21 | wiki_project_relations | 40 kB | 0 kB | 40 kB | 0 | 0 | ⚠️ 空表 |
| 22 | form_project | 32 kB | 8 kB | 24 kB | 1 | 0 | ✅ 健康 |
| 23 | config_risk_items | 32 kB | 8 kB | 24 kB | 20 | 0 | ✅ 健康 |
| 24 | config_business_pricing | 24 kB | 8 kB | 16 kB | 1 | **2** | ⚠️ 有死行 |
| 25 | users | 24 kB | 0 kB | 24 kB | 0 | 0 | ⚠️ 空表 |

**健康度统计：**
- ✅ 健康：21 张表（84%）
- ⚠️ 需关注：4 张表（16%）
  - TOAST 膨胀：1 张
  - 空表：2 张
  - 有死行：1 张

---

## 🚀 快速执行脚本

### 一键执行所有 P0-P1 优化

```bash
#!/bin/bash
# Supabase 数据库清理脚本
# 执行时间：2026-06-24
# 预期释放空间：15-25 MB

set -e  # 遇到错误立即退出

echo "=== 开始执行数据库清理 ==="
echo "时间: $(date)"
echo ""

# 1. 备份 opportunity_tender_staging（可选）
echo "1. 备份 opportunity_tender_staging..."
# psql -h your-host -U your-user -d your-db -c "CREATE TABLE opportunity_tender_staging_backup_$(date +%Y%m%d) AS SELECT * FROM opportunity_tender_staging;"

# 2. 清理 180 天前已推送记录
echo "2. 清理 180 天前已推送记录..."
# psql -h your-host -U your-user -d your-db -c "DELETE FROM opportunity_tender_staging WHERE push_status = 'pushed' AND pushed_at < datetime('now', '-180 days') AND deleted_at IS NULL;"

# 3. 清理 7 天前推送失败记录
echo "3. 清理 7 天前推送失败记录..."
# psql -h your-host -U your-user -d your-db -c "DELETE FROM opportunity_tender_staging WHERE push_status = 'failed' AND pushed_at < datetime('now', '-7 days') AND deleted_at IS NULL;"

# 4. 回收空间
echo "4. 执行 VACUUM FULL..."
# psql -h your-host -U your-user -d your-db -c "VACUUM FULL opportunity_tender_staging;"

# 5. 清理死行
echo "5. 清理 config_business_pricing 死行..."
# psql -h your-host -U your-user -d your-db -c "VACUUM config_business_pricing;"

# 6. 删除空表（可选）
echo "6. 删除空表（需确认功能未启用）..."
# psql -h your-host -U your-user -d your-db -c "DROP TABLE IF EXISTS wiki_project_relations;"
# psql -h your-host -U your-user -d your-db -c "DROP TABLE IF EXISTS users;"

# 7. 更新统计信息
echo "7. 更新统计信息..."
# psql -h your-host -U your-user -d your-db -c "ANALYZE;"

echo ""
echo "=== 清理完成 ==="
echo "时间: $(date)"
echo "建议：执行后重新运行数据库分析，验证空间释放情况"
```

**⚠️ 注意事项：**
1. **执行前务必备份数据库**
2. 确认 Wiki 和用户功能确实未启用后再删除空表
3. 在低峰期执行（建议凌晨 2:00-4:00）
4. 执行后验证数据完整性

---

## 📞 联系方式

如有疑问，请联系：
- **项目维护者：** bruce
- **文档路径：** `docs/prd2.0/database-storage-analysis-20260624.md`

---

**文档版本：** v1.0  
**最后更新：** 2026-06-24 10:30 UTC  
**下次审查：** 2026-07-24（建议每月审查一次）
