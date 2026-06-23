# 图表选型决策 (Decision Logic, DL)

**版本**: v2.1  
**输入依赖**: `intent-analysis-{draft_id}.yaml`（由 IA 生成）

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 若 `IA` 未完成或 `artifacts.intent_analysis` 缺失，提示先执行 `[IA]`。
3. 若 `DL` 已完成，询问是否重跑；确认后按契约清理 `NC/ANF`。

---

## 1. 决策输入

从 IA 产物读取：
- `selected_intent`
- `scenario.logic`
- `scenario.consumption`
- `narrative.duration_level`
- `visual_hint.annotation_needed`

---

## 2. 基础选型映射

| selected_intent | 默认候选（按优先） |
|---|---|
| Trend | `LineChart` / `ColumnChart` |
| Comparison | `BarChart` / `ColumnChart` |
| Composition | `PieChart` / `StackedBarChart` |
| Distribution | `Histogram` / `BoxPlot` / `ScatterPlot` |
| Relationship | `ScatterPlot` / `BubbleChart` |

---

## 3. 场景修正（严格区分 logic 与 consumption）

### 3.1 按 `scenario.logic` 修正

- `Elevator-Pitch`：优先低认知图表（`Bar/Line/Single-Donut`），降级复杂图。
- `Instructional`：保留解释性强图表，强制 `annotation_required=true`。
- `Consultative`：允许中高信息密度，保留对比与异常细节。
- `Storytelling`：优先单主线叙事图，减少多编码。

### 3.2 按 `scenario.consumption` 修正

- `Lean-Back`：放大字号、降低图元密度，禁用密集小多图。
- `Lean-Forward`：允许更多交互（tooltip/drill-down）与注释。
- `Static-In-Depth`：允许高密度标注，强调打印可读性。

---

## 4. 产物输出

### 4.1 文件名

`chart-decision-{draft_id}.yaml`

### 4.2 保存路径

`./outputs/chart-decision-{draft_id}.yaml`

### 4.3 文件结构

```yaml
draft_id: {draft_id}
generated_at: {timestamp}
selection_mode: "intent-guided"

selected_chart: "{最终图表类型}"
decision_path: "{intent -> base -> overrides -> result}"
decision_rationale: "{简要理由}"

candidates:
  - name: "{候选1}"
    pros: ["..."]
    cons: ["..."]
    score: 1-10
    recommendation: "首选|备选|不推荐"

input_intent: "{Trend|Comparison|Composition|Distribution|Relationship}"
scenario_logic: "{Instructional|Elevator-Pitch|Consultative|Storytelling}"
scenario_consumption: "{Lean-Forward|Lean-Back|Static-In-Depth}"
duration_level: "{Flash|Standard|Deep-Dive}"

context_overrides:
  - "{修正规则与原因}"

visual_constraints:
  mobile_friendly: true/false
  annotation_required: true/false
  interaction_level: "low|medium|high"
```

---

## 5. 可视化示例按需加载

当用户追问“看一下效果”时，读取：
- `./references/examples/chart-ascii-gallery.md`
- `./references/examples/chart-html-preview.md`

默认不加载，避免主流程冗长。

---

## 6. 状态更新

```json
{
  "current_step": "DL",
  "completed_steps": ["...", "DL"],
  "artifacts": {
    "chart_decision": "./outputs/chart-decision-{draft_id}.yaml"
  }
}
```

