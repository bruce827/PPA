# Story: 仪表板前端UI/UX实现

Status: Draft

## Story

As a 用户,
I want 在仪表板上直观地查看所有核心项目评估指标和数据可视化,
so that 能够快速理解项目整体状况，做出更明智的决策.

## Acceptance Criteria

1.  仪表板页面布局符合设计稿要求。
2.  项目总数、平均成本以统计卡片形式展示。
3.  风险等级分布以饼图或柱状图形式展示。
4.  成本构成分析以环形图或堆叠柱状图形式展示。
5.  角色成本占比以饼图或堆叠柱状图形式展示。
6.  项目成本趋势以折线图形式展示。
7.  风险因子与成本关联以散点图或气泡图形式展示。
8.  仪表板布局支持不同屏幕尺寸的响应式展示。
9.  数据加载失败时显示友好的错误提示。
10. 无数据时显示“暂无数据”状态。
11. 仪表板页面首次加载时间在 2 秒以内。

## Tasks / Subtasks

-   创建或修改 `frontend/ppa_frontend/src/pages/Dashboard/` 下的 React 组件。
-   根据新的 API 接口，更新数据请求逻辑。
-   实现新的 UI 布局和图表展示。
-   编写单元测试，验证 React 组件的渲染、交互和数据绑定。
-   编写端到端测试，模拟用户访问仪表板，验证数据展示的正确性和交互的流畅性。

## Dev Notes

### Technical Summary

实现仪表板的前端UI/UX，包括布局、图表展示和数据集成。

### Project Structure Notes

- Files to modify: `frontend/ppa_frontend/src/pages/Dashboard/index.tsx`, `frontend/ppa_frontend/src/pages/Dashboard/components/`, `frontend/ppa_frontend/src/services/dashboard.ts`
- Expected test locations: `frontend/ppa_frontend/src/pages/Dashboard/__tests__/`
- Estimated effort: 5 story points (3-5 days)

### References

- **Tech Spec:** See tech-spec.md for detailed implementation
- **Architecture:** `tech-spec.md` (设计参考, 技术细节, 前端重构)

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

<!-- Will be populated during dev-story execution -->

### Debug Log References

<!-- Will be populated during dev-story execution -->

### Completion Notes List

<!-- Will be populated during dev-story execution -->

### File List

<!-- Will be populated during dev-story execution -->
