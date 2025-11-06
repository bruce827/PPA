# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

项目评估系统 (Project Assessment System) - 一个基于 Node.js + Express + SQLite 的后端服务，搭配 React (Ant Design) 前端，用于项目成本和风险评估的Web应用。

## Tech Stack

- **Backend**: Node.js + Express 5.x, SQLite3
- **Frontend**: React (UMI Max), Ant Design, TypeScript  
- **Testing**: Jest, Supertest
- **Export**: ExcelJS, PDFKit

## Repository Structure

```
server/                         # 后端服务（Node.js + Express）
├── index.js                    # Express 应用入口，中间件加载、路由注册、错误处理
├── init-db.js                  # SQLite 数据库表结构初始化脚本
├── ppa.db                       # SQLite 数据库文件
├── config/
│   ├── server.js              # 端口和环境变量配置
│   └── database.js            # 数据库单例管理
├── controllers/                # 路由控制层（HTTP 请求处理和响应）
├── routes/                     # 模块化路由定义
│   ├── health.js              # 健康检查
│   ├── config.js              # 配置管理（角色、风险项、差旅成本）
│   ├── calculation.js         # 实时成本计算
│   ├── projects.js            # 项目和模板 CRUD
│   ├── dashboard.js           # 仪表板数据
│   └── index.js               # 路由汇聚
├── services/                   # 业务逻辑层
│   ├── calculationService.js  # 成本、工作量、评分因子计算核心逻辑
│   ├── projectService.js      # 项目和模板管理逻辑
│   ├── dashboardService.js    # 仪表板数据聚合
│   ├── exportService.js       # PDF/Excel 导出逻辑
│   └── aiTestService.js       # AI 相关测试服务
├── models/                     # 数据访问层（SQLite SQL 操作）
│   ├── configModel.js         # 配置表查询
│   ├── projectModel.js        # 项目表查询
│   └── dashboardModel.js      # 仪表板数据查询
├── middleware/
│   └── errorHandler.js        # 全局错误处理中间件
├── utils/
│   ├── db.js                  # SQLite Promise 包装（初始化、查询、关闭）
│   ├── constants.js           # 业务常量（工作日、单价、风险阈值等）
│   └── rating.js              # 风险评分因子计算算法
├── seed-data/                  # 初始数据脚本
│   ├── seed-all.js            # 批量初始化所有基础数据
│   ├── seed-roles.js          # 初始化角色配置
│   ├── seed-travel-costs.js   # 初始化差旅成本配置
│   └── seed-risk-items.js     # 初始化风险评估项配置
└── tests/                      # 测试文件

frontend/ppa_frontend/          # 前端应用（UMI Max + React）
├── .umirc.ts                   # UMI 配置文件（路由、代理、插件等）
├── src/
│   ├── pages/                  # 页面组件
│   │   ├── Dashboard/         # 数据看板
│   │   ├── Assessment/        # 项目评估（新建、历史、详情）
│   │   ├── Config/            # 参数配置
│   │   └── ModelConfig/       # 模型配置（AI应用、提示词模板）
│   ├── services/              # API 调用层（使用 UMI request）
│   ├── components/            # 可复用组件
│   ├── models/                # 全局状态管理（UMI Model）
│   ├── utils/                 # 工具函数
│   ├── constants/             # 常量定义
│   ├── access.ts             # 权限配置
│   └── app.ts                 # 运行时配置
└── package.json
```

## Key Commands

### 完整启动流程（首次运行）

```bash
# 1. 初始化后端
cd server
npm install
node init-db.js                  # 创建数据库表结构
cd seed-data && node seed-all.js # 初始化基础数据
cd ..

# 2. 启动后端服务（端口 3001）
node index.js

# 3. 在另一个终端，启动前端
cd frontend/ppa_frontend
yarn install
yarn start                        # 端口 8000
```

### 日常开发命令

```bash
# 后端开发
cd server && node index.js        # 启动后端服务
npm test                          # 运行测试

# 前端开发
cd frontend/ppa_frontend && yarn start   # 启动开发服务器
yarn build                                # 生产构建
yarn format                               # 代码格式化（Prettier）

# 数据库操作
cd server
node init-db.js                   # 重新创建表结构（幂等）
cd seed-data && node seed-all.js  # 重新初始化数据
```

## Core Architecture Patterns

### 1. 三层架构（MVC）
- **Controller**: HTTP 请求处理、参数验证、响应格式化
- **Service**: 业务逻辑集中地，成本计算、数据转换、流程编排
- **Model**: 数据访问层，SQL 操作和数据库交互

### 2. 单数据库连接模式
- `utils/db.js` 提供全局 SQLite 连接单例
- 所有 db 操作均经过 Promise 包装（`.get()`, `.all()`, `.run()`）
- 应用启动时通过 `db.init()` 初始化，graceful shutdown 时调用 `db.close()`
- 避免多实例导致的 SQLite 文件锁冲突

### 3. 成本计算核心流程
在 `services/calculationService.js` 中：
1. 汇总各类风险评分 → `riskScore`
2. 根据风险分数计算评分因子（`rating_factor`）：通过 `utils/rating.js` 分段线性插值
3. 分别计算软件开发、系统集成成本（含 `delivery_factor`、`scope_factor`、`tech_factor`）
4. 累加差旅成本、维护成本、风险成本
5. 最终返回各项明细和汇总

**单位转换规则**：所有角色单价在数据库中以"元/人/天"存储，计算时除以 10000 转为"万元"

### 4. 风险评分因子算法
在 `utils/rating.js` 中实现分段线性函数：
- `ratio ≤ 0.8` → `factor = 1.0`
- `0.8 < ratio ≤ 1.0` → 线性提升到 `1.2`
- `1.0 < ratio ≤ 1.2` → 继续提升到封顶 `1.5`

其中 `ratio = riskScore / maxScore`，`maxScore` 根据配置的风险项选项 JSON 动态计算。

### 5. 项目与模板共用表
`projects` 表通过 `is_template` 字段区分：
- `is_template = 0` → 项目记录
- `is_template = 1` → 模板记录
- 两类数据共用字段结构，便于查询和维护

### 6. 错误处理
- 全局错误处理中间件：`middleware/errorHandler.js`
- 捕获数据库错误、验证错误等，统一响应格式
- SQLite 错误返回 500；验证错误返回 400

## API 快速索引

所有 API 均挂载于 `/api` 前缀下：

| 功能模块 | 主要端点 | 说明 |
|---------|---------|-----|
| **健康检查** | `GET /api/health` | 服务状态 |
| **配置管理** | `GET/POST/PUT/DELETE /api/config/roles` | 角色 CRUD |
| | `GET/POST/PUT/DELETE /api/config/risk-items` | 风险项 CRUD |
| | `GET/POST/PUT/DELETE /api/config/travel-costs` | 差旅成本 CRUD |
| | `GET /api/config/all` | 聚合获取全部配置 |
| **实时计算** | `POST /api/calculate` | 根据表单数据计算成本和工作量 |
| **项目/模板** | `GET /api/projects` | 获取项目列表 |
| | `GET /api/projects?is_template=true` | 获取模板列表 |
| | `POST /api/projects` | 创建项目（可用 `is_template` 标记为模板） |
| | `PUT /api/projects/:id` | 更新项目 |
| | `DELETE /api/projects/:id` | 删除项目 |
| | `GET /api/projects/:id/export/pdf` | 导出 PDF 报告 |
| | `GET /api/projects/:id/export/excel` | 导出 Excel 报告 |
| **仪表板** | `GET /api/dashboard/...` | 统计数据聚合接口 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|-------|-----|
| `PORT` | 3001 | 后端服务监听端口 |
| `NODE_ENV` | development | 运行环境（影响日志输出和 API 行为） |

## 前后端通信

### 前端代理配置
前端 `.umirc.ts` 配置代理，将 `/api` 请求转发到 `http://localhost:3001`，确保前后端可在本地同时运行。

### 数据流向
1. 前端表单收集用户评估数据
2. `POST /api/calculate` 实时计算并返回成本结果  
3. 用户确认后保存项目：`POST /api/projects`
4. 后端存储完整的 `assessment_details_json`（保存表单快照）
5. 导出时读取该 JSON，结合计算重新生成报告

## 常见开发任务

### 添加新的成本类别
1. **后端**: 在 `seed-data/` 中新增种子数据脚本或更新现有文件
2. **后端**: 在 `services/calculationService.js` 中添加计算逻辑
3. **后端**: 在 `routes/calculation.js` 验证请求字段
4. **前端**: 在 `pages/Assessment/New` 中更新表单组件
5. **前端**: 在 `services/` 中添加对应的 API 调用

### 修改风险评分算法
1. 编辑 `server/utils/constants.js` 中 `RISK` 对象的阈值
2. 更新 `server/utils/rating.js` 中 `computeFactorFromRatio` 函数
3. 通过单元测试验证分段计算结果：`cd server && npm test`

### 添加新的前端页面
1. 在 `.umirc.ts` 的 `routes` 数组中添加路由配置
2. 在 `src/pages/` 中创建对应的页面组件
3. 如需菜单显示，配置 `name` 和 `icon` 属性
4. 如需权限控制，在 `access.ts` 中配置权限规则

### 调试 SQLite 查询
- 使用 SQLite 客户端打开 `server/ppa.db` 查看数据
- 在 `models/` 层函数中临时添加 `console.log(sql, params)` 输出 SQL
- 通过测试环境验证：`cd server && npm test`

### 处理新的导出格式
- PDF/Excel 导出逻辑位于 `server/services/exportService.js`
- 使用 `pdfkit` 和 `exceljs` 库
- 导出的数据需从 `projects` 表中读取 `assessment_details_json` 并解析

## 重要注意事项

### 后端
- **单价单位转换**: 数据库存储为"元"，计算时需转为"万元"（除以 10000）
- **数据库初始化**: `node init-db.js` 使用 `IF NOT EXISTS`，可安全重复执行
- **模板与项目**: 通过 `is_template` 字段共用 `projects` 表，查询时注意过滤
- **评分因子**: 最大分值由已配置的风险项 `options_json` 动态计算，无硬编码值
- **Graceful Shutdown**: Ctrl+C 会触发 SIGINT，自动关闭数据库连接
- **测试隔离**: `npm test` 时使用内存数据库或临时文件，避免污染生产数据

### 前端
- **包管理器**: 使用 yarn，不要用 npm（package.json 中指定）
- **代理配置**: 开发环境 API 请求通过 `/api` 代理到后端 3001 端口
- **路由配置**: 所有路由在 `.umirc.ts` 中定义，不使用文件系统路由
- **状态管理**: 使用 UMI Model，避免引入额外的状态管理库

## 前端架构详解

### UMI Max 约定式路由
前端使用 UMI Max 的约定式路由机制，在 `.umirc.ts` 中定义了以下主要页面：

- `/dashboard` - 数据看板（首页）
- `/assessment/new` - 新建评估向导
- `/assessment/history` - 历史项目列表
- `/assessment/detail/:id` - 项目详情（不在菜单显示）
- `/config` - 参数配置（角色、风险项、差旅成本）
- `/model-config/application` - 模型应用管理
- `/model-config/prompts` - 提示词模板管理

### 数据流
1. **API 服务层** (`src/services/`) - 封装所有后端 API 调用，使用 UMI 的 `request` 工具
2. **全局状态** (`src/models/`) - 使用 UMI Model 管理跨页面状态
3. **页面组件** (`src/pages/`) - 业务页面，消费 API 和全局状态
4. **通用组件** (`src/components/`) - 可复用的 UI 组件

### 代理配置
`.umirc.ts` 中配置了开发代理：`/api` → `http://localhost:3001`
确保前后端能在本地同时运行，前端不受跨域限制。

## 相关文档

- 主项目 README：`../README.md`
- 后端详细说明：`./server/README.md`（包含 API 详规、计算公式、最佳实践）
- AGENTS.md：`../AGENTS.md`（项目总体指引）
