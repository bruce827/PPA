# PPA - 一键评估工作量功能 PRD

**作者**: John (PM)
**日期**: 2025-11-14
**版本**: 0.1 Draft

---

## Executive Summary

**愿景对齐：** 将“新功能开发”Tab中人工填报的多角色工作量评估自动化，让项目发起人进入模块详情后即可用统一提示词调用AI，在一个操作内拿到可信的角色人天、delivery_factor 与复杂度判断，从而缩短评估时间并提升跨团队协同效率。

### What Makes This Special

当用户点击一键评估后，系统瞬间汇总模块上下文并生成覆盖所有角色的人天、delivery_factor 与复杂度/置信度，避免逐行填写和来回讨论，让“打开详情 → 看到完整方案”成为默认体验。

---

## Project Classification

**Technical Type:** SaaS B2B Web App
**Domain:** 企业内部评估工具（General B2B）
**Complexity:** 中等：前后端联动 + AI 服务

**产品形态**: B2B SaaS Web 应用，服务内部评估团队。
**典型用户流程**: 新建项目评估 → 进入“工作量估算”Tab → 选择模块并展开详情 → 点击一键评估 → 查看/应用结果并继续后续逻辑（写回角色人天与 delivery_factor）。
**主要环境**: 前端 Umi Max/Ant Design Web，后端 Express5 + SQLite，AI 服务通过 `/api/ai` 路由。

_领域复杂度：General B2B，无额外监管上下文。_

---

## Success Criteria

**Success Criteria / 项目成功标准（自动生成）**

1. 单模块无需手填任何角色人天；80% 用户点击“一键评估”后在 8 秒内看到完整建议。
2. AI 建议覆盖率 ≥ 90%，若缺失角色需展示“暂无建议”提示。
3. AI 角色工作量与历史人工结果 MAE ≤ 0.5 人天；“满意”反馈占比 ≥ 70%。
4. 写回链路：应用按钮成功率 ≥ 90%，写回后仍需手动大量调整的情况 ≤ 20%。
5. API 平均耗时 ≤ 4 秒、P95 ≤ 8 秒、失败率 < 3%；失败时 95% 请求提供 traceId + 可操作提示。

### Business Metrics

- 单次评估转化率 ≥ 65%（进入详情的用户中执行一键评估的比例）。
- 平均每个模块录入时间从 3 分钟降至 ≤ 1 分钟。
- 应用评估结果的成功率 ≥ 85%。
- 评估日志覆盖率 100%，便于 AI 调优与审计。

---

## Product Scope

### MVP - Minimum Viable Product

- 单模块一键评估：在“工作量估算”Tab 内点击详情后，用户可触发 API `/api/ai/evaluate-workload`，返回角色人天、delivery_factor、complexity、confidence。
- 前端将 AI 返回值渲染在 WorkloadEvaluationModal 中并允许“应用结果”写回当前模块。
- 后端完成路由/控制器/服务/提示词模板，落库日志并兜底解析 JSON 或文本。

### Growth Features (Post-MVP)

- 批量评估：支持多模块队列式评估并返回整包结果。
- 模型自适应：可根据模块类型匹配不同提示词/模型配置。
- 版本对比：允许查看 AI 建议与人工修订之间的差异，并持续学习。

### Vision (Future)

- 与资源排期工具打通，直接输出项目甘特和人力预测。
- 工作量评估与成本估算联动，自动生成报价建议。
- 提供评估API给第三方系统调用，实现评估能力对外输出。

---

## Domain-Specific Requirements

_无额外行业合规要求，遵循通用 B2B SaaS 安全与审计规范（权限控制、日志留存、速率限制）。_

---

## Innovation & Novel Patterns

- 把角色维度的工作量评估抽象为提示词模板化的 AI 能力，并与现有配置角色表动态对齐。
- 模拟“打开详情即见答案”的即时体验，减少人工讨论与排期等待。

### Validation Approach

- 设计提示词模板，增加示例输出 JSON；若 AI 返回非结构化文本则走服务端兜底解析器。
- 对比 10 个历史模块的人工结果与 AI 建议，校验误差及角色覆盖度。
- 接入日志与重放机制，便于后续训练或 Prompt 调优。

---

## Project Type Specific Requirements

**核心需求**

1. 前端
   - WorkloadEstimation 列表中“详情”抽屉需展示一键评估按钮，调用 `aiService.evaluateWorkload`.
   - Modal 接收 `role_workloads`, `delivery_factor`, `complexity`, `confidence`，并支持写回行内数据。
   - 若 AI 返回缺失角色，UI 需提示“该角色暂无建议”并允许手动补充。
2. 后端
   - 路由 `/api/ai/evaluate-workload` → 控制器 `aiController.evaluateWorkload` → 服务 `aiWorkloadEvaluationService`.
   - 依赖 `aiPromptService` 获取 category=workload_evaluation 的模板，变量包括模块字段与角色列表。
   - 统一模型调用栈（Provider、日志、DB 落盘、错误兜底），并复用风险评估的解析/重试逻辑。
3. 数据
   - 角色名与 `config_roles` 做宽松匹配（大小写/空格/中英文括号）。
   - 记录 `raw_response`, `parsed`, `model_used`, `duration_ms`, `prompt_id`.
   - 失败时返回结构化错误 `code/message`, 前端弹 Toast。

### API Specification

- **POST /api/ai/evaluate-workload**
  - Headers: `Content-Type: application/json`, `Authorization` 继承会话。
  - Body: `{ promptId, module1, module2, module3, description, variables?, roles? }`.
  - Response: `{ parsed: { role_workloads: Record<string, number>, delivery_factor?: number, complexity?: string, confidence?: number }, raw_response, model_used, timestamp, duration_ms }`.
  - Error: `{ code: string, message: string, traceId?: string }`.
- 需要节流：同一用户 30 秒内最多触发 5 次。

### Authentication & Authorization

- 复用现有 JWT/Session 校验；AI 路由属于受保护资源。
- 为防止滥用，可在服务端确认用户角色（PM/Owner）才可发起评估。

### Platform Support

- 需在 Chrome / Edge / Safari 最新两个版本稳定运行，兼容 1440px 桌面视图。

### Device Capabilities

- 主要为桌面端浏览器，无需移动端特性；保持抽屉 + Modal 在 13" 屏幕上完整展示。

### Multi-Tenancy Architecture

- 与现有评估数据相同，按 workspace/tenant 隔离，不允许跨项目读取模块详情。

### Permissions & Roles

- 只允许项目 Owner/PM 发起一键评估；评估结果写回需具备模块编辑权限。

---

## User Experience Principles

- Modal-first：保持评估流程在抽屉内完成，不跳转。
- 即时反馈：按钮、加载动画、错误提示全部实时反馈，让用户知道 AI 正在工作。
- 透明可信：展示模型信息/置信度，让用户理解建议来源。
- 可控替换：应用前允许逐角色调整，体现“AI 建议 + 人类最终决定”。

### Key Interactions

1. 点击“一键评估”后按钮进入 loading → Modal 显示“AI 正在生成”。
2. 模态框结构：角色工作量表格 + delivery_factor + complexity + confidence + 原因说明。
3. “应用结果”按钮在差异预览后启用；成功后在列表行展示“来自AI”的标记。

---

## Functional Requirements

1. User Flow & Trigger
   - 在“工作量估算”Tab 中点击详情抽屉即可看到“一键评估”按钮；空状态需提示所需字段。
   - 按钮需在请求中展示 loading、禁用重复点击，并在成功/失败时提示。

2. Payload 组装
   - 收集当前模块的 `module1/2/3`, `description`, 角色列表、历史工作量。
   - 可选 `variables`：模块规模、风险等级、复杂度提示。

3. API 调用
   - 调用 `/api/ai/evaluate-workload`。遇到 4xx/5xx 需展示 Toast，并允许重试。

4. Modal 渲染
   - WorkloadEvaluationModal 显示每个角色的人天建议、delivery_factor、复杂度、置信度。
   - 若 parsed 缺少字段，采用 UI 兜底：`--` + tooltip 说明。

5. 应用写回
   - “应用评估结果”将角色人天写入列表，更新 delivery_factor，并调用现有 `recalcWorkload`.
   - 记录 `ai_evaluation_result` 字段，标记当前结果是否来自 AI。

6. 服务端解析
   - 首选 JSON.parse；若失败，进入文本解析：按“角色: 数值”/“delivery_factor=”模式。
   - 未匹配角色应忽略并写 warning 日志。

7. 日志与审计
   - DB 中新增 `ai_workload_logs`（或复用现有 AI 日志表），字段含 request/response、promptId、model、duration。
   - 文件日志存储原始返回，便于调试。

8. 错误处理
   - 对超时/模型报错提供 `traceId`，便于支持团队排查。
   - 若解析失败，返回结构化错误 + 建议手动填写。

---

## Non-Functional Requirements

### Performance

- API 平均耗时 ≤ 4s，P95 ≤ 8s；超限时提示“正在继续计算”并轮询/重试。

### Security

- 遵循 `/api/ai` 路由既有安全策略：鉴权、速率限制、日志脱敏。
- Prompt/响应不要写入用户敏感信息，必要时做字段过滤。

### Scalability

- 支持并发 20 RPS，在高峰期时开启队列/排队提示。

### Accessibility

- Modal 中的“应用结果”按钮需有键盘可达性与ARIA标签；loading 状态传达给屏幕阅读器。

### Integration

- 与现有评估模板/模块梳理接口共享模型配置表；保持 `aiPromptService` 中 category 一致。

---

## Implementation Planning

### Epic Breakdown Required

本功能完成后需进入「工作量评估链路」的故事分解，请运行 `workflow create-epics-and-stories`。

---

## References

- Source Notes: docs/todo/workload-one-click-evaluation-flow.md
- Product Brief: docs/todo/workload-one-click-evaluation-flow.md
- Domain Brief: _暂无_
- Research: _暂无_

---

## Next Steps

1. 工作量评估联调
2. UX一致性评审
3. 评估服务扩展到批量场景

---

_This PRD captures the essence of自动化工作量估算体验——所有角色的工作量自动生成._

