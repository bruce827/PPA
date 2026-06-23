# DB 查询构建器 (DB Branch Query Builder)

**版本**: v1.0  
**快捷键**: `[DBQ]`  
**输入依赖**: `db-field-roles-{draft_id}.yaml`（由 DBS 生成）

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 若 `DBS` 未完成或 `artifacts.db_field_roles` 缺失，提示先执行 `[DBS]`。
3. 若 `DBQ` 已完成，询问是否重跑；确认后按契约清理 `DBV`。

---

## 1. 确定分析意图

询问用户：

> **你想进行什么类型的分析？**
>
> 1. **分布分析** - 查看数据在不同维度上的分布情况
> 2. **趋势分析** - 查看数据随时间的变化趋势
> 3. **对比分析** - 比较不同类别之间的数据差异
> 4. **构成分析** - 查看各部分占整体的比例

---

## 2. 构建 SQL 查询

根据用户选择的分析类型，生成对应的 SQL 查询：

### 2.1 分布分析

```sql
SELECT 
  {primary_dimension},
  COUNT(*) as count,
  AVG({primary_measure}) as avg_value,
  SUM({primary_measure}) as total_value
FROM {table_name}
WHERE {primary_measure} IS NOT NULL
GROUP BY {primary_dimension}
ORDER BY count DESC;
```

### 2.2 趋势分析（需要时间维度）

```sql
SELECT 
  strftime('%Y-%m', {time_dimension}) as period,
  COUNT(*) as count,
  AVG({primary_measure}) as avg_value,
  SUM({primary_measure}) as total_value
FROM {table_name}
WHERE {time_dimension} IS NOT NULL
  AND {primary_measure} IS NOT NULL
GROUP BY period
ORDER BY period;
```

### 2.3 对比分析

```sql
SELECT 
  {primary_dimension},
  AVG({primary_measure}) as avg_value,
  MIN({primary_measure}) as min_value,
  MAX({primary_measure}) as max_value,
  COUNT(*) as count
FROM {table_name}
WHERE {primary_measure} IS NOT NULL
GROUP BY {primary_dimension}
ORDER BY avg_value DESC;
```

### 2.4 构成分析

```sql
SELECT 
  {primary_dimension},
  SUM({primary_measure}) as value,
  ROUND(SUM({primary_measure}) * 100.0 / (SELECT SUM({primary_measure}) FROM {table_name}), 2) as percentage
FROM {table_name}
WHERE {primary_measure} IS NOT NULL
GROUP BY {primary_dimension}
ORDER BY value DESC;
```

---

## 3. 执行查询并获取数据

执行：

```bash
sqlite3 -header -csv ../../../server/ppa.db "{sql_query}"
```

输出为 CSV 格式，便于后续处理。

---

## 4. 产物输出

### 4.1 文件名

`db-query-result-{draft_id}.yaml`

### 4.2 保存路径

`./outputs/db-query-result-{draft_id}.yaml`

### 4.3 文件结构

```yaml
draft_id: "{draft_id}"
generated_at: "{timestamp}"

analysis_type: "{distribution|trend|comparison|composition}"
sql_query: "{执行的 SQL}"

data_summary:
  row_count: {行数}
  column_count: {列数}
  columns: [列名清单]

data_preview: |
  {前 10 行 CSV 数据}

export_path: "./outputs/db-data-{draft_id}.csv"
```

---

## 5. 状态更新

```json
{
  "workflow_mode": "db-guided",
  "current_step": "DBQ",
  "completed_steps": ["DB", "DBS", "DBQ"],
  "artifacts": {
    "db_source_selection": "./outputs/db-source-selection-{draft_id}.yaml",
    "db_field_roles": "./outputs/db-field-roles-{draft_id}.yaml",
    "db_query_result": "./outputs/db-query-result-{draft_id}.yaml"
  }
}
```

---

## 6. 下一步建议

推荐执行 `[DBV]` - 数据验证与质量检查。
