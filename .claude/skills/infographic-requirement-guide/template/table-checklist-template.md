# Table Rule Checklist (TCL) - Gate Template

> 用途：在 `TWB`（Table Web Build）之前执行门禁检查。  
> 结果判定：`P0` 任一 `Fail` => `BLOCKED`；`P1` 任一 `Fail` => 需豁免说明后方可继续；`P2` 可带风险继续。  
> 说明：本模板是“可执行检查单”，不是知识摘录。  
> 最近更新：2026-03-05

---

## 0) Metadata

```yaml
draft_id: "draft-xxx"
selection_mode: "data-guided|intent-guided"
selection_entry: "TG->TES"
selected_engine: "vxe-table|pro-table|tanstack-table|antv-s2"
fallback_engine: "..."
primary_device: "mobile|desktop|mixed"
time_budget_sec: 60
decision_type: "pitch|lookup|edit"
presentation_strategy: "dual-view|table-first"
primary_view: "mobile-pitch|evidence-table"
secondary_view: "evidence-table|mobile-pitch|null"
source_carrier: "excel|csv|db|api"
calculation_owner: "excel|warehouse|script|mixed"
owner: ""
reviewer: ""
created_at: "YYYY-MM-DD"
last_reviewed_at: "YYYY-MM-DD"
source_snapshot_at: "YYYY-MM-DD"
status: "DRAFT|READY|BLOCKED"
supported_versions:
  vxe-table: ""
  pro-table: ""
  tanstack-table: ""
  antv-s2: ""
blocking_issues: []
waivers: []
```

---

## 1) 填写规则

- `Result` 只能填：`Pass` / `Fail` / `NA`
- `Evidence` 必填：代码位置、截图路径、或配置片段
- `Priority` 含义：
  - `P0` 阻塞上线
  - `P1` 需修复或书面豁免
  - `P2` 优化项

建议记录格式：

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| A1 | 示例：表格与图表分工已明确 | Pass | `table-brief-xxx.yaml` 第 12 行 | P0 | @name |

---

## 2) Gate Checks

### A. 业务目标与分工边界

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| A1 | 表格目标为“查找/对比/明细”，非叙事主图替代 |  |  | P0 |  |
| A2 | 用户核心任务已明确（浏览/筛选/导出/编辑） |  |  | P0 |  |
| A3 | 与图表分工边界已写入 `table_decision`（避免重复表达） |  |  | P1 |  |
| A4 | 数据载体与计算归属已明确（如 Excel 负责计算，表格负责交付） |  |  | P1 |  |

### B. 数据质量与语义一致性

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| B1 | 主键/唯一键定义清楚，重复行策略明确 |  |  | P0 |  |
| B2 | 单位、币种、时区、日期口径统一 |  |  | P0 |  |
| B3 | 缺失值、异常值、极值处理策略已定义 |  |  | P0 |  |
| B4 | 场景/差异字段定义一致（如 `AC/PL/FC`、`ΔPL`、`ΔPL%`） |  |  | P1 |  |
| B5 | 层级结构满足 MECE；必要时有“余项/Rest”策略 |  |  | P1 |  |

### C. 引擎选型约束（通用 + 引擎专属）

#### C-0 通用

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| C0-1 | `selected_engine` 与 `TES` 推理一致 |  |  | P0 |  |
| C0-2 | 大规模数据策略已定义（分页/虚拟化/服务端查询） |  |  | P0 |  |
| C0-3 | 导出需求与权限边界已定义（CSV/XLSX/PDF） |  |  | P1 |  |

#### C-VXE（仅 selected_engine=vxe-table 时必填）

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| CV-1 | 需要强编辑能力或 Excel 类交互（批量编辑/键盘流） |  |  | P0 |  |
| CV-2 | 编辑回写与校验链路明确（前端校验 + 服务端校验） |  |  | P0 |  |

#### C-PRO（仅 selected_engine=pro-table 时必填）

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| CP-1 | 场景是后台管理范式（搜索表单 + 列操作 + 动作栏） |  |  | P0 |  |
| CP-2 | `request`/分页/筛选/排序接口契约明确 |  |  | P0 |  |

#### C-TS（仅 selected_engine=tanstack-table 时必填）

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| CT-1 | 需要高度自定义列渲染与状态编排 |  |  | P0 |  |
| CT-2 | 若数据量大，已补充虚拟化方案（如 TanStack Virtual） |  |  | P0 |  |

#### C-S2（仅 selected_engine=antv-s2 时必填）

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| CS-1 | 需求包含多维透视/交叉分析/分析看板 |  |  | P0 |  |
| CS-2 | 行列维度与指标模型已定义（rows/columns/values） |  |  | P0 |  |

### D. 交互一致性与可用性

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| D1 | 排序/筛选/分页状态在刷新或路由切换后行为一致 |  |  | P1 |  |
| D2 | 列宽、固定列、列显隐、行展开交互一致且可预期 |  |  | P1 |  |
| D3 | 空态/加载态/错误态定义完整 |  |  | P0 |  |
| D4 | 导航回路完整（含“返回总览”或同级替代路径） |  |  | P2 |  |

### E. 可访问性（A11y）与可读性（2026 基线）

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| E1 | 键盘可达（表头、分页、筛选、行操作可聚焦） |  |  | P0 |  |
| E2 | 可排序列正确暴露 `aria-sort` |  |  | P0 |  |
| E3 | 不仅靠颜色传达正负/状态（有文本或图标冗余编码） |  |  | P0 |  |
| E4 | 文本与关键 UI 对比度达标（WCAG 2.2） |  |  | P1 |  |
| E5 | 焦点样式可见，且不被样式覆盖 |  |  | P1 |  |

### F. 性能预算与降级策略

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| F1 | 首屏渲染预算已定义（例如 < 2s，按项目标准） |  |  | P1 |  |
| F2 | 交互延迟预算已定义（排序/筛选响应阈值） |  |  | P1 |  |
| F3 | 行列规模阈值明确（何时切分页/虚拟化/服务端） |  |  | P0 |  |
| F4 | 超阈值降级策略可执行且已验证 |  |  | P0 |  |

### G. 安全与导出合规

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| G1 | 富文本/HTML 字段已做 XSS 防护或转义 |  |  | P0 |  |
| G2 | 导出文件字段遵循权限模型（敏感字段不外泄） |  |  | P0 |  |
| G3 | CSV 导出已处理公式注入风险（如 `= + - @` 前缀） |  |  | P0 |  |

### H. 发布验收

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| H1 | `preview_url_local` 可访问 |  |  | P0 |  |
| H2 | `preview_url_network` 可访问（同网段） |  |  | P1 |  |
| H3 | 核心路径截图/录屏已存档 |  |  | P2 |  |
| H4 | 未关闭问题已登记并绑定处理计划 |  |  | P1 |  |

### I. 移动端 Pitch 体验门禁（`dual-view` 或主设备为 `mobile` 时必填）

| ID | Checkpoint | Result | Evidence | Priority | Owner |
| --- | --- | --- | --- | --- | --- |
| I1 | 首屏展示 3-5 个核心 KPI，避免完整大表首屏直出 |  |  | P0 |  |
| I2 | 首屏展示 TopN/异常摘要，并提供趋势微图或关键变化 |  |  | P1 |  |
| I3 | 从 Pitch 到完整表格的路径 <= 2 次点击，且可返回总览 |  |  | P0 |  |
| I4 | 主视图无强制横向滚动读数（完整表格可在次级视图） |  |  | P0 |  |
| I5 | 触控目标尺寸符合移动端可用性（建议 >= 44x44） |  |  | P1 |  |
| I6 | 关键状态不依赖颜色单编码（文本/图标冗余表达） |  |  | P0 |  |

---

## 3) 结果汇总（TCL 输出摘要）

```yaml
summary:
  pass: 0
  fail: 0
  na: 0
  p0_fail: 0
  p1_fail: 0
  mobile_gate_fail: 0
final_decision: "READY|BLOCKED"
top_risks:
  - "..."
required_actions:
  - "..."
```

---

## 4) 规范依据（可追溯）

### 本地规范基线

- `./resource/table-规范资源包-摘录版.md`

### 官方文档（时效校验）

- TanStack Table Pagination: <https://tanstack.com/table/latest/docs/guide/pagination>
- TanStack Table Virtualization: <https://tanstack.com/table/latest/docs/guide/virtualization>
- TanStack Virtual: <https://tanstack.com/virtual/docs/overview>
- Ant Design Table: <https://ant.design/components/table/>
- AntV S2: <https://github.com/antvis/S2>
- ARIA `aria-sort`: <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-sort>
- WCAG 2.2 Overview: <https://www.w3.org/WAI/standards-guidelines/wcag/>

---

## 5) 备注

- 若你有私有检查项（行业合规、内控审计、监管规则），在对应分组下新增 `P0/P1` 条目即可。
- 若 `selected_engine` 切换，必须重跑 `C` 分组与 `F` 分组。
