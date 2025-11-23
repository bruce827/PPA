# 手工接口验证（风险成本不乘评分因子）

用于本地手测 `/api/calculate` 改动：风险成本字段改为 `risk_cost_items`，且不再乘评分因子。

## 前置
1. 确保在项目根目录。
2. 后端启动（如需重启数据库可先 `cd server && node init-db.js`）：  
   ```bash
   cd server
   npm install   # 如未安装依赖
   node index.js # 端口 3001
   ```

## curl 示例
在另一个终端执行：
```bash
curl -v \
  -H 'Content-Type: application/json' \
  -d '{
    "risk_scores": {"架构": 10},
    "roles": [{"role_name": "前端", "unit_price": 1800}],
    "development_workload": [{"delivery_factor": 1, "scope_factor": 1, "tech_factor": 1, "前端": 5}],
    "integration_workload": [],
    "travel_months": 0,
    "travel_headcount": 0,
    "maintenance_months": 0,
    "maintenance_headcount": 0,
    "maintenance_daily_cost": 1600,
    "risk_cost_items": [{"description": "投标保证金", "cost": 2.5}]
  }' \
  http://127.0.0.1:3001/api/calculate
```

## 预期结果要点
- 响应 `risk_cost` 应为 `2.5`（万元），不随评分因子变化。
- `total_cost_exact/total_cost` 包含上述风险成本，加上研发成本等。
- `rating_factor` 应依据 `risk_scores` 计算（与风险成本无关）。
