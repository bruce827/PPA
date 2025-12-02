const db = require('../utils/db');

const WORKLOAD_CATEGORIES = ['data_processing', 'core_dev', 'business_logic'];

// ============ 风险项 ============ //

const getRiskItems = async () => {
  return await db.all(
    'SELECT * FROM web3d_risk_items ORDER BY step_order ASC, id ASC'
  );
};

const createRiskItem = async (data) => {
  const { step_order, step_name, item_name, description, weight, options_json } = data;
  const result = await db.run(
    `INSERT INTO web3d_risk_items (step_order, step_name, item_name, description, weight, options_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [step_order, step_name, item_name, description, weight, options_json]
  );
  return { id: result.id };
};

const updateRiskItem = async (id, data) => {
  const { step_order, step_name, item_name, description, weight, options_json } = data;
  const result = await db.run(
    `UPDATE web3d_risk_items
       SET step_order = ?, step_name = ?, item_name = ?, description = ?, weight = ?, options_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [step_order, step_name, item_name, description, weight, options_json, id]
  );
  return { updated: result.id };
};

const deleteRiskItem = async (id) => {
  const result = await db.run(`DELETE FROM web3d_risk_items WHERE id = ?`, [id]);
  return { deleted: result.id };
};

// ============ 工作量模板 ============ //

const getWorkloadTemplates = async () => {
  return await db.all(
    'SELECT * FROM web3d_workload_templates ORDER BY category ASC, id ASC'
  );
};

const createWorkloadTemplate = async (data) => {
  const { category, item_name, description, base_days, unit } = data;
  const result = await db.run(
    `INSERT INTO web3d_workload_templates (category, item_name, description, base_days, unit)
     VALUES (?, ?, ?, ?, ?)`,
    [category, item_name, description, base_days, unit]
  );
  return { id: result.id };
};

const updateWorkloadTemplate = async (id, data) => {
  const { category, item_name, description, base_days, unit } = data;
  const result = await db.run(
    `UPDATE web3d_workload_templates
       SET category = ?, item_name = ?, description = ?, base_days = ?, unit = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [category, item_name, description, base_days, unit, id]
  );
  return { updated: result.id };
};

const deleteWorkloadTemplate = async (id) => {
  const result = await db.run(`DELETE FROM web3d_workload_templates WHERE id = ?`, [id]);
  return { deleted: result.id };
};

module.exports = {
  WORKLOAD_CATEGORIES,
  // 风险项
  getRiskItems,
  createRiskItem,
  updateRiskItem,
  deleteRiskItem,
  // 工作量模板
  getWorkloadTemplates,
  createWorkloadTemplate,
  updateWorkloadTemplate,
  deleteWorkloadTemplate
};
