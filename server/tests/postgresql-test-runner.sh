#!/bin/bash
# PostgreSQL 专项测试批量运行脚本
# 自动设置 PostgreSQL 环境变量并运行测试

set -e

export DB_TYPE=postgres
export NODE_ENV=test

echo "========================================="
echo "PostgreSQL 专项测试批量运行"
echo "========================================="
echo ""

# 核心专项测试列表
CORE_TESTS=(
  "aiModelAPI.test.js"
  "aiModelService.test.js"
  "attachmentService.test.js"
  "contractsAPI.test.js"
  "calculationAPI.test.js"
  "calculationService.test.js"
)

# 业务专项测试列表
BUSINESS_TESTS=(
  "biddingSitesAPI.test.js"
  "businessQuoteAPI.test.js"
  "tenderStagingService.test.js"
  "monitoringAPI.test.js"
  "wikiAPI.test.js"
)

# 其他专项测试
OTHER_TESTS=(
  "web3d.service.test.js"
  "formDesign.js"
  "dataMetrics.js"
)

run_test_suite() {
  local suite_name=$1
  shift
  local tests=("$@")

  echo "📋 $suite_name"
  echo "-----------------------------------------"

  local passed=0
  local failed=0
  local total=${#tests[@]}

  for test in "${tests[@]}"; do
    echo "运行: $test"
    if npm test -- "$test" --silent 2>&1 | grep -q "Test Suites:.*passed"; then
      echo "  ✅ 通过"
      ((passed++))
    else
      echo "  ❌ 失败"
      ((failed++))
    fi
  done

  echo ""
  echo "$suite_name 结果: $passed/$total 通过"
  echo ""
}

# 运行核心测试
run_test_suite "核心专项测试" "${CORE_TESTS[@]}"

# 运行业务测试
run_test_suite "业务专项测试" "${BUSINESS_TESTS[@]}"

# 运行其他测试
run_test_suite "其他专项测试" "${OTHER_TESTS[@]}"

echo "========================================="
echo "所有测试完成"
echo "========================================="
