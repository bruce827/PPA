const db = require('../utils/db');

async function getAllPrompts() {
  const rows = await db.all(
    'SELECT id, name, description, content, variables_json, model_hint, updated_at FROM ai_prompts ORDER BY name ASC'
  );
  return rows;
}

async function getPromptById(promptId) {
  return db.get(
    'SELECT id, name, description, content, variables_json, model_hint, updated_at FROM ai_prompts WHERE id = ?',
    [promptId]
  );
}

module.exports = {
  getAllPrompts,
  getPromptById,
};
