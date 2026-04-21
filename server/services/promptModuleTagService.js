const db = require('../utils/db');

function getDb() {
  return db.getDb();
}

async function getAllTags() {
  const rows = await db.all(
    'SELECT * FROM prompt_module_tags ORDER BY sort_order ASC, id ASC'
  );
  return rows;
}

async function getTagByValue(value) {
  const row = await db.get(
    'SELECT * FROM prompt_module_tags WHERE value = ?',
    [value]
  );
  return row;
}

async function createTag({ value, label, description, is_recommended = 0, sort_order = 0 }) {
  if (!value || !label) {
    throw new Error('value 和 label 为必填字段');
  }
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    throw new Error('value 不能为空');
  }

  const existingByValue = await db.get(
    'SELECT id FROM prompt_module_tags WHERE value = ?',
    [normalized]
  );
  if (existingByValue) {
    throw new Error(`标签值 ${normalized} 已存在`);
  }

  const existingByLabel = await db.get(
    'SELECT id FROM prompt_module_tags WHERE label = ?',
    [label.trim()]
  );
  if (existingByLabel) {
    throw new Error(`标签名「${label.trim()}」已存在，请使用其他名称`);
  }

  const result = await db.run(
    `INSERT INTO prompt_module_tags (value, label, description, is_recommended, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [normalized, label.trim(), description || null, is_recommended ? 1 : 0, sort_order]
  );
  const id = typeof result.id === 'number' ? result.id : null;
  if (!id) {
    throw new Error('插入失败，无法获取新标签 ID');
  }
  return db.get('SELECT * FROM prompt_module_tags WHERE id = ?', [id]);
}

async function updateTag(id, { label, description, sort_order }) {
  const existing = await db.get('SELECT * FROM prompt_module_tags WHERE id = ?', [id]);
  if (!existing) {
    throw new Error('标签不存在');
  }

  await db.run(
    `UPDATE prompt_module_tags
     SET label = ?, description = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      label !== undefined ? label.trim() : existing.label,
      description !== undefined ? description : existing.description,
      sort_order !== undefined ? sort_order : existing.sort_order,
      id,
    ]
  );
  return db.get('SELECT * FROM prompt_module_tags WHERE id = ?', [id]);
}

async function deleteTag(id) {
  const existing = await db.get('SELECT * FROM prompt_module_tags WHERE id = ?', [id]);
  if (!existing) {
    throw new Error('标签不存在');
  }
  if (existing.is_recommended) {
    throw new Error('推荐标签不可删除');
  }
  await db.run('DELETE FROM prompt_module_tags WHERE id = ?', [id]);
}

module.exports = {
  getAllTags,
  getTagByValue,
  createTag,
  updateTag,
  deleteTag,
};
