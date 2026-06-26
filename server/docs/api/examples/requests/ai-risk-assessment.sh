#!/bin/bash

# AI风险评估请求示例
# 
# 功能：使用AI分析项目文档，识别和评估潜在风险
# 
# 使用方法：
#   chmod +x ai-risk-assessment.sh
#   ./ai-risk-assessment.sh

# 设置变量
BASE_URL="http://localhost:3001"
ENDPOINT="/api/ai/assess-risk"

# 项目文档内容（示例）
DOCUMENT='项目名称：电商平台开发项目

项目背景：
为公司开发全新的B2C电商平台，支持PC端和移动端。

技术栈：
- 前端：React + TypeScript + Ant Design
- 后端：Node.js + Express + MySQL
- 部署：Docker + Kubernetes

团队配置：
- 前端工程师：3人
- 后端工程师：3人
- 测试工程师：2人
- UI设计师：1人
- 项目经理：1人

项目周期：6个月

主要功能：
1. 用户管理：注册、登录、个人信息管理
2. 商品管理：商品展示、搜索、分类
3. 购物车：添加、删除、修改数量
4. 订单管理：下单、支付、物流跟踪
5. 支付系统：多种支付方式、退款处理
6. 数据分析：销售报表、用户行为分析'

echo "🤖 AI风险评估请求示例"
echo "======================"
echo ""

# 构建请求JSON
REQUEST_JSON=$(cat <<EOF
{
  "document": $(echo "$DOCUMENT" | jq -R -s .)
}
EOF
)

echo "📡 发送请求到: ${BASE_URL}${ENDPOINT}"
echo ""
echo "📄 请求内容:"
echo "$REQUEST_JSON" | jq . 2>/dev/null || echo "$REQUEST_JSON"
echo ""

# 发送请求
echo "⏳ 正在进行AI风险评估，请稍候..."
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
        echo "✅ AI风险评估完成"
        echo ""
        
        # 显示风险列表
        echo "📋 识别到的风险:"
        echo "$HTTP_BODY" | jq -r '.data.risks[] | "   - \(.name): \(.score)分 - \(.reasoning)"' 2>/dev/null
        
        # 显示总结
        SUMMARY=$(echo "$HTTP_BODY" | jq -r '.data.summary' 2>/dev/null)
        if [ "$SUMMARY" != "null" ]; then
            echo ""
            echo "📝 评估总结:"
            echo "   $SUMMARY"
        fi
        
        # 显示置信度和耗时
        CONFIDENCE=$(echo "$HTTP_BODY" | jq -r '.data.confidence' 2>/dev/null)
        DURATION=$(echo "$HTTP_BODY" | jq -r '.data.duration_ms' 2>/dev/null)
        
        if [ "$CONFIDENCE" != "null" ] && [ "$DURATION" != "null" ]; then
            echo ""
            echo "📊 评估信息:"
            echo "   - 置信度: ${CONFIDENCE}"
            echo "   - 评估耗时: ${DURATION}ms"
        fi
    else
        ERROR=$(echo "$HTTP_BODY" | jq -r '.error' 2>/dev/null)
        echo "❌ AI风险评估失败: ${ERROR}"
    fi
else
    echo "❌ 请求失败，状态码: ${HTTP_STATUS}"
    echo "   请检查:"
    echo "   1. 服务器是否正常运行"
    echo "   2. AI服务是否可用"
    echo "   3. 请求参数是否正确"
fi

echo ""
echo "🔗 相关链接:"
echo "   - Swagger文档: ${BASE_URL}/api-docs"
echo "   - AI风险评估: ${BASE_URL}${ENDPOINT}"