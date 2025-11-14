/**
 * 将 prompt_templates 中的分类从中文别名统一迁移为英文标准：
 * - '成本估算'、'工作量评估' -> 'workload_evaluation'
 * 使用：node server/scripts/migrate-prompt-categories.js
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'ppa.db');

console.log('[migrate] DB:', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[migrate] open db failed:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(
    `UPDATE prompt_templates 
     SET category = 'workload_evaluation'
     WHERE category IN ('成本估算', '工作量评估')`,
    function (err) {
      if (err) {
        console.error('[migrate] update failed:', err.message);
      } else {
        console.log(`[migrate] updated rows: ${this.changes || 0}`);
      }
      db.close();
    },
  );
});

