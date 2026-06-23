# DB Schema Reference (DB Schema 参考)

**版本**: v1.0  
**用途**: 从项目 SQLite 数据库 (`ppa.db`) 自动生成 Schema 参考文档，供 DB 引导工作流使用。

---

## 1. 执行方式

### 1.1 自动生成 Schema

执行以下命令自动生成：

```bash
sqlite3 ../../../server/ppa.db ".schema" > ./outputs/db-schema-latest.txt
sqlite3 ../../../server/ppa.db ".tables" > ./outputs/db-tables-latest.txt
```

### 1.2 手动维护（可选）

若无法直接访问数据库，可手动创建 `./outputs/db-schema-manual.md`。

---

## 2. 项目数据库表结构

### 2.1 核心业务表

| 表名 | 用途 | 主要字段 |
|------|------|----------|
| `projects` | 项目评估数据 | id, name, final_total_cost, final_risk_score, final_workload_days, project_type, tags_json |
| `opportunity_bidding_sites` | 招标信息来源网站 | id, name, source_level, province, platform_type, validation_status |
| `opportunity_tender_staging` | 招标公告待推送数据 | id, title, published_date, region, budget_amount, push_status |
| `tender_staging_web_search_results` | 招标搜索结果 | id, tender_staging_id, search_query, result_summary |

### 2.2 配置表

| 表名 | 用途 | 主要字段 |
|------|------|----------|
| `config_roles` | 角色配置（单价） | role_name, unit_price |
| `config_risk_items` | 风险项配置 | category, item_name, options_json |
| `config_travel_costs` | 差旅成本配置 | item_name, cost_per_month |
| `ai_model_configs` | AI 模型配置 | config_name, provider, model_name |
| `ai_prompts` | AI 提示词模板 | id, name, content, variables_json |
| `web3d_risk_items` | 3D 风险项 | step_name, item_name, weight |
| `web3d_workload_templates` | 3D 工作量模板 | category, item_name, base_days |

### 2.3 系统表

| 表名 | 用途 | 主要字段 |
|------|------|----------|
| `users` | 用户 | id, username, role |
| `ai_assessment_logs` | AI 评估日志 | id, prompt_id, model_used, duration_ms, status |

---

## 3. 推荐分析查询

### 3.1 项目成本分析

```sql
-- 项目成本分布
SELECT 
  project_type,
  COUNT(*) as count,
  AVG(final_total_cost) as avg_cost,
  MIN(final_total_cost) as min_cost,
  MAX(final_total_cost) as max_cost
FROM projects
WHERE final_total_cost IS NOT NULL
GROUP BY project_type;
```

### 3.2 项目风险评估

```sql
-- 风险评分分布
SELECT 
  final_risk_score,
  COUNT(*) as count
FROM projects
WHERE final_risk_score IS NOT NULL
GROUP BY final_risk_score
ORDER BY final_risk_score;
```

### 3.3 招标趋势分析

```sql
-- 月度招标数量趋势
SELECT 
  strftime('%Y-%m', published_date) as month,
  COUNT(*) as tender_count,
  AVG(CAST(budget_amount AS REAL)) as avg_budget
FROM opportunity_tender_staging
WHERE published_date IS NOT NULL
GROUP BY month
ORDER BY month DESC;
```

### 3.4 渠道质量分析

```sql
-- 各来源级别的验证状态
SELECT 
  source_level,
  validation_status,
  COUNT(*) as count
FROM opportunity_bidding_sites
GROUP BY source_level, validation_status;
```

---

## 4. 数据质量检查清单

执行 DB 引导工作流前，建议先检查：

- [ ] 数据库文件存在且可读
- [ ] 目标表有足够数据量（> 10 行）
- [ ] 关键字段无大量空值
- [ ] 数值字段范围合理
- [ ] 日期字段格式正确

---

## 5. 下一步

生成 Schema 后，执行：

1. `[DB]` - 进入 DB 引导入口
2. `[DBS]` - 选择要分析的数据表
3. `[DBQ]` - 定义查询条件
4. `[DBV]` - 验证数据质量
