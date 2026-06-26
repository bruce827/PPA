#!/bin/bash

# 项目成本计算请求示例
# 
# 功能：根据评估数据实时计算项目成本
# 
# 使用方法：
#   chmod +x calculate-cost.sh
#   ./calculate-cost.sh

# 设置变量
BASE_URL="http://localhost:3001"
ENDPOINT="/api/calculate"

echo "💰 项目成本计算请求示例"
echo "========================"
echo ""

# 构建请求JSON
REQUEST_JSON='{
  "risk_scores": {
    "技术风险": 15,
    "进度风险": 12,
    "人员风险": 10,
    "需求风险": 8,
    "质量风险": 6
  },
  "roles": [
    {
      "role_name": "前端工程师",
      "unit_price": 1800
    },
    {
      "role_name": "后端工程师",
      "unit_price": 2000
    },
    {
      "role_name": "测试工程师",
      "unit_price": 1500
    },
    {
      "role_name": "UI设计师",
      "unit_price": 1600
    },
    {
      "role_name": "项目经理",
      "unit_price": 2500
    }
  ],
  "development_workload": [
    {
      "delivery_factor": 1.0,
      "前端工程师": 60,
      "后端工程师": 80,
      "测试工程师": 40,
      "UI设计师": 30,
      "项目经理": 20
    }
  ],
  "integration_workload": [
    {
      "delivery_factor": 1.1,
      "前端工程师": 15,
      "后端工程师": 20,
      "测试工程师": 10
    }
  ],
  "travel_months": 2,
  "travel_headcount": 3,
  "maintenance_months": 3,
  "maintenance_headcount": 2,
  "maintenance_daily_cost": 1600,
  "risk_items": [
    {
      "cost": 2.5
    },
    {
      "cost": 1.8
    }
  ]
}'

echo "📡 发送请求到: ${BASE_URL}${ENDPOINT}"
echo ""
echo "📄 请求内容:"
echo "$REQUEST_JSON" | jq . 2>/dev/null || echo "$REQUEST_JSON"
echo ""

# 发送请求
echo "⏳ 正在计算项目成本..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$REQUEST_JSON" \
  "${BASE_URL}${ENDPOINT}")

# 分离响应体和状态码
HTTP_BODY=$(echo "$RESPONSE" | sed '$d')
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)

echo "📊 响应状态码: ${HTTP_STATUS}"
echo ""
echo "📄 响应内容:"
echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"
echo ""

# 检查结果
if [ "$HTTP_STATUS" -eq 200 ]; then
    SUCCESS=$(echo "$HTTP_BODY" | jq -r '.success' 2>/dev/null)
    if [ "$SUCCESS" = "true" ]; then
        echo "✅ 项目成本计算完成"
        echo ""
        
        # 显示成本明细
        echo "💰 成本明细（单位：万元）:"
        echo "   - 软件开发成本: $(echo "$HTTP_BODY" | jq -r '.data.software_dev_cost' 2>/dev/null)"
        echo "   - 系统集成成本: $(echo "$HTTP_BODY" | jq -r '.data.system_integration_cost' 2>/dev/null)"
        echo "   - 差旅成本: $(echo "$HTTP_BODY" | jq -r '.data.travel_cost' 2>/dev/null)"
        echo "   - 维护成本: $(echo "$HTTP_BODY" | jq -r '.data.maintenance_cost' 2>/dev/null)"
        echo "   - 风险成本: $(echo "$HTTP_BODY" | jq -r '.data.risk_cost' 2>/dev/null)"
        echo ""
        
        # 显示总成本
        TOTAL_COST=$(echo "$HTTP_BODY" | jq -r '.data.total_cost' 2>/dev/null)
        TOTAL_COST_EXACT=$(echo "$HTTP_BODY" | jq -r '.data.total_cost_exact' 2>/dev/null)
        echo "📊 总成本:"
        echo "   - 精确值: ${TOTAL_COST_EXACT}万元"
        echo "   - 四舍五入: ${TOTAL_COST}万元"
        echo ""
        
        # 显示工作量
        echo "👥 工作量统计:"
        echo "   - 软件开发工作量: $(echo "$HTTP_BODY" | jq -r '.data.software_dev_workload_days' 2>/dev/null)人天"
        echo "   - 系统集成工作量: $(echo "$HTTP_BODY" | jq -r '.data.system_integration_workload_days' 2>/dev/null)人天"
        
        # 显示角色成本
        echo ""
        echo "👤 角色成本明细:"
        echo "$HTTP_BODY" | jq -r '.data.role_costs[] | "   - \(.role_name): \(.total_cost)万元 (\(.total_days)人天)"' 2>/dev/null
    else
        ERROR=$(echo "$HTTP_BODY" | jq -r '.error' 2>/dev/null)
        echo "❌ 项目成本计算失败: ${ERROR}"
    fi
else
    echo "❌ 请求失败，状态码: ${HTTP_STATUS}"
    echo "   请检查:"
    echo "   1. 服务器是否正常运行"
    echo "   2. 请求参数是否正确"
    echo "   3. 角色配置是否存在"
fi

echo ""
echo "🔗 相关链接:"
echo "   - Swagger文档: ${BASE_URL}/api-docs"
echo "   - 成本计算: ${BASE_URL}${ENDPOINT}"