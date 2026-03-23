# DVZ 数据格式选可视化方案 (Data Branch Viz Picker)

**版本**: v1.0  
**快捷键**: `[DVZ]`  
**输入依赖**: `data-profile-{draft_id}.yaml`（由 DT 生成）

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 若 `DT` 未完成或 `artifacts.data_profile` 缺失，提示先执行 `[DT]`。
3. 若 `DVZ` 已完成，询问是否重跑；确认后按契约清理 `TG/NC/ANF`。

---

## 执行逻辑（打开网站）

直接打开：`https://bruce999.site/`

执行方式（按系统选择）：
- macOS: `open https://bruce999.site/`
- Linux: `xdg-open https://bruce999.site/`
- Windows: `start https://bruce999.site/`

若无法打开：输出链接并提示用户手动访问。

打开后追问用户：
1. 你在网站中筛出的候选图（1-3 个）是哪些？
2. 你最终选哪个作为主图？

---

## 产物输出

文件：`./outputs/chart-decision-{draft_id}.yaml`

关键字段：

```yaml
selection_mode: "data-guided"
selection_entry: "website"
decision_path: "DVZ->data-to-viz"
```

---

## 状态更新

```json
{
  "workflow_mode": "data-guided",
  "current_step": "DVZ",
  "completed_steps": ["...", "DVZ"],
  "artifacts": {
    "chart_decision": "./outputs/chart-decision-{draft_id}.yaml"
  }
}
```

---

## 下一步建议

推荐执行 `[TG]`，再执行 `[NC]`。

