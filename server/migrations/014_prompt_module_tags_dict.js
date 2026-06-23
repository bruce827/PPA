/**
 * ⚠️ [已废弃] Migration 014: 创建 prompt_module_tags 字典表
 *
 * 废弃原因: 本文件从未被 server/index.js 中的 migration 启动序列引用，
 *          属于孤立死代码（dead code）。保留作为历史参考，请勿执行。
 *
 * 替代方案: prompt_module_tags 表的定义和初始化已迁移至：
 * - server/services/promptModuleTagService.js 中的 createTag/getAllTags 等方法
 * - 前端通过 GET /api/config/prompt-module-tags 获取推荐标签列表
 *
 * 如需在已有数据库上创建 prompt_module_tags 表，请参考本文件逻辑自行手动执行。
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'ppa.db');

const RECOMMENDED_MODULE_TAGS = [
  {
    value: 'assessment',
    label: '评估流程',
    description: '评估流程中的 AI 分析（风险/工作量/模块分析）',
  },
  {
    value: 'web3d',
    label: '3D 模块',
    description: 'Web3D 模块的 AI 分析（Step4 图片分析等）',
  },
  {
    value: 'tender',
    label: '招标信息',
    description: '招标信息的解析、字段提取等',
  },
  {
    value: 'bidding_search',
    label: '全网招标检索',
    description: '全网招标信息的搜索与处理',
  },
  {
    value: 'report',
    label: '报告生成',
    description: '评估报告的生成',
  },
  {
    value: 'general',
    label: '通用',
    description: '通用模板，无特定模块归属',
  },
];

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
}

async function runMigration(databasePath = DEFAULT_DB_PATH) {
  console.log('开始创建提示词模块标签字典表...');

  const db = new sqlite3.Database(databasePath, (err) => {
    if (err) throw err;
  });

  try {
    // 检查表是否已存在
    const table = await new Promise((resolve, reject) => {
      db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='prompt_module_tags'",
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    if (table) {
      console.log('✅ prompt_module_tags 表已存在，跳过创建');
      return;
    }

    await exec(db, `
      CREATE TABLE IF NOT EXISTS prompt_module_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        value TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        description TEXT,
        is_recommended INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await exec(db, `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_module_tags_value ON prompt_module_tags(value);
    `);

    // 插入推荐标签
    for (let i = 0; i < RECOMMENDED_MODULE_TAGS.length; i++) {
      const tag = RECOMMENDED_MODULE_TAGS[i];
      await run(
        db,
        `INSERT INTO prompt_module_tags (value, label, description, is_recommended, sort_order)
         VALUES (?, ?, ?, 1, ?)`,
        [tag.value, tag.label, tag.description, i]
      );
    }

    console.log(`✅ prompt_module_tags 表创建完成，已写入 ${RECOMMENDED_MODULE_TAGS.length} 个推荐标签`);
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  } finally {
    await new Promise((resolve) => {
      db.close(() => resolve());
    });
  }
}

if (require.main === module) {
  runMigration().catch(() => process.exit(1));
}

module.exports = { runMigration };
