# PPA 前端 E2E 测试

## 快速开始

```bash
cd frontend/ppa_frontend
yarn install
yarn test:e2e:smoke
```

如果本机还没有 Playwright 浏览器：

```bash
yarn playwright install chromium
```

## 运行命令

```bash
yarn test:e2e          # 全量 E2E
yarn test:e2e:smoke    # 冒烟测试
yarn test:e2e:ui       # Playwright UI 模式
```

## 服务与数据库

Playwright 会自动启动：

- 后端：`http://127.0.0.1:3101`
- 前端：`http://127.0.0.1:8000`
- 测试数据库：`.tmp/ppa-e2e.db`

测试数据库会在 E2E 启动前重建，避免污染开发库 `server/ppa.db`。

## 测试结构

```text
tests/
  e2e/
    dashboard.smoke.spec.ts
    tender-push.smoke.spec.ts
    assessment.smoke.spec.ts
    web3d.smoke.spec.ts
    config.smoke.spec.ts
    support/
      apiClient.ts
      factories.ts
      prepareE2eDatabase.js
```

## 约定

- `@smoke`：每次 PR 和本地快速验证都应运行。
- `@p0`：核心业务链路，失败应阻塞合并。
- `@p1`：重要功能链路，失败通常阻塞合并。
- 测试数据通过 API 准备，页面只验证真实用户可见行为。
- 不使用硬等待；使用 Playwright locator 和 web-first assertion。
- 每个测试清理自己创建的数据。
