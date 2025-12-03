# Web3D 导出 API 冒烟测试方案

目的：验证 Web3D 后端接口创建 → 导出 → 清理的闭环可用，确保导出 XLSX 生成正常且不留下脏数据。

## 前置条件
- 后端已启动，监听 `http://localhost:3001`
- 已执行 Web3D 迁移与种子（`node migrations/004_web3d_assessment.js`、`node seed-data/seed-web3d.js`）
- 已安装 `jq`（用于解析创建接口返回的 `id`）
- 角色与单价已在“参数配置/角色与单价管理”中配置（工作量行需指定 `role_name`，成本由角色单价驱动）

## 一键冒烟脚本（推荐）
在仓库根目录运行：

```bash
#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://localhost:3001/api/web3d"
TMP_JSON=$(mktemp)
OUT_XLSX="web3d-export-demo.xlsx"

cat > "$TMP_JSON" <<'JSON'
{
  "name": "Web3D Export Demo",
  "description": "temp export test",
  "assessment": {
    "risk_selections": [
      { "item_name": "技术路线", "selected_value": 3 },
      { "item_name": "数据质量", "selected_value": 5 }
    ],
    "workload_items": [
      { "category": "data_processing", "item_name": "BIM 清洗与轻量化", "quantity": 1, "role_name": "前端开发" },
      { "category": "core_dev", "item_name": "场景搭建与基础交互", "quantity": 1, "role_name": "前端开发" }
    ],
    "mix_tech": false
  }
}
JSON

echo "Creating Web3D project..."
project_id=$(curl -s -X POST "$BASE_URL/projects" \
  -H "Content-Type: application/json" \
  --data @"$TMP_JSON" | jq -r '.id')

if [ -z "$project_id" ] || [ "$project_id" = "null" ]; then
  echo "Create failed"; rm -f "$TMP_JSON"; exit 1; fi
echo "Created project id: $project_id"

echo "Downloading export to $OUT_XLSX..."
curl -s -L "$BASE_URL/projects/$project_id/export" -o "$OUT_XLSX"
echo "Export saved: $OUT_XLSX"

echo "Cleaning up project..."
curl -s -X DELETE "$BASE_URL/projects/$project_id" >/dev/null
rm -f "$TMP_JSON"
echo "Done (project deleted)."
```

预期结果：
- 终端显示创建的 `project id`，并提示导出完成
- 生成文件 `web3d-export-demo.xlsx`，包含 Summary / 风险选择 / 工作量明细
- 项目被删除（数据库无残留）

## 手动步骤（无需 jq）
1. 创建项目：`POST http://localhost:3001/api/web3d/projects`（请求体同上），记下响应中的 `id`
2. 导出：`GET http://localhost:3001/api/web3d/projects/{id}/export` 保存 XLSX
3. 清理：`DELETE http://localhost:3001/api/web3d/projects/{id}`

## 常见问题
- 连接失败：确认后端监听 3001，或防火墙/权限允许本机访问。
- 导出空白：检查是否已跑过 Web3D 种子，确保风险项/工作量模板存在。
