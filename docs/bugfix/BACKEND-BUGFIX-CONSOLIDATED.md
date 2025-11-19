# 后端 Bug 修复记录（整合版）

> **最后更新**: 2025-11-06  
> **适用范围**: PPA 项目后端 (server/)  
> **架构版本**: 当前三层架构（Controller-Service-Model）

---

## 📋 目录

1. [数据库与连接问题](#1-数据库与连接问题)
2. [异步函数与 async/await 问题](#2-异步函数与-asyncawait-问题)
3. [SQLite JSON 函数陷阱](#3-sqlite-json-函数陷阱)
4. [服务器重启与开发流程](#4-服务器重启与开发流程)
5. [数据查询与字段映射问题](#5-数据查询与字段映射问题)

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
| 2025-11-06 | 新增数据查询与字段映射问题 | Story 2 |
| 2025-11-01 | 整合文档，删除过时内容 | - |
| 2025-10-29 | 修复 prompts 接口挂起问题 | - |
| 2025-10-21 | 修复差旅成本计算错误 | Sprint 9 |
| Sprint 6-7 | 修复硬编码单价问题（已过时） | Sprint 6-7 |
| Sprint 2 | 服务器重启问题说明 | Sprint 2 |

---

**维护说明**: 本文档应随项目架构演进持续更新。当引入新的技术栈或重构架构时，应及时删除过时内容，添加新的最佳实践。

---

## 5. 数据查询与字段映射问题

### 5.1 角色成本分布查询字段映射错误（Dashboard API）

**故障现象**:  
调用 `/api/dashboard/role-cost-distribution` 接口返回空对象 `{}`，但数据库中确实存在项目数据和角色配置。

**发生时间**: 2025-11-06（Story 2: Dashboard 前端UI/UX实现）

**根本原因**:  
代码中查找的 JSON 字段名与数据库中实际存储的字段名不匹配：

1. **字段名不一致**:
   - 代码查找: `details.workload.newFeatures`
   - 实际数据: `details.development_workload`
   - 代码查找: `details.workload.systemIntegration`
   - 实际数据: `details.integration_workload`

2. **数据结构不一致**:
   - 代码查找: `feature.roles.角色名` (嵌套结构)
   - 实际数据: `feature.角色名` (角色名直接作为字段)

**错误代码**:

```javascript
// ❌ 错误：字段名不匹配
exports.getRoleCostDistribution = async () => {
  const projects = await db.all('SELECT assessment_details_json FROM projects');
  const roles = await db.all('SELECT role_name, unit_price FROM config_roles');
  const rolePrices = roles.reduce((acc, role) => { 
    acc[role.role_name] = role.unit_price; 
    return acc; 
  }, {});

  const roleCosts = {};
  projects.forEach(project => {
    try {
      const details = JSON.parse(project.assessment_details_json);
      
      // ❌ 错误：查找不存在的字段
      if (details.workload && details.workload.newFeatures) {
        details.workload.newFeatures.forEach(feature => {
          // ❌ 错误：假设有 roles 对象
          if (feature.roles) {
            Object.keys(feature.roles).forEach(roleName => {
              const manDays = parseFloat(feature.roles[roleName] || 0);
              // ...
            });
          }
        });
      }
    } catch (e) {
      console.error('Error parsing assessment_details_json:', e);
    }
  });
  return roleCosts;
};
```

**实际数据结构**:

```json
{
  "development_workload": [
    {
      "id": "1761180558013-b422",
      "module1": "碳资产管理子系统",
      "项目经理": 1.5,
      "技术经理": 1.2,
      "DBA": 0.5,
      "产品经理": 1
    }
  ],
  "integration_workload": [
    {
      "id": "1761180558014-0db2",
      "module1": "系统对接",
      "项目经理": 1.5,
      "技术经理": 2,
      "DBA": 0.5
    }
  ]
}
```

**解决方案**:

```javascript
// ✅ 正确：使用实际字段名 + 正确的数据结构
exports.getRoleCostDistribution = async () => {
  const projects = await db.all('SELECT assessment_details_json FROM projects');
  const roles = await db.all('SELECT role_name, unit_price FROM config_roles');
  const rolePrices = roles.reduce((acc, role) => { 
    acc[role.role_name] = role.unit_price; 
    return acc; 
  }, {});

  const roleCosts = {};

  projects.forEach(project => {
    try {
      const details = JSON.parse(project.assessment_details_json);
      
      // ✅ 正确：使用 development_workload
      if (details.development_workload && Array.isArray(details.development_workload)) {
        details.development_workload.forEach(feature => {
          // ✅ 正确：遍历所有角色配置，直接从 feature 对象读取
          Object.keys(rolePrices).forEach(roleName => {
            if (feature[roleName] !== undefined) {
              const manDays = parseFloat(feature[roleName] || 0);
              const unitPrice = rolePrices[roleName] || 0;
              if (manDays > 0) {
                roleCosts[roleName] = (roleCosts[roleName] || 0) + (manDays * unitPrice);
              }
            }
          });
        });
      }
      
      // ✅ 正确：使用 integration_workload
      if (details.integration_workload && Array.isArray(details.integration_workload)) {
        details.integration_workload.forEach(integration => {
          Object.keys(rolePrices).forEach(roleName => {
            if (integration[roleName] !== undefined) {
              const manDays = parseFloat(integration[roleName] || 0);
              const unitPrice = rolePrices[roleName] || 0;
              if (manDays > 0) {
                roleCosts[roleName] = (roleCosts[roleName] || 0) + (manDays * unitPrice);
              }
            }
          });
        });
      }
    } catch (e) {
      console.error('Error parsing assessment_details_json for role costs:', e);
    }
  });

  return roleCosts;
};
```

**调试技巧**:

```bash
# 1. 直接查看数据库中的 JSON 数据结构
cd server
sqlite3 ppa.db "SELECT assessment_details_json FROM projects WHERE id = 8;" | python3 -m json.tool

# 2. 在 service 中添加 console.log 调试
console.log('Parsed details:', JSON.stringify(details, null, 2));
console.log('Available keys:', Object.keys(details));

# 3. 检查角色配置
curl http://localhost:3001/api/config/roles

# 4. 测试 API 返回
curl http://localhost:3001/api/dashboard/role-cost-distribution
```

**最佳实践检查清单**:

- [ ] 在编写查询逻辑前，先查看数据库中的实际数据结构
- [ ] 使用 `sqlite3` 命令行工具或 SQL 客户端查看 JSON 数据
- [ ] 不要假设 JSON 字段名，要查看实际数据确认
- [ ] 添加详细的错误日志，便于调试
- [ ] 对 JSON 数据添加类型检查（Array.isArray）
- [ ] 对可能缺失的字段添加空值检查
- [ ] 遍历配置的角色列表，而不是假设数据结构

**相关文件**:
- `server/services/dashboardService.js` - 角色成本分布查询逻辑
- `server/controllers/dashboardController.js` - Dashboard API 控制器

**预防措施**:
1. **文档化数据结构**: 在 README 或单独文档中记录 assessment_details_json 的完整结构
2. **数据结构验证**: 添加 JSON Schema 验证
3. **单元测试**: 为 service 层添加测试，使用真实的数据样本
4. **类型定义**: 考虑使用 TypeScript 或 JSDoc 定义数据类型

---

## 6. AI 调用文件日志未落盘（2025-11-14）

**故障现象**:  
执行第1步（风险评分）和第2步（模块梳理）后端调用成功，但未在 `server/logs/ai` 目录看到任何日志文件。

**根本原因**:  
接入文件日志保存逻辑后，Service 中遗漏导入 `aiFileLogger`，导致 `aiFileLogger.save(...)` 在 `try { ... } catch {}` 保护块内抛出 `ReferenceError` 被吞掉，实际没有写盘也没有显式报错。

**修复方案**:  
- 明确导入写盘模块，并在写入成功时输出落盘路径：
  - `server/services/aiModuleAnalysisService.js` 顶部新增 `const aiFileLogger = require('./aiFileLogger');`
  - `server/services/aiRiskAssessmentService.js` 顶部新增 `const aiFileLogger = require('./aiFileLogger');`
  - `server/services/aiFileLogger.js` 在写入完成后 `console.info('[AI File Logger] saved to: <dir>')`

**验证步骤**:  
1. 在 `server` 目录启动后端（需重启以加载改动）：`node index.js`
2. 触发第1步或第2步任一AI接口。
3. 控制台应出现：`[AI File Logger] saved to: server/logs/ai/<step>/<date>/<time>_<hash>`
4. 对应目录下应存在：`index.json`、`request.json`、`response.raw.txt`、`response.parsed.json`、`notes.log`。

**默认行为与配置**:  
- 日志默认开启：未设置 `AI_LOG_ENABLED` 时会写盘；将其设为 `false` 可关闭。
- 可通过 `AI_LOG_DIR` 修改落盘目录（默认 `server/logs/ai`）。

**涉及文件**:  
- `server/services/aiModuleAnalysisService.js`
- `server/services/aiRiskAssessmentService.js`
- `server/services/aiFileLogger.js`


### 5.2 数据结构假设的常见陷阱

**背景**:  
在开发新功能时，开发者容易根据需求文档或想象来假设数据结构，而不是查看实际存储的数据。

**常见错误假设**:

1. **假设嵌套结构**: 假设 `obj.parent.child`，实际可能是 `obj.child`
2. **假设数组**: 假设某字段是数组，实际可能是对象或字符串
3. **假设字段存在**: 直接访问字段不检查 undefined
4. **假设字段名**: 使用驼峰命名，实际可能是下划线命名

**最佳实践**:

```javascript
// ✅ 正确：先检查数据结构再使用
const data = JSON.parse(jsonString);

// 1. 检查顶层字段是否存在
if (!data.workload) {
  console.warn('Missing workload field');
  return {};
}

// 2. 检查字段类型
if (!Array.isArray(data.workload.items)) {
  console.warn('workload.items is not an array');
  return {};
}

// 3. 安全访问嵌套字段
const value = data?.workload?.items?.[0]?.value ?? 0;

// 4. 使用实际字段名（查看数据库确认）
const features = data.development_workload; // 而不是 data.workload.newFeatures
```

**调试工作流**:

```bash
# 步骤 1: 查看实际数据
sqlite3 ppa.db "SELECT * FROM projects LIMIT 1;"

# 步骤 2: 查看 JSON 字段的完整结构
sqlite3 ppa.db "SELECT assessment_details_json FROM projects WHERE id = 1;" | python3 -m json.tool

# 步骤 3: 提取特定字段查看
sqlite3 ppa.db "SELECT json_extract(assessment_details_json, '$.development_workload') FROM projects LIMIT 1;"

# 步骤 4: 验证字段是否存在
sqlite3 ppa.db "SELECT COUNT(*) FROM projects WHERE json_extract(assessment_details_json, '$.development_workload') IS NOT NULL;"
```

**相关工具**:
- SQLite JSON 函数: `json_extract()`, `json_each()`, `json_type()`
- Python `json.tool`: 格式化 JSON 输出
- VS Code SQLite 扩展: 可视化查看数据库

---

### 5.3 内部导出 Summary Rating Factor 为空

**故障现象**:  
用户执行内部版 Excel 导出时，Summary 工作表中的 `Rating Factor` 列始终为空（`formatted.json` 中对应字段为 `null`），导致报价追溯链断裂。

**发生时间**: 2025-11-19（Excel 导出验收回归）

**根本原因**:  
`internalFormatter.formatForExport()` 在兼容旧版 `assessment_details_json` 结构时，直接将 `ratingFactor` 设为 `null`，并未基于项目的 `final_risk_score` 重新计算评分因子：

```javascript
// ❌ 旧逻辑：legacy 分支 ratingFactor 永远为 null
const summary = {
  snapshotId: project.id,
  // ...
  ratingFactor: null,
  exportedAt
};
```

即便项目的 `final_risk_score` 已经在外层聚合字段中保存，也没有再次调用评分算法，导致 Summary 页缺数。

**解决方案**:

1. 将 `internalFormatter.formatForExport` 改为 `async`，在 legacy 分支内读取最终风险分数（`project.final_risk_score` 或 `risk_scores` 求和），并调用 `utils/rating.computeRatingFactor()` 动态得到评分因子，失败时保持 `null` 而不阻断导出。
2. `computeRatingFactor` 依赖配置库（SQLite），因此需要补充 `exportService.generateExcel()` 对 formatter 结果 `await`，确保外层流程能够正确处理异步。

```javascript
// ✅ 新逻辑：legacy 结构也计算 ratingFactor
if (Number.isFinite(normalizedRiskScore)) {
  const { factor } = await computeRatingFactor(normalizedRiskScore);
  resolvedRatingFactor = Number(Number(factor).toFixed(4));
}

const summary = {
  // ...
  ratingFactor: resolvedRatingFactor,
  exportedAt
};
```

**验证步骤**:
1. 在 `server` 目录 `node` 运行脚本，先 `await db.init()`（或启动 API 服务）。
2. 读取一条 legacy 项目（例如 `server/logs/export/2025-11-19/151308_000017/project.json`），执行 `internalFormatter.formatForExport`。
3. 断言 `result.summary.ratingFactor` 为介于 `1~1.5` 的数值（示例测试得到 `1`）。
4. 重新通过接口导出 Excel，Summary 页应显示对应值。

**涉及文件**:
- `server/services/export/formatters/internalFormatter.js`
- `server/services/exportService.js`
- `server/utils/rating.js`, `server/models/configModel.js`

### 5.4 内部导出评估完成时间为空

**故障现象**:  
内部版 Excel Summary 的“评估完成时间”列一直为空，落盘的 `formatted.json.summary.completedAt` 也是 `null`，无法追溯具体的评估交付时间。

**发生时间**: 2025-11-19（Excel 导出回归）

**根本原因**:  
`internalFormatter.formatForExport()` 仅在新数据结构下读取 `details.completed_at`；legacy 分支直接写死 `completedAt: null`。线上老项目没有 `completed_at` 字段，即使数据库行存在 `updated_at` 也未被利用。

**解决方案**:

1. 在 formatter 中新增 `formatCompletedAt(project)`，优先使用项目记录的 `updated_at`，否则回退到 `created_at`，并统一格式化为 `YYYY-MM-DD HH:mm`。
2. 新旧两种数据结构都复用该值，异常格式自动容错为空，不阻断导出。

```javascript
const completedAt = formatCompletedAt(project);

return {
  summary: {
    // ...
    completedAt,
    exportedAt
  }
};
```

**验证步骤**:
1. 在 `server` 目录跑脚本，`await db.init()` 后读取示例项目（如 `logs/export/.../project.json`），调用 `internalFormatter.formatForExport()`。
2. 断言 `result.summary.completedAt` 输出 `YYYY-MM-DD HH:mm`（示例：`2025-11-19 07:13`）。
3. 重新导出 Excel，Summary 页显示对应时间。

**涉及文件**:
- `server/services/export/formatters/internalFormatter.js`

### 5.5 导出时间显示/下载文件名不一致

**故障现象**:  
导出记录与 Excel Summary 中的“导出时间”使用 ISO 字符串（`2025-11-19T07:13:08.894Z`），既不符合业务要求的 `YYYY-MM-DD HH:mm:ss` 展示格式，也导致后续希望按照“人类可读”时间排序时比较困难。

**发生时间**: 2025-11-19（Excel 导出回归）

**根本原因**:  
`internalFormatter.formatForExport()` 直接将 `new Date().toISOString()` 写入 `summary.exportedAt`；控制器与渲染器都使用同一个字段，无法区分“文件命名/追溯用的原始时间戳”和“展示给用户的格式化时间”。

**解决方案**:
1. 在 formatter 中新增 `formatExportedAtDisplay()`，生成 `YYYY-MM-DD HH:mm:ss` 的人类可读时间，保留原始 ISO 字符串在 `summary.exportedAtISO`。
2. `summary.exportedAt` 仅用于 Excel 展示，`summary.exportedAtISO` 提供给控制器生成文件名/日志，避免解析格式问题。
3. `exportController` 生成导出文件名时优先使用 `exportedAtISO`，兼容老数据回退到 `exportedAt`。

```javascript
const exportedAtISO = new Date().toISOString();
const exportedAtDisplay = formatExportedAtDisplay(exportedAtISO);

summary: {
  // ...
  exportedAt: exportedAtDisplay,
  exportedAtISO
};
```

**验证步骤**:
1. 运行 formatter 脚本，检查 `summary.exportedAt`（`2025-11-19 16:05:30`）与 `summary.exportedAtISO`（`2025-11-19T08:05:30Z`）均存在。
2. 重新导出 Excel → Summary 中显示 `YYYY-MM-DD HH:mm:ss`，下载文件名仍然包含正确的时间戳。

**涉及文件**:
- `server/services/export/formatters/internalFormatter.js`
- `server/controllers/exportController.js`

### 5.6 配置版本字段仍强制输出

**故障现象**:  
内部版 Summary、Excel 模板和导出日志依旧包含“配置版本/`config_version`”字段，但实际产品中模块功能没有版本概念，字段恒为空或 `unknown`，反而造成歧义。

**根本原因**:  
早期 Export Spec 沿用了配置中心的“版本”设定，formatter/renderer/logger/文档都强制生成该字段，即使数据库与 UI 并无对应属性。

**解决方案**:
1. 移除 formatter Summary 中的 `configVersion`，同步删除 Excel Summary 页和导出文件名/日志中的使用。
2. 精简 `exportFileLogger` 入参与 `index.json` 结构，不再写入 `config_version`。
3. 更新 Export Spec、PRD、Roadmap、Sprint Story/Context 等文档，明确仅需 `snapshot_id` 与 `exported_at` 作为元数据。

**验证步骤**:
1. 运行 formatter 脚本，确认 `Object.keys(result.summary)` 不再包含 `configVersion`。
2. 手动导出 Excel，Summary 页不再出现“配置版本”一行，`logs/export/*/index.json` 也不再有 `config_version` 字段。

**涉及文件**:
- `server/services/export/formatters/internalFormatter.js`
- `server/services/export/renderers/excelRenderer.js`
- `server/services/exportFileLogger.js`
- `server/controllers/exportController.js`
- `docs/prd/export-spec.md`、`docs/PRD.md`、`docs/roadmap-features.md`
- `docs/sprint-artifacts/stories/6-1-fr6-export*.{md,context.xml}`

### 5.7 Rating Factor 说明字段为空

**故障现象**:  
内部版 Excel 的 “Rating Factor 说明” sheet 只有“风险总分”有值，“最大风险分值 / 放大系数 / Rating Factor” 全为空，导致风险放大逻辑不可追溯。

**根本原因**:  
legacy 数据结构没有 `risk_calculation` 字段；formatter 在兼容逻辑里直接返回 `{}`，renderer 读取不到放大系数等值，表格自然空白。

**解决方案**:
1. 在 `internalFormatter` legacy 分支复用 `computeRatingFactor(riskScore)`，拿到 `factor / ratio / maxScore`。
2. 通过公式 `amplification = (ratingFactor - 1) / ratio` 反推放大系数（ratio 为 0 时直接用 `ratingFactor - 1`），把三者写入 `formatted.riskCalculation`。
3. renderer 读取到值后，Rating Factor 说明 sheet 即可正常展示“最大风险分值 / 放大系数 / Rating Factor”三项。

**验证步骤**:
1. 执行 formatter 脚本加载 `logs/export/2025-11-19/151308_000017/project.json`，`riskCalculation` 输出 `{ max_risk_score: 780, amplification_factor: 0, rating_ratio: 0.6795 }`。
2. 重新导出内部版 Excel，Rating Factor sheet 显示完整数据。

**涉及文件**:
- `server/services/export/formatters/internalFormatter.js`

### 5.8 外部导出未包含系统对接模块成本

**故障现象**:  
对外版 Excel 的“模块报价明细”仅列出新功能开发模块，系统对接阶段的工作量模块全部显示成本 0，导致总成本分摊不包含系统对接部分。

**根本原因**:  
`externalFormatter` 在新结构路径下只读取 `role_costs` 聚合模块成本，legacy 兜底才会使用 `integration_workload`。当前线上数据仍走 legacy（只存 `development_workload/integration_workload`），所以系统对接模块未参与成本比例计算。此外 `exportedAt` 也仍是 ISO 字符串，不符合内部版的格式要求。

**解决方案**:
1. 新增 `aggregateModulesFromWorkloads()` 工具，将任意工作量列表（含角色天数、delivery_factor）按模块聚合为 `roleCost/workloadDays`。
2. 在新结构路径下除了 `role_costs` 外，再根据 `integration_workload + roles` 聚合一次，并与开发模块合并，这样两个阶段都参与成本占比。
3. Summary 中同步输出 `exportedAt ISO + display` 形式，保持与内部版一致。

**验证步骤**:
1. 读取 legacy 项目（如 `logs/export/2025-11-19/151308_000017/project.json`），执行 formatter，`modules` 列表中包含系统对接模块（虽然示例数据角色天数为 0，但结构已出现）。
2. render 外部版 Excel，检查“项目概览”导出时间格式为 `YYYY-MM-DD HH:mm:ss`，模块表包含集成模块。
3. 若系统对接模块填写了角色天数，导出的成本占比会正常分摊。

**涉及文件**:
- `server/services/export/formatters/externalFormatter.js`
