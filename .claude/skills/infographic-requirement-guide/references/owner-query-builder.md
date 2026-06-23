# 查询构建与执行 (Query Builder)

**版本**: v1.0
**快捷键**: `[QUERY_BUILD]` 或 `[QB]`
**输入依赖**: `owner-data-map-{draft_id}.yaml`（由 DATA_MAP 生成）

---

## 前置检查

1. 读取 `workflow-state.json` 与 `owner-data-map` 产物。
2. 若 `DATA_MAP` 未完成或 `mapping_result.full_sql` 缺失，提示先执行 `[DATA_MAP]`。
3. 若 `QUERY_BUILD` 已完成，询问是否重跑；确认后按契约清理下游步骤。

---

## 1. 执行 SQL 查询

根据 `mapping_result.full_sql` 执行查询：

```bash
sqlite3 -header -csv ../../../server/ppa.db "{full_sql}"
```

---

## 2. 结果处理

### 2.1 数据类型转换

将查询结果转换为结构化格式：

```yaml
query_result:
  columns: ["列名 1", "列名 2", ...]
  rows:
    - ["值 1", "值 2", ...]
    - ["值 1", "值 2", ...]
  row_count: {行数}
```

### 2.2 结果摘要

生成数据摘要：

```yaml
result_summary:
  total_value: {总计值，如总数}
  min_value: {最小值或 null}
  max_value: {最大值或 null}
  avg_value: {平均值或 null}
  unique_categories: {分类数或 null}
```

---

## 3. 产物输出

### 3.1 文件名

`owner-query-result-{draft_id}.yaml`

### 3.2 保存路径

`./outputs/owner-query-result-{draft_id}.yaml`

### 3.3 文件结构

```yaml
draft_id: "{draft_id}"
generated_at: "{timestamp}"

executed_sql: |
  {执行的 SQL}

query_result:
  columns: ["列名清单"]
  rows:
    - [行数据]
  row_count: {行数}

result_summary:
  total_value: {总计}
  # 其他摘要信息

business_interpretation: |
  {业务解读：用自然语言描述查询结果}

next_step: "REPORT_GEN"
```

---

## 4. 示例

### 4.1 示例输入 SQL

```sql
SELECT COUNT(*) as value
FROM opportunity_tender_staging
WHERE published_date >= '2026-02-20'
  AND push_status = 'pushed'
```

### 4.2 示例输出

```yaml
draft_id: "draft-20260320-000000"
generated_at: "2026-03-20T17:00:00+08:00"

executed_sql: |
  SELECT COUNT(*) as value
  FROM opportunity_tender_staging
  WHERE published_date >= '2026-02-20'
    AND push_status = 'pushed'

query_result:
  columns: ["value"]
  rows:
    - [45]
  row_count: 1

result_summary:
  total_value: 45

business_interpretation: |
  自 2026 年 2 月 20 日以来，共有 **45 条** 招标文件已成功推送。
```

---

## 5. 状态更新

```json
{
  "workflow_mode": "owner-guided",
  "current_step": "QUERY_BUILD",
  "completed_steps": ["OWNER_ENTRY", "INTENT_CLARIFY", "DATA_MAP", "QUERY_BUILD"],
  "artifacts": {
    "owner_intent": "./outputs/owner-intent-{draft_id}.yaml",
    "owner_data_map": "./outputs/owner-data-map-{draft_id}.yaml",
    "owner_query_result": "./outputs/owner-query-result-{draft_id}.yaml"
  }
}
```

---

## 6. 下一步建议

推荐执行 `[REPORT_GEN]` - 报告生成。
