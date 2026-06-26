const db = require('../utils/db');

/**
 * Web3D 项目相关的数据库操作
 */

const normalizeBooleanFlagForDb = (value) => {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value === 1 ? 1 : 0;
  if (typeof value === 'string') {
    return ['1', 'true', 'yes'].includes(value.trim().toLowerCase()) ? 1 : 0;
  }
  return 0;
};

const createProject = async (data) => {
  const {
    name,
    description,
    is_template = 0,
    final_total_cost,
    final_risk_score,
    final_workload_days,
    assessment_details_json
  } = data;

  const result = await db.run(
    `INSERT INTO projects
      (name, description, is_template, project_type, final_total_cost, final_risk_score, final_workload_days, assessment_details_json)
     VALUES (?, ?, ?, 'web3d', ?, ?, ?, ?)`,
    [
      name,
      description,
      normalizeBooleanFlagForDb(is_template),
      final_total_cost,
      final_risk_score,
      final_workload_days,
      assessment_details_json
    ]
  );
  return { id: result.id };
};

const updateProject = async (id, data) => {
  const {
    name,
    description,
    is_template = 0,
    final_total_cost,
    final_risk_score,
    final_workload_days,
    assessment_details_json
  } = data;

  const result = await db.run(
    `UPDATE projects
       SET name = ?, description = ?, is_template = ?, final_total_cost = ?, final_risk_score = ?, final_workload_days = ?, assessment_details_json = ?, project_type = 'web3d', updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND project_type = 'web3d'`,
    [
      name,
      description,
      normalizeBooleanFlagForDb(is_template),
      final_total_cost,
      final_risk_score,
      final_workload_days,
      assessment_details_json,
      id
    ]
  );
  return { updated: result.id };
};

const getProjectById = async (id) => {
  return await db.get(
    `SELECT * FROM projects WHERE id = ? AND project_type = 'web3d'`,
    [id]
  );
};

const getAllProjects = async () => {
  return await db.all(
    `SELECT id, name, description, is_template, final_total_cost, final_risk_score, final_workload_days, created_at
     FROM projects
     WHERE project_type = 'web3d'
     ORDER BY created_at DESC`
  );
};

const deleteProject = async (id) => {
  const result = await db.run(
    `DELETE FROM projects WHERE id = ? AND project_type = 'web3d'`,
    [id]
  );
  return { deleted: result.id };
};

const clearAllTemplateFlags = async () => {
  const result = await db.run(
    `UPDATE projects SET is_template = 0 WHERE project_type = 'web3d' AND is_template = 1`
  );
  return { updated: result.id };
};

module.exports = {
  createProject,
  updateProject,
  getProjectById,
  getAllProjects,
  deleteProject,
  clearAllTemplateFlags
};
