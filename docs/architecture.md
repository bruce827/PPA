# 技术架构详解

本文档提供 PPA 系统的完整技术架构设计说明，面向需要深入理解系统设计的开发者。

---

## 🏗️ 整体架构

PPA 采用前后端分离的 Web 应用架构：

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (React + UmiJS)                  │
│  - 页面组件 (src/pages/)                                  │
│  - 服务层 (src/services/)                                 │
│  - 状态管理 (React Hooks + Ant Design ProComponents)      │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP/REST API
┌───────────────────────▼─────────────────────────────────┐
│                    后端 (Node.js + Express)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   Routes    │→ │Controllers  │→ │  Services   │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
│                                           ↓               │
│                                    ┌─────────────┐        │
│                                    │   Models     │        │
│                                    └─────────────┘        │
└───────────────────────┬─────────────────────────────────┘
                        │ SQL Queries
┌───────────────────────▼─────────────────────────────────┐
│                   数据库层                                │
│  ┌─────────────┐              ┌─────────────┐            │
│  │  SQLite3    │  (V1 本地)   │ PostgreSQL  │  (V2 云端) │
│  └─────────────┘              └─────────────┘            │
└─────────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                 外部服务                                  │
│  - OpenAI API / 豆包 API                                  │
│  - Supabase Storage (V2)                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🖥️ 前端架构

### 技术栈

- **框架**：React 18 + TypeScript
- **构建工具**：UmiJS Max 4
- **UI 库**：Ant Design 5 + ProComponents
- **包管理**：Yarn
- **图表**：@ant-design/charts
- **E2E 测试**：Playwright

### 目录结构

```
frontend/ppa_frontend/
├── .umirc.ts                      # UmiJS 配置（路由、代理、插件）
├── src/
│   ├── pages/                     # 页面组件
│   │   ├── Dashboard/             # 数据看板
│   │   ├── Assessment/            # 标准项目评估
│   │   ├── Web3D/                 # Web3D 项目评估
│   │   ├── Config/                # 参数配置
│   │   ├── ModelConfig/           # AI 模型管理
│   │   ├── Opportunity/           # 项目机会
│   │   ├── Monitoring/            # AI 日志监控
│   │   ├── ProjectWiki/           # Wiki 知识库
│   │   └── FormDesign/            # 表单设计
│   ├── services/                  # API 服务层
│   ├── components/                # 公共组件
│   └── utils/                     # 工具函数
```

### 路由配置

前端路由在 `.umirc.ts` 中配置：

```typescript
routes: [
  { path: '/dashboard', component: 'Dashboard' },
  { path: '/assessment', component: 'Assessment' },
  { path: '/web3d', component: 'Web3D' },
  { path: '/config', component: 'Config' },
  { path: '/model-config', component: 'ModelConfig' },
  { path: '/opportunity', component: 'Opportunity' },
  { path: '/monitoring', component: 'Monitoring' },
  { path: '/project-wiki', component: 'ProjectWiki' },
  { path: '/form-design', component: 'FormDesign' },
];
```

### API 代理

前端通过 UmiJS proxy 将 `/api` 请求代理到后端：

```typescript
// .umirc.ts
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
}
```

---

## 🔧 后端架构

### 技术栈

- **运行时**：Node.js + Express 5
- **数据库**：SQLite3（V1 本地）/ PostgreSQL（V2 Supabase）
- **AI 集成**：OpenAI API、豆包(Doubao) API
- **测试**：Jest + Supertest
- **导出**：PDFKit、ExcelJS

### 三层架构

后端严格遵循三层架构模式：

```
┌─────────────────────────────────────────────────────┐
│  Routes (路由层)                                      │
│  - 定义 URL 路由                                      │
│  - 应用中间件（认证、日志）                            │
│  - 11 个路由模块                                      │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│  Controllers (控制器层)                               │
│  - 提取请求参数                                       │
│  - 参数验证                                           │
│  - 调用 Service 层                                    │
│  - 格式化响应（{ success, data, error }）             │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│  Services (业务层)                                    │
│  - 核心业务逻辑                                       │
│  - 计算引擎（报价计算、风险评分）                       │
│  - AI 服务集成                                        │
│  - 导出服务（PDF/Excel）                              │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│  Models (数据层)                                      │
│  - 直接 SQL 操作                                      │
│  - 兼容 SQLite/PostgreSQL                             │
│  - 参数化查询（防止 SQL 注入）                         │
└─────────────────────────────────────────────────────┘
```

**代码示例**：

```javascript
// 1. Routes (server/routes/projects.js)
router.post('/', projectController.createProject);

// 2. Controller (server/controllers/projectController.js)
exports.createProject = async (req, res, next) => {
  try {
    const project = await projectService.createProject(req.body);
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// 3. Service (server/services/projectService.js)
exports.createProject = async (data) => {
  // 业务逻辑：验证、计算、关联数据
  const project = await projectModel.create(data);
  await aiService.analyzeProject(project.id);
  return project;
};

// 4. Model (server/models/projectModel.js)
exports.create = async (data) => {
  return await db.run(
    'INSERT INTO projects (name, description) VALUES (?, ?)',
    [data.name, data.description]
  );
};
```

### 路由模块

11 个路由模块：

| 路由模块 | 用途 |
|---------|------|
| `health` | 健康检查 |
| `ai` | AI 辅助服务（风险评分、模块拆解等） |
| `calculation` | 报价计算引擎 |
| `config` | 系统配置管理 |
| `projects` | 项目 CRUD |
| `dashboard` | 数据看板 |
| `contracts` | 合同 CSV 检索 |
| `web3d` | Web3D 专项评估 |
| `templates` | 模板管理 |
| `opportunity` | 项目机会（招标网站） |
| `wiki` | Wiki 知识库 |

### 目录结构

```
server/
├── index.js                  # 应用入口（加载中间件、路由、启动服务）
├── init-db.js                # 数据库表结构初始化脚本
├── config/                   # 配置层
│   ├── server.js             # 端口 & 环境变量读取
│   └── database.js           # 数据库单例管理
├── controllers/              # 控制器层
├── routes/                   # 路由层（11 个模块）
├── services/                 # 业务服务层
│   ├── calculationService.js # 报价计算引擎
│   ├── aiService.js          # AI 服务入口
│   ├── exportService.js      # PDF/Excel 导出
│   └── dashboardService.js   # 数据看板聚合
├── models/                   # 数据访问层
├── providers/ai/             # AI 提供商实现
│   ├── openaiProvider.js     # OpenAI 实现
│   └── doubaoProvider.js     # 豆包实现
├── migrations/               # 数据库迁移脚本（001-016+）
├── utils/                    # 公共工具
│   ├── constants.js          # 系统常量
│   ├── rating.js             # 评分因子算法
│   └── logger.js             # 日志工具
├── openapi/                  # OpenAPI 3.0 契约生成
├── logs/                     # AI/导出日志
└── wiki/                     # Wiki Markdown 文件
```

---

## 🗄️ 数据层架构

### 双数据库支持

系统同时支持 SQLite（V1）和 PostgreSQL（V2），通过环境变量切换：

```bash
# V1：SQLite 本地模式
DB_TYPE=sqlite

# V2：PostgreSQL/Supabase 云端模式
DB_TYPE=postgres
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### 数据库单例模式

通过 `config/database.js` 管理数据库连接，避免多实例文件锁冲突：

```javascript
// server/config/database.js
let dbInstance = null;

exports.getDatabase = () => {
  if (!dbInstance) {
    if (process.env.DB_TYPE === 'postgres') {
      // PostgreSQL 连接
      dbInstance = new Database(process.env.DATABASE_URL);
    } else {
      // SQLite 连接
      dbInstance = new Database('server/ppa.db');
    }
  }
  return dbInstance;
};
```

### 核心数据表

#### 项目表（projects）

```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  customer_name TEXT,
  industry TEXT,
  project_type TEXT,
  template_id INTEGER,
  is_template BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**关键字段**：
- `is_template`：区分项目和模板（共用一张表）
- `template_id`：基于模板创建项目时关联的模板 ID

#### 风险项表（risk_items）

```sql
CREATE TABLE risk_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  probability INTEGER CHECK (probability BETWEEN 1 AND 5),
  impact INTEGER CHECK (impact BETWEEN 1 AND 5),
  score REAL GENERATED ALWAYS AS (probability * impact * 0.5) STORED,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

#### 角色工作量表（role_assignments）

```sql
CREATE TABLE role_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  role_name TEXT NOT NULL,
  daily_rate REAL NOT NULL,
  effort_days REAL NOT NULL,
  subtotal REAL GENERATED ALWAYS AS (daily_rate * effort_days) STORED,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

#### Wiki 关联表（wiki_project_relations）

```sql
CREATE TABLE wiki_project_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wiki_key TEXT NOT NULL,
  project_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(wiki_key, project_id)
);
```

---

## 🤖 AI 服务架构

### 统一 AI 服务入口

```javascript
// server/services/aiService.js
exports.assessRisk = async (params) => {
  const provider = getAIProvider(); // 根据配置选择 OpenAI 或豆包
  return await provider.assessRisk(params);
};
```

### AI 提供商抽象

```javascript
// server/providers/ai/baseAIProvider.js
class BaseAIProvider {
  async call(prompt, options) {
    // 1. 记录请求日志
    await logRequest(prompt, options);

    // 2. 调用 AI API
    const response = await this.callAPI(prompt, options);

    // 3. 记录响应日志
    await logResponse(response);

    // 4. 解析结果
    return this.parseResponse(response);
  }
}
```

### AI 日志系统

AI 调用日志自动保存到本地文件系统：

```
server/logs/ai/{step}/YYYY-MM-DD/{HHmmss}_{requestHash}/
├── index.json           # 请求元数据
├── request.json         # 完整请求参数
├── response.raw.txt     # AI 原始响应
├── response.parsed.json # 解析后的结构化数据
└── notes.log            # 额外日志
```

**开启日志**：
```bash
AI_LOG_ENABLED=true
```

---

## 💰 核心业务流程

### 报价计算流程

```
用户录入项目信息
    ↓
填写风险评分（概率 × 影响）
    ↓
填写角色工作量（角色 × 人天 × 单价）
    ↓
系统计算风险系数（1.0 + 风险总分 × 调整系数）
    ↓
应用交付系数、范围系数、技术系数
    ↓
生成五大成本构成：
  - 软件研发成本
  - 系统对接成本
  - 差旅成本
  - 运维成本
  - 风险成本
    ↓
汇总总成本 + 利润率 → 最终报价
```

**核心公式**：

```
基础成本 = Σ(角色单价 × 人天) × 交付系数 × 范围系数 × 技术系数

风险成本 = 基础成本 × 风险系数 × 风险调整系数

总成本 = 基础成本 + 系统对接 + 差旅 + 运维 + 风险成本

最终报价 = 总成本 × (1 + 利润率)
```

---

## 🔄 数据库迁移系统

### 迁移脚本命名

```
migrations/
├── 001_create_projects_table.js
├── 002_create_risk_items_table.js
├── 003_create_role_assignments_table.js
├── ...
└── 016_create_wiki_project_relations.js
```

### 迁移执行

迁移脚本通过 `node init-db.js` 执行：

```javascript
// server/init-db.js
const migrations = [
  './migrations/001_create_projects_table.js',
  './migrations/002_create_risk_items_table.js',
  // ...
];

for (const migration of migrations) {
  const { up } = require(migration);
  await up();
}
```

---

## 📊 前端状态管理

### React Hooks + Ant Design ProComponents

前端采用 React Hooks 进行状态管理，结合 Ant Design ProComponents 提供的数据表格和表单能力：

```typescript
// 示例：项目列表页面
const [projects, setProjects] = useState<Project[]>([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  fetchProjects();
}, []);

const fetchProjects = async () => {
  setLoading(true);
  const res = await getProjects();
  if (res.success) {
    setProjects(res.data);
  }
  setLoading(false);
};
```

---

## 🚀 部署架构

### V1：本地部署

```
用户浏览器
  ↓ (HTTP)
UmiJS 开发服务器 (localhost:8000)
  ↓ (API 代理)
Express 后端 (localhost:3001)
  ↓ (SQL)
SQLite 数据库 (server/ppa.db)
```

### V2：云端部署（规划中）

```
用户浏览器
  ↓ (HTTPS)
UmiJS 生产构建（CDN/OSS）
  ↓ (HTTPS)
Express 后端（云服务器/Serverless）
  ↓ (TCP)
Supabase PostgreSQL
  ↓
Supabase Storage（文件存储）
```

---

## 🔐 安全考虑

### 当前状态

- ❌ **无身份认证/授权** — 单用户系统，未来需要添加
- ⚠️ **SQL 注入风险** — 部分代码使用字符串拼接（应改用参数化查询）
- ✅ **环境变量隔离** — 敏感信息在 `server/.env`，已加入 `.gitignore`

### 改进方向

1. **添加 JWT 认证**
2. **统一使用参数化查询**
3. **添加请求频率限制**
4. **添加 CORS 配置**
5. **启用 Helmet.js 安全头**

---

## 📈 性能优化

### 已实现

- ✅ 数据库索引（`risk_items`、`role_assignments` 等）
- ✅ AI 日志文件系统（异步写入）
- ✅ Wiki 内容缓存（10秒 TTL）
- ✅ 前端组件懒加载（UmiJS 路由懒加载）

### 待优化

- ⚠️ 无分页（大数据量时性能问题）
- ⚠️ 部分接口 N+1 查询
- ⚠️ 缺少 Redis 缓存层

---

## 🧩 扩展性设计

### AI 提供商扩展

通过抽象基类 `BaseAIProvider`，可以轻松添加新的 AI 提供商：

```javascript
class NewAIProvider extends BaseAIProvider {
  async callAPI(prompt, options) {
    // 实现新提供商的 API 调用
  }

  parseResponse(response) {
    // 实现新提供商的响应解析
  }
}
```

### 数据库扩展

通过 `config/database.js` 的单例模式，可以支持多种数据库：

```javascript
if (process.env.DB_TYPE === 'postgres') {
  // PostgreSQL
} else if (process.env.DB_TYPE === 'mysql') {
  // MySQL（未来可扩展）
}
```

---

## 📚 相关文档

- **开发规范**：[development-guide.md](./development-guide.md)
- **项目 README**：[../README.md](../README.md)
- **后端 README**：[../server/README.md](../server/README.md)
- **V2 产品规划**：[../docs/prd2.0/prd.md](../docs/prd2.0/prd.md)
- **API 文档**：启动后端后访问 `http://localhost:3001/api-docs`
