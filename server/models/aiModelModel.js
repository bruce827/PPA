const db = require('../utils/db');

async function getCurrentModel() {
  return db.get(
    'SELECT * FROM ai_model_configs WHERE is_current = 1'
  );
}

async function getAllModels() {
  return db.all(
    'SELECT * FROM ai_model_configs ORDER BY is_current DESC, created_at DESC'
  );
}

async function getModelById(id) {
  return db.get(
    'SELECT * FROM ai_model_configs WHERE id = ?',
    [id]
  );
}

module.exports = {
  getCurrentModel,
  getAllModels,
  getModelById,
};
