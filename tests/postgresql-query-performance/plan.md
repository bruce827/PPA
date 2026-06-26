# PostgreSQL 慢接口优化方案

## Summary

优先优化性能报告中超过 5s 的接口，但按“当前库只读”约束执行验证。第一阶段重点处理热路径里的数据库连接重建、重复 schema 检查、明显缺失索引和 Dashboard 全量聚合。

`/api/config/all` 当前不再作为报错修复项，只作为性能观察项。

## Execution Status

- 2026-06-25 已完成连接池热路径优化、`/api/health` 轻量探活、`/api/dashboard/cost-range` 数据库侧分桶。
- 2026-06-25 已在 PostgreSQL 上执行慢查询索引脚本：`node server/scripts/migration/apply-slow-query-indexes.js --apply`。
- 索引执行后已只读查询 `pg_indexes` 验证：期望 15 个，找到 15 个，缺失 0 个。
- 2026-06-25 已新增启动阶段 schema warmup：服务启动时预热配置、项目、招标网站、招标暂存、联网搜索结果、AI 日志 schema ensure；请求路径保留兜底但不再由首个 GET 承担初始化成本。
- 2026-06-26 已完成 Dashboard 二次优化：`/api/dashboard/overview` 合并为单次指标查询；`keywords` 改为只读取项目文本；`dna/top-roles/top-risks` 共享 assessment JSON 短缓存；`top-risks` 风险白名单加入短缓存；Dashboard 聚合读操作增加窄范围串行读队列，避免首屏并发 GET 触发 PostgreSQL 冷连接风暴。
- 2026-06-26 只读采样结果：启动 warmup 后，7 个 Dashboard 聚合接口冷并发总耗时约 3.4s；`keywords` 约 0.95s，`dna/top-roles` 约 2.37s，`top-risks` 约 2.55s，`overview` 约 2.75s，`trend` 约 3.22s，`cost-range` 约 3.40s。
- 2026-06-26 Express 路由只读采样结果：启动 warmup 后，7 个 Dashboard 聚合接口冷并发总耗时约 3.23s，全部返回 200；最慢的 `/api/dashboard/cost-range` 约 3.22s。
- 当前仍未执行完整 PostgreSQL regression；因为该脚本会写测试数据/cleanup，不适合直接跑在唯一真实库。

## Key Changes

- 修复连接池热路径问题：
  - `/api/health` 不再每次调用会重建连接池的 `db.init()`。
  - `db.init()` 调整为同配置幂等：同一个 `DB_TYPE` / `DATABASE_URL` 已初始化时直接复用连接池，只有显式 `db.close()` 或配置变化才重建。
  - 健康检查只在现有连接上执行轻量 `SELECT 1`。

- 移除普通 GET 请求里的 schema 初始化成本：
  - 已把配置、项目、招标站点、招标暂存、联网搜索结果、AI 日志相关 schema ensure 预热到启动阶段。
  - 请求路径仍保留 `ensureSchema()` 兜底，避免旧库/重连场景缺字段直接失效；但正常启动后的首个 GET 不再承担 schema 检查成本。
  - 后续如果只读复测仍显示某个 GET 首包慢，再对该 model 做更细的“启动迁移 + 请求路径只读化”。

- 补齐慢接口相关索引：
  - `prompt_templates`：已补充 `/api/config/prompts` 的分页排序与常见筛选索引。
  - `ai_model_configs`：已补充 `/api/config/ai-models` 的列表排序与启用状态筛选索引。
  - `opportunity_bidding_sites`：已补充 `/api/opportunity/bidding-sites` 的默认排序、`enabled`、`validation_status` 过滤索引。
  - `ai_assessment_logs`：已补充监控日志 `step`、`project_id`、`request_hash` 与 log_dir 更新路径索引。
  - `projects`：已补充 Dashboard cost-range 和非模板项目更新时间索引。

- Dashboard 优化：
  - 保留现有 Dashboard 缓存，包括 `/api/dashboard/top-risks` 的缓存策略。
  - `/api/dashboard/cost-range` 改为数据库侧分桶聚合，避免拉全量项目再 JS 统计。
  - `/api/dashboard/overview` 改为单次数据库指标查询；合同总数保留现有 TTL 缓存。
  - `/api/dashboard/keywords` 只查询 `name/description`，不再等待 assessment JSON 大缓存。
  - `/api/dashboard/dna`、`/api/dashboard/top-roles`、`/api/dashboard/top-risks` 共享 assessment JSON 短缓存和 in-flight 去重。
  - `/api/dashboard/top-risks` 风险配置白名单加入同 TTL 短缓存，保留既有 dashboard 缓存语义。
  - Dashboard 聚合读操作通过 service 内部串行读队列执行，避免首屏多接口并发时连接池同时建立多条 PostgreSQL 冷连接。
  - `/api/dashboard/top-risks` 暂不重构为统计表；如果数据量继续增长导致 JSON 解析超过目标，再规划风险统计表或物化视图。

## Test Plan

- 当前真实库只做只读验证：
  - 对慢接口逐个执行 GET 采样，记录耗时，不插入、不删除、不更新业务数据。
  - 使用 `EXPLAIN` / `EXPLAIN ANALYZE` 检查慢 SQL 计划，确认是否走索引。
  - 打开慢查询日志阈值，定位具体 SQL 或非 SQL 阻塞点。
  - 验证 `/api/health` 连续请求不再触发连接池重建。

- 不在当前库执行：
  - 不跑会创建测试数据的完整 PostgreSQL regression 脚本。
  - 不执行自动 cleanup。
  - 不做破坏性数据操作。

已执行的 schema 写入仅限人工确认后的幂等索引创建，使用 `CREATE INDEX CONCURRENTLY IF NOT EXISTS`，不写业务数据。

- 若需要完整回归：
  - 先准备单独测试库或 staging 库。
  - 再跑完整 query performance regression。
  - 验收目标：超过 5s 的接口全部降到 5s 以下；健康检查、配置列表、普通分页列表尽量低于 1s。

## Assumptions

- 当前库是唯一可用业务库，默认只读验证。
- 索引和 schema 迁移属于写 schema 操作，执行前需要单独确认；本轮慢查询索引已确认并执行。
- `/api/dashboard/top-risks` 现有缓存保留；第一阶段不移除、不弱化。
- 不改变现有 API 路径、参数和响应结构。
