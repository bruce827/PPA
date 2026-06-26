#!/bin/bash

# 健康检查请求示例
# 
# 功能：检查系统健康状态和数据库连接
# 
# 使用方法：
#   chmod +x health-check.sh
#   ./health-check.sh

# 设置变量
BASE_URL="http://localhost:3001"
ENDPOINT="/api/health"

echo "🏥 PPA系统健康检查"
echo "=================="
echo ""

# 发送请求
echo "📡 发送请求到: ${BASE_URL}${ENDPOINT}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}${ENDPOINT}")

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
    echo "✅ 系统状态正常"
    
    # 检查数据库连接
    DB_CONNECTED=$(echo "$HTTP_BODY" | jq -r '.data.database.connected' 2>/dev/null)
    if [ "$DB_CONNECTED" = "true" ]; then
        echo "✅ 数据库连接正常"
    else
        echo "❌ 数据库连接异常"
    fi
    
    # 显示系统信息
    UPTIME=$(echo "$HTTP_BODY" | jq -r '.data.uptime' 2>/dev/null)
    ENVIRONMENT=$(echo "$HTTP_BODY" | jq -r '.data.environment' 2>/dev/null)
    
    echo ""
    echo "📋 系统信息:"
    echo "   - 运行时间: ${UPTIME}秒"
    echo "   - 运行环境: ${ENVIRONMENT}"
else
    echo "❌ 系统状态异常"
    echo "   请检查服务器是否正常运行"
fi

echo ""
echo "🔗 相关链接:"
echo "   - Swagger文档: ${BASE_URL}/api-docs"
echo "   - 健康检查: ${BASE_URL}${ENDPOINT}"