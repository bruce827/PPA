# 数据类型识别与质量评估 (Data Typing, DT)

**版本**: v2.2  
**输入依赖**: `brief-{draft_id}.yaml`（由 FR 生成）

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 若 `FR` 未完成或 `artifacts.brief` 缺失：
   - 若用户已提供可分析的数据（文件路径或可解析表格），允许继续执行 DT；
   - 自动生成最小 `brief`（`workflow_mode=data-guided`）；
   - 若无数据输入，再提示先执行 `[FR]`。
3. 若 `DT` 已完成，询问是否重跑；确认后按契约清理 `IA/DL/EDA/DVZ/MIX/TG/NC/ANF`。

---

## 1. 输入采集

必须确认以下输入：

- 数据来源：文件路径或用户粘贴的表格
- 文件类型：`.csv/.xlsx/.json/.txt/markdown table`
- 数据规模：行数、列数、文件大小

性能分级：
- `< 500` 行：轻量
- `500-2000` 行：中等（建议聚合）
- `> 2000` 行：密集（建议抽样/分页）

---

## 2. 字段识别与质量检查

至少执行以下检查：

- 空值率（Null Rate）
- 维度基数（Cardinality）
- 数值范围与异常值（Outlier）
- 时间字段识别（可解析日期）

并输出：
- 维度字段清单
- 度量字段清单
- 主维度 `primary_dimension`
- 主度量 `primary_measure`
- 时间维度 `time_dimension`（无则 `null`）

---

## 3. 产物输出

### 3.1 文件名

`data-profile-{draft_id}.yaml`

### 3.2 保存路径

`./outputs/data-profile-{draft_id}.yaml`

### 3.3 文件结构

```yaml
draft_id: {draft_id}
generated_at: {timestamp}

source_data:
  file_name: {file_name}
  file_path: {file_path}
  file_size_mb: {size_mb}
  data_scale: "{row_count} 行 × {col_count} 列"
  performance_level: "Light|Medium|Heavy"

data_structure_tree: |
  {字段树文本}

field_roles:
  primary_dimension: {字段名}
  primary_measure: {字段名}
  time_dimension: {字段名或null}

quality_audit:
  null_rate:
    {field}: {ratio}
  cardinality:
    {field}: {count}
  outlier_fields:
    - {field}

evaluation: |
  {质量总结 + 图表适配建议}
```

---

## 4. 状态更新

```json
{
  "current_step": "DT",
  "completed_steps": ["...", "DT"],
  "artifacts": {
    "brief": "./outputs/brief-{draft_id}.yaml",
    "data_profile": "./outputs/data-profile-{draft_id}.yaml"
  }
}
```

---

## 5. 下一步建议

读取 `workflow_mode`：
- `intent-guided`：推荐 `[IA]`
- `data-guided`：推荐 `[EDA]` 或 `[DVZ]` 或 `[MIX]`

---

## 6. 验收标准

- 与原始数据字段一致，不臆造字段
- `field_roles` 可直接被 IA 或 EDA/DVZ/MIX 引用
- 大数据场景给出可执行性能建议
