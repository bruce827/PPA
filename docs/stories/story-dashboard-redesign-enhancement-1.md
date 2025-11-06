# Story: 后端API与数据聚合实现

Status: review

## Story

As a 开发者,
I want 实现仪表板所需的所有后端API接口和数据聚合逻辑,
so that 为前端提供稳定、高效的数据支持，确保仪表板能展示准确的核心指标.

## Acceptance Criteria

1.  `GET /api/dashboard/summary` 接口返回项目总数和平均成本。
2.  `GET /api/dashboard/risk-distribution` 接口返回风险等级分布数据。
3.  `GET /api/dashboard/cost-composition` 接口返回成本构成数据。
4.  `GET /api/dashboard/role-cost-distribution` 接口返回角色成本占比数据。
5.  `GET /api/dashboard/cost-trend` 接口返回项目成本趋势数据。
6.  `GET /api/dashboard/risk-cost-correlation` 接口返回风险因子与成本关联数据。
7.  所有API接口响应时间在 500 毫秒以内。
8.  后端数据聚合逻辑能够兼容旧数据格式（如果存在）。

## Tasks / Subtasks

- [x] 在 `server/controllers/dashboardController.js` 中实现新的 API 路由处理函数。
- [x] 在 `server/services/dashboardService.js` 中编写数据聚合逻辑。
- [x] 编写单元测试，验证数据聚合逻辑的准确性。
- [x] 编写集成测试，验证 API 接口响应和数据格式。

## Dev Notes

### Technical Summary

实现仪表板所需的所有后端API接口和数据聚合逻辑，确保数据准确性和性能。

### Project Structure Notes

- Files to modify: `server/controllers/dashboardController.js`, `server/routes/dashboard.js`, `server/services/dashboardService.js`
- Expected test locations: `server/tests/`
- Estimated effort: 5 story points (3-5 days)

### References

- **Tech Spec:** See tech-spec.md for detailed implementation
- **Architecture:** `tech-spec.md` (技术细节, API 接口设计, 数据聚合逻辑)

## Dev Agent Record

### Context Reference

- Path: docs/stories/story-context-dashboard-redesign-enhancement.1.xml

### Agent Model Used

GitHub Copilot (Claude 3.5 Sonnet)

### Debug Log References

- 2025-10-27: Backend API and data aggregation implementation complete. Testing pending.
- 2025-11-06: 完成所有测试实现
  - 创建单元测试文件 `server/tests/dashboardService.test.js` (17个测试用例)
  - 创建集成测试文件 `server/tests/dashboardAPI.test.js` (8个测试用例)
  - 修复 `getSummary` 函数处理 null 平均成本的边缘情况
  - 所有测试通过 (25/25)，包括性能测试 (AC7: <500ms)

### Completion Notes List

- ✅ 完成后端 API 和数据聚合逻辑实现 (2025-10-27)
- ✅ 完成全面的测试覆盖 (2025-11-06)
  - 单元测试：覆盖所有 dashboardService 函数的核心逻辑、边缘情况和错误处理
  - 集成测试：验证所有 6 个 API 端点的功能、数据格式和性能要求
  - 所有 8 个验收标准均通过测试验证
  - 性能测试确认所有接口响应时间 < 500ms

### File List

- `server/controllers/dashboardController.js` - Dashboard API 控制器 (已修改)
- `server/services/dashboardService.js` - 数据聚合服务逻辑 (已修改)
- `server/routes/dashboard.js` - Dashboard 路由配置 (已存在)
- `server/tests/dashboardService.test.js` - 单元测试 (新增)
- `server/tests/dashboardAPI.test.js` - 集成测试 (新增)
