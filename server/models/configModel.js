const db = require('../utils/db');

/**
 * 配置相关的数据库操作
 */

// ============ 角色配置 ============

const getAllRoles = async () => {
  return await db.all("SELECT * FROM config_roles");
};

const createRole = async (roleData) => {
  const { role_name, unit_price } = roleData;
  const result = await db.run(
    `INSERT INTO config_roles (role_name, unit_price) VALUES (?, ?)`,
    [role_name, unit_price]
  );
  return { id: result.id };
};

const updateRole = async (id, roleData) => {
  const { role_name, unit_price } = roleData;
  const result = await db.run(
    `UPDATE config_roles SET role_name = ?, unit_price = ? WHERE id = ?`,
    [role_name, unit_price, id]
  );
  return { updated: result.id };
};

const deleteRole = async (id) => {
  const result = await db.run(`DELETE FROM config_roles WHERE id = ?`, [id]);
  return { deleted: result.id };
};

// ============ 风险评估项 ============

const getAllRiskItems = async () => {
  return await db.all("SELECT * FROM config_risk_items");
};

const createRiskItem = async (itemData) => {
  const { category, item_name, options_json } = itemData;
  const result = await db.run(
    `INSERT INTO config_risk_items (category, item_name, options_json) VALUES (?, ?, ?)`,
    [category, item_name, options_json]
  );
  return { id: result.id };
};

const updateRiskItem = async (id, itemData) => {
  const { category, item_name, options_json } = itemData;
  const result = await db.run(
    `UPDATE config_risk_items SET category = ?, item_name = ?, options_json = ? WHERE id = ?`,
    [category, item_name, options_json, id]
  );
  return { updated: result.id };
};

const deleteRiskItem = async (id) => {
  const result = await db.run(`DELETE FROM config_risk_items WHERE id = ?`, [id]);
  return { deleted: result.id };
};

// ============ 差旅成本 ============

const getAllTravelCosts = async () => {
  return await db.all("SELECT * FROM config_travel_costs");
};

const createTravelCost = async (costData) => {
  const { item_name, cost_per_month } = costData;
  const result = await db.run(
    `INSERT INTO config_travel_costs (item_name, cost_per_month) VALUES (?, ?)`,
    [item_name, cost_per_month]
  );
  return { id: result.id };
};

const updateTravelCost = async (id, costData) => {
  const { item_name, cost_per_month } = costData;
  const result = await db.run(
    `UPDATE config_travel_costs SET item_name = ?, cost_per_month = ? WHERE id = ?`,
    [item_name, cost_per_month, id]
  );
  return { updated: result.id };
};

const deleteTravelCost = async (id) => {
  const result = await db.run(`DELETE FROM config_travel_costs WHERE id = ?`, [id]);
  return { deleted: result.id };
};

// ============ 聚合查询 ============

const getAllConfigs = async () => {
  const [roles, risk_items, travel_costs] = await Promise.all([
    getAllRoles(),
    getAllRiskItems(),
    getAllTravelCosts()
  ]);
  
  return { roles, risk_items, travel_costs };
};

// ============ 差旅成本总和查询 ============

const getTravelCostPerMonth = async () => {
  const row = await db.get(
    'SELECT SUM(cost_per_month) as total FROM config_travel_costs WHERE is_active = 1'
  );
  return row?.total || 10800; // 默认值
};

module.exports = {
  // 角色
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  // 风险评估项
  getAllRiskItems,
  createRiskItem,
  updateRiskItem,
  deleteRiskItem,
  // 差旅成本
  getAllTravelCosts,
  createTravelCost,
  updateTravelCost,
  deleteTravelCost,
  getTravelCostPerMonth,
  // 聚合
  getAllConfigs
};
