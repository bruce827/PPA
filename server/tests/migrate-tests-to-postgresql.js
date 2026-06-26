#!/usr/bin/env node

/**
 * 批量修改测试文件以支持 PostgreSQL
 *
 * 自动识别并替换以下模式：
 * 1. 替换 SQLite 临时数据库初始化逻辑
 * 2. 替换 db.init() 调用
 * 3. 替换 afterAll 清理逻辑
 */

const fs = require('fs');
const path = require('path');

const TESTS_DIR = path.join(__dirname);
const BACKUP_DIR = path.join(__dirname, 'backup-postgresql-migration');

// 需要排除的文件（已完成或不适用）
const EXCLUDE_FILES = new Set([
  'test-helper.js',
  'dbAdapter.test.js',
  'migrationScripts.test.js',
  'verify-transaction-rollback.js',
  'api-smoke-runner.js',
  'run-postgresql-tests.sh',
  'backup-tests.sh',
  'migrate-tests-to-postgresql.js'
]);

// 旧的初始化模式（SQLite）
const OLD_PATTERNS = [
  /const TEST_DB_PATH = path\.join\(\s*os\.tmpdir\(\),\s*`ppa\.\w+\.\$\{process\.pid\}\.\$\{Date\.now\(\)\}.db`\s*\);/g,
  /if \(fs\.existsSync\(TEST_DB_PATH\)\) \{\s*fs\.unlinkSync\(TEST_DB_PATH\);\s*}/g,
  /await initDatabase\(TEST_DB_PATH\);/g,
  /await db\.init\(TEST_DB_PATH\);/g,
  /await db\.close\(\);\s*try \{\s*if \(fs\.existsSync\(TEST_DB_PATH\)\) \{\s*fs\.unlinkSync\(TEST_DB_PATH\);\s*}\s*} catch \(_error\) {}/
];

// 新的初始化代码（PostgreSQL + SQLite 兼容）
const NEW_IMPORTS = `const { initTestDatabase, cleanupTestDatabase, setupTransactionProtection } = require('./test-helper');`;

const NEW_BEFORE_ALL = `  let testContext;

  beforeAll(async () => {
    testContext = await initTestDatabase();
    await setupTransactionProtection();
  });`;

const NEW_AFTER_ALL = `  afterAll(async () => {
    if (testContext) {
      await cleanupTestDatabase(testContext.dbPath, testContext.isPostgres);
    }
  });`;

/**
 * 迁移单个测试文件
 */
function migrateTestFile(filePath) {
  const filename = path.basename(filePath);
  console.log(`📝 处理: ${filename}`);

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // 1. 添加新的 import
  if (!content.includes('test-helper')) {
    // 在最后一个 require 语句后添加
    content = content.replace(
      /(const \{ app \} = require\('\.\.\/index'\);\s*const db = require\('\.\.\/utils\/db'\))/,
      `$1;\n${NEW_IMPORTS}`
    );
  }

  // 2. 替换 beforeAll
  content = content.replace(
    /beforeAll\(async \(\) => \{[\s\S]*?\n  \}\);/,
    NEW_BEFORE_ALL
  );

  // 3. 替换 afterAll
  content = content.replace(
    /afterAll\(async \(\) => \{[\s\S]*?\n  \}\);/,
    NEW_AFTER_ALL
  );

  // 如果内容改变了，写入文件
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ 已更新`);
    return true;
  } else {
    console.log(`  ⏭️  无需修改或已符合新模式`);
    return false;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('=========================================');
  console.log('批量迁移测试文件到 PostgreSQL');
  console.log('=========================================');
  console.log('');

  // 获取所有测试文件
  const testFiles = fs.readdirSync(TESTS_DIR)
    .filter(f => f.endsWith('.test.js'))
    .filter(f => !EXCLUDE_FILES.has(f))
    .map(f => path.join(TESTS_DIR, f));

  console.log(`📊 找到 ${testFiles.length} 个测试文件需要处理\n`);

  let updated = 0;
  let skipped = 0;

  for (const file of testFiles) {
    try {
      if (migrateTestFile(file)) {
        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`  ❌ 错误: ${err.message}`);
    }
    console.log('');
  }

  console.log('=========================================');
  console.log('迁移完成');
  console.log('=========================================');
  console.log(`总计: ${testFiles.length}`);
  console.log(`✅ 已更新: ${updated}`);
  console.log(`⏭️  跳过: ${skipped}`);
  console.log('');
  console.log('⚠️  请运行测试验证修改是否正确:');
  console.log('   npm test -- <test-file>.test.js');
}

main();
