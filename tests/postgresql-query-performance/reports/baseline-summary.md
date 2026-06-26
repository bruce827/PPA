# PostgreSQL Regression Performance Report

- Run ID: `query-performance`
- Generated at: 2026-06-25T06:32:23.165Z
- Total requests: 47

## Route Summary

| Method | Route | Count | Status | Avg ms | P95 ms | Max ms |
| --- | --- | --- | --- | --- | --- | --- |
| GET | /api/dashboard/overview | 1 | 200 | 32473.388 | 32473.388 | 32473.388 |
| GET | /api/config/prompts | 1 | 200 | 22554.451 | 22554.451 | 22554.451 |
| GET | /api/config/all | 1 | 500 | 18671.166 | 18671.166 | 18671.166 |
| GET | /api/opportunity/bidding-sites | 1 | 200 | 11037.999 | 11037.999 | 11037.999 |
| GET | /api/health | 1 | 200 | 10026.956 | 10026.956 | 10026.956 |
| GET | /api/monitoring/logs | 1 | 200 | 9237.513 | 9237.513 | 9237.513 |
| GET | /api/dashboard/cost-range | 1 | 200 | 6948.945 | 6948.945 | 6948.945 |
| GET | /api/config/ai-models | 1 | 200 | 5276.669 | 5276.669 | 5276.669 |
| GET | /api/web3d/projects | 1 | 200 | 4884.356 | 4884.356 | 4884.356 |
| GET | /api/dashboard/top-risks | 1 | 200 | 4570.233 | 4570.233 | 4570.233 |
| GET | /api/dashboard/keywords | 1 | 200 | 4479.979 | 4479.979 | 4479.979 |
| GET | /api/web3d/ai/step4-prompts | 1 | 200 | 4203.444 | 4203.444 | 4203.444 |
| GET | /api/ai/module-prompts | 1 | 200 | 3813.075 | 3813.075 | 3813.075 |
| GET | /api/config/roles | 1 | 200 | 3116.539 | 3116.539 | 3116.539 |
| GET | /api/ai/workload-prompts | 1 | 200 | 2818.008 | 2818.008 | 2818.008 |
| GET | /api/web3d/config/workload-templates | 1 | 200 | 2161.399 | 2161.399 | 2161.399 |
| GET | /api/contracts/file | 1 | 200 | 1693.22 | 1693.22 | 1693.22 |
| GET | /api/ai/prompts | 1 | 200 | 1594.857 | 1594.857 | 1594.857 |
| GET | /api/ai/project-tag-prompts | 1 | 200 | 1580.418 | 1580.418 | 1580.418 |
| GET | /api/templates | 1 | 200 | 1564.506 | 1564.506 | 1564.506 |
| GET | /api/projects | 1 | 200 | 1449.788 | 1449.788 | 1449.788 |
| GET | /api/projects/:id/business-quote | 1 | 200 | 1404.557 | 1404.557 | 1404.557 |
| GET | /api/web3d/config/risk-items | 1 | 200 | 1170.142 | 1170.142 | 1170.142 |
| GET | /api/monitoring/stats | 1 | 200 | 1064.865 | 1064.865 | 1064.865 |
| GET | /api/config/travel-costs | 1 | 200 | 1055.169 | 1055.169 | 1055.169 |
| GET | /api/config/prompts/:id | 1 | 200 | 958.364 | 958.364 | 958.364 |
| GET | /api/templates/templates | 1 | 200 | 933.175 | 933.175 | 933.175 |
| GET | /api/opportunity/bidding-sites/:id | 1 | 200 | 808.484 | 808.484 | 808.484 |
| GET | /api/config/risk-items | 1 | 200 | 557.707 | 557.707 | 557.707 |
| GET | /api/monitoring/logs/:hash | 1 | 200 | 548.169 | 548.169 | 548.169 |
| GET | /api/dashboard/trend | 1 | 200 | 537.776 | 537.776 | 537.776 |
| GET | /api/wiki/relations | 1 | 200 | 534.695 | 534.695 | 534.695 |
| GET | /api/config/ai-models/current-vision | 1 | 404 | 525.575 | 525.575 | 525.575 |
| GET | /api/config/business-pricing | 1 | 200 | 522.897 | 522.897 | 522.897 |
| GET | /api/projects/:id/push-history | 1 | 200 | 509.616 | 509.616 | 509.616 |
| GET | /api/config/prompt-module-tags | 1 | 200 | 507.075 | 507.075 | 507.075 |
| GET | /api/config/ai-models/:id | 1 | 200 | 488.268 | 488.268 | 488.268 |
| GET | /api/projects/templates | 1 | 200 | 476.303 | 476.303 | 476.303 |
| GET | /api/config/ai-models/current | 1 | 200 | 455.816 | 455.816 | 455.816 |
| GET | /api/projects/:id | 1 | 200 | 443.168 | 443.168 | 443.168 |
| GET | /api/dashboard/top-roles | 1 | 200 | 12.765 | 12.765 | 12.765 |
| GET | /api/contracts/files | 1 | 200 | 10.216 | 10.216 | 10.216 |
| GET | /api/dashboard/dna | 1 | 200 | 6.966 | 6.966 | 6.966 |
| GET | /api/projects/:id/attachments/check | 1 | 200 | 5.568 | 5.568 | 5.568 |
| GET | /api/wiki | 1 | 200 | 4.329 | 4.329 | 4.329 |
| GET | /api/projects/:id/attachments | 1 | 200 | 4.324 | 4.324 | 4.324 |
| GET | /api/wiki/content | 1 | 200 | 2.256 | 2.256 | 2.256 |

## Slowest Calls

| Method | Path | Status | Duration ms | Test file | Test |
| --- | --- | --- | --- | --- | --- |
| GET | /api/dashboard/overview | 200 | 32473.388 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/config/prompts | 200 | 22554.451 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/config/all | 500 | 18671.166 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/opportunity/bidding-sites | 200 | 11037.999 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/health | 200 | 10026.956 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/monitoring/logs | 200 | 9237.513 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/dashboard/cost-range | 200 | 6948.945 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/config/ai-models | 200 | 5276.669 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/web3d/projects | 200 | 4884.356 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/dashboard/top-risks | 200 | 4570.233 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/dashboard/keywords | 200 | 4479.979 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/web3d/ai/step4-prompts | 200 | 4203.444 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/ai/module-prompts | 200 | 3813.075 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/config/roles | 200 | 3116.539 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/ai/workload-prompts | 200 | 2818.008 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/web3d/config/workload-templates | 200 | 2161.399 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/contracts/file | 200 | 1693.22 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/ai/prompts | 200 | 1594.857 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/ai/project-tag-prompts | 200 | 1580.418 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/templates | 200 | 1564.506 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/projects | 200 | 1449.788 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/projects/138/business-quote | 200 | 1404.557 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/web3d/config/risk-items | 200 | 1170.142 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/monitoring/stats | 200 | 1064.865 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/config/travel-costs | 200 | 1055.169 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/config/prompts/41 | 200 | 958.364 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/templates/templates | 200 | 933.175 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/opportunity/bidding-sites/313 | 200 | 808.484 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/config/risk-items | 200 | 557.707 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
| GET | /api/monitoring/logs/69a292dbf7f370aae4e924367fb931e0ad84773c827bd8dd0b1b943a0daf8310 | 200 | 548.169 | query-performance.test.js | PostgreSQL regression - query API performance only GET query endpoints respond successfully and record timings |
