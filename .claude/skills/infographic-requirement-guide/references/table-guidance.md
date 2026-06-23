# 数据表格展现引导 (Table Guidance, TG)

**版本**: v2.4  
**用途**: 在生成图表提示词（NC）之前，完成表格引擎选择、双视图模板匹配、规则清单检查、Web 方案与预览 URL 输出。  
**核心策略**: 默认执行“手机讲结论（Pitch）+ 桌面看证据（Evidence Table）”的双视图分流。

---

## 0. 定位边界（必须先判定）

1. table 分支目标是“结果表达与交付”，不是“替代 Excel 做复杂计算”。
2. 若用户当前诉求是统计建模、透视计算、复杂公式校验：
   - 明确建议继续在 Excel（或原分析工具）完成计算；
   - TG 仅承接“结果展示、证据核对、跨端演示、URL 交付”。
3. 执行 TG 时，`table_decision` 必须写入 `chart_table_boundary`，明确：
   - 图负责什么（趋势/结论表达）
   - 表负责什么（精确值核对/筛选/导出）
4. 若无法明确分工边界，不进入 `TWB/TURL`。

---

## 前置检查

1. 读取 `workflow-state.json` 与 `workflow-contract.md`。
2. 若 `DT` 未完成或 `artifacts.data_profile` 缺失，提示先执行 `[DT]`。
3. 若 `TG` 已完成，询问是否重跑；确认后按契约清理 `NC/ANF`。

---

## TG 子菜单

- `[TBR]` Table Brief：采集表格诉求并输出 `table-brief`
- `[TES]` Table Engine Select：自动选插件并输出 `table-decision`
- `[TPL]` Template Match：匹配模板并回填 `table-decision.template`
- `[TCL]` Table Checklist：规则清单检查并输出 `table-checklist`
- `[TWB]` Table Web Build：生成 Web 实现草案并补齐 `table-preview` 的实现信息
- `[TURL]` Table URL：输出本地 + 局域网预览地址，完成 `table-preview`

推荐顺序：`TBR -> TES -> TPL -> TCL -> TWB -> TURL`

---

## 1. TBR: Table Brief

最少采集以下信息：

1. 使用场景：概览 / 明细 / 对比 / 复盘
2. 读者行为：浏览 / 筛选 / 导出 / 编辑
3. 数据规模：行数区间、列数区间
4. 强调需求：TopN / 异常 / 同比环比 / 条件格式
5. 密度偏好：Low / Medium / High
6. 主设备：`mobile | desktop | mixed`
7. 时长预算（秒）：`30 | 60 | 180`（可自定义）
8. 决策类型：`pitch | lookup | edit`
9. 数据载体与计算归属：`source_carrier=excel|csv|db|api`，`calculation_owner=excel|warehouse|script|mixed`

### 1.1 视图分流规则（必须执行）

1. 若满足以下任一条件，使用 `dual-view`：
   - `scenario.logic = Elevator-Pitch`
   - `narrative.duration_level = Flash`
   - `decision_type = pitch`
   - `primary_device = mobile` 且 `time_budget_sec <= 60`
2. `dual-view` 下固定：
   - `primary_view = mobile-pitch`
   - `secondary_view = evidence-table`
3. 其他情况默认：
   - `presentation_strategy = table-first`
   - `primary_view = evidence-table`
   - `secondary_view = mobile-pitch|null`

输出文件：`./outputs/table-brief-{draft_id}.yaml`

最小结构建议：

```yaml
draft_id: "..."
table_use_case: "overview|detail|comparison|review"
user_actions: ["browse", "filter", "export", "edit"]
data_scale:
  row_band: "..."
  col_band: "..."
emphasis_needs: ["topn", "anomaly", "mom_yoy", "conditional_format"]
density_preference: "low|medium|high"
device_profile:
  primary_device: "mobile|desktop|mixed"
  time_budget_sec: 60
  decision_type: "pitch|lookup|edit"
upstream_context:
  source_carrier: "excel|csv|db|api"
  calculation_owner: "excel|warehouse|script|mixed"
view_strategy:
  presentation_strategy: "dual-view|table-first"
  primary_view: "mobile-pitch|evidence-table"
  secondary_view: "evidence-table|mobile-pitch|null"
  pitch_summary_slots: 3
```

---

## 2. TES: Table Engine Select

### 2.1 引擎候选

- `vxe-table`
- `pro-table`
- `tanstack-table`
- `antv-s2`

### 2.2 选型方法（两阶段）

阶段 A：先定证据层引擎（Evidence Table）

1. 多维透视、交叉分析、分析看板优先：`antv-s2`
2. 强编辑能力、Excel 类体验、大数据交互优先：`vxe-table`
3. 管理后台范式（搜索表单 + 操作列 + Ant Design 生态）优先：`pro-table`
4. 高度自定义渲染与交互逻辑优先：`tanstack-table`

阶段 B：叠加“移动适配分”

1. 对四个引擎输出至少三类分数：`desktop_fit`、`mobile_fit`、`edit_fit`（1-5 分）
2. 若 `presentation_strategy = dual-view`，引擎选择以证据层稳定性为主，移动端主视图不强制展示完整大表
3. 若 `decision_type = edit`，`edit_fit` 权重最高

### 2.3 输出要求

输出文件：`./outputs/table-decision-{draft_id}.yaml`

至少包含：

```yaml
selection_mode: "data-guided|intent-guided"
selection_entry: "TG->TES"
presentation_strategy: "dual-view|table-first"
primary_view: "mobile-pitch|evidence-table"
secondary_view: "evidence-table|mobile-pitch|null"
selected_engine: "vxe-table|pro-table|tanstack-table|antv-s2"
fallback_engine: "..."
scoring:
  desktop_fit:
    vxe-table: 0
    pro-table: 0
    tanstack-table: 0
    antv-s2: 0
  mobile_fit:
    vxe-table: 0
    pro-table: 0
    tanstack-table: 0
    antv-s2: 0
  edit_fit:
    vxe-table: 0
    pro-table: 0
    tanstack-table: 0
    antv-s2: 0
engine_reasoning:
  - "..."
chart_table_boundary:
  chart_role: "..."
  table_role: "..."
```

---

## 3. TPL: Template Match

将当前诉求映射到模板信息（双模板）：

1. 模板来源（`./template/` 作为默认模板来源）
2. 移动端结论视图模板：`mobile_pitch_template`
3. 证据表格视图模板：`evidence_table_template`
4. 与图表分工边界（若已有 `chart_decision`）

规则：

1. `presentation_strategy = dual-view` 时，两个模板都必须填写。
2. `presentation_strategy = table-first` 时，`mobile_pitch_template` 可为 `null`，但建议提供轻量摘要模板。
3. 若 `./template/` 中存在合适模板，直接匹配使用。
4. 优先使用 `./template/` 中的模板。

写入：`./outputs/table-decision-{draft_id}.yaml`（增量更新 `template` 节点）

建议结构：

```yaml
template:
  source: "./template"
  mobile_pitch_template:
    template_id: "..."
    structure: "..."
    style: "..."
  evidence_table_template:
    template_id: "..."
    structure: "..."
    style: "..."
```

---

## 4. TCL: Table Checklist

在生成表格实现前执行规则检查。

输出文件：`./outputs/table-checklist-{draft_id}.md`

执行方式：

1. 以 `./template/table-checklist-template.md` 为基线模板生成检查单。
2. 逐项填写 `Result`（仅 `Pass/Fail/NA`）与 `Evidence`。
3. 计算汇总并给出 `final_decision`（`READY|BLOCKED`）。
4. 结论规则：
   - 任一 `P0` 为 `Fail` => `BLOCKED`
   - `P1` 为 `Fail` 时需给出豁免或整改计划
5. 若 `presentation_strategy = dual-view` 或 `primary_device = mobile`，移动端分组（`I`）不允许整体 `NA`。

最小输出要求（必须存在）：

```markdown
## 0) Metadata
- draft_id
- selected_engine
- primary_device
- time_budget_sec
- decision_type
- presentation_strategy
- last_reviewed_at
- source_snapshot_at
- status

## 2) Gate Checks
- A~I 分组（业务目标、数据质量、选型约束、交互一致性、可访问性、性能、安全、发布、移动端 Pitch）

## 3) 结果汇总
- summary.pass / summary.fail / summary.na
- summary.p0_fail / summary.p1_fail
- final_decision
- top_risks
- required_actions
```

---

## 5. TWB: Table Web Build

输出一个“可执行实现草案”，至少包含：

1. 视图架构：`mobile-pitch` / `evidence-table`（单视图或双视图路由）
2. 移动端 Pitch 组件：KPI 卡、TopN 列表、1 条关键趋势、进入完整表格按钮
3. 证据层表格配置：字段、格式化、排序、筛选、固定列、分页/虚拟化
4. 跨视图联动：从 Pitch 跳转到表格时保留筛选上下文
5. 强调规则：TopN/异常/阈值

写入：`./outputs/table-preview-{draft_id}.yaml`（实现草案部分）

---

## 6. TURL: Table URL

必须输出：

- `preview_url_local`: `http://localhost:{port}/...`
- `preview_url_network`: `http://{local-ip}:{port}/...`

推荐在双视图下额外输出：

- `preview_url_local_pitch`
- `preview_url_local_table`
- `preview_url_network_pitch`
- `preview_url_network_table`

URL 目标建议：

1. 双视图路由：`/table-preview/{draft_id}?view=pitch|table`
2. 模板文件直出：`./template/table-preview-{draft_id}.html`
3. 模板工作台预览：`./template/`

写入：`./outputs/table-preview-{draft_id}.yaml`（URL 部分）

---

## 7. TG 完成与状态更新

TG 完成条件：

- `table_decision` 已生成，且包含 `presentation_strategy` 与 `selected_engine`
- `table_checklist` 已生成，且包含 `summary` 与 `final_decision`
- `table_preview` 已生成，且包含 `preview_url_local` 与 `preview_url_network`
- 若 `presentation_strategy = dual-view`，`table_preview` 还需包含 Pitch/Table 的细分 URL

状态更新：

```json
{
  "current_step": "TG",
  "completed_steps": ["...", "TG"],
  "artifacts": {
    "table_brief": "./outputs/table-brief-{draft_id}.yaml",
    "table_decision": "./outputs/table-decision-{draft_id}.yaml",
    "table_checklist": "./outputs/table-checklist-{draft_id}.md",
    "table_preview": "./outputs/table-preview-{draft_id}.yaml"
  }
}
```

---

## 8. 下一步建议

- 继续执行 `[NC]`，将 `table_decision/table_checklist/table_preview` 并入最终提示词输出。
