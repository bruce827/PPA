/**
 * 测试辅助函数 - 支持 SQLite 和 PostgreSQL
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const dbUtil = require('../utils/db');
const { initDatabase } = require('../init-db');

/**
 * 检测当前是否使用 PostgreSQL
 */
function isPostgresMode() {
  return process.env.DB_TYPE === 'postgres';
}

/**
 * 初始化测试数据库
 * PostgreSQL 模式：使用现有的 .env 配置
 * SQLite 模式：创建临时数据库文件
 *
 * @returns {Promise<{dbPath: string|null, isPostgres: boolean}>}
 */
async function initTestDatabase() {
  if (isPostgresMode()) {
    console.log('🔌 使用 PostgreSQL 测试环境');
    await dbUtil.init();
    return { dbPath: null, isPostgres: true };
  } else {
    console.log('🔌 使用 SQLite 测试环境');
    const dbPath = path.join(
      os.tmpdir(),
      `ppa.test.${process.pid}.${Date.now()}.db`
    );

    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    await initDatabase(dbPath);
    await dbUtil.init(dbPath);
    return { dbPath, isPostgres: false };
  }
}

/**
 * 清理测试数据库
 *
 * @param {string|null} dbPath - SQLite 数据库路径
 * @param {boolean} isPostgres - 是否为 PostgreSQL 模式
 */
async function cleanupTestDatabase(dbPath, isPostgres) {
  await dbUtil.close();

  if (!isPostgres && dbPath && fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch (err) {
      console.warn('清理临时数据库失败:', err.message);
    }
  }
}

/**
 * PostgreSQL 模式下的事务保护
 * 在 beforeAll 中开启事务，在 afterAll 中回滚
 *
 * @returns {Promise<{begin: boolean, rollback: () => Promise<void>}>}
 */
async function setupTransactionProtection() {
  if (isPostgresMode()) {
    await dbUtil.run('BEGIN');
    console.log('🔒 已开启测试事务');
    return {
      begin: true,
      rollback: async () => {
        try {
          await dbUtil.run('ROLLBACK');
          console.log('✅ 已回滚测试事务');
        } catch (err) {
          console.warn('回滚事务失败:', err.message);
        }
      }
    };
  }
  return { begin: false, rollback: async () => {} };
}

module.exports = {
  isPostgresMode,
  initTestDatabase,
  cleanupTestDatabase,
  setupTransactionProtection
};
