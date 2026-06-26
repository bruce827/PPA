# Dashboard PostgreSQL 兼容性修复

> **日期**: 2026-06-24  
> **严重程度**: 高 (Dashboard 页面完全不可用)  
> **影响范围**: `/api/dashboard/trend` 接口  
> **修复文件**: `server/utils/db.js`, `server/models/dashboardModel.js`

---

## 问题描述

Dashboard 页面打开时报错：

```
Error: function strftime(unknown, timestamp without time zone) does not exist
```

后端日志显示 PostgreSQL 无法识别 `STRFTIME` 函数。

---

## 根本原因

项目同时支持 SQLite 和 PostgreSQL 两种数据库，但 Dashboard 的 SQL 查询使用了 **SQLite 专有函数**：

| SQLite 语法 | PostgreSQL 等价语法 |
|---|---|
| `STRFTIME('%Y-%m', column)` | `TO_CHAR(column, 'YYYY-MM')` |
| `datetime('now', '-12 months')` | `CURRENT_TIMESTAMP - INTERVAL '12 months'` |
| `GROUP BY month` (使用别名) | `GROUP BY TO_CHAR(...)` (必须重复完整表达式) |

**问题代码示例** (`dashboardModel.js`):

```sql
-- ❌ SQLite 语法，PostgreSQL 不识别 STRFTIME
SELECT STRFTIME('%Y-%m', updated_at) AS month, ...
FROM projects
GROUP BY month  -- PostgreSQL 不允许 GROUP BY 使用别名
```

---

## 解决方案

### 1. 扩展 SQL 语法转换函数

在 `server/utils/db.js` 的 `convertSqliteSyntaxForPostgres()` 中添加 `STRFTIME` 转换规则：

```javascript
// STRFTIME('%Y-%m', column) -> TO_CHAR(column, 'YYYY-MM')
text = text.replace(
  /\bSTRFTIME\s*\(\s*'([^']*)'\s*,\s*([^)]+)\s*\)/gi,
  (_match, format, column) => {
    // Convert SQLite strftime format to PostgreSQL to_char format
    const pgFormat = format
      .replace(/%Y/g, 'YYYY')
      .replace(/%m/g, 'MM')
      .replace(/%d/g, 'DD')
      .replace(/%H/g, 'HH24')
      .replace(/%M/g, 'MI')
      .replace(/%S/g, 'SS');
    return `TO_CHAR(${column.trim()}, '${pgFormat}')`;
  }
);
```

### 2. 修复 GROUP BY 别名问题

**`getCostTrend()`**:
```sql
-- ❌ 错误：使用别名
GROUP BY month

-- ✅ 正确：使用完整表达式
GROUP BY STRFTIME('%Y-%m', created_at)
```

**`getTrendLast12Months()`**:
```sql
-- ❌ 错误：使用别名
GROUP BY month, project_type

-- ✅ 正确：使用完整表达式
GROUP BY STRFTIME('%Y-%m', updated_at), 
         CASE WHEN project_type = 'web3d' THEN 'Web3D' ELSE 'SaaS/平台' END
```

---

## 转换后的 SQL 示例

**转换前** (SQLite):
```sql
SELECT STRFTIME('%Y-%m', updated_at) AS month
FROM projects
WHERE datetime(updated_at) >= datetime('now', '-12 months')
GROUP BY month
```

**转换后** (PostgreSQL):
```sql
SELECT TO_CHAR(updated_at, 'YYYY-MM') AS month
FROM projects
WHERE updated_at::timestamp >= (CURRENT_TIMESTAMP + INTERVAL '-12 months')
GROUP BY TO_CHAR(updated_at, 'YYYY-MM')
```

---

## 格式映射表

| SQLite 格式 | PostgreSQL 格式 | 说明 |
|---|---|---|
| `%Y` | `YYYY` | 四位年份 |
| `%m` | `MM` | 两位月份 |
| `%d` | `DD` | 两位日期 |
| `%H` | `HH24` | 24小时制小时 |
| `%M` | `MI` | 分钟 |
| `%S` | `SS` | 秒 |

---

## 测试验证

1. 重启后端服务器
2. 访问 Dashboard 页面
3. 验证趋势图表正常显示
4. 检查月度数据分组正确

---

## 相关文件

- `server/utils/db.js` - SQL 语法转换函数
- `server/models/dashboardModel.js` - Dashboard 数据查询
- `server/services/dashboardService.js` - Dashboard 业务逻辑
- `server/controllers/dashboardController.js` - Dashboard 控制器

---

## 预防措施

1. **编写新 SQL 时**：优先使用 ANSI SQL 标准函数
2. **使用 SQLite 特性时**：确保 `convertSqliteSyntaxForPostgres()` 有对应转换规则
3. **GROUP BY 子句**：PostgreSQL 不支持使用 SELECT 别名，必须重复完整表达式
4. **测试环境**：建议同时测试 SQLite 和 PostgreSQL 两种数据库

---

## 参考

- [PostgreSQL TO_CHAR 文档](https://www.postgresql.org/docs/current/functions-formatting.html)
- [SQLite STRFTIME 文档](https://www.sqlite.org/lang_datefunc.html)
