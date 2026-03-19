const db = require('../utils/db');

async function getCurrentModel() {
  return db.get(
    'SELECT * FROM ai_model_configs WHERE is_current = 1'
  );
}

async function getAllModels(filters = {}) {
  const { supports_web_search, is_active } = filters;
  let sql = 'SELECT * FROM ai_model_configs WHERE 1 = 1';
  const params = [];

  if (supports_web_search !== undefined && supports_web_search !== null && supports_web_search !== '') {
    sql += ' AND supports_web_search = ?';
    params.push(supports_web_search);
  }

  if (is_active !== undefined && is_active !== null && is_active !== '') {
    sql += ' AND is_active = ?';
    params.push(is_active);
  }

  sql += ' ORDER BY is_current DESC, created_at DESC';
  return db.all(sql, params);
}

async function getModelById(id) {
  return db.get(
    'SELECT * FROM ai_model_configs WHERE id = ?',
    [id]
  );
}

async function createModel(model) {
  const {
    config_name,
    description,
    provider,
    api_key,
    api_host,
    model_name,
    temperature,
    max_tokens,
    timeout,
    is_current,
    is_active,
    supports_web_search,
  } = model;

  if (is_current === 1) {
    await db.run('UPDATE ai_model_configs SET is_current = 0');
  }

  const result = await db.run(
    `INSERT INTO ai_model_configs 
       (config_name, description, provider, api_key, api_host, model_name, 
        temperature, max_tokens, timeout, is_current, is_active, supports_web_search, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      config_name,
      description,
      provider,
      api_key,
      api_host,
      model_name,
      temperature,
      max_tokens,
      timeout,
      is_current,
      is_active,
      supports_web_search,
    ]
  );

  return getModelById(result.id);
}

async function updateModel(id, model) {
  const {
    config_name,
    description,
    provider,
    api_key,
    api_host,
    model_name,
    temperature,
    max_tokens,
    timeout,
    is_current,
    is_active,
    supports_web_search,
  } = model;

  if (is_current === 1) {
    await db.run('UPDATE ai_model_configs SET is_current = 0 WHERE id != ?', [id]);
  }

  await db.run(
    `UPDATE ai_model_configs 
       SET config_name = ?, description = ?, provider = ?, api_key = ?, 
           api_host = ?, model_name = ?, temperature = ?, max_tokens = ?, 
           timeout = ?, is_current = ?, is_active = ?, supports_web_search = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    [
      config_name,
      description,
      provider,
      api_key,
      api_host,
      model_name,
      temperature,
      max_tokens,
      timeout,
      is_current,
      is_active,
      supports_web_search,
      id,
    ]
  );

  return getModelById(id);
}

async function deleteModel(id) {
  return db.run('DELETE FROM ai_model_configs WHERE id = ?', [id]);
}

async function setCurrentModel(id) {
  await db.run('BEGIN TRANSACTION');
  try {
    await db.run('UPDATE ai_model_configs SET is_current = 0');
    await db.run(
      'UPDATE ai_model_configs SET is_current = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

async function updateTestResult(id, testStatus) {
  return db.run(
    `UPDATE ai_model_configs 
       SET last_test_time = CURRENT_TIMESTAMP, 
           test_status = ?
       WHERE id = ?`,
    [testStatus, id]
  );
}

module.exports = {
  getCurrentModel,
  getAllModels,
  getModelById,
  createModel,
  updateModel,
  deleteModel,
  setCurrentModel,
  updateTestResult,
};
