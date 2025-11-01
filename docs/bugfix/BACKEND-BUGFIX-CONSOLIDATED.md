# 后端 Bug 修复记录（整合版）

> **最后更新**: 2025-11-01  
> **适用范围**: PPA 项目后端 (server/)  
> **架构版本**: 当前三层架构（Controller-Service-Model）

---

## 📋 目录

1. [数据库与连接问题](#1-数据库与连接问题)
2. [异步函数与 async/await 问题](#2-异步函数与-asyncawait-问题)
3. [SQLite JSON 函数陷阱](#3-sqlite-json-函数陷阱)
4. [服务器重启与开发流程](#4-服务器重启与开发流程)

---

## 1. 数据库与连接问题

### 1.1 SQLite 单连接模式的重要性

**背景**: 项目使用 SQLite 数据库，通过 `utils/db.js` 提供全局单例连接。

**关键规则**:
- ✅ **必须先调用** `db.init()` 初始化连接（在 `index.js` 启动时）
- ✅ **必须调用** `db.close()` 优雅关闭（SIGINT 信号处理）
- ❌ **禁止**在多处创建新的 `sqlite3.Database()` 实例
- ❌ **禁止**在未初始化前调用 `db.get()`, `db.all()`, `db.run()`

**最佳实践**:
```javascript
// ✅ 正确：使用 utils/db.js 单例
const db = require('../utils/db');
const result = await db.get('SELECT * FROM projects WHERE id = ?', [id]);

// ❌ 错误：创建新实例
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./ppa.db'); // 会导致文件锁冲突
```

**相关文件**:
- `server/utils/db.js` - 数据库单例管理
- `server/index.js` - 初始化和关闭逻辑

---

## 2. 异步函数与 async/await 问题

### 2.1 差旅成本计算错误（Sprint 9）

**问题描述**:  
在 `POST /api/calculate` 接口中，差旅成本计算结果错误。用户配置 4000元/人/月，1个月×1人 应得 0.4万元，实际显示 1万元。

**根本原因**:  
路由函数未声明为 `async`，但内部使用了 `await` 关键字查询数据库：

```javascript
// ❌ 错误：非 async 函数中使用 await
app.post('/api/calculate', (req, res) => {
  // ...
  const travelCostPerMonth = await db.get('SELECT ...');  // await 无效
  // travelCostPerMonth 可能是 Promise 对象而非数值
});
```

**解决方案**:  
所有使用 `await` 的函数必须声明为 `async`：

```javascript
// ✅ 正确：async 函数
app.post('/api/calculate', async (req, res) => {
  try {
    const travelCostPerMonth = await db.get('SELECT ...');
    // 正常获取数值
  } catch (error) {
    // 错误处理
  }
});
```

**检查清单**:
- [ ] 所有路由函数中使用 `await` 的都已声明为 `async`
- [ ] 所有 Service 层函数使用 `await` 的都已声明为 `async`
- [ ] 错误处理使用 `try-catch` 包裹异步代码

**影响范围**（已修复，现在使用 Service 层）:
- ~~`POST /api/calculate`~~（现已迁移到 `calculationService.js`）
- ~~`POST /api/projects`~~（现已迁移到 `projectService.js`）

**当前架构说明**:  
现在项目已重构为三层架构，所有业务逻辑在 Service 层，Service 函数都正确使用了 `async/await`。

---

## 3. SQLite JSON 函数陷阱

### 3.1 `/api/config/prompts` 接口挂起问题（2025-10-29）

**故障现象**:  
`/api/config/prompts` 接口请求永久挂起（pending），前端无响应。其他 API 正常工作。

**根本原因**:  
SQL 查询中使用 `json_array_length(variables_json)` 函数，当 `variables_json` 列存储的不是有效 JSON 数组时（如 JSON 对象 `{}`、`NULL`、格式错误的字符串），该函数会**静默挂起**而不返回错误。

**危险的 SQL**:
```sql
-- ❌ 危险：遇到非数组 JSON 会挂起
SELECT 
  id, 
  template_name, 
  json_array_length(variables_json) as variable_count
FROM prompt_templates;
```

**解决方案**:  
使用 `CASE` 语句先检查 JSON 类型再调用对应函数：

```sql
-- ✅ 安全：兼容多种 JSON 类型
SELECT 
  id, 
  template_name, 
  CASE 
    WHEN json_type(variables_json) = 'array' THEN json_array_length(variables_json)
    WHEN json_type(variables_json) = 'object' THEN (SELECT COUNT(*) FROM json_each(variables_json))
    ELSE 0 
  END as variable_count
FROM prompt_templates;
```

**关键经验**:
1. ✅ SQLite JSON 函数对数据类型敏感，使用前必须检查类型
2. ✅ 使用 `json_type()` 函数做前置判断
3. ✅ 为异常情况提供默认值（如 `ELSE 0`）
4. ✅ 数据库设计时，JSON 字段应有明确的类型约束或默认值

**常用 SQLite JSON 函数安全使用模式**:
```sql
-- 计数数组元素
CASE 
  WHEN json_type(col) = 'array' THEN json_array_length(col)
  ELSE 0 
END

-- 提取对象键值
CASE 
  WHEN json_type(col) = 'object' THEN json_extract(col, '$.key')
  ELSE NULL 
END

-- 遍历数组或对象
CASE 
  WHEN json_type(col) = 'array' THEN json_each(col)
  WHEN json_type(col) = 'object' THEN json_each(col)
  ELSE NULL 
END
```

**相关文件**:
- `server/models/promptTemplateModel.js` (如存在)
- 任何使用 JSON 列查询的 Model 层代码

---

## 4. 服务器重启与开发流程

### 4.1 后端代码修改未生效（Sprint 2）

**问题描述**:  
添加新的 API 路由后，前端请求返回 `404 Not Found`。用 `curl http://localhost:3001/api/config/roles` 直接测试后端也返回 `Cannot GET /api/config/roles`。

**错误诊断过程**:
1. ❌ 初步怀疑前端代理配置问题
2. ✅ 用 `curl` 直接测试后端，发现后端本身返回 404
3. ✅ 定位根本原因：**后端服务器未重启**

**根本原因**:  
Node.js 服务器启动时加载代码到内存，修改源文件不会自动生效。必须重启服务器才能加载最新代码。

**解决方案**:
```bash
# 1. 终止旧进程
pkill -f "node index.js"
# 或手动查找 PID 后 kill
ps aux | grep "node index.js"
kill <PID>

# 2. 重启服务器
cd server
node index.js
```

**开发流程规范**:
1. ✅ 每次修改后端代码（routes, controllers, services, models）后**必须重启**
2. ✅ 修改 `package.json` 或安装新依赖后必须重启
3. ✅ 修改环境变量（`.env` 或 `PORT`）后必须重启
4. ❌ 仅修改前端代码无需重启后端
5. ❌ 仅修改数据库数据（通过 SQL 或 API）无需重启

**推荐工具**:  
使用 `nodemon` 实现自动重启（可选）：
```bash
# 安装 nodemon
npm install --save-dev nodemon

# package.json 中添加脚本
"scripts": {
  "dev": "nodemon index.js",
  "start": "node index.js"
}

# 开发时使用
npm run dev
```

**检查服务器是否需要重启的信号**:
- 添加/修改/删除路由文件
- 修改 Service 或 Model 层逻辑
- 修改 `index.js` 中间件配置
- 修改 `utils/` 下的工具函数
- API 返回 404 但路由代码已存在

---

## 5. 已过时的问题（当前架构不再适用）

以下问题在旧代码中存在，但在当前三层架构下已不适用：

### 5.1 ~~硬编码平均单价问题~~（Sprint 6-7）

**旧问题**: 后端使用硬编码 `averageUnitPrice = 0.16` 计算成本，未使用数据库中各角色的精确单价。

**当前状态**: ✅ 已解决  
现在 `services/calculationService.js` 中的 `calculateWorkloadCost()` 函数正确使用每个角色的 `unit_price` 进行计算：

```javascript
// 当前代码（正确）
const rolePriceMap = new Map(roles.map(r => [r.role_name, r.unit_price / 10000]));
roles.forEach(role => {
  const days = Number(item[role.role_name] || 0);
  itemRoleCost += days * (rolePriceMap.get(role.role_name) || 0);
});
```

**不再需要关注此问题**。

---

## 6. 通用开发建议

### 6.1 异步代码最佳实践
```javascript
// ✅ 推荐：Service 层使用 async/await
async function calculateProjectCost(assessmentData) {
  try {
    const riskScore = computeRiskScore(assessmentData);
    const { factor } = await computeRatingFactor(riskScore);
    const travelCost = await getTravelCost();
    return { total: travelCost + devCost };
  } catch (error) {
    console.error('Calculation error:', error);
    throw error;
  }
}

// ✅ 推荐：Controller 层统一错误处理
router.post('/calculate', async (req, res, next) => {
  try {
    const result = await calculationService.calculateProjectCost(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error); // 交给全局错误处理中间件
  }
});
```

### 6.2 数据库查询最佳实践
```javascript
// ✅ 推荐：使用 utils/db.js 封装
const db = require('../utils/db');

async function getProjectById(id) {
  const project = await db.get(
    'SELECT * FROM projects WHERE id = ?',
    [id]
  );
  if (!project) {
    throw new Error('Project not found');
  }
  return project;
}

// ✅ 推荐：使用参数化查询防止 SQL 注入
const result = await db.all(
  'SELECT * FROM projects WHERE name LIKE ?',
  [`%${searchTerm}%`]
);

// ❌ 禁止：直接拼接 SQL（SQL 注入风险）
const result = await db.all(
  `SELECT * FROM projects WHERE name LIKE '%${searchTerm}%'`
);
```

### 6.3 JSON 字段处理最佳实践
```javascript
// ✅ 保存时：序列化 JSON
await db.run(
  'INSERT INTO projects (name, assessment_details_json) VALUES (?, ?)',
  [name, JSON.stringify(assessmentData)]
);

// ✅ 读取时：解析 JSON 并处理异常
const project = await db.get('SELECT * FROM projects WHERE id = ?', [id]);
let details = {};
try {
  details = JSON.parse(project.assessment_details_json);
} catch (error) {
  console.error('Invalid JSON in assessment_details_json:', error);
  details = {}; // 提供默认值
}

// ✅ SQL 查询 JSON 字段时：先检查类型
const sql = `
  SELECT 
    id,
    CASE 
      WHEN json_valid(assessment_details_json) = 1 
      THEN json_extract(assessment_details_json, '$.roles')
      ELSE '[]'
    END as roles
  FROM projects
`;
```

---

## 7. 快速排查指南

遇到后端问题时，按以下顺序排查：

### 步骤 1: 确认服务器运行状态
```bash
# 检查进程是否运行
ps aux | grep "node index.js"

# 检查端口是否监听
lsof -i :3001

# 测试健康检查接口
curl http://localhost:3001/api/health
```

### 步骤 2: 检查数据库连接
```bash
# 验证数据库文件存在
ls -lh server/ppa.db

# 尝试直接查询（使用 sqlite3 命令行工具）
sqlite3 server/ppa.db "SELECT COUNT(*) FROM projects;"
```

### 步骤 3: 检查日志输出
```bash
# 查看服务器启动日志
cd server && node index.js

# 观察是否有错误输出：
# - Database connection errors
# - Syntax errors
# - Unhandled promise rejections
```

### 步骤 4: 测试具体 API
```bash
# 测试 GET 接口
curl http://localhost:3001/api/projects

# 测试 POST 接口
curl -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"risk_scores": {}, "roles": []}'
```

### 步骤 5: 查看错误类型

| 错误症状 | 可能原因 | 对应章节 |
|---------|---------|---------|
| 接口返回 404 | 路由未注册 或 服务器未重启 | [§4.1](#41-后端代码修改未生效sprint-2) |
| 接口永久挂起 | SQLite JSON 函数问题 或 死循环 | [§3.1](#31-apiconfigprompts-接口挂起问题2025-10-29) |
| 计算结果错误 | async/await 使用不当 或 逻辑错误 | [§2.1](#21-差旅成本计算错误sprint-9) |
| 数据库锁定错误 | 多实例连接冲突 | [§1.1](#11-sqlite-单连接模式的重要性) |
| `Database not initialized` | 未调用 `db.init()` | [§1.1](#11-sqlite-单连接模式的重要性) |

---

## 8. 相关文档

- **项目架构**: `WARP.md` - 完整架构说明
- **后端详细文档**: `server/README.md` - API 规格、计算公式
- **数据库初始化**: `server/init-db.js` - 表结构定义
- **工具函数**: `server/utils/` - 数据库封装、常量定义、评分算法

---

## 9. 变更历史

| 日期 | 变更内容 | 相关 Sprint |
|------|---------|------------|
| 2025-11-01 | 整合文档，删除过时内容 | - |
| 2025-10-29 | 修复 prompts 接口挂起问题 | - |
| 2025-10-21 | 修复差旅成本计算错误 | Sprint 9 |
| Sprint 6-7 | 修复硬编码单价问题（已过时） | Sprint 6-7 |
| Sprint 2 | 服务器重启问题说明 | Sprint 2 |

---

**维护说明**: 本文档应随项目架构演进持续更新。当引入新的技术栈或重构架构时，应及时删除过时内容，添加新的最佳实践。
