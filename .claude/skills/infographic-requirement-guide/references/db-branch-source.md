# DB 数据源选择 (DB Branch Source Select)

**版本**: v1.0  
**快捷键**: `[DBS]`  
**输入依赖**: `db-source-selection-{draft_id}.yaml`（由 DB 生成）

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 若 `DB` 未完成或 `artifacts.db_source_selection` 缺失，提示先执行 `[DB]`。
3. 若 `DBS` 已完成，询问是否重跑；确认后按契约清理 `DBQ/DBV`。

---

## 1. 获取表结构

执行以下命令获取选定表的字段信息：

```bash
sqlite3 ../../../server/ppa.db "PRAGMA table_info({table_name});"
```

输出示例（`projects` 表）：

```
0|id|INTEGER|0||1
1|name|TEXT|1||0
2|description|TEXT|0||0
3|final_total_cost|REAL|0||0
4|final_risk_score|INTEGER|0||0
5|final_workload_days|REAL|0||0
6|project_type|TEXT|0|'standard'|0
7|tags_json|TEXT|0||0
8|created_at|DATETIME|0|CURRENT_TIMESTAMP|0
9|updated_at|DATETIME|0|CURRENT_TIMESTAMP|0
```

---

## 2. 字段角色识别

根据字段类型和命名，识别：

### 2.1 字段类型分类

| 字段类型 | 识别规则 | 用途 |
|----------|----------|------|
| `id` | 主键 | 唯一标识 |
| `dimension` | TEXT/类别字段 | 分类维度 |
| `measure` | REAL/INTEGER 数值字段 | 度量指标 |
| `time` | DATETIME/日期字段 | 时间维度 |

### 2.2 推荐的主维度和主度量

根据表类型推荐：

| 表名 | 推荐主维度 | 推荐主度量 | 时间维度 |
|------|------------|------------|----------|
| `projects` | project_type 或 name | final_total_cost | created_at |
| `opportunity_bidding_sites` | source_level 或 province | is_official | created_at |
| `opportunity_tender_staging` | region | budget_amount | published_date |

---

## 3. 引导用户确认

向用户展示：

> **字段角色确认**
>
> 基于表结构分析，建议：
>
> - **主维度 (Primary Dimension)**: `{recommended_dimension}` - 用于分组/分类
> - **主度量 (Primary Measure)**: `{recommended_measure}` - 用于计算/比较
> - **时间维度 (Time Dimension)**: `{recommended_time}` - 用于趋势分析
>
> 是否接受此推荐？或请指定其他字段。

---

## 4. 产物输出

### 4.1 文件名

`db-field-roles-{draft_id}.yaml`

### 4.2 保存路径

`./outputs/db-field-roles-{draft_id}.yaml`

### 4.3 文件结构

```yaml
draft_id: "{draft_id}"
generated_at: "{timestamp}"

table_name: "{table_name}"

field_roles:
  primary_dimension: 
    field: "{field_name}"
    type: "{TEXT|INTEGER|REAL|DATETIME}"
    description: "{业务含义}"
  primary_measure:
    field: "{field_name}"
    type: "{INTEGER|REAL}"
    description: "{业务含义}"
  time_dimension:
    field: "{field_name}"
    type: "DATETIME"
    description: "{业务含义}"
    
all_fields:
  - name: "{field}"
    type: "{type}"
    role: "{dimension|measure|time|id}"
```

---

## 5. 状态更新

```json
{
  "workflow_mode": "db-guided",
  "current_step": "DBS",
  "completed_steps": ["DB", "DBS"],
  "artifacts": {
    "db_source_selection": "./outputs/db-source-selection-{draft_id}.yaml",
    "db_field_roles": "./outputs/db-field-roles-{draft_id}.yaml"
  }
}
```

---

## 6. 下一步建议

推荐执行 `[DBQ]` - SQL 查询构建。
