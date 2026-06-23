# DB 数据验证 (DB Branch Validate)

**版本**: v1.0  
**快捷键**: `[DBV]`  
**输入依赖**: `db-query-result-{draft_id}.yaml`（由 DBQ 生成）

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 若 `DBQ` 未完成或 `artifacts.db_query_result` 缺失，提示先执行 `[DBQ]`。
3. 若 `DBV` 已完成，询问是否重跑；确认后按契约清理下游步骤。

---

## 1. 数据质量检查

执行以下检查：

### 1.1 空值检查

```sql
SELECT 
  COUNT(*) as total_rows,
  SUM(CASE WHEN {primary_dimension} IS NULL THEN 1 ELSE 0 END) as null_dimension,
  SUM(CASE WHEN {primary_measure} IS NULL THEN 1 ELSE 0 END) as null_measure
FROM {table_name};
```

### 1.2 重复值检查

```sql
SELECT {primary_dimension}, COUNT(*) as cnt
FROM {table_name}
GROUP BY {primary_dimension}
HAVING COUNT(*) > 1;
```

### 1.3 异常值检查（针对数值字段）

```sql
SELECT 
  MIN({primary_measure}) as min_value,
  MAX({primary_measure}) as max_value,
  AVG({primary_measure}) as avg_value,
  COUNT(DISTINCT {primary_measure}) as unique_values
FROM {table_name}
WHERE {primary_measure} IS NOT NULL;
```

---

## 2. 数据适用性评估

根据检查结果，评估数据是否适合可视化：

| 检查项 | 通过标准 | 不通过处理 |
|--------|----------|------------|
| 数据量 | >= 5 行 | 提示数据不足 |
| 空值率 | < 20% | 提示数据质量问题 |
| 维度基数 | 2-20 个不同值 | 过多建议分组，过少建议换维度 |
| 度量分布 | 无明显异常值 | 提示可能需要数据清洗 |

---

## 3. 图表选型建议

根据数据分析类型和数据特征，推荐图表：

### 3.1 分布分析

| 数据特征 | 推荐图表 |
|----------|----------|
| 分类维度 <= 5 | 柱状图 |
| 分类维度 > 5 | 条形图 |
| 构成比例 | 饼图/环形图 |

### 3.2 趋势分析

| 数据特征 | 推荐图表 |
|----------|----------|
| 时间跨度 <= 12 期 | 柱状图 |
| 时间跨度 > 12 期 | 折线图 |

### 3.3 对比分析

| 数据特征 | 推荐图表 |
|----------|----------|
| 2-4 个类别 | 柱状图 |
| 5+ 个类别 | 条形图 |
| 需要显示分布 | 箱线图 |

### 3.4 构成分析

| 数据特征 | 推荐图表 |
|----------|----------|
| 2-5 个部分 | 饼图 |
| 5+ 个部分 | 环形图/堆叠条形图 |

---

## 4. 产物输出

### 4.1 文件名

`db-validation-report-{draft_id}.yaml`

### 4.2 保存路径

`./outputs/db-validation-report-{draft_id}.yaml`

### 4.3 文件结构

```yaml
draft_id: "{draft_id}"
generated_at: "{timestamp}"

data_quality:
  total_rows: {行数}
  null_rate_dimension: {空值率}
  null_rate_measure: {空值率}
  unique_dimension_count: {维度唯一值数量}
  has_outliers: true/false

validation_result:
  passed: true/false
  issues:
    - "{问题描述}"
  recommendations:
    - "{改进建议}"

chart_recommendation:
  chart_type: "{BarChart|LineChart|PieChart|DonutChart}"
  rationale: "{推荐理由}"
  confidence: "{high|medium|low}"

ready_for_next: true/false
```

---

## 5. 状态更新

```json
{
  "workflow_mode": "db-guided",
  "current_step": "DBV",
  "completed_steps": ["DB", "DBS", "DBQ", "DBV"],
  "artifacts": {
    "db_source_selection": "./outputs/db-source-selection-{draft_id}.yaml",
    "db_field_roles": "./outputs/db-field-roles-{draft_id}.yaml",
    "db_query_result": "./outputs/db-query-result-{draft_id}.yaml",
    "db_validation_report": "./outputs/db-validation-report-{draft_id}.yaml"
  }
}
```

---

## 6. 下一步建议

验证通过后，汇入现有工作流：

- 推荐执行 `[DT]` - 将 DB 查询结果转为标准 `data_profile` 格式
- 然后执行 `[TG]` - 表格展现引导
- 最后执行 `[NC]` - 生成图表提示词
