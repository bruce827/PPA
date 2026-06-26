# PPA PostgreSQL 迁移回归测试方案

## 背景

从 SQLite 迁移到 PostgreSQL 后,需要确保所有接口在 PostgreSQL 环境下正常工作,特别是验证:
- 数据库查询不报错
- 数据读写正确
- 计算逻辑结果一致
- 导出功能正常

## 接口清单 (140+ 个)

详见: [`docs/api-inventory.md`](docs/api-inventory.md)

**已扫描路由模块**:
- ✅ health (1)
- ✅ config (37)
- ✅ calculation (1)
- ✅ projects (19)
- ✅ dashboard (7)
- ✅ ai (9)
- ✅ web3d (19)
- ✅ monitoring (3)
- ✅ contracts (3)
- ✅ opportunity (22)
- ✅ formDesign (22)
- ✅ wiki (4)
- ✅ dataMetrics (27)

**总计**: 140+ 个接口

## 测试范围 (2026-06-24 定义)

### ✅ 包含：项目内部数据库操作接口

**定义**: 仅测试项目内部的数据库 CRUD 操作，不测试外部 API 调用

**包含范围**:
- ✅ Config 模块的数据库操作
  - Roles CRUD ✅
  - Risk Items CRUD ✅
  - Travel Costs CRUD ✅
- ✅ Project CRUD
- ✅ Calculation (报价计算)
- ✅ Dashboard (数据看板聚合查询)
- ✅ Export (PDF/Excel 导出)

### ⏭️ 排除：外部调用或复杂业务逻辑

**排除原因**: 这些接口需要外部依赖或复杂业务逻辑准备

**排除列表**:
1. **AI 模型连接测试** (2 个)
   - POST /api/config/ai-models/:id/test
   - POST /api/config/ai-models/test-temp
   - 原因: 需要调用外部 OpenAI API

2. **Prompt Template** (8 个)
   - GET/POST/PUT/DELETE /api/config/prompts
   - POST /api/config/prompts/:id/copy
   - POST /api/config/prompts/:id/preview
   - 原因: 涉及 AI 模型验证逻辑

3. **Push Validate** (1 个)
   - POST /api/projects/:id/push/validate
   - 原因: 需要商务报价完成状态

4. **AI 业务评估** (6 个)
   - POST /api/ai/assess-risk
   - POST /api/ai/normalize-risk-names
   - POST /api/ai/analyze-project-modules
   - POST /api/ai/evaluate-workload
   - POST /api/ai/generate-project-tags
   - 原因: 需要实际调用 AI 服务

5. **Web3D AI 分析** (1 个)
   - POST /api/web3d/ai/step4-analyze
   - 原因: 需要调用 AI 视觉分析

**验证方式**: 这些排除的接口需要在专项功能测试中单独验证

---

## 测试进度跟踪

### 如何使用本文档

1. **测试前**: 打印本文档或在编辑器中查看
2. **测试中**: 每完成一个接口,勾选对应的复选框
3. **遇到问题**: 在 [`docs/api-bug-fixes.md`](docs/api-bug-fixes.md) 中记录
4. **测试后**: 统计通过率,生成测试报告

### 标记说明

- `[ ]` - 待测试
- `[x]` - 测试通过
- `[!]` - 测试通过但有问题 (在 bug-fixes.md 中记录)
- `[-]` - 跳过 (原因在备注列)

### 数据污染防护

✅ **已实现事务回滚机制**
- `api-smoke-runner.js` 已添加 `BEGIN` 和 `ROLLBACK`
- 验证脚本: `verify-transaction-rollback.js` ✅ 通过
- 测试数据不会残留,可安全重复运行

详见: [`docs/api-bug-fixes.md`](docs/api-bug-fixes.md#1-api-smoke-runnerjs-数据污染问题)

## 测试环境准备

### 1. 环境配置

```bash
# 在 server/.env 或测试脚本中设置
DB_TYPE=postgres
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres
PGSSLMODE=require
NODE_ENV=test
```

### 2. 前置检查

- [ ] PostgreSQL 数据库已创建并运行
- [ ] 迁移脚本已执行完成
  ```bash
  node server/scripts/migration/02-convert-to-postgresql.sql  # 生成 schema
  node server/scripts/migration/migrate-data.js              # 迁移数据
  node server/scripts/migration/verify-migration.js          # 验证数据完整性
  ```
- [ ] 后端服务能正常启动并连接 PostgreSQL

## 测试策略

### 阶段一: 数据库适配层测试 (单元测试)

**目标**: 验证 `utils/db.js` 在 PostgreSQL 模式下的行为

**测试文件**: `tests/dbAdapter.test.js` ✅ 已完成

**执行时间**: 2026-06-24
**测试结果**: ✅ 8/8 通过 (100%)

**覆盖点**:
- ✅ SQL 占位符转换 (? → $1, $2, ...)
- ✅ SQLite 语法转换 (AUTOINCREMENT → SERIAL, datetime → CURRENT_TIMESTAMP)
- ✅ PRAGMA 查询转换
- ✅ 事务支持 (BEGIN/COMMIT/ROLLBACK)
- ✅ 结果归一化 (rows/rowCount)

**执行命令**:
```bash
cd server && npm test -- dbAdapter.test.js
```

**详细结果**: 见 `docs/api-bug-fixes.md`

---

### 阶段二: 核心 API 接口 Smoke Test (集成测试)

**目标**: 验证所有 140+ 个接口在 PostgreSQL 下不报错

**测试文件**: `tests/api-smoke-runner.js` ⚠️ 部分完成

**执行时间**: 2026-06-24
**测试结果**: ⚠️ 16/55 通过 (29.09%)，测试**尚未完成**

**失败的接口**:
- AI Model 接口: 12 个失败
- Prompt Template 接口: 7 个失败
- Project 接口: 16 个失败
- Dashboard 接口: 6 个失败

**根本原因**:
1. AI Model 创建时 api_host 验证过严（400 错误）
2. PostgreSQL 事务一旦中断产生连锁失败效应

**阻塞问题**: 需要先解决 AI Model 创建失败问题

**执行命令**:
```bash
cd server && node tests/api-smoke-runner.js
```

**成功标准**:
- 所有接口返回 2xx/3xx 状态码
- 无 5xx 服务器错误
- 无数据库查询错误 (SQLSTATE 错误)
- 测试数据自动回滚,不污染数据库 ✅

**进度跟踪**: 测试运行时会输出实时统计

**详细结果**: 见 [`docs/api-bug-fixes.md`](docs/api-bug-fixes.md)

---

### 阶段三: 专项功能测试 (单元/集成测试)

### 阶段三: 专项功能测试 (单元/集成测试)

**目标**: 验证关键业务逻辑在 PostgreSQL 下的正确性

#### 3.1 报价计算引擎

**测试文件**: `tests/calculationAPI.test.js`, `tests/calculationService.test.js`

**覆盖点**:
- [ ] 角色成本计算 (万元转换)
- [ ] 软件研发成本 (交付系数 × 范围系数 × 技术系数)
- [ ] 系统对接成本
- [ ] 差旅成本
- [ ] 运维成本
- [ ] 风险成本 (动态评分因子)
- [ ] 最终报价四舍五入

**执行命令**:
```bash
cd server && npm test -- calculationAPI.test.js
cd server && npm test -- calculationService.test.js
```

#### 3.2 AI 服务集成

**测试文件**: `tests/aiModelAPI.test.js`, `tests/aiModelService.test.js`, `tests/aiProjectTaggingAPI.test.js`

**覆盖点**:
- [ ] AI 模型 CRUD
- [ ] AI 评估流程调用
- [ ] AI 日志记录
- [ ] 提示词模板管理

**执行命令**:
```bash
cd server && npm test -- aiModelAPI.test.js
cd server && npm test -- aiModelService.test.js
cd server && npm test -- aiProjectTaggingAPI.test.js
```

#### 3.3 数据导出服务

**测试文件**: `tests/attachmentService.test.js`

**覆盖点**:
- [ ] PDF 导出 (pdfkit)
- [ ] Excel 导出 (exceljs)
- [ ] 导出日志记录

**执行命令**:
```bash
cd server && npm test -- attachmentService.test.js
```

#### 3.4 数据看板聚合查询

**测试文件**: `tests/dashboardAPI.test.js`

**覆盖点**:
- [ ] 多表 JOIN 查询
- [ ] 聚合函数 (COUNT, SUM, AVG, GROUP BY)
- [ ] 时间范围过滤
- [ ] 排序和分页

**执行命令**:
```bash
cd server && npm test -- dashboardAPI.test.js
```

#### 3.5 招标网站爬虫数据 (opportunity)

**测试文件**: `tests/biddingSitesAPI.test.js`, `tests/tenderStagingService.test.js`

**覆盖点**:
- [ ] 招标网站 CRUD
- [ ] 爬虫任务调度
- [ ] 去重逻辑
- [ ] 数据清洗和解析

**执行命令**:
```bash
cd server && npm test -- biddingSitesAPI.test.js
cd server && npm test -- tenderStagingService.test.js
```

---

### 阶段四: 数据完整性验证

**目标**: 验证 PostgreSQL 中的数据与 SQLite 一致

**验证脚本**: `server/scripts/migration/verify-migration.js` ✅ 已存在

**执行命令**:
```bash
DB_TYPE=postgres \
DATABASE_URL="postgresql://..." \
PGSSLMODE=require \
SQLITE_DB_PATH="server/ppa.db" \
node server/scripts/migration/verify-migration.js
```

**验证内容**:
- [ ] 每张表的行数一致
- [ ] 主键连续性
- [ ] 关键字段非空

---

### 阶段五: 性能基准测试

**目标**: 对比 PostgreSQL 与 SQLite 的查询性能

**测试方法**:
```bash
# 1. SQLite 基准
DB_TYPE=sqlite node tests/api-smoke-runner.js > sqlite-benchmark.json

# 2. PostgreSQL 基准
DB_TYPE=postgres node tests/api-smoke-runner.js > postgres-benchmark.json

# 3. 对比分析
# 关注:
# - 慢查询 (duration > 1000ms)
# - 数据看板聚合查询性能
# - 大数据量导出性能
```

**通过标准**:
- PostgreSQL 性能不低于 SQLite 的 80%
- 无超时 (默认 30s)

---

## 测试执行计划

### 完整测试流程

```bash
cd server

# 1. 单元测试 (数据库适配层)
npm test -- dbAdapter.test.js
npm test -- migrationScripts.test.js

# 2. 专项功能测试
npm test -- calculationAPI.test.js
npm test -- calculationService.test.js
npm test -- aiModelAPI.test.js
npm test -- aiModelService.test.js
npm test -- dashboardAPI.test.js
npm test -- attachmentService.test.js
npm test -- biddingSitesAPI.test.js
npm test -- contractsAPI.test.js
npm test -- formDesign.js
npm test -- wikiAPI.test.js
npm test -- dataMetrics.js

# 3. API Smoke Test (完整接口测试)
DB_TYPE=postgres node tests/api-smoke-runner.js

# 4. 数据完整性验证
DATABASE_URL="postgresql://..." PGSSLMODE=require \
SQLITE_DB_PATH="server/ppa.db" \
node scripts/migration/verify-migration.js
```

### 快速测试流程 (开发阶段)

```bash
cd server

# 仅运行核心接口测试
DB_TYPE=postgres node tests/api-smoke-runner.js
```

---

## 常见 PostgreSQL 迁移问题检查清单

### SQL 语法兼容性

- [x] `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
- [x] `BEGIN IMMEDIATE` → `BEGIN`
- [x] `INSERT OR IGNORE INTO` → `INSERT INTO ... ON CONFLICT DO NOTHING`
- [x] `STRFTIME('%Y-%m', column)` → `TO_CHAR(column, 'YYYY-MM')`
- [x] `datetime('now')` → `CURRENT_TIMESTAMP`
- [x] `?` 占位符 → `$1, $2, ...`
- [x] `DATETIME` 类型 → `TIMESTAMP`
- [ ] **待验证**: JSON 字段查询 (`json_extract` → `->>`)
- [ ] **待验证**: 布尔字段默认值 (0/1 → true/false)

### 事务处理

- [x] BEGIN/COMMIT/ROLLBACK 使用专用 client
- [x] 事务内查询复用同一 client
- [ ] **待验证**: 长事务性能影响

### 数据类型映射

- [x] `INTEGER` (布尔) → `INTEGER` (保留 0/1)
- [x] `REAL` (风险分数) → `REAL`
- [ ] **待验证**: `TEXT` → `VARCHAR`/`TEXT` 是否需要长度限制
- [ ] **待验证**: `DATETIME` → `TIMESTAMP` 时区处理

### 索引和性能

- [ ] **待验证**: 所有索引已迁移
- [ ] **待验证**: 外键约束已启用
  ```sql
  ALTER TABLE projects ADD CONSTRAINT fk_xxx FOREIGN KEY (...)
  ```

---

## 失败处理和回滚

### 测试失败时

1. **数据库查询报错 (SQLSTATE)**
   - 检查错误日志定位具体 SQL
   - 对比 SQLite 和 PostgreSQL 的 SQL 差异
   - 修复 `utils/db.js` 的 SQL 转换逻辑

2. **接口返回 5xx**
   - 检查后端日志
   - 检查数据库连接
   - 检查事务是否正常提交

3. **数据不一致**
   - 重新运行 `verify-migration.js`
   - 检查是否有遗漏的迁移脚本
   - 对比表结构和数据

### 回滚方案

如果 PostgreSQL 测试失败严重,可临时回滚到 SQLite:

```bash
# 在 server/.env 中设置
DB_TYPE=sqlite

# 重启服务
npm start
```

---

## 测试报告模板

```markdown
# PostgreSQL 迁移回归测试报告

**测试日期**: YYYY-MM-DD
**测试环境**: 开发 /  staging / 生产
**数据库**: PostgreSQL 15.x (Supabase)
**执行人**: [姓名]

## 测试结果总览

| 阶段 | 状态 | 通过率 | 备注 |
|------|------|--------|------|
| 数据库适配层测试 | ✅/❌ | 100% | |
| API Smoke Test | ✅/❌ | XX% | |
| 专项功能测试 | ✅/❌ | XX% | |
| 数据完整性验证 | ✅/❌ | XX% | |
| 性能基准测试 | ✅/❌ | XX% | |

## 失败用例

### 1. [接口名称]

**接口**: `POST /api/xxx`
**错误信息**: [具体错误]
**SQL 语句**: [如果可见]
**截图/日志**: [链接]
**根本原因**: [分析]
**修复建议**: [建议]

## 性能对比

| 接口 | SQLite (ms) | PostgreSQL (ms) | 差异 |
|------|-------------|-----------------|------|
| GET /api/projects | XX | XX | -XX% |
| ... | ... | ... | ... |

## 遗留问题

1. [问题描述] - [优先级] - [负责人]

## 结论

- [ ] 可以上线
- [ ] 需要修复关键问题后重新测试
- [ ] 需要回滚到 SQLite
```

---

## 持续集成建议

### GitHub Actions / CI 配置

```yaml
name: PostgreSQL Migration CI

on: [push, pull_request]

jobs:
  test-postgres:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: cd server && npm install

      - name: Run migrations
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/postgres
          DB_TYPE: postgres
        run: |
          node scripts/migration/02-convert-to-postgresql.sql
          node scripts/migration/migrate-data.js
          node scripts/migration/verify-migration.js

      - name: Run unit tests
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/postgres
          DB_TYPE: postgres
        run: npm test

      - name: Run smoke tests
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/postgres
          DB_TYPE: postgres
        run: node tests/api-smoke-runner.js
```

---

## 附录: 关键测试命令速查

```bash
# 环境变量设置
export DB_TYPE=postgres
export DATABASE_URL="postgresql://..."
export PGSSLMODE=require
export NODE_ENV=test

# 运行单个测试文件
cd server && npm test -- <test-file>.test.js

# 运行 API Smoke Test
node tests/api-smoke-runner.js

# 数据完整性验证
node scripts/migration/verify-migration.js

# 启动服务测试
DB_TYPE=postgres node index.js
# 然后手动测试前端接口
```

---

## 下一步行动

1. **立即执行**: 阶段一 + 阶段二 (单元测试 + Smoke Test)
2. **根据结果**: 修复发现的 PostgreSQL 兼容性问题
3. **再次验证**: 阶段三 + 阶段四 (专项测试 + 数据完整性)
4. **性能优化**: 阶段五 (性能基准测试)
5. **上线准备**: 编写测试报告并更新 CLAUDE.md
