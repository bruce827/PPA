# PPA 2.0 静态文件优化计划

**版本**: V1.0
**创建日期**: 2026-06-23
**状态**: 待执行
**分支**: 2.0

---

## 📋 计划概述

### 目标

将 PPA 项目从"本地文件 + SQLite 数据库"迁移到 **Supabase 云端**：
- ✅ **数据库**：SQLite → Supabase PostgreSQL
- ✅ **文件服务**：本地存储 → Supabase Storage
- ✅ **空间优化**：从 2.9 GB → 100 MB（释放 97% 本地空间）

### 背景

**驱动力**：
1. **安全问题**：`ppa.db` (73 MB) 被提交到 Git 历史中
2. **未来扩展**：需要为 V2 Agent 接口提供在线服务
3. **可靠性**：本地文件无备份机制，服务器故障会丢失

**已确认决策**：
- ✅ 使用 **Supabase**（免费层 500 MB + Storage）
- ✅ **现在不启用 Auth**（V2 需要时再加）
- ✅ 采用**渐进方案**（数据库+附件今天完成，爬虫数据本周）

---

## 📊 当前状态分析

### 静态文件全景（2.9 GB）

| 类别 | 大小 | 数量 | 优先级 | 建议 |
|------|------|------|--------|------|
| **数据库** | 73 MB | 1 | 🔴 P0 | 迁移 PostgreSQL |
| **项目附件** | 9.2 MB | 4 | 🔴 P0 | 迁移 Storage |
| **爬虫数据** | 791 MB | 40 | 🟡 P1 | 迁移 Storage |
| **AI 日志** | 35 MB | 大量 | 🟡 P1 | 定期清理 |
| **Docs 文档** | 11 MB | 5 | 🟢 P2 | 迁移 Storage（可选） |
| **备份文件** | 1.2 MB | 3 | 🟢 P2 | 迁移 Storage |
| **Wiki 文档** | 80 KB | 11 | ✅ 完成 | 留在本地 |
| **爬虫脚本** | 360 KB | 12 | ✅ 完成 | 留在代码库 |

### 空间优化预期

```
优化前（本地）: 2.9 GB
  ├─ 数据库: 73 MB
  ├─ 项目附件: 9.2 MB
  ├─ 爬虫数据: 791 MB
  ├─ AI 日志: 35 MB
  └─ 其他: 2.1 GB

优化后（本地）: ~100 MB
  ├─ 数据库: 0 MB（已迁移）
  ├─ 项目附件: 0 MB（已迁移）
  ├─ 爬虫数据: 0 MB（已迁移）
  ├─ AI 日志: 10 MB（清理后）
  └─ Wiki: 80 KB（保留）

Supabase 占用: ~900 MB（免费层充足）
  ├─ PostgreSQL: 40 MB（500 MB 免费层）
  └─ Storage: 860 MB（项目附件 + 爬虫数据 + 备份）
```

---

## 🎯 执行阶段

### **阶段 0: 前置准备（30 分钟）** 🔴 P0

#### 目标

确认 Supabase 配置，备份现有数据

#### 任务清单

- [ ] **0.1** 备份 SQLite 数据库
  ```bash
  BACKUP_TIME=$(date +%Y%m%d-%H%M%S)
  cp server/ppa.db "server/backups/ppa.db.pre-pg-migration-${BACKUP_TIME}"
  sqlite3 server/ppa.db ".schema" > "server/backups/ppa_schema_backup-${BACKUP_TIME}.sql"
  ```

- [ ] **0.2** 确认 Supabase 环境变量
  ```bash
  # 检查 server/.env
  DB_TYPE=postgres
  DATABASE_URL=postgresql://...
  SUPABASE_URL=https://...
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
  ```

- [ ] **0.3** 创建 Supabase Storage Bucket
  - Bucket name: `project-attachments`
  - 私有（Private）
  - 文件大小限制: 50 MB

- [ ] **0.4** 轮换 Supabase 密码（安全建议）

#### 完成标准

- ✅ 数据库备份已创建
- ✅ Supabase 连接正常
- ✅ Storage bucket 已创建

---

### **阶段 1: 数据库迁移（1 小时）** 🔴 P0

#### 目标

将 SQLite 数据迁移到 Supabase PostgreSQL

#### 任务清单

- [ ] **1.1** 安装 PostgreSQL 驱动
  ```bash
  cd server
  npm install pg
  npm install --save-dev @types/pg
  ```

- [ ] **1.2** 转换 Schema
  ```bash
  # 导出 SQLite Schema
  sqlite3 server/ppa.db ".schema" > /tmp/ppa_schema.sql

  # 转换为 PostgreSQL
  npm install -g sqlite3-to-postgresql
  sqlite3-to-postgresql --input server/ppa.db --output /tmp/ppa_schema_pg.sql --create-indexes --add-foreign-keys

  # 在 Supabase 执行
  psql "$DATABASE_URL" -f /tmp/ppa_schema_pg.sql
  ```

- [ ] **1.3** 迁移数据
  ```bash
  # 运行迁移脚本（见附录 A）
  DATABASE_URL="$DATABASE_URL" node scripts/migration/03-migrate-to-supabase.js
  ```

- [ ] **1.4** 验证数据一致性
  ```bash
  # 运行验证脚本（见附录 A）
  DATABASE_URL="$DATABASE_URL" node scripts/migration/04-verify-migration.js
  ```

- [ ] **1.5** 更新代码
  - [ ] 创建 `server/utils/dbAdapter.js`（数据库抽象层）
  - [ ] 更新 `server/config/database.js`
  - [ ] 转换所有 Model 的 SQL 占位符（`?` → `$1, $2`）

- [ ] **1.6** 测试
  ```bash
  # 启动服务
  DB_TYPE=postgres node server/index.js

  # 测试 API
  curl http://localhost:3001/api/health
  ```

#### 完成标准

- ✅ 所有表已创建
- ✅ 数据一致性验证通过（行数完全匹配）
- ✅ 服务启动成功
- ✅ 核心 API 测试通过

#### 预计时间

**1 小时**（含测试）

---

### **阶段 2: 项目附件迁移（30 分钟）** 🔴 P0

#### 目标

将本地项目附件迁移到 Supabase Storage

#### 任务清单

- [ ] **2.1** 创建迁移脚本
  ```bash
  # 复制附录 B 的完整迁移脚本
  # 保存为：scripts/migrate-attachments.js
  ```

- [ ] **2.2** 执行迁移
  ```bash
  node scripts/migrate-attachments.js
  ```

- [ ] **2.3** 验证迁移
  ```bash
  # 复制附录 B 的验证脚本
  # 保存为：scripts/verify-attachments.js
  node scripts/verify-attachments.js
  ```

- [ ] **2.4** 更新后端 API
  - [ ] 修改附件下载接口（生成签名链接）
  - [ ] 测试下载功能

- [ ] **2.5** 更新前端代码（如需要）
  - [ ] 更新附件下载链接

- [ ] **2.6** 删除本地文件（可选）
  ```bash
  rm -rf server/uploads/project-attachments/*
  ```

#### 完成标准

- ✅ 4 个附件全部迁移成功
- ✅ Supabase Storage 验证通过
- ✅ 后端 API 返回签名链接
- ✅ 前端可正常下载附件

#### 预计时间

**30 分钟**

---

### **阶段 3: 爬虫数据迁移（1 小时）** 🟡 P1

#### 目标

将 791 MB 爬虫数据迁移到 Supabase Storage

#### 任务清单

- [ ] **3.1** 创建 Storage Bucket
  - Bucket name: `spider-data`
  - 私有
  - 文件大小限制: 100 MB

- [ ] **3.2** 批量上传
  ```bash
  # 复制附录 C 的迁移脚本
  # 保存为：scripts/migrate-spider-data.js
  node scripts/migrate-spider-data.js
  ```

- [ ] **3.3** 验证数据完整性
  ```bash
  # 比较本地和云端文件数量
  ls spider/data/*.json | wc -l  # 本地
  # Supabase Storage 列表
  node scripts/verify-spider-data.js
  ```

- [ ] **3.4** 更新爬虫代码路径
  - [ ] 修改爬虫读取逻辑
  - [ ] 从 Supabase Storage 读取数据
  - [ ] 测试爬虫功能

#### 完成标准

- ✅ 40 个 JSON 文件全部迁移
- ✅ 文件大小一致
- ✅ 爬虫可正常读取数据

#### 预计时间

**1 小时**

---

### **阶段 4: AI 日志清理（30 分钟）** 🟡 P1

#### 目标

配置定期清理机制，控制 AI 日志增长

#### 任务清单

- [ ] **4.1** 创建清理脚本
  ```bash
  # 复制附录 D 的清理脚本
  # 保存为：scripts/cleanup-ai-logs.js
  ```

- [ ] **4.2** 测试清理脚本
  ```bash
  # 先备份再清理
  node scripts/cleanup-ai-logs.js --dry-run  # 模拟执行
  node scripts/cleanup-ai-logs.js --backup   # 备份+清理
  ```

- [ ] **4.3** 配置 cron 定时任务
  ```bash
  # 每月 1 号凌晨 2 点清理
  crontab -e
  # 添加：
  0 2 1 * * cd /path/to/PPA && node scripts/cleanup-ai-logs.js >> server/logs/cron.log 2>&1
  ```

- [ ] **4.4** 可选：迁移到 Supabase Storage
  - 创建 bucket: `ai-logs`
  - 迁移历史日志
  - 后续日志直接写入 Storage

#### 完成标准

- ✅ 清理脚本测试通过
- ✅ cron 任务已配置
- ✅ 预期每月节省 2-3 MB

#### 预计时间

**30 分钟**

---

### **阶段 5: 备份优化（30 分钟）** 🟢 P2

#### 目标

将数据库备份迁移到 Supabase Storage

#### 任务清单

- [ ] **5.1** 创建 Storage Bucket
  - Bucket name: `database-backups`
  - 私有

- [ ] **5.2** 创建备份脚本
  ```bash
  # 复制附录 E 的备份脚本
  # 保存为：scripts/backup-to-supabase.js
  ```

- [ ] **5.3** 配置自动备份
  ```bash
  # 每天凌晨 2 点备份
  crontab -e
  # 添加：
  0 2 * * * cd /path/to/PPA && node scripts/backup-to-supabase.js >> server/logs/cron.log 2>&1
  ```

- [ ] **5.4** 保留最近 3 个本地备份
  ```bash
  ls -t server/backups/*.db | tail -n +4 | xargs rm -f
  ```

#### 完成标准

- ✅ 备份脚本测试通过
- ✅ cron 任务已配置
- ✅ 备份可正常上传到 Supabase

#### 预计时间

**30 分钟**

---

## 📅 时间表

### 总览

| 阶段 | 任务 | 优先级 | 预计时间 | 完成日期 |
|------|------|--------|---------|---------|
| **阶段 0** | 前置准备 | 🔴 P0 | 30 分钟 | Day 1 |
| **阶段 1** | 数据库迁移 | 🔴 P0 | 1 小时 | Day 1 |
| **阶段 2** | 项目附件迁移 | 🔴 P0 | 30 分钟 | Day 1 |
| **阶段 3** | 爬虫数据迁移 | 🟡 P1 | 1 小时 | Day 1-2 |
| **阶段 4** | AI 日志清理 | 🟡 P1 | 30 分钟 | Day 2 |
| **阶段 5** | 备份优化 | 🟢 P2 | 30 分钟 | Day 3 |

**总工作量**: **约 4 小时**

**推荐节奏**:
- **Day 1**：完成阶段 0-2（数据库 + 附件，核心功能）
- **Day 2**：完成阶段 3-4（爬虫数据 + 日志清理）
- **Day 3**：完成阶段 5（备份优化）

---

## ✅ 完成检查清单

### 数据库迁移

- [ ] 备份已创建
- [ ] Schema 已迁移
- [ ] 数据验证通过
- [ ] 代码已更新
- [ ] 服务启动成功
- [ ] API 测试通过

### 文件服务

- [ ] Supabase Storage bucket 已创建
- [ ] 项目附件已迁移
- [ ] 爬虫数据已迁移（可选）
- [ ] 签名链接正常
- [ ] 下载功能正常

### 清理与备份

- [ ] AI 日志清理脚本已配置
- [ ] 数据库自动备份已配置
- [ ] cron 任务正常运行

### Git 安全

- [ ] `.env` 在 `.gitignore` 中
- [ ] `ppa.db` 不再提交
- [ ] `server/uploads` 不再提交（除脚本）

---

## 📚 附录

### **附录 A: 数据库迁移脚本**

#### **A.1 数据迁移脚本（03-migrate-to-supabase.js）**

```javascript
// scripts/migration/03-migrate-to-supabase.js
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
  console.log('=== PPA 数据库迁移到 Supabase ===\n');

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

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const columnNames = columns.join(', ');

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

  sqliteDb.close();
  pgClient.end();

  console.log('=== 迁移完成 ===');
}

migrate().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});
```

#### **A.2 数据验证脚本（04-verify-migration.js）**

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
  'config_travel_costs',
  'ai_prompts',
  'users',
  'web3d_risk_items',
  'web3d_workload_templates',
  'opportunity_tender_staging',
  'tender_staging_web_search_results',
  'config_business_pricing',
  'project_push_records',
  'prompt_module_tags',
  'form_app',
  'form_definition',
  'form_field',
  'form_project',
  'wiki_project_relations',
  'data_metric_categories',
  'data_metrics',
  'data_metrics_project',
  'prompt_templates',
  'ai_assessment_logs'
];

async function verify() {
  console.log('=== 数据一致性验证 ===\n');

  const sqliteDb = new sqlite3.Database('./server/ppa.db');
  const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
  await pgClient.connect();

  let allPassed = true;

  for (const table of TABLES) {
    const sqliteCount = await new Promise((resolve, reject) => {
      sqliteDb.get(`SELECT COUNT(*) as cnt FROM ${table}`, (err, row) => {
        if (err) reject(err);
        else resolve(row.cnt);
      });
    });

    const pgResult = await pgClient.query(`SELECT COUNT(*) as cnt FROM ${table}`);
    const pgCount = parseInt(pgResult.rows[0].cnt);

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

---

### **附录 B: 项目附件迁移脚本**

#### **B.1 迁移脚本（migrate-attachments.js）**

```javascript
// scripts/migrate-attachments.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateAttachments() {
  const attachmentsDir = './server/uploads/project-attachments';
  const files = fs.readdirSync(attachmentsDir);

  console.log('=== 项目附件迁移到 Supabase Storage ===\n');
  console.log(`找到 ${files.length} 个文件\n`);

  let success = 0;
  let failed = 0;

  for (const filename of files) {
    const filePath = path.join(attachmentsDir, filename);

    // 跳过非文件
    if (!fs.statSync(filePath).isFile()) continue;

    const fileBuffer = fs.readFileSync(filePath);
    const projectId = filename.split('_')[0];
    const fileSize = (fileBuffer.length / 1024 / 1024).toFixed(2);

    console.log(`[${success + failed + 1}/${files.length}] ${filename}`);
    console.log(`   项目: ${projectId} | 大小: ${fileSize} MB`);

    const { error } = await supabase.storage
      .from('project-attachments')
      .upload(`${projectId}/${filename}`, fileBuffer, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error(`   ❌ 失败: ${error.message}\n`);
      failed++;
      continue;
    }

    console.log(`   ✅ 成功\n`);
    success++;
  }

  console.log('=== 迁移完成 ===');
  console.log(`✅ 成功: ${success}`);
  console.log(`❌ 失败: ${failed}`);
}

migrateAttachments().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});
```

#### **B.2 验证脚本（verify-attachments.js）**

```javascript
// scripts/verify-attachments.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
  const { data, error } = await supabase.storage
    .from('project-attachments')
    .list();

  if (error) {
    console.error('❌ 验证失败:', error.message);
    process.exit(1);
  }

  console.log(`✅ Bucket 中有 ${data.length} 个文件:\n`);
  data.forEach(file => console.log(`   - ${file.name}`));
}

verify();
```

#### **B.3 后端 API 更新（生成签名链接）**

```javascript
// server/controllers/projectController.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 附件下载接口
app.get('/api/projects/:id/attachment', async (req, res) => {
  try {
    const project = await db.getProject(req.params.id);

    if (!project || !project.attachment_path) {
      return res.status(404).json({ error: '附件不存在' });
    }

    const filename = path.basename(project.attachment_path);
    const projectId = project.id;

    // 生成签名链接（1 小时有效）
    const { data, error } = await supabase.storage
      .from('project-attachments')
      .createSignedUrl(`${projectId}/${filename}`, 3600);

    if (error) {
      return res.status(404).json({ error: '文件不存在' });
    }

    // 重定向到签名链接
    res.redirect(data.signedUrl);

  } catch (err) {
    console.error('下载附件失败:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});
```

---

### **附录 C: 爬虫数据迁移脚本**

#### **C.1 迁移脚本（migrate-spider-data.js）**

```javascript
// scripts/migrate-spider-data.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateSpiderData() {
  const dataDir = './spider/data';
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

  console.log('=== 爬虫数据迁移到 Supabase Storage ===\n');
  console.log(`找到 ${files.length} 个文件\n`);

  let success = 0;
  let failed = 0;

  for (const filename of files) {
    const filePath = path.join(dataDir, filename);
    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = (fileBuffer.length / 1024 / 1024).toFixed(2);

    console.log(`[${success + failed + 1}/${files.length}] ${filename} (${fileSize} MB)`);

    const { error } = await supabase.storage
      .from('spider-data')
      .upload(filename, fileBuffer, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error(`   ❌ 失败: ${error.message}\n`);
      failed++;
      continue;
    }

    console.log(`   ✅ 成功\n`);
    success++;
  }

  console.log('=== 迁移完成 ===');
  console.log(`✅ 成功: ${success}`);
  console.log(`❌ 失败: ${failed}`);
}

migrateSpiderData().catch(err => {
  console.error('迁移失败:', err);
  process.exit(1);
});
```

---

### **附录 D: AI 日志清理脚本**

#### **D.1 清理脚本（cleanup-ai-logs.js）**

```javascript
// scripts/cleanup-ai-logs.js
const fs = require('fs');
const path = require('path');

const LOGS_DIR = './server/logs/ai';
const DAYS_TO_KEEP = 30; // 保留 30 天

function cleanupLogs(dryRun = false, backup = false) {
  console.log('=== AI 日志清理 ===\n');
  console.log(`保留天数: ${DAYS_TO_KEEP} 天`);
  console.log(`模式: ${dryRun ? '模拟' : backup ? '备份+清理' : '直接清理'}\n`);

  const now = Date.now();
  const cutoffTime = now - (DAYS_TO_KEEP * 24 * 60 * 60 * 1000);

  let deleted = 0;
  let freedSpace = 0;

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile()) {
        const stats = fs.statSync(fullPath);

        if (stats.mtimeMs < cutoffTime) {
          const size = stats.size;

          if (backup && !dryRun) {
            // 备份到 Supabase Storage（可选）
            console.log(`备份: ${fullPath}`);
          }

          if (!dryRun) {
            fs.unlinkSync(fullPath);
            freedSpace += size;
            deleted++;
          } else {
            console.log(`[将删除] ${fullPath} (${(size / 1024).toFixed(2)} KB)`);
            deleted++;
            freedSpace += size;
          }
        }
      }
    }
  }

  scanDir(LOGS_DIR);

  // 删除空目录
  if (!dryRun) {
    removeEmptyDirs(LOGS_DIR);
  }

  console.log('\n=== 清理完成 ===');
  console.log(`删除文件: ${deleted}`);
  console.log(`释放空间: ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);
}

function removeEmptyDirs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  if (entries.length === 0) {
    fs.rmdirSync(dir);
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      removeEmptyDirs(path.join(dir, entry.name));
    }
  }
}

// 解析命令行参数
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const backup = args.includes('--backup');

cleanupLogs(dryRun, backup);
```

**使用方式**:
```bash
# 模拟执行（不删除）
node scripts/cleanup-ai-logs.js --dry-run

# 直接清理
node scripts/cleanup-ai-logs.js

# 备份后清理
node scripts/cleanup-ai-logs.js --backup
```

---

### **附录 E: 数据库备份脚本**

#### **E.1 备份脚本（backup-to-supabase.js）**

```javascript
// scripts/backup-to-supabase.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backupDatabase() {
  console.log('=== 数据库备份到 Supabase Storage ===\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = `ppa_backup_${timestamp}.sql`;

  console.log(`备份文件: ${backupFile}`);

  // 1. 导出数据库
  console.log('正在导出数据库...');
  try {
    execSync(`pg_dump "${process.env.DATABASE_URL}" > /tmp/${backupFile}`, {
      stdio: 'inherit'
    });
  } catch (err) {
    console.error('❌ 数据库导出失败:', err.message);
    process.exit(1);
  }

  // 2. 读取文件
  const backupBuffer = fs.readFileSync(`/tmp/${backupFile}`);
  const fileSize = (backupBuffer.length / 1024 / 1024).toFixed(2);
  console.log(`备份大小: ${fileSize} MB`);

  // 3. 上传到 Supabase
  console.log('正在上传到 Supabase...');
  const { error } = await supabase.storage
    .from('database-backups')
    .upload(backupFile, backupBuffer, {
      cacheControl: '3600'
    });

  if (error) {
    console.error('❌ 上传失败:', error.message);
    process.exit(1);
  }

  // 4. 清理本地临时文件
  fs.unlinkSync(`/tmp/${backupFile}`);

  console.log('✅ 备份完成');

  // 5. 保留最近 3 个备份
  const { data: files } = await supabase.storage
    .from('database-backups')
    .list();

  if (files.length > 3) {
    const toDelete = files
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(3)
      .map(f => f.name);

    console.log(`\n清理旧备份: ${toDelete.join(', ')}`);

    for (const filename of toDelete) {
      await supabase.storage
        .from('database-backups')
        .remove([filename]);
    }
  }
}

backupDatabase().catch(err => {
  console.error('备份失败:', err);
  process.exit(1);
});
```

---

### **附录 F: .gitignore 更新**

#### **F.1 新增忽略规则**

```gitignore
# 数据库
*.db
*.sqlite
*.sqlite3
server/ppa.db

# 环境变量
.env
.env.local
.env.*.local

# 上传文件（除脚本外）
server/uploads/project-attachments/
server/uploads/bidding-site-scripts/

# 爬虫数据
spider/data/

# 日志
server/logs/ai/

# 备份（保留最近 3 个）
server/backups/ppa.db.*
!server/backups/ppa.db.bak_*
```

---

### **附录 G: 环境变量配置**

#### **G.1 server/.env（更新后）**

```bash
# ===== 数据库 =====
DB_TYPE=postgres
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres?sslmode=require

# ===== Supabase =====
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===== 可选：V2 启用时配置 =====
# SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 备注

### 决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-06-23 | 选择 Supabase | Auth + Storage + Realtime 匹配 V2 需求 |
| 2026-06-23 | 现在不启用 Auth | 当前无用户认证需求，V2 再启用 |
| 2026-06-23 | 渐进迁移 | 降低风险，分阶段验证 |
| 2026-06-23 | AI 日志定期清理 | 节省空间，无需永久保存 |

### 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 迁移失败 | 低 | 高 | 完整备份 + 验证脚本 |
| Supabase 超出 500 MB | 中 | 中 | 定期清理 + 升级 Pro ($12/月) |
| 文件上传失败 | 低 | 中 | 分批次 + 错误重试 |
| 签名链接泄露 | 低 | 低 | 1 小时自动过期 |

### 下一步

- [ ] 确认计划
- [ ] 执行阶段 0（前置准备）
- [ ] 执行阶段 1（数据库迁移）
- [ ] 执行阶段 2（项目附件迁移）

---

**计划创建日期**: 2026-06-23
**下次审查**: 执行阶段 1 完成后
