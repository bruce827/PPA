# 开发规范指南

本文档面向项目新加入的开发者和未来的自己，提供完整的开发规范、调试技巧和常见问题解决方案。

---

## 📦 包管理规范

### 前端：必须用 yarn

```bash
# ✅ 正确
cd frontend/ppa_frontend
yarn install
yarn start
yarn build
yarn format

# ❌ 错误
npm install
npm start
```

**原因**：
- 前端项目已有 `yarn.lock`，混用 npm 可能导致依赖版本不一致
- 团队成员统一使用 yarn，避免"在我机器上能跑"的问题

### 后端：用 npm

```bash
cd server
npm install
npm test
npm run build:api
```

---

## 🏗️ 代码架构

### 后端三层架构

```
Routes（路由层）
  ↓
Controllers（控制器）
  ↓
Services（业务层）
  ↓
Models（数据层）
```

#### Routes（路由层）

**职责**：定义 URL 路由，调用对应的 Controller

```javascript
// server/routes/projects.js
router.get('/', projectController.getAllProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProjectById);
```

**规则**：
- ✅ 只定义路由，不写业务逻辑
- ✅ 可以添加中间件（认证、日志等）
- ❌ 禁止直接操作数据库
- ❌ 禁止写复杂计算逻辑

#### Controllers（控制器）

**职责**：参数提取、验证、调用 Service、格式化响应

```javascript
// server/controllers/projectController.js
exports.createProject = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const project = await projectService.createProject({ name, description });
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};
```

**规则**：
- ✅ 提取请求参数
- ✅ 调用 Service 层
- ✅ 统一响应格式 `{ success, data, error }`
- ❌ 禁止写业务逻辑
- ❌ 禁止直接操作数据库

#### Services（业务层）

**职责**：核心业务逻辑

```javascript
// server/services/projectService.js
exports.createProject = async (data) => {
  // 业务逻辑：验证、计算、调用 Model
  const project = await projectModel.create(data);
  return project;
};
```

**规则**：
- ✅ 业务逻辑放在这里
- ✅ 调用 Model 层操作数据库
- ✅ 可以被多个 Controller 复用
- ❌ 禁止直接写 SQL（通过 Model）
- ❌ 禁止处理 HTTP 请求/响应

#### Models（数据层）

**职责**：直接 SQLite/PostgreSQL 操作

```javascript
// server/models/projectModel.js
exports.create = async (data) => {
  const { name, description } = data;
  const result = await db.run(
    'INSERT INTO projects (name, description) VALUES (?, ?)',
    [name, description]
  );
  return result;
};
```

**规则**：
- ✅ 只写 SQL 操作
- ✅ 使用参数化查询（防止 SQL 注入）
- ❌ 禁止写业务逻辑
- ❌ 禁止处理 HTTP 相关代码

---

### 前端架构

#### 页面组件

- 所有页面组件放在 `frontend/ppa_frontend/src/pages/` 下
- 使用 UmiJS 的路由系统（`.umirc.ts` 中配置）
- 使用 Ant Design ProComponents（`ProCard`、`ProTable` 等）

#### API 请求

```typescript
// frontend/ppa_frontend/src/services/xxx.ts
import { request } from '@umijs/max';

export async function getData(params) {
  return request('/api/xxx', { params });
}
```

**规则**：
- ✅ API 请求统一放在 `src/services/` 下
- ✅ 使用 TypeScript 接口定义数据结构
- ❌ 禁止在组件中直接写 `fetch` 或 `axios`

---

## 🧪 测试规范

### 后端测试（Jest + Supertest）

**位置**：`server/tests/`

```javascript
// server/tests/projectAPI.test.js
describe('Project API', () => {
  it('should create a new project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'Test Project' });
    expect(res.body.success).toBe(true);
  });
});
```

**运行测试**：
```bash
cd server
npm test                    # 运行所有测试
npm test -- projectAPI.test.js  # 运行单个测试文件
```

### 前端测试（Playwright）

**位置**：`frontend/ppa_frontend/tests/`

```bash
cd frontend/ppa_frontend
yarn test:e2e:smoke         # 运行 smoke 测试
```

### 项目级测试工作区

**位置**：`tests/`

用于存放测试计划、复测脚本、测试报告和测试产物：

```
tests/
├── postgresql-query-performance/  # PostgreSQL 慢接口优化测试包
│   ├── plan.md
│   ├── scripts/
│   ├── reports/
│   └── artifacts/
```

**运行专项测试**：
```bash
# PostgreSQL 慢接口优化聚焦验证
tests/postgresql-query-performance/scripts/run-focused-verification.sh

# Dashboard 只读性能采样
node tests/postgresql-query-performance/scripts/run-dashboard-readonly-sampling.js
```

---

## 🐛 调试技巧

### AI 日志查看

**日志位置**：`server/logs/ai/{step}/YYYY-MM-DD/{HHmmss}_{requestHash}/`

**常见文件**：
- `index.json` — 请求元数据
- `request.json` — 完整请求参数
- `response.raw.txt` — AI 原始响应
- `response.parsed.json` — 解析后的结构化数据
- `notes.log` — 额外日志

**开启 AI 日志**：
```bash
# server/.env
AI_LOG_ENABLED=true
```

### 数据库查看

#### SQLite（本地开发）

```bash
# 安装 sqlite3 CLI
brew install sqlite3

# 查看数据库
sqlite3 server/ppa.db

# 常用命令
.tables                      # 查看所有表
.schema projects             # 查看表结构
SELECT * FROM projects;      # 查询数据
```

#### PostgreSQL（V2）

连接 Supabase Dashboard 或使用 `psql`：
```bash
psql postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

### 常见问题排查

#### 1. 后端启动失败

**检查端口占用**：
```bash
lsof -i :3001
```

**检查环境变量**：
```bash
cat server/.env
```

**查看详细错误日志**：
```bash
node index.js 2>&1 | tee server.log
```

#### 2. 前端 API 请求失败

**检查代理配置**（`.umirc.ts`）：
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
}
```

**检查后端是否运行**：
```bash
curl http://localhost:3001/health
```

#### 3. AI 调用失败

**检查 API Key**：
```bash
cat server/.env | grep OPENAI_API_KEY
```

**查看 AI 日志**：
```bash
ls server/logs/ai/
```

**测试 AI 连通性**：
```bash
curl http://localhost:3001/api/ai/test
```

#### 4. 数据库迁移失败

**查看迁移状态**：
```bash
cd server
ls migrations/
```

**重新初始化数据库**：
```bash
node init-db.js
```

---

## 📝 Git 提交规范

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：
- `feat`：新功能
- `fix`：修复 bug
- `docs`：文档更新
- `style`：代码格式（不影响功能）
- `refactor`：重构
- `test`：测试相关
- `chore`：构建/工具相关

**示例**：
```bash
git commit -m "feat(projects): add project template feature

- Add is_template field to projects table
- Add template CRUD API endpoints
- Add template selection in project creation form

Closes #123"
```

---

## 🔄 开发工作流

### 新增一个 API 接口

**步骤**：

1. **Model 层**：在 `server/models/` 下创建或修改 Model
   ```javascript
   // server/models/xxxModel.js
   exports.getData = async (id) => {
     return await db.get('SELECT * FROM xxx WHERE id = ?', [id]);
   };
   ```

2. **Service 层**：在 `server/services/` 下创建或修改 Service
   ```javascript
   // server/services/xxxService.js
   exports.getData = async (id) => {
     const data = await xxxModel.getData(id);
     // 业务逻辑处理
     return data;
   };
   ```

3. **Controller 层**：在 `server/controllers/` 下创建或修改 Controller
   ```javascript
   // server/controllers/xxxController.js
   exports.getData = async (req, res, next) => {
     try {
       const { id } = req.params;
       const data = await xxxService.getData(id);
       res.json({ success: true, data });
     } catch (error) {
       next(error);
     }
   };
   ```

4. **Route 层**：在 `server/routes/` 下注册路由
   ```javascript
   // server/routes/xxx.js
   router.get('/:id', xxxController.getData);
   ```

5. **测试**：在 `server/tests/` 下添加测试
   ```javascript
   // server/tests/xxxAPI.test.js
   it('should get data by id', async () => {
     const res = await request(app).get('/api/xxx/1');
     expect(res.body.success).toBe(true);
   });
   ```

---

## ⚡ 性能优化建议

### 数据库查询

- ✅ 使用索引（`CREATE INDEX`）
- ✅ 避免 `SELECT *`，只查询需要的字段
- ✅ 使用参数化查询
- ❌ 避免 N+1 查询
- ❌ 避免在循环中查询数据库

### 前端性能

- ✅ 使用 Ant Design 的 `ProTable`（自带分页和虚拟滚动）
- ✅ 使用 React.memo 避免不必要的重渲染
- ✅ 使用 UmiJS 的 `umi-request` 缓存
- ❌ 避免在 `useEffect` 中执行过多计算

---

## 🔐 安全注意事项

### SQL 注入风险

**当前问题**：部分代码使用 SQL 字符串拼接

**示例（不安全）**：
```javascript
// ❌ 禁止
const sql = `SELECT * FROM projects WHERE name = '${name}'`;
```

**正确做法**：
```javascript
// ✅ 使用参数化查询
const sql = 'SELECT * FROM projects WHERE name = ?';
await db.get(sql, [name]);
```

### 环境变量

- ✅ 敏感信息（API Key、数据库密码）必须放在 `server/.env`
- ❌ 禁止提交 `server/.env` 到 Git（已在 `.gitignore`）

---

## 📚 参考文档

- **项目 README**：[README.md](../README.md)
- **技术架构详解**：[architecture.md](./architecture.md)
- **后端 README**：[server/README.md](../server/README.md)
- **V2 产品规划**：[../docs/prd2.0/prd.md](../docs/prd2.0/prd.md)
