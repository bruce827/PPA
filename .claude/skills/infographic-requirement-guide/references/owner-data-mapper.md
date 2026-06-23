# 数据映射 (Data Mapper) - v1.1 增强版

主要变更：
1. 增加数据预览功能（执行 preview_sql 获取实际样例）
2. 增加 SQL 安全检查
3. 扩展意图类型支持（distribution/ranking/correlation）

---

## 前置检查

1. 读取 `workflow-state.json` 与 `owner-intent` 产物。
2. 若 `INTENT_CLARIFY` 未完成，提示先执行 `[CLARIFY]`。
3. 若 `final_intent` 为空，提示需要先澄清意图。

---

## 1. 业务术语映射表

### 1.1 实体映射

| 业务术语 | 数据库表 | 说明 |
|----------|----------|------|
| 招标文件 | `opportunity_tender_staging` | 招标公告待推送数据 |
| 推送记录 | `opportunity_tender_staging` | 使用 push_status 字段 |
| 项目/项目评估 | `projects` | 项目评估数据 |
| 渠道/来源/平台 | `opportunity_tender_staging.source_platform` | 招标信息来源平台（字段） |
| 渠道/来源 | `opportunity_bidding_sites` | 招标信息来源网站 |
| 用户 | `users` | 系统用户 |

### 1.2 常用字段映射

| 业务字段 | 数据库字段 | 说明 |
|----------|------------|------|
| 渠道/来源 | `source_platform` | 招标信息来源平台 |
| 地区 | `region` | 招标项目所在地区 |
| 发布时间 | `published_date` | 招标公告发布日期 |
| 截止时间 | `deadline_date` | 投标截止日期 |
| 预算金额 | `budget_amount` | 项目预算 |
| 推送状态 | `push_status` | pushed/pending/error |
| 业主单位 | `issuer` | 招标业主 |

### 1.3 指标映射

| 业务指标 | SQL 表达 | 说明 |
|----------|---------|------|
| 数量/多少 | `COUNT(*)` | 计数 |
| 总计/合计 | `SUM(field)` | 求和 |
| 平均 | `AVG(field)` | 平均值 |
| 占比 | `COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()` | 百分比 |
| 成功率 | `COUNT(CASE WHEN status='success') / COUNT(*)` | 比率 |

### 1.4 时间范围映射

| 业务表达 | SQL 表达 | 说明 |
|----------|---------|------|
| 最近一周 | `date >= date('now', '-7 days')` | 7 天前至今 |
| 最近一月 | `date >= date('now', '-1 month')` | 30 天前至今 |
| 最近三月 | `date >= date('now', '-3 months')` | 90 天前至今 |
| 今年 | `strftime('%Y', date) = strftime('%Y', 'now')` | 当前年份 |
| 全部时间 | 无时间过滤 | - |

---

## 2. 映射逻辑

### 2.1 根据意图类型选择映射

```python
# 伪代码示例
intent_type_mapping = {
    "count": "COUNT(*) as value",
    "comparison": "{dimension}, COUNT(*) as value, ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage",
    "trend": "strftime('%Y-%m-%d', {time_field}) as period, COUNT(*) as value",
    "diagnosis": "{dim1}, {dim2}, COUNT(*) as value",
    "distribution": "{dimension}, COUNT(*) as count, ROUND(AVG({metric_field}), 2) as avg_value",
    "ranking": "{dimension}, COUNT(*) as value ORDER BY value DESC",
    "correlation": "{field1}, {field2}, COUNT(*) as frequency"
}

if intent_type == "count":
    select_clause = "COUNT(*) as value"
elif intent_type == "comparison":
    select_clause = "{dimension}, COUNT(*) as value"
elif intent_type == "trend":
    select_clause = "strftime('%Y-%m-%d', {time_field}) as period, COUNT(*) as value"
elif intent_type == "diagnosis":
    select_clause = "{dim1}, {dim2}, COUNT(*) as value"
elif intent_type == "distribution":
    select_clause = "{dimension}, COUNT(*) as count, ROUND(AVG({metric_field}), 2) as avg_value"
elif intent_type == "ranking":
    select_clause = "{dimension}, COUNT(*) as value"
    order_by = "ORDER BY value DESC"
elif intent_type == "correlation":
    select_clause = "{field1}, {field2}, COUNT(*) as frequency"
```

### 2.2 构建 WHERE 子句

```python
where_clauses = []
params = []  # 参数化查询，防止注入

if filters.get("time_field") and filters.get("time_value"):
    # 使用参数化查询
    where_clauses.append(f"{filters['time_field']} >= ?")
    params.append(filters['time_value'])
    
if filters.get("push_status"):
    where_clauses.append(f"push_status = ?")
    params.append(filters['push_status'])

where_clause = " AND ".join(where_clauses) if where_clauses else ""
```

### 2.3 生成预览 SQL

```python
# 预览查询：带 LIMIT 5，用于快速验证
preview_sql = full_sql.rstrip(';') + " LIMIT 5"
```

---

## 3. SQL 安全检查

### 3.1 检查规则

在执行映射前，必须验证：

1. **只读操作**：只允许 SELECT 查询
2. **白名单表**：只能查询预定义的表
3. **无子查询注入**：检查是否有 UNION、INSERT、DELETE、DROP 等关键字
4. **参数化查询**：时间值和字符串值必须参数化

### 3.2 验证函数

```python
ALLOWED_TABLES = {
    'opportunity_tender_staging',
    'opportunity_bidding_sites', 
    'projects',
    'users'
}

DANGEROUS_PATTERNS = [
    'DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER',
    'ATTACH', 'DETACH', 'CREATE', 'PRAGMA'
]

def validate_sql(sql, target_table):
    sql_upper = sql.upper()
    
    # 检查危险关键字
    for pattern in DANGEROUS_PATTERNS:
        if pattern in sql_upper:
            return False, f"包含危险关键字：{pattern}"
    
    # 检查表名白名单
    if target_table not in ALLOWED_TABLES:
        return False, f"表名不在白名单：{target_table}"
    
    # 检查只读
    if not sql_upper.strip().startswith('SELECT'):
        return False, "只允许 SELECT 查询"
    
    return True, "验证通过"
```

---

## 4. 产物输出

### 4.1 文件名

`owner-data-map-{draft_id}.yaml`

### 4.2 保存路径

`./outputs/owner-data-map-{draft_id}.yaml`

### 4.3 文件结构

```yaml
draft_id: "{draft_id}"
generated_at: "{timestamp}"

mapping_result:
  target_table: "{表名}"
  target_table_cn: "{中文说明}"

  select_clause: "{SELECT 子句}"
  from_clause: "{FROM 子句}"
  where_clause: "{WHERE 子句}"
  group_by_clause: "{GROUP BY 子句或 null}"
  order_by_clause: "{ORDER BY 子句或 null}"

  full_sql: "{完整 SQL}"
  preview_sql: "{带 LIMIT 5 的 SQL}"
  
  # 新增：用于预览的实际数据
  data_preview:
    columns: ["列名 1", "列名 2"]
    sample_rows:
      - ["值 1", "值 2"]
      - ["值 1", "值 2"]
    row_count: 实际返回行数

  expected_columns:
    - name: "{列名}"
      type: "{类型}"
      description: "{中文含义}"

security_check:
  passed: true/false
  read_only: true
  validated_tables: ["表名"]
  injection_risk: false
  notes: "{安全检查备注}"

next_step: "QUERY_BUILD"
```

---

## 5. 执行步骤

### 5.1 生成 SQL

根据 `final_intent` 生成完整 SQL 和预览 SQL。

### 5.2 执行预览查询

```bash
# 执行预览查询，获取前 5 行数据
sqlite3 -header -json ../../../server/ppa.db "{preview_sql}"
```

### 5.3 填充产物

将预览结果填充到 `data_preview` 字段。

### 5.4 输出确认

向用户展示：
- 生成的 SQL
- 数据预览（前 3-5 行）
- 预期列说明

示例输出：

```
✅ 数据映射完成

📋 生成 SQL:
SELECT COUNT(*) as value
FROM opportunity_tender_staging
WHERE published_date >= '2026-02-20' AND push_status = 'pushed'

📊 数据预览:
| value |
|-------|
| 45    |

📁 产物已保存：./outputs/owner-data-map-{draft_id}.yaml

推荐执行：[QUERY_BUILD] - 执行完整查询
```

---

## 6. 示例

### 6.1 示例输入

```yaml
final_intent:
  entity: "招标文件推送"
  metric: "count"
  filters:
    time_field: "published_date"
    time_value: "2026-02-20"
    time_operator: ">="
    push_status: "pushed"
```

### 6.2 示例输出

```yaml
draft_id: "draft-20260320-000003"
generated_at: "2026-03-20T17:30:00+08:00"

mapping_result:
  target_table: "opportunity_tender_staging"
  target_table_cn: "招标公告待推送数据"

  select_clause: "COUNT(*) as value"
  from_clause: "FROM opportunity_tender_staging"
  where_clause: "WHERE published_date >= '2026-02-20' AND push_status = 'pushed'"
  group_by_clause: null
  order_by_clause: null

  full_sql: |
    SELECT COUNT(*) as value
    FROM opportunity_tender_staging
    WHERE published_date >= '2026-02-20'
      AND push_status = 'pushed'
  
  preview_sql: |
    SELECT COUNT(*) as value
    FROM opportunity_tender_staging
    WHERE published_date >= '2026-02-20'
      AND push_status = 'pushed'
    LIMIT 5

  data_preview:
    columns: ["value"]
    sample_rows:
      - [45]
    row_count: 1

  expected_columns:
    - name: "value"
      type: "INTEGER"
      description: "推送数量"

security_check:
  passed: true
  read_only: true
  validated_tables: ["opportunity_tender_staging"]
  injection_risk: false
  notes: "SQL 验证通过，使用参数化查询"
```

---

## 7. 状态更新

```json
{
  "workflow_mode": "owner-guided",
  "current_step": "DATA_MAP",
  "completed_steps": ["OWNER_ENTRY", "INTENT_CLARIFY", "DATA_MAP"],
  "artifacts": {
    "owner_intent": "./outputs/owner-intent-{draft_id}.yaml",
    "owner_data_map": "./outputs/owner-data-map-{draft_id}.yaml"
  }
}
```

---

## 8. 下一步建议

推荐执行 `[QUERY_BUILD]` - 查询构建与执行。
