# MIX 多种展示方案组合 (Data Branch Combo)

**版本**: v1.0  
**快捷键**: `[MIX]`  
**输入依赖**: `data-profile-{draft_id}.yaml`（由 DT 生成）

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 若 `DT` 未完成或 `artifacts.data_profile` 缺失，提示先执行 `[DT]`。
3. 若 `MIX` 已完成，询问是否重跑；确认后按契约清理 `TG/NC/ANF`。

---

## 执行逻辑（组合方案）

至少输出 3 套组合方案，每套必须包含：
- 主图（核心结论）
- 辅图（补充维度）
- 表格策略（精确值查阅）
- 适用场景

推荐组合规则：
- 时间维度：`Line + Bar + Trend-Table`
- 分类对比：`Bar + Donut + Comparison-Table`
- 关系分析：`Scatter + BoxPlot + Detail-Table`

让用户确认其中一套作为主推荐。

---

## 产物输出

文件：`./outputs/chart-decision-{draft_id}.yaml`

关键字段：

```yaml
selection_mode: "data-guided"
selection_entry: "combo"
decision_path: "MIX->combo"
combo_options:
  - name: "方案A"
    primary_chart: "..."
    secondary_chart: "..."
    table_strategy: "..."
    fit_scenario: "..."
```

---

## 状态更新

```json
{
  "workflow_mode": "data-guided",
  "current_step": "MIX",
  "completed_steps": ["...", "MIX"],
  "artifacts": {
    "chart_decision": "./outputs/chart-decision-{draft_id}.yaml"
  }
}
```

---

## 下一步建议

推荐执行 `[TG]`，再执行 `[NC]`。

