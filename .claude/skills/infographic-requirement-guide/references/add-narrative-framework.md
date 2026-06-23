# 演讲稿生成规范 (Add Narrative Framework, ANF)

**版本**: v2.1  
**输入依赖**: `chart-prompt-{draft_id}.md`（由 NC 生成）

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 若 `NC` 未完成或 `chart_prompt` 缺失，提示先执行 `[NC]`。
3. 若 `ANF` 已完成，询问是否重跑（重跑不影响其他步骤）。

---

## 1. 输入读取

读取：
- `artifacts.brief`
- `artifacts.data_profile`
- `artifacts.chart_decision`
- `artifacts.chart_prompt`
- `artifacts.intent_analysis`（可选）

重点字段：
- `scenario.logic`
- `scenario.consumption`
- `narrative.duration_level`（若无则默认 `Standard`）
- `selected_chart`

---

## 2. 生成结构（四段式）

1. 开场背景：为什么看这张图
2. 看图指引：如何读轴与编码
3. 核心洞察：关键异常/趋势/结论
4. 行动建议：下一步决策与动作

---

## 3. 语气适配

### 3.1 按 `scenario.logic`

- `Elevator-Pitch`：短句、结论先行、少术语。
- `Instructional`：解释完整、循序渐进。
- `Consultative`：中性客观、保留方法与边界说明。
- `Storytelling`：故事化表达，强调记忆点。

### 3.2 按 `duration_level`

- `Flash`：150-250 字
- `Standard`：300-600 字
- `Deep-Dive`：700-1200 字

---

## 4. 产物输出

### 4.1 文件名

`speech-script-{draft_id}.md`

### 4.2 保存路径

`./outputs/speech-script-{draft_id}.md`

### 4.3 内容模板

```markdown
# 演讲稿

**图表**: {selected_chart}
**logic**: {scenario.logic}
**consumption**: {scenario.consumption}
**时长级别**: {duration_level}

---

## 开场
{...}

## 看图指引
{...}

## 核心洞察
{...}

## 结论行动
{...}
```

---

## 5. 状态更新

```json
{
  "current_step": "ANF",
  "completed_steps": ["...", "ANF"],
  "artifacts": {
    "speech_script": "./outputs/speech-script-{draft_id}.md"
  }
}
```

完成后可将 `current_step` 设为 `DONE`。

