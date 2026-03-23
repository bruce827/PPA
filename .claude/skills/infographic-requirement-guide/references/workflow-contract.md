# 工作流契约 (Workflow Contract)

**版本**: v3.0  
**用途**: 作为 `infographic-requirement-guide` 的唯一状态与流程契约。

---

## 1. 固定路径

- Skill 根目录：`.skills/infographic-requirement-guide/`
- 状态文件：`./workflow-state.json`
- 产物目录：`./outputs/`

所有 `artifacts` 路径一律使用相对 Skill 根目录的形式（如 `./outputs/xxx`）。

---

## 2. 枚举定义

### 2.1 工作模式枚举

- `workflow_mode`: `intent-guided` | `data-guided` | `db-guided` | `owner-guided` | `null`

说明：初始化阶段允许 `null`；进入 FR/DT/DB/OWNER 后必须落入对应模式。

### 2.2 步骤枚举

- `DB`: 数据库入口（DB 引导分支）
- `DBS`: 数据源选择（DB 引导分支）
- `DBQ`: 查询构建器（DB 引导分支）
- `DBV`: 数据验证（DB 引导分支）
- `FR`: 首轮引导
- `DT`: 数据分析
- `IA`: 意图梳理（意图驱动分支）
- `DL`: 图表选型（意图驱动分支）
- `EDA`: 分析现有数据（数据驱动分支）
- `DVZ`: 按现有数据格式选可视化方案（数据驱动分支）
- `MIX`: 多种展示方案组合（数据驱动分支）
- `TG`: 数据表格展现引导（可选）
- `NC`: 样式与提示词
- `ANF`: 演讲稿
- `OWNER_ENTRY`: Owner 入口（Owner 引导分支）
- `INTENT_CLARIFY`: 意图澄清（Owner 引导分支）
- `DATA_MAP`: 数据映射（Owner 引导分支）
- `QUERY_BUILD`: 查询构建（Owner 引导分支）
- `REPORT_GEN`: 报告生成（Owner 引导分支）
- `DONE`: 流程完成（最少完成到 NC 或 REPORT_GEN）

### 2.3 TG 子命令（不写入 completed_steps）

- `TBR`: Table Brief（采集表格诉求）
- `TES`: Table Engine Select（自动选插件）
- `TPL`: Template Match（匹配模板）
- `TCL`: Table Checklist（规则清单检查）
- `TWB`: Table Web Build（生成 Web 实现草案）
- `TURL`: Table URL（输出预览 URL）

规则：
- 子命令仅作为 TG 内部流程控制，不作为一级步骤。
- `completed_steps` 记录一级步骤枚举。

### 2.4 Owner 意图类型枚举（INTENT_CLARIFY 输出）

- `intent_type`: `count` | `comparison` | `trend` | `diagnosis` | `distribution` | `ranking` | `correlation`

### 2.5 报告级别枚举（REPORT_GEN 输出）

- `report_level`: `lite` | `standard` | `full`

---

## 3. 状态结构

```json
{
  "draft_id": "draft-20260304-093000",
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
    "speech_script": null,
    "db_source_selection": null,
    "db_field_roles": null,
    "db_query_result": null,
    "db_validation_report": null,
    "owner_intent": null,
    "owner_data_map": null,
    "owner_query_result": null,
    "owner_report": null
  },
  "created_at": "2026-03-04T09:30:00+08:00",
  "updated_at": "2026-03-04T09:30:00+08:00"
}
```

规则：
- `completed_steps` 记录已执行的一级步骤。
- `current_step` 可以是某一步，或 `DONE`。
- DB 引导分支的产物使用 `db_*` 字段存储。
- Owner 引导分支的产物使用 `owner_*` 字段存储。

---

## 4. 产物命名

### 4.1 通用产物

- `brief-{draft_id}.yaml`
- `data-profile-{draft_id}.yaml`
- `intent-analysis-{draft_id}.yaml`
- `chart-decision-{draft_id}.yaml`
- `chart-prompt-{draft_id}.md`
- `speech-script-{draft_id}.md`

### 4.2 表格产物

- `table-brief-{draft_id}.yaml`
- `table-decision-{draft_id}.yaml`
- `table-checklist-{draft_id}.md`
- `table-preview-{draft_id}.yaml`

### 4.3 DB 引导产物

- `db-source-selection-{draft_id}.yaml`
- `db-field-roles-{draft_id}.yaml`
- `db-query-result-{draft_id}.yaml`
- `db-validation-report-{draft_id}.yaml`

### 4.4 Owner 引导产物（新增）

- `owner-intent-{draft_id}.yaml`
- `owner-data-map-{draft_id}.yaml`
- `owner-query-result-{draft_id}.yaml`
- `owner-report-{level}-{draft_id}.md`（level: lite/standard/full）

---

## 5. 工作流分支

### 5.1 意图驱动分支

`FR -> DT -> IA -> DL -> TG -> NC -> (ANF)`

### 5.2 数据驱动分支

`DT -> (EDA|DVZ|MIX) -> TG -> NC -> (ANF)`

### 5.3 DB 引导分支

`DB -> DBS -> DBQ -> DBV -> DT -> TG -> NC -> (ANF)`

说明：DB 引导分支完成后汇入 DT 步骤，将数据库查询结果转为标准 `data_profile` 格式。

### 5.4 Owner 引导分支（新增）

`OWNER_ENTRY -> INTENT_CLARIFY -> DATA_MAP -> QUERY_BUILD -> REPORT_GEN`

说明：
- Owner 引导分支是独立流程，完成后可以选择汇入标准流程（如需要图表则进入 DT）。
- 报告级别根据数据复杂度智能分级：
  - 行数=1 且 列数≤2 → `lite`
  - 行数 2-10 或 有分组维度 → `standard`
  - 行数>10 或 意图=diagnosis → `full`

### 5.5 依赖表

| 步骤 | 前置 | 必产物 |
|---|---|---|
| DB | 无 | `db_source_selection` |
| DBS | DB | `db_field_roles` |
| DBQ | DBS | `db_query_result` |
| DBV | DBQ | `db_validation_report` |
| FR | 无 | `brief` |
| DT | DBV/FR/直接数据 | `data_profile` |
| IA | DT | `intent_analysis` |
| DL | IA | `chart_decision` |
| EDA | DT | `chart_decision` |
| DVZ | DT | `chart_decision` |
| MIX | DT | `chart_decision` |
| OWNER_ENTRY | 无 | `owner_intent` |
| INTENT_CLARIFY | OWNER_ENTRY | `owner_intent` (updated) |
| DATA_MAP | INTENT_CLARIFY | `owner_data_map` |
| QUERY_BUILD | DATA_MAP | `owner_query_result` |
| REPORT_GEN | QUERY_BUILD | `owner_report` |
| TG | DT | `table_brief` + `table_decision` + `table_checklist` + `table_preview` |
| NC | DL 或 EDA/DVZ/MIX | `chart_prompt` |
| ANF | NC | `speech_script` |

### 5.6 TG 内部工作流约定

推荐执行顺序：`TBR -> TES -> TPL -> TCL -> TWB -> TURL`

规则：
1. `TBR` 必须采集 `primary_device/time_budget_sec/decision_type/source_carrier/calculation_owner`，并产出 `presentation_strategy`（`dual-view|table-first`）。
2. `TES` 必须在四个引擎中四选一：`vxe-table/pro-table/tanstack-table/antv-s2`。
3. `TPL` 必须输出模板来源（默认 `./template/`），并记录双模板。
4. `TCL` 必须在 `TWB` 前执行，基于 `./template/table-checklist-template.md` 输出 `table-checklist` 文件。
5. `TWB` 必须输出可执行实现方案。
6. `TURL` 必须输出至少两个 URL（本地 + 局域网）。

---

## 6. 失效传播（必须执行）

上游步骤重跑时，必须清理下游状态与产物引用：

| 重跑步骤 | 清理步骤 |
|---|---|
| DB | DBS/DBQ/DBV |
| FR | DT/IA/DL/NC/ANF |
| DT | IA/DL/EDA/DVZ/MIX/TG/NC/ANF |
| IA | DL/NC/ANF |
| DL | NC/ANF |
| EDA/DVZ/MIX | TG/NC/ANF |
| TG | NC/ANF |
| NC | ANF |
| OWNER_ENTRY | INTENT_CLARIFY/DATA_MAP/QUERY_BUILD/REPORT_GEN |
| INTENT_CLARIFY | DATA_MAP/QUERY_BUILD/REPORT_GEN |
| DATA_MAP | QUERY_BUILD/REPORT_GEN |
| QUERY_BUILD | REPORT_GEN |
