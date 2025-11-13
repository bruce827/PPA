# AGENTS.md

# Repository Guidelines

## 项目结构与模块
- `frontend/ppa_frontend`（UMI Max + Ant Design）：配置在 `.umirc.ts`（`/` 重定向到 `/dashboard`，`/api` 代理到 `http://localhost:3001`，`mfsu: false`）。源码位于 `src/`（`access.ts`、`app.ts`、pages、services）。
- `server`（Express 5 + SQLite）：入口 `index.js`，数据库 `ppa.db`；分层 `controllers/ → services/ → models/`；中间件在 `middleware/`，测试在 `tests/`。

## 构建、测试与本地开发
- 前端
  - `cd frontend/ppa_frontend && npm install`
  - `npm run dev` 本地启动 `http://localhost:8000`
  - `npm run build` 构建到 `dist/`
  - `npm run format` 执行 Prettier 格式化
- 后端
  - `cd server && npm install`
  - `node init-db.js` 初始化表结构（可重复执行）
  - `node index.js` 启动 API `http://localhost:3001`
  - `npm test` 运行 Jest + Supertest
- 同时运行：需并行启动前端（8000）与后端（3001）。

## 代码风格与命名
- 缩进 2 空格；前端 TypeScript，后端 Node.js。
- 组件 PascalCase；文件/变量 camelCase；路由/控制器/服务与目录同名。
- 使用 Prettier，插件包含 `prettier-plugin-organize-imports`、`prettier-plugin-packagejson`（建议 `npm run format`）。

## 测试规范
- 测试位于 `server/tests`，命名 `*.test.js`，使用 `npm test` 执行。
- 使用独立测试库 `server/ppa.test.db` 与 `NODE_ENV=test`（由测试脚本处理）。
- 性能要求：所有 API 响应需 < 500ms（测试中断言）。

## 提交与 PR 规范
- 提交信息简洁祈使语，可中英混用；优先使用类型前缀。
  - 示例：`feat: 项目评估计算`、`fix: 修复成本四舍五入`、`refactor: controllers 分层`。
- PR 请包含：变更目的/摘要、关联 issue、运行与测试说明；前端改动附截图，接口改动附请求/响应示例。

## 架构与配置要点
- 全局错误处理中间件需放在最后：`server/middleware/errorHandler.js`。
- SQLite 文件自动生成于 `server/ppa.db`；SIGINT 触发优雅退出并关闭数据库连接。
- 复杂字段在数据库中以 JSON 存储（如 `assessment_details_json`、`variables_json`）。
- API 前缀为 `/api`，前端代理在 `frontend/ppa_frontend/.umirc.ts` 配置。
