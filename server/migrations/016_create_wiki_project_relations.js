/**
   * 物理迁移脚本：创建 wiki_project_relations 关联关系表
   */
const db = require('../utils/db');

exports.up = async function () {
  await db.run(`
    CREATE TABLE IF NOT EXISTS wiki_project_relations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wiki_key TEXT NOT NULL,
      project_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(wiki_key, project_id)
    )
  `);

  // 创建辅助索引提升多对多查询性能
  await db.run(`CREATE INDEX IF NOT EXISTS idx_wiki_relations_wiki_key ON wiki_project_relations(wiki_key)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_wiki_relations_project_id ON wiki_project_relations(project_id)`);

  console.log('wiki_project_relations table created successfully');
};

exports.down = async function () {
  await db.run('DROP TABLE IF EXISTS wiki_project_relations');
};
