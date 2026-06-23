# 状态管理器 (State Manager)

**版本**: v2.5  
**用途**: 读写 `workflow-state.json`，并严格遵循 `workflow-contract.md`。

---

## 1. 先加载契约

执行任何状态操作前，先读取：
- `./references/workflow-contract.md`

`workflow-contract.md` 是唯一真值来源；本文件不重复定义字段。

---

## 2. 初始化状态

当状态文件缺失、损坏、或用户执行 `[R]` 时，初始化为：

```json
{
  "draft_id": "draft-{YYYYMMDD-HHmmss}",
  "workflow_mode": null,
  "current_step": "FR",
  "completed_steps": [],
  "artifacts": {
    "brief": null,
    "data_profile": null,
    "intent_analysis": null,
    "chart_decision": null,
    "table_brief": null,
    "table_decision": null,
    "table_checklist": null,
    "table_preview": null,
    "chart_prompt": null,
    "speech_script": null
  },
  "created_at": "{iso8601}",
  "updated_at": "{iso8601}"
}
```

---

## 3. 通用更新流程

1. 执行前置检查（见 `state-checker.md`）。
2. 若是重跑上游步骤，先执行失效传播清理（见契约第 6 节）。
3. 写入当前步骤产物路径到 `artifacts`。
4. 更新 `completed_steps`（去重，保留执行顺序）。
5. 更新 `current_step` 与 `updated_at`。

---

## 4. 快速指令约定

- `[P]`：只读状态，不改写。
- `[R]`：重置状态，不删除 `outputs/` 文件。
- `[C]`：清理 `outputs/*.yaml|*.md`，不改写状态。
