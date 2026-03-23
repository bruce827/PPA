# 状态检查器 (State Checker)

**版本**: v2.8  
**用途**: 每步执行前进行前置校验，并在重跑时触发失效传播。

---

## 1. 依赖矩阵

| 步骤 | 前置步骤 | 必需产物 |
|---|---|---|
| FR | 无 | 无 |
| DT | FR（意图驱动）或直接数据输入（数据驱动） | `artifacts.brief` 可选 |
| IA | DT | `artifacts.data_profile` |
| DL | IA | `artifacts.intent_analysis` |
| EDA | DT | `artifacts.data_profile` |
| DVZ | DT | `artifacts.data_profile` |
| MIX | DT | `artifacts.data_profile` |
| TG | DT | 无（执行后需产出 `table_brief/table_decision/table_checklist/table_preview`） |
| NC | DL 或 EDA/DVZ/MIX | `artifacts.chart_decision` |
| ANF | NC | `artifacts.chart_prompt` |

说明：
- `TG` 内部子命令 `TBR/TES/TPL/TCL/TWB/TURL` 不属于一级步骤，不进入 `completed_steps`。
- 一级步骤 `TG` 完成后，必须存在 `table_brief/table_decision/table_preview`，且 `table_checklist` 包含 `summary` 与 `final_decision`。
- `table_brief` 需包含 `upstream_context.source_carrier/calculation_owner`。
- `table_decision` 需包含 `chart_table_boundary`（明确图表与表格分工边界）。
- 若 `table_decision.presentation_strategy=dual-view`，校验 `table_preview` 包含 Pitch/Table 的细分预览 URL。

---

## 2. 通用检查逻辑

```text
读取 workflow-state.json
读取 workflow-contract.md

IF 目标步骤缺少前置步骤或前置产物:
  输出前置缺失提示
  返回菜单

IF 目标步骤已在 completed_steps:
  询问是否重跑 (y/n)
  IF n:
    返回菜单
  IF y:
    按契约执行失效传播清理
    继续执行目标步骤
ELSE:
  继续执行目标步骤
```

### DT 特例（数据驱动入口）

当目标步骤是 `DT` 且 `FR/brief` 缺失时：
- 若用户已提供可解析数据（文件路径或表格内容），允许执行；
- 并在 DT 内自动补齐最小 `brief`；
- 若无可解析数据，再提示先执行 `FR`。

---

## 3. 失效传播规则

- 重跑 `FR`：清理 `DT/IA/DL/EDA/DVZ/MIX/TG/NC/ANF`
- 重跑 `DT`：清理 `IA/DL/EDA/DVZ/MIX/TG/NC/ANF`
- 重跑 `IA`：清理 `DL/TG/NC/ANF`
- 重跑 `DL`：清理 `TG/NC/ANF`
- 重跑 `EDA`：清理 `TG/NC/ANF`
- 重跑 `DVZ`：清理 `TG/NC/ANF`
- 重跑 `MIX`：清理 `TG/NC/ANF`
- 重跑 `TG`：清理 `NC/ANF`
- 重跑 `NC`：清理 `ANF`
- 重跑 `ANF`：无下游清理

清理方式：
- 从 `completed_steps` 中移除下游步骤
- 将下游 `artifacts` 字段设为 `null`
- 若清理包含 `TG`，同时清空 `table_brief/table_decision/table_checklist/table_preview`
- 更新 `updated_at`

---

## 4. 进度展示模板

```text
FR  首轮引导   {✅/⏳/⬜}
DT  数据分析   {✅/⏳/⬜}
IA  意图梳理   {✅/⏳/⬜}
DL  意图选型   {✅/⏳/⬜}
EDA 数据分析   {✅/⏳/⬜}
DVZ 格式选图   {✅/⏳/⬜}
MIX 方案组合   {✅/⏳/⬜}
TG  表格引导   {✅/⏳/⬜}
NC  提示词     {✅/⏳/⬜}
ANF 演讲稿     {✅/⏳/⬜}
```
