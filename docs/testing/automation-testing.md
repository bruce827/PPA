# 自动化测试方案

## 目标

本项目的自动化测试优先保护业务正确性，而不是追求一次性全覆盖。当前阶段聚焦三类风险：

- 计算、项目保存、导出等核心业务链路被改坏。
- 前端关键页面能否真实加载并展示后端数据。
- 自动化测试污染开发数据库 `server/ppa.db`。

## 当前策略

| 层级 | 工具 | 当前状态 | 策略 |
| --- | --- | --- | --- |
| 后端单元/集成测试 | Jest + Supertest | 已有基础 | 继续补核心 API 和边界 |
| 前端 E2E 冒烟测试 | Playwright | 新增脚手架 | 只覆盖 P0/P1 主路径 |
| 前端组件测试 | 暂无 | 未建立 | 暂缓，等核心 E2E 稳定后再评估 |
| 契约测试 | 暂无 | 不适用 | 当前不是微服务，暂不引入 |
| 性能测试 | 暂无 | 非本阶段重点 | 后续单独做 API 基线 |

## 已落地内容

前端新增 Playwright 配置：

- `frontend/ppa_frontend/playwright.config.ts`
- `frontend/ppa_frontend/tests/e2e/*.spec.ts`
- `frontend/ppa_frontend/tests/e2e/support/*`
- `frontend/ppa_frontend/tests/README.md`

后端新增测试与隔离能力：

- `server/tests/calculationAPI.test.js`
- `DB_PATH` 环境变量支持
- `PORT` 环境变量支持
- `server/init-db.js` 支持初始化指定 SQLite 文件

## 本地运行

后端回归：

```bash
cd server
npm test
```

前端 E2E 冒烟：

```bash
cd frontend/ppa_frontend
yarn install
yarn test:e2e:smoke
```

首次运行 Playwright 如缺少浏览器：

```bash
cd frontend/ppa_frontend
yarn playwright install chromium
```

## 数据隔离

E2E 默认使用：

```text
frontend/ppa_frontend/.tmp/ppa-e2e.db
```

Playwright 启动前会重建这个数据库，不会触碰 `server/ppa.db`。如果需要指定其他测试数据库：

```bash
PPA_E2E_DB_PATH=/tmp/ppa-e2e.db yarn test:e2e:smoke
```

默认拒绝重置 `.tmp` 之外的数据库。确实需要覆盖时，必须显式设置：

```bash
PPA_E2E_ALLOW_DB_RESET=1 PPA_E2E_DB_PATH=/tmp/ppa-e2e.db yarn test:e2e:smoke
```

## 测试优先级

| 标签 | 含义 | 运行频率 |
| --- | --- | --- |
| `@smoke` | 冒烟测试，验证系统主路径可用 | 每次 PR / 本地快速验证 |
| `@p0` | 核心业务风险，失败应阻塞合并 | 每次 PR |
| `@p1` | 重要功能路径，失败通常阻塞合并 | 每次 PR |
| `@p2` | 次要路径或边界场景 | 夜间或发布前 |

当前第一批 E2E 覆盖：

- 数据看板加载核心指标。
- 标准项目通过 API 种入后，在历史列表和详情页可见。
- Web3D 项目通过 API 种入后，在历史列表可见。
- 参数配置页能加载核心配置表。

## 编写规则

- 用 API 或 DB helper 准备数据，UI 只做用户可见行为验证。
- 测试数据必须唯一，避免并发或重复执行冲突。
- 不使用 `waitForTimeout`。
- 优先使用 `getByRole`、`getByText` 等用户可见定位。
- 每个测试自行清理创建的数据。
- AI 外部模型调用不进入常规自动化回归，使用 mock 或边界测试覆盖。

## 后续扩展顺序

1. 补齐项目创建表单的真实 UI E2E。
2. 增加 Excel/PDF 导出的后端断言。
3. 为 AI 风险评估、模块分析、工作量评估补 mock 后端集成测试。
4. 将 `npm test` 和 `yarn test:e2e:smoke` 接入 CI。
5. 稳定后再评估前端组件测试是否值得投入。
