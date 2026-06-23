const db = require('../utils/db');

/**
 * 获取某个 Wiki Key 关联的所有项目 ID 列表
 * @param {string} wikiKey Wiki 相对路径
 * @returns {Promise<number[]>} 项目 ID 数组
 */
exports.getProjectIdsByWikiKey = async (wikiKey) => {
  const rows = await db.all(
    'SELECT project_id FROM wiki_project_relations WHERE wiki_key = ?',
    [wikiKey]
  );
  return rows.map(row => row.project_id);
};

/**
 * 获取某个项目关联的所有 Wiki Key 列表
 * @param {number} projectId 项目 ID
 * @returns {Promise<string[]>} Wiki Key 相对路径数组
 */
exports.getWikiKeysByProjectId = async (projectId) => {
  const rows = await db.all(
    'SELECT wiki_key FROM wiki_project_relations WHERE project_id = ?',
    [projectId]
  );
  return rows.map(row => row.wiki_key);
};

/**
 * 覆盖保存 Wiki 关联的项目列表 (BEGIN IMMEDIATE 事务防写锁死)
 * @param {string} wikiKey Wiki 相对路径
 * @param {number[]} projectIds 项目 ID 数组
 */
exports.saveProjectRelationsForWiki = async (wikiKey, projectIds) => {
  await db.run('BEGIN IMMEDIATE');
  try {
    // 1. 删除旧关联
    await db.run('DELETE FROM wiki_project_relations WHERE wiki_key = ?', [wikiKey]);
    
    // 2. 批量插入新关联 (INSERT OR IGNORE 容错)
    if (projectIds && projectIds.length > 0) {
      for (const projectId of projectIds) {
        await db.run(
          'INSERT OR IGNORE INTO wiki_project_relations (wiki_key, project_id) VALUES (?, ?)',
          [wikiKey, projectId]
        );
      }
    }
    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
};

/**
 * 覆盖保存项目关联的 Wiki 列表 (BEGIN IMMEDIATE 事务防写锁死)
 * @param {number} projectId 项目 ID
 * @param {string[]} wikiKeys Wiki 相对路径数组
 */
exports.saveWikiRelationsForProject = async (projectId, wikiKeys) => {
  await db.run('BEGIN IMMEDIATE');
  try {
    // 1. 删除旧关联
    await db.run('DELETE FROM wiki_project_relations WHERE project_id = ?', [projectId]);
    
    // 2. 批量插入新关联 (INSERT OR IGNORE 容错)
    if (wikiKeys && wikiKeys.length > 0) {
      for (const wikiKey of wikiKeys) {
        await db.run(
          'INSERT OR IGNORE INTO wiki_project_relations (wiki_key, project_id) VALUES (?, ?)',
          [wikiKey, projectId]
        );
      }
    }
    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
};
