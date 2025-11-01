# Story: 后端API与数据聚合实现

Status: InProgress

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
- [ ] 编写单元测试，验证数据聚合逻辑的准确性。
- [ ] 编写集成测试，验证 API 接口响应和数据格式。

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

<!-- Will be populated during dev-story execution -->

### Debug Log References

- 2025-10-27: Backend API and data aggregation implementation complete. Testing pending.

### Completion Notes List

<!-- Will be populated during dev-story execution -->

### File List

<!-- Will be populated during dev-story execution -->
