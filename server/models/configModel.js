const { getDatabase } = require('../config/database');

/**
 * 配置相关的数据库操作
 */

// ============ 角色配置 ============

const getAllRoles = () => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all("SELECT * FROM config_roles", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const createRole = (roleData) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const { role_name, unit_price } = roleData;
    db.run(
      `INSERT INTO config_roles (role_name, unit_price) VALUES (?, ?)`,
      [role_name, unit_price],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
};

const updateRole = (id, roleData) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const { role_name, unit_price } = roleData;
    db.run(
      `UPDATE config_roles SET role_name = ?, unit_price = ? WHERE id = ?`,
      [role_name, unit_price, id],
      function(err) {
        if (err) reject(err);
        else resolve({ updated: this.changes });
      }
    );
  });
};

const deleteRole = (id) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(`DELETE FROM config_roles WHERE id = ?`, [id], function(err) {
      if (err) reject(err);
      else resolve({ deleted: this.changes });
    });
  });
};

// ============ 风险评估项 ============

const getAllRiskItems = () => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all("SELECT * FROM config_risk_items", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const createRiskItem = (itemData) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const { category, item_name, options_json } = itemData;
    db.run(
      `INSERT INTO config_risk_items (category, item_name, options_json) VALUES (?, ?, ?)`,
      [category, item_name, options_json],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
};

const updateRiskItem = (id, itemData) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const { category, item_name, options_json } = itemData;
    db.run(
      `UPDATE config_risk_items SET category = ?, item_name = ?, options_json = ? WHERE id = ?`,
      [category, item_name, options_json, id],
      function(err) {
        if (err) reject(err);
        else resolve({ updated: this.changes });
      }
    );
  });
};

const deleteRiskItem = (id) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(`DELETE FROM config_risk_items WHERE id = ?`, [id], function(err) {
      if (err) reject(err);
      else resolve({ deleted: this.changes });
    });
  });
};

// ============ 差旅成本 ============

const getAllTravelCosts = () => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all("SELECT * FROM config_travel_costs", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const createTravelCost = (costData) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const { item_name, cost_per_month } = costData;
    db.run(
      `INSERT INTO config_travel_costs (item_name, cost_per_month) VALUES (?, ?)`,
      [item_name, cost_per_month],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
};

const updateTravelCost = (id, costData) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const { item_name, cost_per_month } = costData;
    db.run(
      `UPDATE config_travel_costs SET item_name = ?, cost_per_month = ? WHERE id = ?`,
      [item_name, cost_per_month, id],
      function(err) {
        if (err) reject(err);
        else resolve({ updated: this.changes });
      }
    );
  });
};

const deleteTravelCost = (id) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(`DELETE FROM config_travel_costs WHERE id = ?`, [id], function(err) {
      if (err) reject(err);
      else resolve({ deleted: this.changes });
    });
  });
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

const getTravelCostPerMonth = () => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.get(
      'SELECT SUM(cost_per_month) as total FROM config_travel_costs WHERE is_active = 1',
      [],
      (err, row) => {
        if (err) reject(err);
        else resolve(row?.total || 10800); // 默认值
      }
    );
  });
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
