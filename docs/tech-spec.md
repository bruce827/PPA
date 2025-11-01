# PPA - 技术规范

**作者:** bruce
**日期:** 2025-10-27
**项目级别:** 1
**项目类型:** web
**开发背景:** brownfield

---

## 设计参考

-   **设计稿链接:** [请在此处提供设计稿的 URL 或本地路径，例如 Figma、Sketch 或图片文件]
-   **设计稿关键元素:** 统计卡片布局、图表类型、颜色方案、交互细节等。

---

## 源文件树结构

**前端:**
- `frontend/ppa_frontend/src/pages/Dashboard/index.tsx`: 仪表板主页面组件
- `frontend/ppa_frontend/src/pages/Dashboard/components/`: 可能新增或修改的子组件，例如统计卡片、图表组件等
- `frontend/ppa_frontend/src/services/dashboard.ts`: 仪表板相关API服务调用

**后端:**
- `server/controllers/dashboardController.js`: 仪表板数据获取和处理逻辑
- `server/routes/dashboard.js`: 仪表板API路由定义
- `server/services/dashboardService.js`: 仪表板业务逻辑服务

---

## 技术方法

### 目标
-   **提高用户参与度:** 通过更直观、友好的界面设计，鼓励用户更频繁地查看和使用仪表板。
-   **增强数据可读性:** 优化数据可视化，使用户能够更快、更准确地理解项目核心指标。
-   **支持未来扩展:** 构建灵活的组件和API，便于未来添加新的统计维度或图表。

### 方法
1.  **前端重构:**
    -   根据新的设计稿，更新 `frontend/ppa_frontend/src/pages/Dashboard/index.tsx` 及相关子组件。
    -   利用 Ant Design Pro 的布局和组件能力，实现新的统计卡片、图表展示。
    -   可能引入新的图表库（如 `@ant-design/charts`）或更新现有图表配置。
    -   优化数据加载逻辑，确保仪表板性能和用户体验。
2.  **后端API调整:**
    -   根据前端新的数据需求，修改或新增 `server/controllers/dashboardController.js` 中的 API 接口。
    -   确保 API 能够高效地从 SQLite3 数据库中聚合和返回所需的数据。
    -   可能需要优化数据库查询，以支持新的统计维度和性能要求。

---

## 实施堆栈

**前端:**
-   React 18+
-   Ant Design Pro 5+
-   Ant Design 5+
-   `@ant-design/charts` (或类似图表库)
-   TypeScript

**后端:**
-   Node.js 16+
-   Express 4+
-   SQLite3 (通过 `sqlite3` npm包或ORM)

---

## 技术细节

1.  **数据指标定义:**
    -   **项目总数:** 统计 `projects` 表中的总记录数。**展示形式:** 统计卡片 (Statistic Card)。
    -   **平均成本:** 统计 `projects` 表中 `final_total_cost` 的平均值。**展示形式:** 统计卡片。
    -   **风险等级分布:** 统计 `projects` 表中 `final_risk_score` 的分布情况，可能需要定义风险等级区间（低、中、高）。**展示形式:** 饼图 (Pie Chart) 或柱状图 (Bar Chart)。
    -   **成本构成分析:** 聚合 `projects` 表中 `assessment_details_json` 内的成本明细（软件研发、系统对接、运维、差旅、风险）进行百分比或金额展示。**展示形式:** 环形图 (Donut Chart) 或堆叠柱状图 (Stacked Bar Chart)。
    -   **角色成本占比:** 统计不同角色（例如，开发、测试、产品）在所有项目总成本中的占比。**展示形式:** 饼图或堆叠柱状图。
    -   **项目成本趋势:** 按时间（月/季度）展示项目总成本的趋势。**展示形式:** 折线图。
    -   **风险因子与成本关联:** 分析项目风险因子与最终成本之间的关系。**展示形式:** 散点图或气泡图。
2.  **API 接口设计:**
    -   `GET /api/dashboard/summary`: 返回项目总数、平均成本等概览数据。
    -   `GET /api/dashboard/risk-distribution`: 返回风险等级分布数据。
    -   `GET /api/dashboard/cost-composition`: 返回成本构成数据。
    -   `GET /api/dashboard/role-cost-distribution`: 返回角色成本占比数据。
    -   `GET /api/dashboard/cost-trend`: 返回项目成本趋势数据。
    -   `GET /api/dashboard/risk-cost-correlation`: 返回风险因子与成本关联数据。
3.  **数据聚合逻辑:**
    -   后端服务层 (`server/services/dashboardService.js`) 负责执行复杂的 SQL 查询和数据聚合。
    -   利用 SQLite 的聚合函数（`COUNT`, `AVG`, `SUM`）和 `CASE` 语句进行数据处理。
    -   **角色成本占比:** 需要解析 `assessment_details_json` 中的工作量明细，并结合 `config_roles` 表中的 `unit_price` 进行计算。
    -   **项目成本趋势:** 需要按 `created_at` 进行分组和聚合。
    -   **风险因子与成本关联:** 需要对 `final_risk_score` 和 `final_total_cost` 进行关联分析。
4.  **数据迁移/兼容性:**
    -   如果 `projects` 表的 `assessment_details_json` 结构发生变化，需确保后端数据聚合逻辑能够兼容旧数据格式，或提供数据迁移方案。
5.  **错误处理:**
    -   前端在数据加载失败时应显示友好的错误提示（例如，使用 Ant Design 的 `Alert` 组件）。
    -   后端 API 应返回清晰的错误码和错误信息。
    -   仪表板在无数据时应显示“暂无数据”状态，而非空白或错误。
6.  **性能目标:**
    -   仪表板页面首次加载时间应控制在 2 秒以内。
    -   所有数据 API 响应时间应在 500 毫秒以内。
7.  **响应式设计:**
    -   仪表板布局应支持不同屏幕尺寸（桌面、平板）的响应式展示。

---

## 开发设置

1.  **环境配置:** 确保 Node.js 和 npm/yarn 已安装。
2.  **数据库:** 确保 `ppa.db` 数据库文件存在且可访问。
3.  **依赖安装:**
    -   前端: `cd frontend/ppa_frontend && yarn install`
    -   后端: `cd server && yarn install`
4.  **启动项目:**
    -   前端: `cd frontend/ppa_frontend && yarn start`
    -   后端: `cd server && yarn start`

---

## 实施指南

1.  **前端开发:**
    -   创建或修改 `frontend/ppa_frontend/src/pages/Dashboard/` 下的 React 组件。
    -   根据新的 API 接口，更新数据请求逻辑。
    -   实现新的 UI 布局和图表展示。
2.  **后端开发:**
    -   在 `server/controllers/dashboardController.js` 中实现新的 API 路由处理函数。
    -   在 `server/services/dashboardService.js` 中编写数据聚合逻辑。
    -   确保数据库查询的效率和准确性。

---

## 测试方法

1.  **单元测试:**
    -   **前端:** 使用 Jest/React Testing Library 对新的 React 组件进行单元测试，验证渲染、交互和数据绑定。
    -   **后端:** 使用 Mocha/Chai 对 `dashboardService.js` 中的数据聚合逻辑进行单元测试，验证计算结果的准确性。
2.  **集成测试:**
    -   使用 Supertest 对 `GET /api/dashboard/*` 系列 API 接口进行集成测试，验证接口响应和数据格式。
3.  **端到端测试:**
    -   使用 Cypress/Playwright 编写端到端测试用例，模拟用户访问仪表板，验证数据展示的正确性和交互的流畅性。
