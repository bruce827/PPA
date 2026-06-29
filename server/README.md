# Server 目录说明

## 📦 目录结构

```text
server/
├── index.js              # 应用入口：加载中间件、路由、错误处理、启动服务
├── init-db.js            # 数据库表结构初始化脚本
├── package.json          # 依赖配置
├── config/               # 配置层
│   ├── server.js         # 端口 & 环境变量读取（PORT / NODE_ENV）
│   └── database.js       # 数据库单例管理 (getDatabase / closeDatabase)
├── controllers/          # 路由控制器（拆分业务逻辑与响应）
├── routes/               # 模块化路由定义（health/config/calculate/projects/ai）
├── services/             # 领域服务层（计算、项目、配置、AI服务）
├── models/               # 数据访问层（SQLite SQL 封装）
├── middleware/           # 错误处理等中间件
├── providers/            # AI提供商集成（OpenAI、Doubao等）
├── migrations/           # 数据库迁移脚本
├── scripts/              # 脚本工具
├── tests/                # 测试用例
├── utils/                # 公共工具（常量、评分因子、日志等）
├── seed-data/            # 初始数据脚本（角色 / 差旅 / 风险项）
└── ARCHITECTURE.md       # 详细的技术架构说明文档
```

## 📚 技术架构

详细的技术架构设计说明请参考：[ARCHITECTURE.md](./ARCHITECTURE.md)

该文档包含：
- 分层架构设计详解
- 各层职责与实现
- AI集成架构特点
- 性能优化特性
- 测试架构说明
- 部署与运维指南

## 🚀 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 初始化数据库与基础数据

```bash
# 创建表结构（幂等，可重复执行）
node init-db.js

# 初始化基础配置（角色 / 差旅 / 风险项）
cd seed-data
node seed-all.js
```

可按需分别初始化：

```bash
node seed-roles.js          # 角色配置
node seed-travel-costs.js   # 差旅成本配置
node seed-risk-items.js     # 风险评估项配置
```

### 3. 启动服务

```bash
cd ..            # 回到 server 根目录
node index.js    # 默认端口 3001（可用 PORT 覆盖）
```

启动后输出：

```text
Server is running on http://localhost:3001
Environment: development
```

### 4. 优雅退出

按 Ctrl+C 会触发 SIGINT，调用 `closeDatabase()` 关闭连接。

## 🧪 环境变量

| 变量 | 默认值 | 说明 |
| ---- | ------ | ---- |
| PORT | 3001   | 服务监听端口 |
| NODE_ENV | development | 运行环境标识（影响日志等） |
| EXPORT_LOG_ENABLED | true | 是否启用导出日志（logs/export） |
| EXPORT_LOG_DIR | (空) | 导出日志目录覆盖路径，默认 `server/logs/export` |

## ⚙️ 核心概念

- 单一数据库连接：通过 `config/database.js` 单例复用，避免多实例文件锁冲突。
- 三层结构：Controller → Service → Model，业务与存储解耦，便于后期迁移数据库或加缓存。
- 计算集中：实时成本与工作量计算在 `services/calculationService.js`，评分因子算法在 `utils/rating.js`。
- 模板复用：项目与模板共用一张 `projects` 表，通过 `is_template` 区分。

## 📖 API 文档

### 自动获取接口文档

本项目采用 **zod + OpenAPI 3.0** 自动生成接口文档，确保文档与代码永远同步。

#### 方式 1：在线获取（推荐）

Server 启动后，直接访问：

```bash
# OpenAPI JSON 规范（机器可读，供 agent/代码使用）
curl http://localhost:3001/api-docs.json

# Swagger UI（人工查看）
open http://localhost:3001/api-docs
```

**运行时保证**：`GET /api-docs.json` 由 `server/index.js:43` 的 `mountDocs(app)` 挂载，每次服务启动时自动生成最新契约。

#### 方式 2：本地构建离线文档

```bash
cd server
npm run build:api
```

产出文件：
- `docs/api/openapi.json` — 完整 OpenAPI 3.0 规范（提交进 git，供离线 agent / 版本对比）
- `docs/api-inventory.md` — 人类可读接口清单（自动生成，请勿手工编辑）

#### 方式 3：代码中直接获取

```js
const { buildSpec } = require('./openapi/generate');
const spec = buildSpec();
console.log(spec.paths); // 所有接口定义
```

### API 实现架构

| 组件 | 说明 | 文件 |
|------|------|------|
| **zod schema 定义** | 一处定义，同时用于运行时校验和契约生成 | `schemas/*.schema.js` |
| **OpenAPI Registry** | 单例收集所有接口契约 | `openapi/registry.js` |
| **统一注册函数** | `registerRoute()` 简化契约登记 | `openapi/registry.js` |
| **契约登记文件** | 按模块分文件登记接口 | `openapi/paths/*.js` |
| **契约生成器** | 从 registry 生成 OpenAPI 3.0 文档 | `openapi/generate.js` |
| **在线文档端点** | 挂载 `/api-docs.json` 和 `/api-docs` | `openapi/docs.js` |

**关键流程**：
```
Server 启动
  └─> mountDocs(app)
        └─> buildSpec()
              └─> require('./paths')  // 触发所有 registerRoute 执行
                    └─> registry 收集所有契约
              └─> OpenApiGeneratorV3 生成 OpenAPI 文档
        └─> 挂载 GET /api-docs.json 和 GET /api-docs
```

**核心优势**：
- zod schema 一处定义，同时用于运行时校验和契约生成，物理上无法不一致
- 消费方是 agent，需精确 response 才能正确解析返回结构
- OpenAPI 3.0 是 agent 工具调用的事实标准格式，可直接转成 function-calling 的 tool schema

## ⚠️ 注意事项
