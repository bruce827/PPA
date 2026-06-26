#!/bin/bash

# 批量运行所有专项测试（在 PostgreSQL 环境下）

echo "========================================="
echo "PPA PostgreSQL 迁移 - 专项测试批量运行"
echo "========================================="
echo ""

# 确保使用 PostgreSQL
export DB_TYPE=postgres
export NODE_ENV=test

# 测试文件列表
TEST_FILES=(
  "calculationAPI.test.js"
  "aiModelAPI.test.js"
  "attachmentService.test.js"
  "contractsAPI.test.js"
  "biddingSitesAPI.test.js"
)

PASSED=0
FAILED=0
TOTAL=${#TEST_FILES[@]}

for test_file in "${TEST_FILES[@]}"; do
  echo "📋 运行测试: $test_file"
  echo "-----------------------------------------"

  if npm test -- "$test_file" --silent 2>&1 | grep -q "Test Suites:.*passed"; then
    echo "✅ $test_file 通过"
    ((PASSED++))
  else
    echo "❌ $test_file 失败"
    ((FAILED++))
  fi

  echo ""
done

echo "========================================="
echo "测试汇总"
echo "========================================="
echo "总计: $TOTAL"
echo "✅ 通过: $PASSED"
echo "❌ 失败: $FAILED"
echo "通过率: $(echo "scale=1; $PASSED * 100 / $TOTAL" | bc)%"
echo "========================================="
