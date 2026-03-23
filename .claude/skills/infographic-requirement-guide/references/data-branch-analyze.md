# EDA 分析现有数据 (Data Branch Analyze)

**版本**: v1.0  
**快捷键**: `[EDA]`  
**输入依赖**: `data-profile-{draft_id}.yaml`（由 DT 生成）

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 若 `DT` 未完成或 `artifacts.data_profile` 缺失，提示先执行 `[DT]`。
3. 若 `EDA` 已完成，询问是否重跑；确认后按契约清理 `TG/NC/ANF`。

---

## 执行逻辑（沿用原规则）

基于 `data_profile` 做规则选型：

1. 时间维度存在：`LineChart`（或 `ColumnChart`）
2. 无时间维度 + 低基数分类：`BarChart`
3. 构成表达 + 类目较少：`DonutChart/PieChart`
4. 多数值关系：`ScatterPlot`
5. 分布分析：`Histogram/BoxPlot`

---

## 产物输出

文件：`./outputs/chart-decision-{draft_id}.yaml`

关键字段：

```yaml
selection_mode: "data-guided"
selection_entry: "rules"
decision_path: "EDA->rules"
```

---

## 状态更新

```json
{
  "workflow_mode": "data-guided",
  "current_step": "EDA",
  "completed_steps": ["...", "EDA"],
  "artifacts": {
    "chart_decision": "./outputs/chart-decision-{draft_id}.yaml"
  }
}
```

---

## 下一步建议

推荐执行 `[TG]`，再执行 `[NC]`。

