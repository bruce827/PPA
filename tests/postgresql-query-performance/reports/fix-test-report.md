# PostgreSQL Query Performance Fix Test Report

- Report date: 2026-06-26
- Scope: PostgreSQL slow GET/API optimization
- Related plan: `docs/postgresql-query-performance-optimization-plan.md`
- Baseline report: `_bmad-output/test-artifacts/postgresql-regression-performance/query-performance/summary.md`
- Verification mode: real PostgreSQL read-only sampling plus focused automated tests

## Summary

This fix round completed the first-stage slow API optimization plan. The main verified improvement is the Dashboard query path: after startup warmup, seven Dashboard aggregation endpoints can be requested concurrently and complete in about 3.23s total, with every endpoint returning HTTP 200 and staying below the 5s target.

Full PostgreSQL regression was intentionally not executed because the available database is the only business database and the full regression flow writes and cleans test data.

## Changes Under Test

- Database initialization:
  - `db.init()` is same-config idempotent.
  - `/api/health` uses the existing connection instead of rebuilding the pool.

- Startup warmup:
  - Schema ensure work is moved to startup warmup for config, projects, bidding sites, tender staging, tender web search results, AI logs, and contract total row count.
  - Request-path fallback remains in place.

- PostgreSQL indexes:
  - 15 slow-query indexes were created with `CREATE INDEX CONCURRENTLY IF NOT EXISTS`.
  - The expected indexes were verified in `pg_indexes`.

- Dashboard:
  - `/api/dashboard/overview` uses one metrics query.
  - `/api/dashboard/cost-range` uses database-side bucket aggregation.
  - `/api/dashboard/keywords` uses the lightweight text-only query.
  - `/api/dashboard/dna`, `/api/dashboard/top-roles`, and `/api/dashboard/top-risks` share short-lived assessment JSON cache with in-flight de-duplication.
  - `/api/dashboard/top-risks` caches the risk whitelist for the same short TTL.
  - Dashboard aggregation DB reads are serialized inside the service to avoid PostgreSQL cold-connection fan-out under first-screen concurrent GET requests.

## Automated Test Results

Command:

```bash
cd server
npm test -- dashboardServiceCache.test.js dbAdapter.test.js slowQueryIndexes.test.js schemaWarmupService.test.js --watchman=false
```

Result:

| Suite | Result |
| --- | --- |
| `dashboardServiceCache.test.js` | PASS |
| `dbAdapter.test.js` | PASS |
| `slowQueryIndexes.test.js` | PASS |
| `schemaWarmupService.test.js` | PASS |
| Total | 4 suites, 16 tests passed |

Additional syntax checks were run for the touched Dashboard files during the fix:

```bash
node --check server/services/dashboardService.js
node --check server/models/dashboardModel.js
node --check server/tests/dashboardServiceCache.test.js
```

All syntax checks passed.

## Read-Only Performance Sampling

### Direct Model Profiling

Purpose: compare text-only project query with assessment JSON query.

| Query | Rows | Payload | Duration |
| --- | ---: | ---: | ---: |
| Project text only | 43 | 16,347 bytes | 360ms |
| Assessment details | 43 | 1,316,864 bytes | 1,356ms |
| Combined dashboard project data | 43 | 1,333,168 bytes | 1,414ms |

Finding: `keywords` should not wait on the large assessment JSON query.

### Service Profiling After Query Split

| Call | Result Size | Duration |
| --- | ---: | ---: |
| `keywords` | 50 | 344ms |
| `dna` | 5 | 1,420ms |
| `topRoles` | 5 | 8ms |
| `topRisks` | 10 | 1,376ms |
| `overview` | 6 | 661ms |
| Warm-cache parallel total | - | 229ms |

### Cold Concurrent Dashboard Sampling

Without startup warmup, the Dashboard service-level cold concurrent run improved from the earlier 13s-level connection fan-out behavior to about 5.31s after the internal serialized DB read queue.

After startup warmup, service-level cold concurrent sampling completed in about 3.40s.

| Endpoint | Duration |
| --- | ---: |
| `keywords` | 949ms |
| `dna` | 2,368ms |
| `topRoles` | 2,368ms |
| `topRisks` | 2,552ms |
| `overview` | 2,753ms |
| `trend` | 3,221ms |
| `costRange` | 3,401ms |
| Total concurrent wall time | 3,402ms |

### Express Route Sampling

Verification path: in-process Express + Supertest against the real PostgreSQL database, with startup warmup executed first. This does not start an external server and does not write business data.

| Endpoint | Status | Duration |
| --- | ---: | ---: |
| `/api/dashboard/keywords` | 200 | 1,117ms |
| `/api/dashboard/dna` | 200 | 2,462ms |
| `/api/dashboard/top-roles` | 200 | 2,462ms |
| `/api/dashboard/top-risks` | 200 | 2,681ms |
| `/api/dashboard/overview` | 200 | 2,866ms |
| `/api/dashboard/trend` | 200 | 3,045ms |
| `/api/dashboard/cost-range` | 200 | 3,224ms |
| Total concurrent wall time | - | 3,226ms |

Result: all sampled Dashboard endpoints are below the 5s target in the validated startup-warm path.

## Baseline Comparison

Selected slow baseline entries from `summary.md` before this optimization:

| Endpoint | Baseline Duration |
| --- | ---: |
| `/api/dashboard/overview` | 32,473ms |
| `/api/dashboard/cost-range` | 6,949ms |
| `/api/dashboard/top-risks` | 4,570ms |
| `/api/dashboard/keywords` | 4,480ms |
| `/api/dashboard/trend` | 538ms |
| `/api/dashboard/top-roles` | 13ms |
| `/api/dashboard/dna` | 7ms |

Latest verified Dashboard concurrent route sampling after the fix:

| Endpoint | Latest Duration | Status |
| --- | ---: | --- |
| `/api/dashboard/overview` | 2,866ms | Improved below 5s |
| `/api/dashboard/cost-range` | 3,224ms | Improved below 5s |
| `/api/dashboard/top-risks` | 2,681ms | Below 5s |
| `/api/dashboard/keywords` | 1,117ms | Improved below 5s |
| `/api/dashboard/trend` | 3,045ms | Below 5s in concurrent cold sample |
| `/api/dashboard/top-roles` | 2,462ms | Below 5s in concurrent cold sample |
| `/api/dashboard/dna` | 2,462ms | Below 5s in concurrent cold sample |

## Data Safety

- No full PostgreSQL regression was run in this validation pass.
- No business data insert/update/delete was executed during the performance sampling.
- Schema writes in this overall optimization were limited to the previously approved idempotent concurrent index creation.

## Remaining Risk

- The full query-performance regression report has not been regenerated because it would require a separate test/staging database.
- `ai_assessment_logs` still performs index ensure work during startup warmup. This affects startup time, not the optimized GET request hot path.
- If Dashboard data volume grows substantially, `/api/dashboard/top-risks` may need a risk summary table or materialized view instead of parsing assessment JSON on cache refresh.

## Verdict

First-stage slow API optimization is verified for the Dashboard path. The current read-only evidence shows the previously slow Dashboard aggregation endpoints are under the 5s target after startup warmup.
