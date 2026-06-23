# 意图梳理与场景分析 (Intent Analysis, IA)

**版本**: v2.3  
**输入依赖**: `data-profile-{draft_id}.yaml`（由 DT 生成）

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 若 `DT` 未完成或 `artifacts.data_profile` 缺失，提示先执行 `[DT]`。
3. 若当前 `workflow_mode=data-guided`，提示用户：
   - 继续 IA 将切换到意图驱动分支；
   - 若要保持数据驱动，请执行 `[EDA]` / `[DVZ]` / `[MIX]`。
4. 若 `IA` 已完成，询问是否重跑；确认后按契约清理 `DL/NC/ANF`。

---

## 1. 读取依赖

从 `data_profile` 中提取：
- `field_roles.primary_dimension`
- `field_roles.primary_measure`
- `field_roles.time_dimension`

从 `brief` 中提取：
- `goal_question`
- `scenario.logic`（若已有）
- `scenario.consumption`（若已有）
- `deliverables`（若已有）

---

## 2. 引导问题（最少 4 轮）

1. 你最想回答的问题是什么（用一句话）？
2. 你的核心意图属于哪类：`Trend|Comparison|Composition|Distribution|Relationship`？
3. 沟通场景（logic）选择：
   - `Instructional`
   - `Elevator-Pitch`
   - `Consultative`
   - `Storytelling`
4. 消费场景（consumption）选择：
   - `Lean-Forward`
   - `Lean-Back`
   - `Static-In-Depth`
5. 叙事复杂度：`Flash|Standard|Deep-Dive`

---

## 3. 产物输出

### 3.1 文件名

`intent-analysis-{draft_id}.yaml`

### 3.2 保存路径

`./outputs/intent-analysis-{draft_id}.yaml`

### 3.3 文件结构

```yaml
draft_id: {draft_id}
generated_at: {timestamp}

instance_example: "{用户业务描述}"
selected_intent: "{Trend|Comparison|Composition|Distribution|Relationship}"

scenario:
  logic: "{Instructional|Elevator-Pitch|Consultative|Storytelling}"
  consumption: "{Lean-Forward|Lean-Back|Static-In-Depth}"

narrative:
  primary_thread: "{维度字段，可含中文注释}"
  measure_index: "{度量字段，可含中文注释}"
  duration_level: "{Flash|Standard|Deep-Dive}"

visual_hint:
  density: "{High|Medium|Low}"
  annotation_needed: true/false
```

---

## 4. 状态更新

```json
{
  "workflow_mode": "intent-guided",
  "current_step": "IA",
  "completed_steps": ["...", "IA"],
  "artifacts": {
    "intent_analysis": "./outputs/intent-analysis-{draft_id}.yaml"
  }
}
```

---

## 5. 验收标准

- `selected_intent` 必须映射到 DL 决策根节点
- `scenario.logic` 与 `scenario.consumption` 必须使用契约枚举
- `primary_thread/measure_index` 必须来自 DT 字段，不可虚构
