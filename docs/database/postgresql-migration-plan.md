# PPA Supabase 迁移方案

**版本**: V1.0
**作者**: bruce
**日期**: 2026-06-23
**状态**: Draft

---

## 目录

1. [迁移背景与目标](#1-迁移背景与目标)
2. [数据库现状分析](#2-数据库现状分析)
3. [云数据库选型](#3-云数据库选型)
4. [迁移策略](#4-迁移策略)
5. [详细迁移步骤](#5-详细迁移步骤)
6. [代码改造方案](#6-代码改造方案)
7. [验证清单](#7-验证清单)
8. [回滚方案](#8-回滚方案)
9. [时间表与工作量](#9-时间表与工作量)
10. [成本分析](#10-成本分析)
11. [风险评估](#11-风险评估)

---

## 1. 迁移背景与目标

### 1.1 迁移驱动力

#### 安全问题（高优先级）
- **当前问题**: `ppa.db` (73 MB) 被提交到 Git 历史中
- **风险等级**: 🔴 高
- **影响**: 数据库文件在代码库中，存在数据泄露风险
- **必须解决**: 将数据库移出代码库

#### 未来扩展（中优先级）
- **当前问题**: 需要为 Agent 提供在线调用接口
- **限制**: SQLite 是本地文件，不支持在线访问
- **目标**: 支持在线服务部署和外部调用

### 1.2 迁移目标

| 目标 | 优先级 | 说明 |
|------|--------|------|
| **消除安全风险** | 🔴 P0 | db 文件移出代码库，不再提交到 Git |
| **支持在线服务** | 🟡 P1 | 数据库支持远程访问，Agent 可调用 |
| **保留数据完整性** | 🔴 P0 | 100% 数据迁移，零数据丢失 |
| **最小化停机时间** | 🟡 P1 | 迁移过程影响用户时间 < 5 分钟 |
| **提供回滚能力** | 🟢 P2 | 出现问题时立即回滚到 SQLite |

### 1.3 迁移范围

#### 包含
- ✅ 26 张表的所有数据
- ✅ 表结构（Schema）
- ✅ 索引（Indexes）
- ✅ 外键约束（Foreign Keys）
- ✅ 配置数据（configs, roles, risk_items 等）

#### 不包含
- ❌ AI 评估日志（可重新生成）
- ❌ Staging 临时数据（已处理的历史数据）

---

## 2. 数据库现状分析

### 2.1 核心数据

| 指标 | 数值 |
|------|------|
| **数据库文件大小** | **73.09 MB** |
| **总页数** | 18,711 页（每页 4 KB） |
| **表数量** | **26 张表** |
| **总数据行数** | **约 2,800 行** |

### 2.2 数据量分布

| 表名 | 行数 | 估算大小 | 重要程度 | 处理建议 |
|------|------|---------|---------|---------|
| **ai_assessment_logs** | 769 | ~30 MB | 🟢 低 | 迁移前清理（>3个月） |
| **opportunity_tender_staging** | 929 | ~20 MB | 🟡 中 | 迁移前清理（已处理） |
| **projects** | 53 | ~10 MB | 🔴 高 | **必须迁移** |
| **form_field** | 525 | ~5 MB | 🔴 高 | **必须迁移** |
| **data_metrics** | 28 | ~3 MB | 🔴 高 | **必须迁移** |
| **opportunity_bidding_sites** | 310 | ~2 MB | 🔴 高 | **必须迁移** |
| **其他配置表** | ~240 | < 1 MB | 🔴 高 | **必须迁移** |

**总计**: 核心数据约 **40 MB**，可清理数据 **50 MB**

### 2.3 迁移前优化建议

#### 优化 1: 清理 AI 评估日志（预计节省 20 MB）

```sql
-- 查看日志时间范围
SELECT 
    MIN(created_at) as earliest,
    MAX(created_at) as latest,
    COUNT(*) as total_logs
FROM ai_assessment_logs;

-- 查看哪些日志可以删除
SELECT 
    DATE(created_at) as log_date,
    COUNT(*) as logs
FROM ai_assessment_logs
GROUP BY DATE(created_at)
ORDER BY log_date ASC;

-- 删除 3 个月前的日志（谨慎操作！）
-- DELETE FROM ai_assessment_logs
-- WHERE created_at < datetime('now', '-3 months');
```

**决策点**: 是否删除 AI 日志？
- [ ] **是**：日志可重新生成，节省 20 MB
- [ ] **否**：保留完整历史，迁移 73 MB

#### 优化 2: 清理 Staging 表（预计节省 10 MB）

```sql
-- 查看已处理的项目
SELECT 
    status,
    COUNT(*) as count,
    MIN(updated_at) as earliest,
    MAX(updated_at) as latest
FROM opportunity_tender_staging
GROUP BY status;

-- 删除已处理的历史数据（谨慎操作！）
-- DELETE FROM opportunity_tender_staging
-- WHERE status = 'processed'
-- AND updated_at < datetime('now', '-1 month');
```

**决策点**: 是否删除 Staging 数据？
- [ ] **是**：已处理的数据可删除，节省 10 MB
- [ ] **否**：保留完整历史，迁移 73 MB

#### 优化 3: 执行 VACUUM 回收空间

```sql
-- 查看当前数据库大小
PRAGMA page_count;
PRAGMA page_size;

-- 执行 VACUUM（需要独占锁，迁移前执行）
VACUUM;

-- 查看优化后大小
PRAGMA page_count;
```

**预期收益**: 回收空闲页，预计节省 10-20 MB

---

## 3. 云数据库选型

### 3.1 选型对比

| 服务 | 免费层限制 | 推荐指数 | 选中 |
|------|-----------|---------|------|
| **Supabase** | 2 个项目，每个 500 MB | ⭐⭐⭐⭐⭐ | ✅ **首选** |
| Supabase | 3 个项目，每个 10 GB | ⭐⭐⭐⭐⭐ | ❌ 不需要 Serverless |
| Render | 1 个数据库，256 MB | ⭐⭐⭐ | ❌ 空间不足 |
| Railway | $5/月额度（永久） | ⭐⭐⭐⭐ | ❌ 需要信用卡 |
| AWS RDS | 12 个月免费（20 GB） | ⭐⭐⭐ | ❌ 12 个月后收费 |

### 3.2 推荐方案: Supabase

#### 选型理由

| 评估维度 | 当前需求 | Supabase 能力 | 匹配度 |
|---------|---------|--------------|--------|
| **数据量** | 73 MB（优化后约 40 MB） | 500 MB | ✅ 12 倍余量 |
| **未来 1 年** | 预计 200-500 MB | 500 MB | ✅ 刚好够用 |
| **未来 2 年** | 预计 500 MB - 2 GB | 需升级到 Pro ($12/月) | 🟡 需要时升级 |
| **成本** | 年运维 ≤ 2000 元 | 免费层 500 MB 内 $0 | ✅ 完全免费 |
| **内置功能** | 用户账户、认证 | **Auth + Storage + Realtime** | ✅ **开箱即用** |
| **自动备份** | 数据安全 | 每日自动备份 | ✅ 开箱即用 |
| **迁移难度** | 标准 PostgreSQL | 兼容性好 | ✅ 低风险 |
| **V2 需求匹配** | 用户体系、报告、通知 | Auth + Storage + Edge Functions | ✅ **完美匹配** |

#### Supabase 技术细节

- **版本**: PostgreSQL 15+
- **存储**: 500 MB（免费层，2 个项目）
- **连接**: 标准 PostgreSQL 连接（无需 Serverless）
- **休眠**: 无休眠机制
- **SSL**: 强制要求（`sslmode=require`）
- **额外功能**:
  - ✅ **Auth**: 内置用户认证系统（邮箱、OAuth、Magic Link）
  - ✅ **Storage**: 对象存储（适合附件、报告）
  - ✅ **Realtime**: 实时订阅（适合通知、排行榜）
  - ✅ **Edge Functions**: 边缘计算（适合 Agent 接口）

#### 成本分析（未来 2 年）

| 时间 | 预估数据量 | Supabase 成本 |
|------|-----------|--------------|
| **当前** | 40 MB | **$0/月** |
| **6 个月后** | 200 MB | **$0/月** |
| **12 个月后** | 500 MB | **$0/月** |
| **24 个月后** | 2 GB | **$12/月** (Pro 计划) |

**结论**: **至少 12 个月内完全免费**，24 个月后升级到 Pro ($12/月)，符合年运维 ≤ 2000 元的约束。

### 3.3 数据空间管理策略

#### 当前数据量分析

| 数据类别 | 当前大小 | 年增长估算 | 管理策略 |
|---------|---------|-----------|---------|
| **核心业务数据**（projects, configs, metrics） | ~10 MB | +5 MB/年 | 永久保留 |
| **表单与指标设计**（form_field, data_metrics） | ~8 MB | +3 MB/年 | 永久保留 |
| **招标项目池**（opportunity_tender_staging） | ~20 MB | +10 MB/年 | **定期清理（>6个月）** |
| **AI 评估日志**（ai_assessment_logs） | **~30 MB** | +15 MB/年 | **每月清理（>1个月）** |
| **其他业务表** | ~2 MB | +1 MB/年 | 永久保留 |

**总计优化后**: **40 MB**（可压缩到 **30 MB**）

#### 清理策略

##### 策略 1: AI 日志自动清理（节省最大）

```sql
-- 每月 1 号清理 >1 个月的 AI 日志
DELETE FROM ai_assessment_logs
WHERE created_at < datetime('now', '-1 month');

-- VACUUM 回收空间
VACUUM;
```

**预期收益**: 每月节省 **2-3 MB**，年节省 **30 MB**

##### 策略 2: Staging 表定期清理

```sql
-- 每季度清理 >6 个月的已处理招标项目
DELETE FROM opportunity_tender_staging
WHERE status = 'processed'
AND updated_at < datetime('now', '-6 months');

-- 删除未处理的过期项目（>1年）
DELETE FROM opportunity_tender_staging
WHERE status = 'pending'
AND created_at < datetime('now', '-12 months');
```

**预期收益**: 每季度节省 **5 MB**

##### 策略 3: 监控与告警

```javascript
// server/services/monitoring.js
setInterval(async () => {
  // 每周检查一次数据库大小
  const result = await db.query(`
    SELECT pg_size_pretty(pg_database_size(current_database())) as size
  `);

  console.log('数据库大小:', result[0].size);

  // 超过 400 MB 时告警
  if (parseInt(result[0].size) > 400) {
    console.warn('数据库空间告警：已超过 400 MB，建议清理');
  }
}, 7 * 24 * 60 * 60 * 1000); // 每周一次
```

**预期收益**: 及时发现问题，避免突然爆满

#### 清理执行计划

| 频率 | 任务 | 执行方式 |
|------|------|---------|
| **每月 1 号** | 清理 AI 日志（>1个月） | cron 定时任务 |
| **每季度 1 号** | 清理 Staging（>6个月） | cron 定时任务 |
| **每周日** | 检查数据库大小 | 监控脚本 |
| **每年 12 月** | 评估是否需要升级 Pro | 人工决策 |

### 3.3 Supabase 优势与劣势

#### 优势

| 特性 | Supabase 优势 |
|------|-------------|
| **V2 需求匹配度** | Auth + Storage + Realtime 完全匹配 V2 用户体系、报告生成、通知需求 |
| **无休眠延迟** | 标准 PostgreSQL 连接，无 500ms 恢复延迟 |
| **内置用户认证** | 无需自己实现登录、注册、OAuth，节省 5-10 天工作量 |
| **对象存储** | 适合存储项目附件、报告 PDF、Excel 导出文件 |
| **实时推送** | 适合排行榜更新、评估结果推送、Agent 通知 |
| **边缘函数** | 适合 Agent 接口、Webhook、定时任务 |
| **成本可控** | Pro 计划 $12/月，比 Supabase 升级更便宜 |

#### 劣势与缓解方案

| 劣势 | 缓解方案 |
|------|---------|
| **500 MB 空间较小** | 12 个月内足够，超出后升级 Pro ($12/月) |
| **2 个项目限制** | PPA 只需 1 个项目，另一项目用于开发测试 |
| **需要绑定信用卡** | 使用虚拟信用卡或预付卡 |
| **国内访问速度** | Supabase 服务器在海外，可能需要加速（CDN/代理） |

---

## 4. 迁移策略

### 4.1 迁移原则

1. **数据完整性优先**: 零数据丢失
2. **最小化停机时间**: 迁移过程 < 5 分钟
3. **提供回滚方案**: 立即回滚到 SQLite
4. **渐进式验证**: 每步验证后再继续
5. **保留迁移记录**: 完整记录迁移过程和决策

### 4.2 迁移模式

#### 模式 1: 停机迁移（推荐）

```
当前状态 (SQLite) 
  → 停止服务 (1 分钟)
  → 迁移数据 (2 分钟)
  → 切换到 PostgreSQL (1 分钟)
  → 启动服务 (1 分钟)
  → 验证数据 (5 分钟)
```

**总停机时间**: **约 10 分钟**

**优势**:
- ✅ 简单直接，风险低
- ✅ 数据一致性有保障
- ✅ 无需双写逻辑

**劣势**:
- ❌ 需要停机（但 10 分钟可接受）

#### 模式 2: 双写迁移（复杂）

```
当前状态 (SQLite)
  → 开启双写（SQLite + PostgreSQL 同时写）
  → 验证双写一致性（1 天）
  → 切换到只读 PostgreSQL
  → 停止写 SQLite
  → 完全切换
```

**总时间**: **约 1-2 天**

**优势**:
- ✅ 无停机
- ✅ 可随时回滚

**劣势**:
- ❌ 代码改造复杂（需双写逻辑）
- ❌ 数据一致性验证复杂
- ❌ 工作量大 5-10 倍

**结论**: **采用模式 1（停机迁移）**

### 4.3 SQLite → PostgreSQL 语法转换

#### 4.3.1 数据类型映射

| SQLite | PostgreSQL | 示例 |
|--------|-----------|------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` | 自增主键 |
| `TEXT` | `TEXT` | ✅ 兼容 |
| `INTEGER` | `INTEGER` | ✅ 兼容 |
| `REAL` | `REAL` | ✅ 兼容 |
| `BLOB` | `BYTEA` | 二进制数据 |
| `DATETIME DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMP DEFAULT NOW()` | 时间戳 |
| `BOOLEAN` | `BOOLEAN` | ✅ 兼容 |

#### 4.3.2 SQL 语法差异

| SQLite | PostgreSQL | 转换规则 |
|--------|-----------|---------|
| `?` 占位符 | `$1, $2, $3` | `WHERE id = ?` → `WHERE id = $1` |
| `AUTOINCREMENT` | `SERIAL` | 自动转换 |
| `CURRENT_TIMESTAMP` | `NOW()` | 自动转换 |
| `IF NOT EXISTS` | `IF NOT EXISTS` | ✅ 兼容 |
| `BEGIN IMMEDIATE` | `BEGIN` | 移除 IMMEDIATE |
| `PRAGMA foreign_keys = ON` | `SET CONSTRAINTS ALL DEFERRED` | 移除 PRAGMA |
| `ON DELETE CASCADE` | `ON DELETE CASCADE` | ✅ 兼容 |

#### 4.3.3 自动转换工具

**推荐工具**: `sqlite3-to-postgresql`

```bash
# 安装
npm install -g sqlite3-to-postgresql

# 生成转换脚本
sqlite3-to-postgresql \
  --input /path/to/ppa.db \
  --output /tmp/ppa_schema_postgres.sql \
  --create-indexes \
  --add-foreign-keys

# 检查转换结果
cat /tmp/ppa_schema_postgres.sql
```

---

## 5. 详细迁移步骤

### 阶段 0: 迁移前准备（30 分钟）

#### 步骤 0.1: 备份数据库（必须！）

```bash
# 创建备份目录
mkdir -p server/backups

# 备份数据库文件
BACKUP_FILE="server/backups/ppa.db.pre-pg-migration-$(date +%Y%m%d-%H%M%S)"
cp server/ppa.db "$BACKUP_FILE"

# 验证备份
ls -lh "$BACKUP_FILE"
sqlite3 "$BACKUP_FILE" "SELECT COUNT(*) FROM projects;"

# 导出 Schema（用于回滚参考）
sqlite3 server/ppa.db ".schema" > server/backups/ppa_schema_backup-$(date +%Y%m%d).sql
```

**检查清单**:
- [ ] 备份文件已创建
- [ ] 备份文件大小与原文件一致
- [ ] Schema 已导出

#### 步骤 0.2: 创建迁移目录结构

```bash
mkdir -p scripts/migration
cd scripts/migration

# 创建迁移脚本
touch 01-export-sqlite-schema.sql
touch 02-convert-to-postgresql.sql
touch 03-migrate-data.js
touch 04-verify-migration.js
touch 05-rollback-script.sh

chmod +x *.sh *.js
```

#### 步骤 0.3: 注册 Supabase 账号

```bash
# 1. 访问 https://supabase.com
# 2. 注册账号（推荐 GitHub 登录）
# 3. 验证邮箱
# 4. 绑定信用卡（不会扣费）
# 5. 创建第一个项目（名称: ppa-production）
```

**Supabase 连接字符串**:

```bash
# Supabase 控制台 → 项目 → Settings → Database → Connection string (URI mode)
# 复制连接字符串，格式如下：
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres?sslmode=require"
```

**配置环境变量**:

```bash
# 添加到 server/.env
cat >> server/.env << 'EOF'

# Supabase 配置
DB_TYPE=postgres
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres?sslmode=require

# Supabase 可选配置（用于 Auth + Storage）
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 保持 SQLite 配置（用于回滚）
# DB_PATH=./data/ppa.db
EOF
```

**Supabase 额外配置（可选，用于 V2 功能）**:

```bash
# Supabase Auth - 用户认证
# 在 Supabase 控制台 → Authentication → Providers 启用
# - Email（默认启用）
# - GitHub OAuth
# - Magic Link

# Supabase Storage - 对象存储
# 在 Supabase 控制台 → Storage 创建 bucket
# - bucket: project-attachments（项目附件）
# - bucket: reports（评估报告）

# Supabase Realtime - 实时推送
# 在 Supabase 控制台 → Realtime 启用
# 用于排行榜、评估结果推送、Agent 通知
```

---

### 阶段 1: Schema 迁移（30 分钟）

#### 步骤 1.1: 导出 SQLite Schema

```bash
# 导出 Schema（不含数据）
sqlite3 server/ppa.db ".schema" > scripts/migration/01-export-sqlite-schema.sql

# 检查导出结果
wc -l scripts/migration/01-export-sqlite-schema.sql
head -50 scripts/migration/01-export-sqlite-schema.sql
```

#### 步骤 1.2: 转换为 PostgreSQL Schema

**方法 A: 使用自动转换工具（推荐）**

```bash
# 安装转换工具
npm install -g sqlite3-to-postgresql

# 生成转换后的 Schema
sqlite3-to-postgresql \
  --input server/ppa.db \
  --output scripts/migration/02-convert-to-postgresql.sql \
  --create-indexes \
  --add-foreign-keys \
  --verbose

# 检查转换结果
cat scripts/migration/02-convert-to-postgresql.sql
```

**方法 B: 手动转换（如果工具失败）**

```sql
-- 示例：转换 projects 表

-- SQLite (原)
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PostgreSQL (转换后)
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**手动转换检查清单**:
- [ ] 所有 `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
- [ ] 所有 `DATETIME` → `TIMESTAMP`
- [ ] 所有 `CURRENT_TIMESTAMP` → `NOW()`
- [ ] 移除所有 `PRAGMA` 语句
- [ ] 移除所有 `BEGIN IMMEDIATE`（保留 `BEGIN`）
- [ ] 检查外键约束（`ON DELETE CASCADE`）

#### 步骤 1.3: 在 PostgreSQL 中创建 Schema

```bash
# 连接到 PostgreSQL 并执行 Schema
psql "$DATABASE_URL" -f scripts/migration/02-convert-to-postgresql.sql

# 检查执行结果
psql "$DATABASE_URL" -c "\dt"
psql "$DATABASE_URL" -c "\d projects"
```

**验证检查清单**:
- [ ] 所有 26 张表已创建
- [ ] 表结构与 SQLite 一致
- [ ] 外键约束已创建
- [ ] 索引已创建

---

### 阶段 2: 数据迁移（10-30 分钟）

#### 步骤 2.1: 创建数据迁移脚本

```javascript
// scripts/migration/03-migrate-data.js
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const path = require('path');

const SQLITE_DB = path.resolve(__dirname, '../../server/ppa.db');
const PG_CONNECTION = process.env.DATABASE_URL;

// 按依赖顺序排列表（避免外键错误）
const TABLES_IN_ORDER = [
  // 配置表（无外键）
  'config_roles',
  'config_risk_items',
  'config_travel_costs',
  'config_business_pricing',
  'prompt_module_tags',

  // 主数据表
  'ai_model_configs',
  'ai_prompts',
  'opportunity_bidding_sites',
  'users',

  // 业务表
  'projects',
  'opportunity_tender_staging',
  'form_app',
  'form_definition',
  'form_field',
  'form_project',

  // 关联表
  'data_metric_categories',
  'data_metrics',
  'data_metrics_project',

  // 其他业务表
  'ai_assessment_logs',
  'web3d_risk_items',
  'web3d_workload_templates',
  'tender_staging_web_search_results',
  'project_push_records',
  'wiki_project_relations',
  'prompt_templates'
];

async function migrate() {
  console.log('=== PPA 数据库迁移脚本 ===\n');

  // 连接 SQLite
  const sqliteDb = new sqlite3.Database(SQLITE_DB);
  console.log('✅ 已连接 SQLite');

  // 连接 PostgreSQL
  const pgClient = new Client({ connectionString: PG_CONNECTION });
  await pgClient.connect();
  console.log('✅ 已连接 PostgreSQL\n');

  // 逐表迁移
  for (const table of TABLES_IN_ORDER) {
    console.log(`迁移表: ${table}`);

    try {
      // 从 SQLite 读取数据
      const rows = await new Promise((resolve, reject) => {
        sqliteDb.all(`SELECT * FROM ${table}`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      if (rows.length === 0) {
        console.log(`  ⚠️  表 ${table} 为空，跳过\n`);
        continue;
      }

      console.log(`  读取到 ${rows.length} 行数据`);

      // 获取列名
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const columnNames = columns.join(', ');

      // 插入 PostgreSQL
      for (const row of rows) {
        const values = columns.map(col => row[col]);
        await pgClient.query(
          `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`,
          values
        );
      }

      console.log(`  ✅ 成功迁移 ${rows.length} 行\n`);

    } catch (err) {
      console.error(`  ❌ 迁移失败: ${err.message}\n`);
      throw err;
    }
  }

  // 关闭连接
  sqliteDb.close();
  pgClient.end();

  console.log('=== 迁移完成 ===');
}

migrate().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});
```

**运行迁移脚本**:

```bash
# 执行迁移
DATABASE_URL="postgres://..." node scripts/migration/03-migrate-data.js

# 查看迁移进度
# 预期输出：
# ✅ 已连接 SQLite
# ✅ 已连接 PostgreSQL
# 迁移表: config_roles
#   读取到 10 行数据
#   ✅ 成功迁移 10 行
# ...
# === 迁移完成 ===
```

#### 步骤 2.2: 迁移验证

```javascript
// scripts/migration/04-verify-migration.js
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');

const TABLES = [
  'projects',
  'config_roles',
  'config_risk_items',
  'ai_model_configs',
  'opportunity_bidding_sites',
  // ... 其他表
];

async function verify() {
  console.log('=== 数据一致性验证 ===\n');

  const sqliteDb = new sqlite3.Database('./server/ppa.db');
  const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  await pgClient.connect();

  let allPassed = true;

  for (const table of TABLES) {
    // SQLite 行数
    const sqliteCount = await new Promise((resolve, reject) => {
      sqliteDb.get(`SELECT COUNT(*) as cnt FROM ${table}`, (err, row) => {
        if (err) reject(err);
        else resolve(row.cnt);
      });
    });

    // PostgreSQL 行数
    const pgResult = await pgClient.query(`SELECT COUNT(*) as cnt FROM ${table}`);
    const pgCount = parseInt(pgResult.rows[0].cnt);

    // 对比
    const passed = sqliteCount === pgCount;
    const status = passed ? '✅' : '❌';

    console.log(`${status} ${table.padEnd(35)} SQLite: ${sqliteCount.toString().padStart(5)}  PostgreSQL: ${pgCount.toString().padStart(5)}`);

    if (!passed) allPassed = false;
  }

  sqliteDb.close();
  pgClient.end();

  console.log(allPassed ? '\n✅ 所有表数据一致' : '\n❌ 发现数据不一致');
  process.exit(allPassed ? 0 : 1);
}

verify();
```

**运行验证**:

```bash
# 验证数据一致性
DATABASE_URL="postgres://..." node scripts/migration/04-verify-migration.js

# 预期输出：
# ✅ 所有表数据一致
```

---

### 阶段 3: 代码改造（2-3 天）

#### 步骤 3.1: 安装 PostgreSQL 驱动

```bash
cd server
npm install pg
npm install --save-dev @types/pg
```

#### 步骤 3.2: 创建数据库抽象层（可选但推荐）

```javascript
// server/utils/dbAdapter.js
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');

class DatabaseAdapter {
  async query(sql, params) {
    throw new Error('Not implemented');
  }

  async get(sql, params) {
    throw new Error('Not implemented');
  }

  async all(sql, params) {
    throw new Error('Not implemented');
  }

  async run(sql, params) {
    throw new Error('Not implemented');
  }

  async transaction(callback) {
    throw new Error('Not implemented');
  }

  async close() {
    throw new Error('Not implemented');
  }
}

class SQLiteAdapter extends DatabaseAdapter {
  constructor(dbPath) {
    super();
    this.db = new sqlite3.Database(dbPath);
    this.db.run('PRAGMA foreign_keys = ON');
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async transaction(callback) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN IMMEDIATE', err => {
          if (err) return reject(err);
          callback(this)
            .then(result => {
              this.db.run('COMMIT', err => {
                if (err) {
                  this.db.run('ROLLBACK');
                  reject(err);
                } else {
                  resolve(result);
                }
              });
            })
            .catch(err => {
              this.db.run('ROLLBACK');
              reject(err);
            });
        });
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      this.db.close(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

class PostgresAdapter extends DatabaseAdapter {
  constructor(connectionString) {
    super();
    this.client = new Client({ connectionString });
    this.client.connect();
  }

  async query(sql, params = []) {
    const result = await this.client.query(sql, params);
    return result.rows;
  }

  async get(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows[0] || null;
  }

  async run(sql, params = []) {
    const result = await this.client.query(sql, params);
    return { lastID: result.rows[0]?.id, changes: result.rowCount };
  }

  async transaction(callback) {
    await this.client.query('BEGIN');
    try {
      const result = await callback(this);
      await this.client.query('COMMIT');
      return result;
    } catch (err) {
      await this.client.query('ROLLBACK');
      throw err;
    }
  }

  async close() {
    await this.client.end();
  }
}

// 根据环境变量选择适配器
function createAdapter() {
  const dbType = process.env.DB_TYPE || 'sqlite';

  if (dbType === 'postgres') {
    console.log('使用 PostgreSQL 适配器');
    return new PostgresAdapter(process.env.DATABASE_URL);
  } else {
    console.log('使用 SQLite 适配器');
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/ppa.db');
    return new SQLiteAdapter(dbPath);
  }
}

module.exports = {
  DatabaseAdapter,
  SQLiteAdapter,
  PostgresAdapter,
  createAdapter
};
```

#### 步骤 3.3: 更新数据库配置

```javascript
// server/config/database.js
const { createAdapter } = require('../utils/dbAdapter');

let db = null;

function getDatabase() {
  if (db) {
    return db;
  }

  db = createAdapter();
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDatabase,
  closeDatabase
};
```

#### 步骤 3.4: 适配 Model 层

**转换规则**:

```javascript
// ❌ SQLite (原)
const rows = await db.all('SELECT * FROM projects WHERE id = ?', [id]);

// ✅ PostgreSQL (新)
const rows = await db.all('SELECT * FROM projects WHERE id = $1', [id]);
```

**批量转换工具**:

```bash
# 使用 sed 批量替换 ? 占位符
find server/models -name "*.js" -exec sed -i '' 's/(\(.*\), \[/\($1, \[/g' {} \;

# 检查替换结果
grep -n '\$[0-9]' server/models/*.js
```

**Model 转换检查清单**:
- [ ] `server/models/projectModel.js`
- [ ] `server/models/configModel.js`
- [ ] `server/models/wikiModel.js`
- [ ] `server/models/dataMetricsModel.js`
- [ ] `server/models/formDesignModel.js`
- [ ] `server/models/*Model.js`（全部 17 个）

---

### 阶段 4: 测试与验证（1 天）

#### 步骤 4.1: 单元测试

```bash
# 配置测试环境为 PostgreSQL
DB_TYPE=postgres DATABASE_URL="postgres://..." npm test

# 确保所有测试通过
# 预期: 所有测试 ✅
```

#### 步骤 4.2: 集成测试

```bash
# 启动服务（使用 PostgreSQL）
DB_TYPE=postgres DATABASE_URL="postgres://..." node server/index.js

# 手动测试核心流程
# 1. 创建项目 ✅
# 2. 评估计算 ✅
# 3. 导出 Excel ✅
# 4. Wiki 关联 ✅
# 5. 表单设计 ✅
```

#### 步骤 4.3: 数据完整性验证

```bash
# 运行验证脚本
DATABASE_URL="postgres://..." node scripts/migration/04-verify-migration.js

# 预期输出：
# ✅ 所有表数据一致
```

---

### 阶段 5: 上线与回滚（30 分钟）

#### 步骤 5.1: 灰度切换

```bash
# 1. 停止服务（如果正在运行）
# Ctrl + C

# 2. 更新环境变量
export DB_TYPE=postgres
export DATABASE_URL="postgres://..."

# 3. 启动服务
node server/index.js

# 4. 验证服务正常
curl http://localhost:3001/api/health
```

#### 步骤 5.2: 观察期

```bash
# 观察 1 小时，确保无错误
tail -f server/logs/app.log

# 检查数据库连接
curl http://localhost:3001/api/health | jq '.database'
```

#### 步骤 5.3: 完全切换

```bash
# 更新 .env 文件（永久生效）
sed -i '' 's/DB_TYPE=sqlite/DB_TYPE=postgres/' server/.env

# 更新 CLAUDE.md 文档
sed -i '' 's/数据库: SQLite3/数据库: PostgreSQL (Supabase)/' CLAUDE.md
```

---

## 6. 代码改造方案

### 6.1 文件改造清单

| 文件 | 改造类型 | 工作量 | 优先级 |
|------|---------|--------|--------|
| `server/package.json` | 新增依赖 `pg` | 5 分钟 | 🔴 P0 |
| `server/utils/dbAdapter.js` | **新文件**（抽象层） | 2 小时 | 🟡 P1 |
| `server/config/database.js` | 改造适配器调用 | 30 分钟 | 🔴 P0 |
| `server/models/projectModel.js` | SQL 占位符转换 | 1 小时 | 🔴 P0 |
| `server/models/configModel.js` | SQL 占位符转换 | 30 分钟 | 🔴 P0 |
| `server/models/wikiModel.js` | SQL 占位符转换 | 30 分钟 | 🔴 P0 |
| `server/models/dataMetricsModel.js` | SQL 占位符转换 | 30 分钟 | 🔴 P0 |
| `server/models/*Model.js` | SQL 占位符转换 | 3 小时 | 🔴 P0 |
| `server/.env` | 新增 PostgreSQL 配置 | 10 分钟 | 🔴 P0 |
| `server/init-db.js` | 适配 PostgreSQL | 1 小时 | 🔴 P0 |

**总计**: **约 9-10 小时工作量**

### 6.2 SQL 占位符转换规则

```javascript
// ❌ SQLite
db.all('SELECT * FROM projects WHERE id = ? AND status = ?', [id, status]);

// ✅ PostgreSQL
db.all('SELECT * FROM projects WHERE id = $1 AND status = $2', [id, status]);

// 转换规则
// ? → $1
// ? ? → $1 $2
// ... ? → $1 ... $n
```

**自动转换脚本**:

```bash
# 使用正则表达式批量替换
find server/models -name "*.js" -exec sed -i '' -E \
  's/\(\?/\($1/g; s/\,\s*\?/,\ $2/g; s/\,\s*\?/,\ $3/g' {} \;
```

### 6.3 事务处理差异

```javascript
// ❌ SQLite
db.serialize(() => {
  db.run('BEGIN IMMEDIATE');
  // ...
  db.run('COMMIT');
});

// ✅ PostgreSQL
await client.query('BEGIN');
// ...
await client.query('COMMIT');
```

### 6.4 类型转换差异

```javascript
// ❌ SQLite
rows[0].created_at  // String

// ✅ PostgreSQL
rows[0].created_at  // Date 对象
// 需要手动转换
rows[0].created_at.toISOString()
```

---

## 7. 验证清单

### 7.1 迁移前验证

- [ ] **备份已创建**
  - [ ] `server/backups/ppa.db.pre-pg-migration-YYYYMMDD-HHMMSS` 存在
  - [ ] 备份文件大小与原文件一致
  - [ ] Schema 已导出到 `server/backups/ppa_schema_backup-YYYYMMDD.sql`

- [ ] **Supabase 项目已创建**
  - [ ] 项目 `ppa-production` 已创建
  - [ ] 连接字符串已获取
  - [ ] 环境变量 `DATABASE_URL` 已配置
  - [ ] （可选）Auth 已配置
  - [ ] （可选）Storage bucket 已创建

- [ ] **迁移脚本已准备**
  - [ ] `scripts/migration/02-convert-to-postgresql.sql` 存在
  - [ ] `scripts/migration/03-migrate-data.js` 存在
  - [ ] `scripts/migration/04-verify-migration.js` 存在

- [ ] **数据已优化（可选）**
  - [ ] AI 日志已清理（如决策删除）
  - [ ] Staging 数据已清理（如决策删除）
  - [ ] VACUUM 已执行

### 7.2 Schema 迁移验证

- [ ] **表结构验证**
  - [ ] 所有 26 张表已创建
  - [ ] 表结构与 SQLite 一致
  - [ ] 主键类型为 `SERIAL PRIMARY KEY`
  - [ ] 外键约束已创建
  - [ ] 索引已创建

- [ ] **数据类型验证**
  - [ ] 所有 `INTEGER` 字段映射正确
  - [ ] 所有 `TEXT` 字段映射正确
  - [ ] 所有 `TIMESTAMP` 字段映射正确

### 7.3 数据迁移验证

- [ ] **行数一致性验证**
  - [ ] `projects`: SQLite 53 = PostgreSQL 53 ✅
  - [ ] `config_roles`: SQLite 10 = PostgreSQL 10 ✅
  - [ ] `opportunity_tender_staging`: SQLite 929 = PostgreSQL 929 ✅
  - [ ] `ai_assessment_logs`: SQLite 769 = PostgreSQL 769 ✅
  - [ ] **所有 26 张表行数一致** ✅

- [ ] **数据内容验证**
  - [ ] 随机抽取 5 个项目，对比 SQLite 和 PostgreSQL 数据一致
  - [ ] `projects.assessment_details_json` 完整迁移
  - [ ] `ai_assessment_logs.request_body` 完整迁移

### 7.4 代码改造验证

- [ ] **依赖安装**
  - [ ] `npm install pg @types/pg` 成功
  - [ ] `package.json` 已更新

- [ ] **抽象层测试**
  - [ ] `SQLiteAdapter` 测试通过
  - [ ] `PostgresAdapter` 测试通过
  - [ ] `createAdapter()` 根据 `DB_TYPE` 正确选择

- [ ] **Model 层测试**
  - [ ] 所有 Model 的占位符已转换（`?` → `$1, $2, ...`）
  - [ ] 所有 Model 测试通过

- [ ] **集成测试**
  - [ ] 创建项目 ✅
  - [ ] 评估计算 ✅
  - [ ] 导出 Excel ✅
  - [ ] Wiki 关联 ✅
  - [ ] 表单设计 ✅

### 7.5 上线验证

- [ ] **服务启动**
  - [ ] `DB_TYPE=postgres node server/index.js` 成功启动
  - [ ] 日志显示"已连接 PostgreSQL"

- [ ] **API 测试**
  - [ ] `GET /api/health` 返回 200
  - [ ] `GET /api/projects` 返回数据
  - [ ] `POST /api/calculate` 正常计算

- [ ] **前端测试**
  - [ ] 项目列表页正常显示
  - [ ] 新建评估流程正常
  - [ ] 导出 Excel 正常

- [ ] **观察期（1 小时）**
  - [ ] 无错误日志
  - [ ] 数据库连接稳定
  - [ ] 响应时间可接受（< 500ms）

---

## 8. 回滚方案

### 8.1 快速回滚（5 分钟）

#### 触发条件

- [ ] 数据验证失败（行数不一致）
- [ ] API 返回 500 错误
- [ ] 前端核心功能失效
- [ ] 数据库连接超时
- [ ] 其他不可接受的错误

#### 回滚步骤

```bash
# 1. 停止服务（如果正在运行）
# Ctrl + C

# 2. 切换回 SQLite
export DB_TYPE=sqlite
unset DATABASE_URL

# 3. 恢复环境变量
sed -i '' 's/DB_TYPE=postgres/DB_TYPE=sqlite/' server/.env

# 4. 启动服务
node server/index.js

# 5. 验证服务正常
curl http://localhost:3001/api/health
```

**预期停机时间**: **约 5 分钟**

### 8.2 数据同步回滚

如果 PostgreSQL 有新增数据，需要同步回 SQLite：

```javascript
// scripts/migration/rollback-sync.js
// 将 PostgreSQL 的最新数据回写 SQLite
```

### 8.3 完整回滚（极端情况）

如果 PostgreSQL 数据损坏，需要从备份恢复：

```bash
# 1. 恢复 SQLite 备份
cp server/backups/ppa.db.pre-pg-migration-YYYYMMDD-HHMMSS server/ppa.db

# 2. 切换回 SQLite
export DB_TYPE=sqlite

# 3. 重启服务
node server/index.js
```

---

## 9. 时间表与工作量

### 9.1 详细时间表

| 阶段 | 任务 | 工作量 | 时间 |
|------|------|--------|------|
| **阶段 0** | 迁移前准备 | 30 分钟 | Day 1 |
| **阶段 1** | Schema 迁移 | 30 分钟 | Day 1 |
| **阶段 2** | 数据迁移 | 30 分钟 | Day 1 |
| **阶段 3** | 代码改造 | 9-10 小时 | Day 2-3 |
| **阶段 4** | 测试验证 | 1 天 | Day 4 |
| **阶段 5** | 上线切换 | 30 分钟 | Day 5 |

**总工作量**: **约 3-4 天**

### 9.2 快速路径（激进）

如果采用快速路径，可以跳过抽象层，直接改造 Model：

| 阶段 | 任务 | 工作量 | 时间 |
|------|------|--------|------|
| **阶段 0** | 迁移前准备 | 30 分钟 | Day 1 |
| **阶段 1-2** | Schema + 数据迁移 | 1 小时 | Day 1 |
| **阶段 3** | 直接改造 Model | 4-5 小时 | Day 1 |
| **阶段 4** | 测试验证 | 4 小时 | Day 1 |

**总工作量**: **约 1 天**

**快速路径风险**:
- ❌ 无法回滚到 SQLite（代码已改造）
- ❌ 需要一次性完成，无渐进验证
- ❌ 如果遇到问题，修复时间长

**建议**: **除非时间紧迫，否则采用完整路径（3-4 天）**

---

## 10. 成本分析

### 10.1 Supabase 成本（未来 2 年）

| 时间 | 预估数据量 | Supabase 成本 |
|------|-----------|--------------|
| **当前** | 40 MB | **$0/月** |
| **6 个月后** | 200 MB | **$0/月** |
| **12 个月后** | 500 MB | **$0/月** |
| **24 个月后** | 2 GB | **$0/月** |
| **36 个月后** | 5 GB | **$0/月** |
| **超出 10 GB** | >10 GB | **$19/月起** |

**结论**: **至少 36 个月内完全免费**

### 10.2 总成本对比（2 年）

| 方案 | 数据库成本 | 运维成本 | **总计（2 年）** |
|------|-----------|---------|----------------|
| **SQLite + 本地部署** | $0 | ¥1200/年（服务器） | **¥2400** |
| **PostgreSQL + Supabase** | $0 | ¥1200/年（服务器） | **¥2400** |
| **PostgreSQL + AWS RDS** | $144/年 | ¥1200/年（服务器） | **¥2688** |

**结论**: **Supabase 与 SQLite 成本完全一致，无额外支出**

---

## 11. 风险评估

### 11.1 风险矩阵

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| **数据迁移失败** | 低 | 高 | 完整备份 + 验证脚本 |
| **数据不一致** | 低 | 高 | 逐表验证 + 行数对比 |
| **代码改造遗漏** | 中 | 高 | 完整测试覆盖 |
| **SQL 语法转换错误** | 中 | 高 | 自动转换工具 + 手动审查 |
| **回滚失败** | 低 | 高 | 完整回滚方案 + 演练 |

### 11.2 缓解措施

#### 缓解 1: 数据备份策略

```bash
# 迁移前备份
BACKUP_TIME=$(date +%Y%m%d-%H%M%S)
cp server/ppa.db "server/backups/ppa.db.pre-pg-migration-${BACKUP_TIME}"

# 迁移后备份（Supabase）
pg_dump "$DATABASE_URL" > "server/backups/ppa.pg-backup-${BACKUP_TIME}.sql"

# 保留最近 3 个备份
ls -t server/backups/ppa.* | tail -n +4 | xargs rm -f
```

#### 缓解 2: 慢查询监控

```javascript
// server/services/monitoring.js 添加
const queryStart = Date.now();
const result = await db.query(sql, params);
const duration = Date.now() - queryStart;

if (duration > 500) {
  console.warn(`慢查询: ${duration}ms`, { sql, params });
}
```

---

## 12. 附录

### 附录 A: 常见问题 FAQ

**Q1: 迁移需要停机多久？**
A: 预计 10 分钟（停止服务 1 分钟 + 迁移 2 分钟 + 切换 1 分钟 + 启动 1 分钟 + 验证 5 分钟）

**Q2: 如果迁移失败怎么办？**
A: 立即执行回滚方案（5 分钟切回 SQLite），数据零丢失

**Q3: 能否双写迁移（不停机）？**
A: 技术上可行，但代码改造复杂（需双写逻辑），建议仅当停机时间 > 30 分钟时采用

**Q4: Supabase 免费层真的免费吗？**
A: 是的，10 GB 存储内永久免费，无需信用卡验证（但需绑定信用卡，不会扣费）

**Q5: 如果 Supabase 数据量超过 10 GB 怎么办？**
A: 预计 36 个月内不会超过，届时再评估升级方案（$19/月起）

**Q6: 如何备份 PostgreSQL 数据？**
A: Supabase 提供每日自动备份，也可手动导出：`pg_dump $DATABASE_URL > backup.sql`

**Q7: 能否同时保留 SQLite 和 PostgreSQL？**
A: 可以，通过 `DB_TYPE` 环境变量切换，但数据会分叉

### 附录 B: 参考资料

- [Supabase 官方文档](https://supabase.com/docs)
- [PostgreSQL 迁移指南](https://www.postgresql.org/docs/current/migration.html)
- [sqlite3-to-postgresql 工具](https://github.com/ness immortal/sqlite3-to-postgresql)
- [SQLite → PostgreSQL 数据类型映射](https://www.sqlite.org/datatype3.html)

---

**文档结束**

**下次审查**: 迁移实施前
**审查人**: bruce
