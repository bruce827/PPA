# 首轮引导规范 (First-Round Guide, FR)

**版本**: v2.5  
**核心目标**: 把用户输入沉淀为结构化 brief，并确定后续走“意图驱动”还是“数据驱动”分支。

---

## 前置检查

- 无强制前置。
- 若 `FR` 已完成，重跑前需确认，并按契约清理下游步骤状态。

---

## 1. 询问最小闭环问题（必须）

按顺序收集以下信息：

1. **目标问题**：这张图最终要回答什么业务问题？
2. **数据现状**：
   - 已有数据文件（路径）
   - 只有指标描述（暂无文件）
   - 只有想法（尚未定义指标）
3. **引导模式（workflow_mode）**：
   - `intent-guided`（通过意图访谈选择图表）
   - `data-guided`（通过已有数据结构快速选图）
4. **沟通场景（logic）**：
   - `Instructional`
   - `Elevator-Pitch`
   - `Consultative`
   - `Storytelling`
5. **消费环境（consumption）**：
   - `Lean-Forward`
   - `Lean-Back`
   - `Static-In-Depth`
6. **交付物要求**：
   - 仅图表提示词（到 `NC`）
   - 图表提示词 + 演讲稿（到 `ANF`）

若用户回答不完整，继续追问，直到关键字段齐全。

---

## 2. 产物输出

### 2.1 文件名

`brief-{draft_id}.yaml`

### 2.2 保存路径

`./outputs/brief-{draft_id}.yaml`

### 2.3 文件结构

```yaml
draft_id: {draft_id}
generated_at: {timestamp}

workflow_mode: "intent-guided|data-guided"
entry_mode: "data-ready|metrics-only|idea-only"
goal_question: "{一句话问题}"

input_context:
  data_path: "{若无则 null}"
  domain_hint: "{如: 销售/用户/财务/运营}"

scenario:
  logic: "{Instructional|Elevator-Pitch|Consultative|Storytelling}"
  consumption: "{Lean-Forward|Lean-Back|Static-In-Depth}"

deliverables:
  chart_prompt_required: true
  speech_script_required: true/false

open_questions:
  - "{仍待确认的问题，若无可为空数组}"
```

---

## 3. 状态更新

执行完成后更新 `workflow-state.json`：

```json
{
  "workflow_mode": "intent-guided|data-guided",
  "current_step": "FR",
  "completed_steps": ["FR"],
  "artifacts": {
    "brief": "./outputs/brief-{draft_id}.yaml",
    "data_profile": null,
    "intent_analysis": null,
    "chart_decision": null,
    "table_brief": null,
    "table_decision": null,
    "table_checklist": null,
    "table_preview": null,
    "chart_prompt": null,
    "speech_script": null
  }
}
```

---

## 4. 下一步建议

- 若 `entry_mode=data-ready`：
  - `workflow_mode=intent-guided` → 推荐 `[DT]`，随后 `[IA]`
  - `workflow_mode=data-guided` → 推荐 `[DT]`，随后 `[EDA]` 或 `[DVZ]` 或 `[MIX]`
- 若 `entry_mode=metrics-only|idea-only`：先补充最小数据样例，再执行 `[DT]`
