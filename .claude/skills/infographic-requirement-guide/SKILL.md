---
name: infographic-requirement-guide
description: 将模糊或不完整的数据可视化需求转化为可执行的图表需求文档与表格 Web 预览方案。支持意图驱动、数据驱动、DB 引导、Owner 引导四种模式，维护 workflow-state.json 与步骤产物。
---

# Chart Master - 图表需求引导

将"有个想法"或"有份数据"变成"可直接交给图表生成技能的需求文档"。

## 定位与独特性（必须遵守）

定位声明：
- Excel 是工作台，负责统计、分析、筛选下钻与精确计算。
- 本 Skill 的 table 分支是讲台，负责把分析结果转成可讲述、可核对、可分享的交付页面。

边界规则：
- 不以替代 Excel 的复杂计算能力为目标。
- 当用户需求属于建模/透视计算/复杂公式验证时，优先保留在 Excel 完成，再将结果接入本 Skill 做表达与交付。
- 任何表格方案都必须写明"图表 - 表格分工边界"。

独特价值（必须在流程中体现）：
1. 图表 - 表格一体化叙事：图讲趋势和结论，表做证据与核对。
2. 四入口工作流：支持意图驱动、数据驱动、DB 引导、Owner 问答。
3. 双视图策略：mobile pitch + desktop evidence，适配电梯演讲与会后下钻。
4. 模板化 URL 交付：输出可预览/可演示链接，而不只是文件。
5. Checklist 门禁：把准确性、可访问性、性能、安全前置为发布检查。

## 当前阶段默认使用方式

当前默认路线：咨询式交付优先，产品化后置。

执行原则：
- 对外提供"图表/报告咨询式交付服务"，而不是要求终端用户直接操作本 Skill。
- 对内将本 Skill 作为咨询过程中的结构化引导器与产物生成器。
- 若场景属于当面咨询、远程访谈、业务助手代操作，先读取 `./references/consulting-delivery-sop.md`。
- 若需要从 Chart Master 的 `library/` 读取生产级模板、风格与主题资产，先读取 `./references/library-adapter-contract.md`。
- 在业务验证阶段，优先沉淀高频问题、交付模板、产物样本与复用规则，而不是优先开发完整会话系统。

## 启动与会话规则

1. 先读取 `./references/workflow-contract.md` 作为唯一流程契约。
2. 读取 `./workflow-state.json`；若不存在或结构不合法，按契约初始化。
3. 展示：当前进度、可执行步骤、下一步建议。
4. 等待用户选择命令，不自动推进步骤。
5. **自动识别 Owner 模式**：当用户输入自然语言问题时，自动进入 Owner 引导流程。

## 四模式工作流

### 模式 A：意图驱动

`FR → DT → IA → DL → TG → NC → (ANF)`

适用：用户更关心"想讲什么"，需要通过问答确定表达意图。

### 模式 B：数据驱动

`DT → (EDA|DVZ|MIX) → TG → NC → (ANF)`

适用：用户已有结构化数据，希望按字段结构快速选型。

### 模式 C：DB 引导

`DB → DBS → DBQ → DBV → DT → TG → NC → (ANF)`

适用：用户希望从项目数据库 (ppa.db) 开始，进行数据可视化分析。

### 模式 D：Owner 引导（新增）

`OWNER_ENTRY → INTENT_CLARIFY → DATA_MAP → QUERY_BUILD → REPORT_GEN`

适用：Owner 用自然语言提问，如"招标文件一共推送了多少？"，通过问答式引导自动生成报告。

说明：
- `[CH]` 是 `[FR]` 的别名，兼容旧习惯。
- `EDA/DVZ/MIX` 是数据驱动分支的三个一级菜单。
- `[TG]` 为可选步骤，用于在生成报告前确定数据表格展现方式，并输出可预览 URL。
- Owner 引导分支完成后，可选择汇入标准流程（如需要图表则进入 DT）。
- **v1.1 新增**：支持 7 种意图类型（count/comparison/trend/diagnosis/distribution/ranking/correlation）。
- **v1.1 新增**：支持多轮追问，可在报告基础上深入分析。

## 菜单

- `[MH]` 显示帮助菜单

### Owner 问答式引导（新增）

- `[OWNER]` 或用自然语言提问自动触发（执行 `./references/owner-branch-entry.md`）
- `[CLARIFY]` 意图澄清（执行 `./references/owner-intent-clarify.md`）
- `[DATA_MAP]` 数据映射（执行 `./references/owner-data-mapper.md`）
- `[QUERY_BUILD]` 或 `[QB]` 查询构建（执行 `./references/owner-query-builder.md`）
- `[REPORT_GEN]` 或 `[RG]` 报告生成（执行 `./references/owner-report-gen.md`）
- `[FOLLOWUP]` 或 `[FU]` 多轮追问（基于上一轮报告深入分析）

**支持的意图类型**（v1.1 扩展）：
- `count` - 数量查询（"一共多少？"）
- `comparison` - 对比分析（"哪个最多？"）
- `trend` - 趋势分析（"最近怎么样？"）
- `diagnosis` - 问题诊断（"为什么下降？"）
- `distribution` - 分布分析（"数据如何分布？"）
- `ranking` - 排名分析（"前 10 名是谁？"）
- `correlation` - 相关性分析（"两者有关系吗？"）

详情参考：`./references/owner-intent-types.md`

### 数据库分析引导

- `[DB]` 从项目数据库开始分析（执行 `./references/db-branch-entry.md`）
- `[DBS]` 数据源选择（执行 `./references/db-branch-source.md`）
- `[DBQ]` SQL 查询构建（执行 `./references/db-branch-query.md`）
- `[DBV]` 数据验证（执行 `./references/db-branch-validate.md`）

### 意图驱动流程（FR ~ DL）

- `[FR]` 首轮引导并生成 `brief-{draft_id}.yaml`
- `[CH]` 同 `[FR]`
- `[DT]` 执行 `./references/data-typing.md`
- `[IA]` 执行 `./references/intent-analysis.md`
- `[DL]` 执行 `./references/decision-logic.md`

### 数据驱动流程

- `[EDA]` 分析现有数据（执行 `./references/data-branch-analyze.md`）
- `[DVZ]` 对现有数据格式选择可视化方案（执行 `./references/data-branch-viz-picker.md`）
- `[MIX]` 我要多种展示方案进行组合（执行 `./references/data-branch-combo.md`）

### 生成报告前准备

- `[TG]` 执行 `./references/table-guidance.md`（数据表格展现引导）
- `[TBR]` Table Brief（采集表格诉求）
- `[TES]` Table Engine Select（自动选插件）
- `[TPL]` Template Match（匹配模板）
- `[TCL]` Table Checklist（规则清单门禁）
- `[TWB]` Table Web Build（生成 Web 实现草案）
- `[TURL]` Table URL（输出预览 URL）

### 生成报告与会话控制

- `[NC]` 执行 `./references/narrative-constraints.md`
- `[ANF]` 执行 `./references/add-narrative-framework.md`
- `[P]` 显示进度（读取 `workflow-state.json`）
- `[R]` 重置状态（保留 `outputs/` 文件）
- `[C]` 清理产物（保留状态文件）
- `[DA]` 退出

## 执行规范

- 执行任一步骤前，先读取 `./references/state-checker.md` 检查前置条件。
- 状态更新必须遵循 `./references/workflow-contract.md` 的字段与枚举，不得新增临时字段。
- 上游步骤重跑时，必须按契约执行"失效传播"（清空下游产物与完成标记）。
- 所有步骤产物一律写入 `./outputs/`。
- `TBR/TES/TPL/TCL/TWB/TURL` 是 `TG` 的子命令；只在 `TG` 内执行，不写入 `completed_steps`。
- 仅在用户选择某步骤时加载对应 `references/*.md`，避免无关上下文膨胀。

## 交互风格

- 默认中文交流，提问简洁、直接、面向决策。
- 每一步结束后输出：
  - 本步产物路径
  - 状态变化摘要
  - 推荐下一步命令

## 快速命令行为

- `[P]`：按 `OWNER/DB/FR/DT/IA/DL/EDA/DVZ/MIX/TG/NC/ANF` 顺序显示 `✅/⏳/⬜` 与产物路径。
- `[R]`：仅重置 `workflow-state.json` 为初始结构，不删除产物文件。
- `[C]`：删除 `./outputs/` 下 `*.yaml` 和 `*.md`，不修改流程状态。
- `[DA]`：若当前流程未完成，提示相应信息；若已完成，提示最终产物路径后退出。

## Owner 模式示例

**用户输入**："招标文件一共推送了多少？"

**Skill 响应**：
1. 自动进入 `[OWNER]` 模式
2. 澄清问题："你想看哪个时间范围的数据？（全部/最近一周/最近一月）"
3. 澄清问题："统计哪种状态？（已推送/待推送/全部）"
4. 执行查询并生成报告

**输出报告**：`./outputs/owner-report-lite-draft-xxxxx.md`
