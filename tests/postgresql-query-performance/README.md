# PostgreSQL Query Performance Test Pack

本目录归档 PostgreSQL 慢接口优化这一轮的测试计划、脚本、报告和原始产物。

## Contents

- `plan.md`：慢接口优化计划快照，来源于 `docs/postgresql-query-performance-optimization-plan.md`。
- `scripts/run-focused-verification.sh`：运行本次修复相关的聚焦 Jest 测试。
- `scripts/run-dashboard-readonly-sampling.js`：执行只读 Dashboard 并发性能采样。
- `scripts/apply-slow-query-indexes.js`：慢查询索引脚本入口，转调后端实际索引脚本。
- `reports/fix-test-report.md`：本次修复测试报告。
- `reports/baseline-summary.md`：修复前 query-performance 基线报告。
- `artifacts/`：基线 JSON 和原始测试产物。

## Related Source Files

这些文件仍放在原工程执行目录中，避免破坏现有测试/脚本路径：

- `server/tests/dashboardServiceCache.test.js`
- `server/tests/dbAdapter.test.js`
- `server/tests/schemaWarmupService.test.js`
- `server/tests/slowQueryIndexes.test.js`
- `server/scripts/migration/apply-slow-query-indexes.js`
- `_bmad-output/test-artifacts/postgresql-regression-performance/query-performance/postgresql-query-performance-fix-test-report.md`

## Commands

运行本次聚焦验证：

```bash
tests/postgresql-query-performance/scripts/run-focused-verification.sh
```

运行只读 Dashboard 性能采样：

```bash
node tests/postgresql-query-performance/scripts/run-dashboard-readonly-sampling.js
```

查看慢查询索引 SQL dry-run：

```bash
node tests/postgresql-query-performance/scripts/apply-slow-query-indexes.js
```

执行索引写入需要明确确认后再运行：

```bash
node tests/postgresql-query-performance/scripts/apply-slow-query-indexes.js --apply
```
