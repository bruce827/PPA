# Supabase PostgreSQL 连接串与 SSL 配置修复

> **日期**: 2026-07-01  
> **严重程度**: 高（后端无法启动）  
> **影响范围**: `DB_TYPE=postgres` 启动流程、PostgreSQL 迁移脚本、慢查询索引脚本  
> **修复文件**: `server/utils/db.js`, `server/utils/postgresConfig.js`, `server/scripts/migration/lib.js`, `server/scripts/migration/apply-slow-query-indexes.js`, `server/.env.example`

---

## 问题描述

后端以 PostgreSQL 模式启动时，先出现 `pg-connection-string` SSL 模式警告，随后 PostgreSQL 连接失败：

```text
Warning: SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
Failed to connect to PostgreSQL: Connection terminated unexpectedly
```

启动重试 3 次后退出：

```text
PostgreSQL startup connection failed; retrying
Failed to start server {"error":"Connection terminated unexpectedly"}
```

---

## 根本原因

这次故障由两个问题叠加造成：

1. `DATABASE_URL` 中携带 `?sslmode=require`，会触发 `pg-connection-string` 的安全警告，并让 `pg` 自行解析 SSL 语义。
2. 当前 `.env` 使用的 Supabase pooler 地址不可用，连接到 `aws-1-ap-northeast-2.pooler.supabase.com:6543` 时服务端直接断开；同一密码切换到 direct DB 地址 `db.wsvrthgeqngzmsbbilwc.supabase.co:5432` 后验证通过。

---

## 解决方案

### 1. 规范化 PostgreSQL 连接配置

新增 `server/utils/postgresConfig.js`，在交给 `pg` 前从连接串中移除 `sslmode` / `uselibpqcompat` 查询参数，并由应用代码显式设置 `ssl`：

```javascript
const buildPostgresConnectionConfig = (connectionString, options = {}) => {
  if (!connectionString) {
    throw new Error(options.missingMessage || 'DATABASE_URL is required when DB_TYPE=postgres');
  }

  const config = {
    connectionString: removeSslModeQueryParams(connectionString),
  };
  const ssl = resolvePostgresSsl(connectionString);

  if (ssl !== undefined) {
    config.ssl = ssl;
  }

  return config;
};
```

### 2. 所有 PostgreSQL 入口复用同一配置逻辑

以下路径都改为复用 `buildPostgresConnectionConfig()`：

- `server/utils/db.js` - 后端启动和运行时数据库连接
- `server/scripts/migration/lib.js` - 迁移脚本 PostgreSQL 连接
- `server/scripts/migration/apply-slow-query-indexes.js` - 慢查询索引脚本连接

### 3. 切换 `.env` 到 Supabase direct DB 地址

将真实环境中的 `DATABASE_URL` 从 pooler 地址切换为 direct connection，密码沿用原值：

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.wsvrthgeqngzmsbbilwc.supabase.co:5432/postgres
PGSSLMODE=require
```

注意不要在 `DATABASE_URL` 后再追加 `?sslmode=require`。

---

## 验证结果

单元测试通过：

```bash
npm test -- postgresConfig.test.js dbAdapter.test.js slowQueryIndexes.test.js --watchman=false
```

结果：

```text
Test Suites: 3 passed, 3 total
Tests: 17 passed, 17 total
```

真实 Supabase 连接验证通过：

```text
Connected to PostgreSQL database via Supabase.
postgres-init-ok
```

---

## 预防措施

1. Supabase PostgreSQL URL 优先使用 direct connection 格式：
   ```env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.<PROJECT_REF>.supabase.co:5432/postgres
   PGSSLMODE=require
   ```
2. 如需使用 pooler，必须从 Supabase 控制台重新复制当前项目的 pooler URI，避免项目引用、区域、端口或用户名格式不匹配。
3. 不要把 `sslmode=require` 放进 `DATABASE_URL`；统一通过 `PGSSLMODE=require` 或连接配置 helper 控制 SSL。
4. 启动报 `Connection terminated unexpectedly` 时，分别探测 pooler 与 direct DB；如果 direct DB 可通而 pooler 不通，优先判断为 pooler 配置问题。

---

## 相关文件

- `server/utils/postgresConfig.js` - PostgreSQL 连接配置规范化
- `server/utils/db.js` - 运行时数据库适配器
- `server/scripts/migration/lib.js` - 迁移脚本连接配置
- `server/scripts/migration/apply-slow-query-indexes.js` - 慢查询索引脚本连接配置
- `server/tests/postgresConfig.test.js` - 连接配置单元测试
- `server/.env.example` - direct connection / transaction pooler 示例
