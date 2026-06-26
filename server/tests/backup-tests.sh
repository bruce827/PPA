#!/bin/bash

# 批量修改测试文件以支持 PostgreSQL
# 自动替换数据库初始化逻辑

set -e

TESTS_DIR="tests"
BACKUP_DIR="tests/backup-postgresql-migration"

echo "========================================="
echo "批量修改测试文件支持 PostgreSQL"
echo "========================================="
echo ""

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 需要排除的文件（已完成或不适用）
EXCLUDE_FILES=(
  "test-helper.js"
  "dbAdapter.test.js"
  "migrationScripts.test.js"
  "verify-transaction-rollback.js"
  "api-smoke-runner.js"
  "run-postgresql-tests.sh"
)

# 备份所有测试文件
echo "📦 备份测试文件..."
for file in "$TESTS_DIR"/*.test.js; do
  filename=$(basename "$file")
  # 排除已在 exclude 列表中的文件
  skip=false
  for exclude in "${EXCLUDE_FILES[@]}"; do
    if [ "$filename" == "$exclude" ]; then
      skip=true
      break
    fi
  done

  if [ "$skip" == "false" ]; then
    cp "$file" "$BACKUP_DIR/"
    echo "  ✅ 备份: $filename"
  fi
done

echo ""
echo "✅ 备份完成，保存在: $BACKUP_DIR"
echo ""
echo "⚠️  注意：此脚本仅创建备份"
echo "实际修改需要手动或使用其他工具"
echo ""

# 统计
total=$(ls "$TESTS_DIR"/*.test.js 2>/dev/null | wc -l)
echo "总计测试文件: $total"
echo "已备份: $(ls "$BACKUP_DIR"/*.test.js 2>/dev/null | wc -l)"
