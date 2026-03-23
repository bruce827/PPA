# 样式与提示词配置 (Narrative Constraints, NC)

**版本**: v2.6  
**输入依赖**: `chart-decision-{draft_id}.yaml`（由 DL 或 EDA/DVZ/MIX 生成）

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 若 `chart_decision` 缺失，提示先执行 `[DL]`（意图驱动）或 `[EDA]/[DVZ]/[MIX]`（数据驱动）。
3. 若 `NC` 已完成，询问是否重跑；确认后按契约清理 `ANF`。
4. 若用户已执行 `TG`，将其表格展现建议并入本步骤输出（图表-表格分工部分），并补充预览 URL。
5. 若 `table_decision.presentation_strategy = dual-view`，提示词中必须同时描述：
   - 移动端结论视图（mobile-pitch）
   - 证据层表格视图（evidence-table）
6. 若已配置模板风格，将风格提示词并入最终提示词。

---

## 1. 输入读取

读取以下产物：
- `artifacts.brief`
- `artifacts.data_profile`
- `artifacts.chart_decision`
- `artifacts.intent_analysis`（可选，数据驱动模式可能为空）
- `artifacts.table_decision`（可选，执行 TG 后建议读取）
- `artifacts.table_checklist`（可选，执行 TG 后建议读取）
- `artifacts.table_preview`（可选，执行 TG 后建议读取）

规则：
- 有 `intent_analysis` 时优先使用其 `scenario/narrative`。
- 无 `intent_analysis` 时回退到 `brief.scenario`，并用 `Standard` 作为默认 `duration`。

---

## 2. 视觉策略映射

### 2.1 按 `scenario.logic`

- `Elevator-Pitch`：结论优先，减少视觉噪音，保守配色。
- `Instructional`：解释优先，增强标注与图例。
- `Consultative`：信息完整，保留多维对比。
- `Storytelling`：故事主线优先，强调情境与记忆点。

### 2.2 按 `scenario.consumption`

- `Lean-Back`：字号 1.3-1.5x，强化对比，减少密集刻度。
- `Lean-Forward`：支持 tooltip 与有限交互。
- `Static-In-Depth`：打印可读优先，允许更密集注释。

### 2.3 按 `duration_level`

- `Flash`：仅 1 个核心洞察 + 1 处标注
- `Standard`：背景 + 洞察 + 结论
- `Deep-Dive`：增加基准线、异常点解释与对比组

---

## 3. 产物输出

### 3.1 文件名

`chart-prompt-{draft_id}.md`

### 3.2 保存路径

`./outputs/chart-prompt-{draft_id}.md`

### 3.3 内容模板

```markdown
# 图表描述提示词

## 数据来源

**文件**: {file_name}
**路径**: {file_path}
**规模**: {row_count} 行 × {col_count} 列
**字段**:
  - 维度: {dimension_fields}
  - 度量: {measure_fields}

## 图表目标

{要回答的问题 + 业务目标}

## 选型结论

{selected_chart}

## 选型模式

{selection_mode: intent-guided|data-guided}

## 数据线索

- X 轴/主线索：{primary_thread_or_dimension}
- Y 轴/核心度量：{measure_index_or_primary_measure}
- 核心比较维度：{comparison_dims}

## 场景约束

- logic: {Instructional|Elevator-Pitch|Consultative|Storytelling}
- consumption: {Lean-Forward|Lean-Back|Static-In-Depth}
- duration: {Flash|Standard|Deep-Dive}

## 终端与视图策略（若已执行 TG）

- primary_device: {mobile|desktop|mixed}
- time_budget_sec: {30|60|180|custom}
- decision_type: {pitch|lookup|edit}
- presentation_strategy: {dual-view|table-first}
- primary_view: {mobile-pitch|evidence-table}
- secondary_view: {evidence-table|mobile-pitch|null}

## 视觉策略

- 配色: {palette_strategy}
- 字号策略: {font_scale}
- 标注策略: {annotation_plan}

## 交互需求

{interaction_plan}

## 表格实现与预览（若已执行 TG）

- 表格引擎：{table_engine}
- 模板来源：{template_source}
- 移动端模板：{mobile_pitch_template}
- 证据层模板：{evidence_table_template}
- 规则清单：{table_checklist_path_or_status}
- 图表与表格分工：{chart_table_boundary}
- 预览地址（本地）：{preview_url_local}
- 预览地址（局域网）：{preview_url_network}
- 预览地址（本地-Pitch）：{preview_url_local_pitch}
- 预览地址（本地-Table）：{preview_url_local_table}
- 预览地址（局域网-Pitch）：{preview_url_network_pitch}
- 预览地址（局域网-Table）：{preview_url_network_table}

## 数据真实性约束

严格遵循原始数据，不编造数值。
```

---

## 4. 状态更新

```json
{
  "current_step": "NC",
  "completed_steps": ["...", "NC"],
  "artifacts": {
    "chart_prompt": "./outputs/chart-prompt-{draft_id}.md"
  }
}
```

若用户在 FR 指定不需要演讲稿，可将 `current_step` 设为 `DONE`。
