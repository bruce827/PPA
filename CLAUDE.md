# CLAUDE.md - AI 开发协作指南

## 🎯 个人指令

- **用中文回答**：所有回复必须使用中文
- **审视潜在问题**：仔细分析用户输入的潜在问题，指出问题的本质
- **超出预期建议**：提供明显超出用户思考框架之外的建议
- **偏离项目目标的提醒**：如果用户要求过于脱离项目目标，需要提醒并建议调整预期

---

## 🚨 强制约定

### 包管理
- **前端必须用 yarn**，禁止用 npm（前端已有 `yarn.lock`）
- **后端用 npm**

### 数据库
- SQL 字符串拼接（未参数化），存在注入风险 ⚠️
- 当前支持两种模式：
  - SQLite 本地开发（`server/ppa.db`）
  - PostgreSQL/Supabase V2 云端模式

---

## 🏗️ 架构约束

### 后端三层架构（必须遵守）

```
Routes（路由层）→ Controllers（控制器）→ Services（业务层）→ Models（数据层）
```

**规则**：
- ✅ Routes：只定义 URL 路由，不写业务逻辑
- ✅ Controllers：参数提取、响应格式化
- ✅ Services：核心业务逻辑（计算引擎、AI 服务、导出等）
- ✅ Models：数据访问层（SQL 封装）
- ❌ 禁止在 Routes 层直接写业务逻辑
- ❌ 禁止在 Controllers 层写复杂计算

### 前端架构
- UmiJS Max 4 + React 18 + TypeScript
- Ant Design 5 + ProComponents
- 页面组件放在 `src/pages/` 下

---

## 📍 关键路径

### 后端入口
- **应用入口**：`server/index.js`
- **数据库配置**：`server/config/database.js`
- **计算引擎**：`server/services/calculation.js`
- **AI 服务**：`server/services/aiService.js`
- **环境变量**：`server/.env`

### 前端入口
- **路由配置**：`frontend/ppa_frontend/.umirc.ts`
- **页面组件**：`frontend/ppa_frontend/src/pages/`

### 数据库
- **SQLite 本地**：`server/ppa.db`（单文件数据库）
- **PostgreSQL V2**：通过 `DATABASE_URL` 环境变量配置

### 核心接口
- **报价计算**：`POST /api/calculate`
- **AI 风险评分**：`POST /api/ai/assess`
- **项目 CRUD**：`/api/projects`
- **数据看板**：`/api/dashboard`

---

## ⚠️ 已知技术债

### 功能限制
- **无身份认证/授权** — 单用户系统
- **无分页** — 数据量大时可能影响性能
- **SQL 注入风险** — 未使用参数化查询

### V2 迁移状态
- V2 重点：SQLite 到 Supabase PostgreSQL 的数据底座迁移
- V2 后续：公开项目池、多人评估、群体判断聚合、奖励机制

---

## 📚 详细文档

- **项目介绍与技术栈**：[README.md](./README.md)
- **详细开发指南**：[docs/development-guide.md](./docs/development-guide.md)
- **技术架构详解**：[docs/architecture.md](./docs/architecture.md)
- **V2 产品规划**：[docs/prd2.0/prd.md](./docs/prd2.0/prd.md)
- **后端 README**：[server/README.md](./server/README.md)

---

## 🧩 BMAD 方法

项目使用 BMAD (Business-Model-Agile-Design) 方法框架，配置在 `_bmad/` 目录。可通过 `/bmad-*` 技能调用相关工作流。
