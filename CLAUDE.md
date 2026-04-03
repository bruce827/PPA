# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

PPA (Project Portfolio Assessment) 是一个 Web 应用，用于替代 Excel 表格对软件项目进行系统化的成本和风险评估。核心功能包括分步评估向导、AI 辅助风险评分与工作量估算、独有的报价算法、模板复用、数据看板和 PDF/Excel 导出。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React + UmiJS Max 4 + TypeScript + Ant Design 5 + ProComponents |
| 后端 | Node.js + Express 5 |
| 数据库 | SQLite3 (单文件 `server/ppa.db`) |
| 测试 | Jest + Supertest |
| 包管理 | **前端必须用 yarn**，后端用 npm |
| AI | OpenAI API、豆包(Doubao) API |
| 爬虫 | Python 3 (spider/ 目录) |

## 开发命令

### 后端 (server/)
```bash
cd server
npm install
node init-db.js                 # 初始化表结构（幂等）
cd seed-data && node seed-all.js && cd ..   # 初始化基础数据
node index.js                   # 启动服务 http://localhost:3001
npm test                        # 运行所有测试
npm test -- <test-file>         # 运行单个测试
```

### 前端 (frontend/ppa_frontend/)
```bash
cd frontend/ppa_frontend
yarn install                    # 必须用 yarn，不要用 npm
yarn start                      # 启动开发服务器 http://localhost:8000
yarn build                      # 生产构建
yarn format                     # Prettier 格式化
```

前端通过 UmiJS proxy 将 `/api` 请求代理到后端 `localhost:3001`。两个服务需同时运行。

## 项目结构

```
PPA/
├── server/                     # 后端
│   ├── index.js                # 入口
│   ├── config/                 # 数据库单例、服务器配置、环境变量
│   ├── routes/                 # 路由定义 (ai, projects, config, dashboard 等)
│   ├── controllers/            # HTTP 请求处理
│   ├── services/               # 业务逻辑 (计算引擎、AI 集成、导出、监控等)
│   ├── models/                 # 数据访问层 (SQLite 操作)
│   ├── providers/ai/           # AI 提供商实现 (OpenAI, 豆包)
│   ├── migrations/             # 数据库迁移脚本 (001-008)
│   ├── seed-data/              # 初始数据 (角色、风险项、差旅成本)
│   └── tests/                  # Jest 测试
├── frontend/ppa_frontend/      # 前端 (React + UmiJS)
│   ├── .umirc.ts               # 路由、代理、构建配置
│   └── src/pages/              # 页面组件
├── spider/                     # Python 爬虫 (招标网站数据采集)
└── docs/                       # 产品文档 (PRD、bugfix、架构等)
```

## 后端架构

采用三层架构：
1. **Routes** → 定义 URL 路由
2. **Controllers** → 参数提取、响应格式化
3. **Services** → 核心业务逻辑（计算引擎、AI 服务、导出服务等）
4. **Models** → 直接 SQLite 操作

11 个路由模块：ai、calculation、config、contracts、dashboard、health、monitoring、opportunity、projects、web3d、templates

**报价计算核心**：`POST /api/calculate`，将角色单价（元/人/天）换算为万元，叠加交付系数、范围系数、技术系数和动态评分因子，生成软件研发/系统对接/差旅/运维/风险五大成本构成。详细公式见 `docs/prd/calculation-logic-spec.md`。

## 前端路由

- `/dashboard` — 数据看板
- `/assessment/new|history|detail/:id|contracts` — 标准项目评估
- `/web3d/new|history|detail/:id` — Web3D 项目评估
- `/config` — 参数配置
- `/model-config` — AI 模型与提示词管理
- `/opportunity/bidding-sites|tender-push` — 项目机会（招标网站与推送）
- `/monitoring/ai-logs` — AI 日志监控

## 已知限制

- **无身份认证/授权** — 单用户系统
- **无分页** — 数据量大时可能影响性能
- **SQL 字符串拼接** — 未使用参数化查询，存在注入风险

## 关键文件

| 文件 | 用途 |
|---|---|
| `server/.env` | 后端环境变量（含 API Key） |
| `server/utils/constants.js` | 系统常量定义 |
| `server/services/calculation.js` | 核心报价计算引擎 |
| `server/services/aiService.js` | AI 服务入口 |
| `frontend/ppa_frontend/.umirc.ts` | 前端路由与代理配置 |

## AI 日志

AI 调用日志自动保存到 `server/logs/ai/{step}/YYYY-MM-DD/{HHmmss}_{requestHash}/`，包含请求、响应、解析结果。通过 `AI_LOG_ENABLED=true` 控制。

## BMAD 方法

项目使用 BMAD (Business-Model-Agile-Design) 方法框架，配置在 `_bmad/` 目录。可通过 `/bmad-*` 技能调用相关工作流。
