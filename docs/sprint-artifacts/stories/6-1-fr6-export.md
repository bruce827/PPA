# Story 6.1: 实现 FR-6 Excel 导出双版本管线

Status: ready-for-dev

## Story

As a 交付负责人,  
I want the backend to stream standardized Excel exports for any assessment snapshot (internal vs. external views),  
so that 内部评审与对外报价都可以直接复用相同的数据源并具备追溯能力。

## Acceptance Criteria

1. **内部版导出接口**：`GET /api/projects/:id/export/excel` 默认返回内部版，响应 200，`Content-Type` 为 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`，`Content-Disposition` 必须遵循 `{projectName}_{version}_{YYYYMMDD_HHmmss}.xlsx`。（[Source: docs/PRD.md#FR-6](docs/PRD.md#FR-6)；[Source: docs/prd/export-spec.md#fr-6-1-导出触发与管线流程](docs/prd/export-spec.md#fr-6-1-导出触发与管线流程)）
2. **内部版内容结构**：Excel 含 `Summary/角色成本明细/差旅成本明细/维护成本/风险评估明细/Rating Factor 说明` 六个工作表，且标题行背景 `#4472C4`、汇总行 `#F0F0F0`，数值列按两位（金额）或一位（工作量）小数显示。（[Source: docs/prd/export-spec.md#fr-6-2-excel-导出内容结构](docs/prd/export-spec.md#fr-6-2-excel-导出内容结构)）
3. **对外版成本分摊**：`version=external` 仅输出 `项目概览` 与 `模块报价明细`，按模块聚合 `role_costs` 并确保总成本差值 ≤0.05 万元，显示总计行。（[Source: docs/prd/export-spec.md#22-对外版本external-version](docs/prd/export-spec.md#22-对外版本external-version)）
4. **元数据与流式输出**：Workbook 属性写入 `creator/created/modified`，Summary Sheet 展示 `snapshot_id/exported_at/rating_factor`，全流程使用 exceljs 流式写入 HTTP 响应，禁止落地临时文件。（[Source: docs/prd/export-spec.md#fr-6-3-导出元数据与追溯](docs/prd/export-spec.md#fr-6-3-导出元数据与追溯)）
5. **接口健壮性**：API 支持 `version=internal|external`，非法值返回 400 JSON `{ "error": "Invalid export version", "project_id": ":id" }`，并由统一错误处理中间件输出。（[Source: docs/PRD.md#FR-6](docs/PRD.md#FR-6)）
6. **异常捕获**：JSON 解析失败、字段缺失、渲染失败、流写入失败均需捕获并返回结构化错误，同时写入日志。（[Source: docs/prd/export-spec.md#fr-6-4-异常捕获与日志](docs/prd/export-spec.md#fr-6-4-异常捕获与日志)）
7. **日志落盘**：导出日志写入 `logs/export/{YYYY-MM-DD}/{HHmmss}_{paddedProjectId}/`，包含 `index/request/project/formatted/error/notes` 文件，受 `EXPORT_LOG_ENABLED`、`EXPORT_LOG_DIR` 控制。（[Source: docs/prd/export-spec.md#fr-6-4-异常捕获与日志](docs/prd/export-spec.md#fr-6-4-异常捕获与日志)）
8. **性能要求**：单次导出（数据准备+渲染+流式返回）≤5 秒，记录 `durationMs` 并在日志与 `index.json` 中体现。（[Source: docs/PRD.md#FR-6](docs/PRD.md#FR-6)）
9. **测试覆盖**：编写 formatter/renderer 单测 + Supertest 集成测试校验内外版响应头、Sheet 命名及成本合计，并覆盖 404、JSON 解析失败等异常路径。（[Source: docs/prd/export-spec.md#5-测试策略](docs/prd/export-spec.md#5-测试策略)）
10. **文档同步**：更新 `server/README.md` 和 `.env.example`，描述查询参数与日志配置并指向 Export Spec；确保 `.gitignore` 继续忽略 `logs/export`。（[Source: docs/prd/export-spec.md#7-迁移计划](docs/prd/export-spec.md#7-迁移计划)）

## Tasks / Subtasks

- [ ] **Controller 实现** (`server/controllers/exportController.js`) — 验证 `version` 参数、读取项目、测量 `durationMs`、统一调用 `exportFileLogger`，确保异常传递至 `errorHandler`。（AC: #1、#4、#5、#6、#7、#8）
- [ ] **Service & Stream** (`server/services/exportService.js`) — 解析 `assessment_details_json`、根据版本调度 formatter/renderer，并确保 exceljs 直接 `workbook.xlsx.write(res)`。（AC: #2、#3、#4、#6、#7）
- [ ] **Formatter-Internal** (`services/export/formatters/internalFormatter.js`) — 构建 summary、role/travel/maintenance/risk 数据，并统一万元/小数格式。（AC: #2）
- [ ] **Formatter-External** (`services/export/formatters/externalFormatter.js`) — 依据 `role_costs` 计算模块成本占比与总和校验。（AC: #3）
- [ ] **Renderer** (`services/export/renderers/excelRenderer.js`) — 生成 6+2 工作表、设置样式、写入 Workbook 属性并封装文件命名逻辑。（AC: #2、#3、#4）
- [ ] **日志模块** (`services/exportFileLogger.js`) — 实现 EXPORT_LOG_ENABLED/EXPORT_LOG_DIR 控制、分层目录及 `index/request/project/formatted/error/notes` 写入。（AC: #6、#7）
- [ ] **性能监控** — 在 controller/service 中记录导出起止时间，并写入 `index.json`。（AC: #8）
- [ ] **API & 文档** — 更新 `server/README.md`、`.env.example` 描述查询参数与日志配置；保证 `.gitignore` 忽略 `logs/export`。（AC: #5、#10）
- [ ] **自动化测试** — 构建覆盖所有场景的测试体系。（AC: #8、#9）
  - [ ] Jest 单测覆盖 formatter、renderer、logger 的 happy path 与异常。（AC: #9）
  - [ ] Supertest 集成测试：验证 internal/external 响应头、sheet 命名、模块成本合计、404/解析失败分支。（AC: #9）
  - [ ] 性能计时脚本或 Jest Hook，确保导出耗时 <5s 并在日志中写入警告。（AC: #8、#9）

## Dev Notes

### Architecture patterns and constraints

- Controller → Service → Model 分层，导出逻辑需保持 controller 简洁、业务集中在 service，并借助新建 formatter/renderer 模块来保持单一职责。（[Source: server/ARCHITECTURE.md#二-各层详细设计](server/ARCHITECTURE.md#二-各层详细设计)）
- 所有 Excel 样式、元数据及成本计算必须严格遵循 Export Spec，禁止“就地计算”或手写魔法数。（[Source: docs/prd/export-spec.md#2-功能需求详解](docs/prd/export-spec.md#2-功能需求详解)）
- 错误必须由全局错误处理中间件输出结构化 JSON，不允许在 controller 内直接 `res.send` 非结构化文案。（[Source: server/ARCHITECTURE.md#一-整体架构概览](server/ARCHITECTURE.md#一-整体架构概览)）

### Learnings from Previous Story

- 本故事为 FR-6 史诗的首个实现项，无已完成的上一故事；保留该小节以便后续故事填充对齐项。（占位说明）[Source: docs/sprint-artifacts/stories/6-1-fr6-export.md]

### Project Structure Notes

- 代码位于 `server/`；新增模块建议落在 `services/export/`，并通过 `controllers/exportController.js` 调用。（[Source: server/ARCHITECTURE.md#二-各层详细设计](server/ARCHITECTURE.md#二-各层详细设计)）
- `logs/` 目录已由 `.gitignore` 忽略，新建 `logs/export` 不需要额外处理，但需在 README/.env 中提示环境变量。（[Source: docs/prd/export-spec.md#fr-6-4-异常捕获与日志](docs/prd/export-spec.md#fr-6-4-异常捕获与日志)）
- 维持项目 2 空格缩进和 CommonJS `require` 规范，formatter/renderer/logger 需导出函数供服务层调用。

### References

- [Source: docs/PRD.md#FR-6](docs/PRD.md#FR-6)
- [Source: docs/prd/export-spec.md](docs/prd/export-spec.md)
- [Source: server/ARCHITECTURE.md](server/ARCHITECTURE.md)
- [Source: server/controllers/exportController.js](server/controllers/exportController.js)
- [Source: server/services/exportService.js](server/services/exportService.js)
- [Source: server/services/aiFileLogger.js](server/services/aiFileLogger.js)

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/stories/6-1-fr6-export.context.xml
- docs/prd/export-spec.md
- server/services/exportService.js
- server/controllers/exportController.js
- server/ARCHITECTURE.md
- docs/sprint-artifacts/sprint-status.yaml

### Agent Model Used

N/A（Story drafting）

### Debug Log References

- N/A（规划阶段未执行）

### Completion Notes List

- 已创建 `docs/sprint-artifacts/sprint-status.yaml` 并登记 `6-1-fr6-export: drafted`，用于后续 Story Context 工作流引用。
- 若 `assessment_details_json` 尚未包含 formatter 所需字段，需与计算/保存逻辑同步扩展。
- 导出成本误差阈值以 ±0.05 万为默认值；若产品确认更严格阈值，需同步更新常量。

### File List

- docs/prd/export-spec.md
- docs/PRD.md
- server/ARCHITECTURE.md
- server/controllers/exportController.js
- server/services/exportService.js
- docs/sprint-artifacts/sprint-status.yaml

## Change Log

- 2025-11-17: 初始草稿（Scrum Master）。
