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
server/
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
├── tests/                      # 测试文件
│   ├── dashboardService.test.js
│   ├── dashboardController.test.js
│   ├── promptTemplate.test.js
│   └── api-smoke-runner.js
└── migrations/                 # 数据库迁移脚本（如有）
```

## Key Commands

### 开发命令

```bash
# 后端相关
cd server

# 安装依赖
npm install

# 初始化数据库表结构（幂等操作，可重复执行）
node init-db.js

# 初始化基础配置数据（角色、差旅、风险项）
cd seed-data
node seed-all.js
cd ..

# 启动开发服务器（端口 3001）
node index.js

# 运行所有测试
npm test

# 前端相关
cd frontend/ppa_frontend

# 安装依赖（使用 yarn）
yarn

# 启动前端开发服务器（端口 8000）
yarn start

# 前端构建
yarn build
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
1. 在 `seed-data/` 中新增种子数据脚本或更新现有文件
2. 在 `services/calculationService.js` 中添加计算逻辑
3. 在 `routes/calculation.js` 验证请求字段
4. 更新前端表单和数据结构

### 修改风险评分算法
- 编辑 `utils/constants.js` 中 `RISK` 对象的阈值
- 更新 `utils/rating.js` 中 `computeFactorFromRatio` 函数
- 通过单元测试验证分段计算结果

### 调试 SQLite 查询
- 使用 `npm test` 前缀在测试环境验证
- 或临时输出 SQL 语句到控制台（在 `models/` 中加 `console.log`）
- SQLite 文件位于 `server/ppa.db`，可用 SQLite 客户端工具打开

### 处理新的导出格式
- PDF/Excel 导出逻辑位于 `services/exportService.js`
- 使用 `pdfkit` 和 `exceljs` 库
- 导出的数据需从 `projects` 表中读取 `assessment_details_json` 并解析

## 重要注意事项

- **单价单位**: 数据库存储为"元"，计算时需转为"万元"（除以 10000）
- **初始化幂等性**: `node init-db.js` 使用 `IF NOT EXISTS`，可安全重复执行
- **模板机制**: 通过 `is_template` 标志共用 `projects` 表，查询时注意过滤
- **评分因子动态计算**: 最大分值由已配置的风险项选项 JSON 动态计算，无硬编码值
- **Graceful Shutdown**: Ctrl+C 会触发 SIGINT，自动关闭数据库连接
- **测试数据库**: `npm test` 时使用内存数据库或临时文件，避免污染生产数据

## 前端项目信息

- **技术**: UMI Max (React) + Ant Design + TypeScript
- **启动**: `cd frontend/ppa_frontend && yarn start` (端口 8000)
- **API 代理**: `/api` 转发到 `http://localhost:3001`
- **构建**: `yarn build`

## 相关文档

- 主项目 README：`../README.md`
- 后端详细说明：`./server/README.md`（包含 API 详规、计算公式、最佳实践）
- AGENTS.md：`../AGENTS.md`（项目总体指引）
