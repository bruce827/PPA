# Server API Test Plan (Smoke Coverage)

## 1. 测试目标

- 快速验证后端服务重构后所有公开 REST 接口可用。
- 确认核心 CRUD 流程与关键查询管线返回结构正确。
- 产出可复用的冒烟脚本与结构化结果文档。

## 2. 测试范围

- `server/routes` 下暴露的所有接口：
  - `/api/health`
  - `/api/config` 模块（角色、风险项、差旅成本、AI 模型、提示词模板、聚合配置）。
  - `/api/calculate` 实时计算服务。
  - `/api/projects` & `/api/templates`（项目、模板、导出）。
  - `/api/dashboard` 统计接口。
- 不覆盖：性能测试、并发压力、权限边界、异常分支。

## 3. 测试方法

- 使用 `supertest` 直接驱动 Express `app`（避免真实 HTTP 依赖）。
- 通过脚本 `server/tests/api-smoke-runner.js` 执行端到端冒烟：
  1. 准备唯一后缀，避免数据冲突。
  2. 对每个接口发起至少一次成功请求；CRUD 接口覆盖创建→查询→更新→删除链路。
  3. 导出、统计等只读接口验证 200 响应与基本结构。
  4. 记录状态码、耗时、响应摘要到 `docs/test/api-test-results.json`。

## 4. 环境依赖

- Node.js ≥ 18.x。
- 已初始化的 SQLite 数据库 `server/ppa.db`（仓库已经提供备份，脚本会复用实际数据源）。
- 在仓库根目录执行：

  ```bash
  cd server
  npm install
  node tests/api-smoke-runner.js
  ```

- `NODE_ENV=test` 由脚本内置，运行时使用内存内 Express 实例，不监听 3001 端口。

## 5. 数据准备与回滚

- 脚本自动生成带时间戳的实体名称并执行清理步骤（DELETE）。
- 数据库已备份，无需额外隔离；若出现异常记录，可根据 `api-test-results.json` 中的 ID 手动回滚。

## 6. 验收标准

- 所有接口响应 HTTP 2xx，并满足预期 JSON 结构或二进制文件流。
- `docs/test/api-test-results.json` 中 `ok` 字段均为 `true`。
- `docs/test/server-api-reference.md` 更新包含本次测试结果摘要。
- 若出现失败，需提供问题描述、复现步骤与建议解决方案。

## 7. 交付物

1. `docs/test/server-api-reference.md`（接口说明 + 测试结果）。
2. `docs/test/server-api-test-plan.md`（本文档）。
3. `docs/test/api-test-results.json`（自动生成的详细冒烟数据）。
