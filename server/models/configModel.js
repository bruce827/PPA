const db = require('../utils/db');
const { BUSINESS_PRICING } = require('../utils/constants');

/**
 * 配置相关的数据库操作
 */

const DEFAULT_CUSTOM_DEVELOPMENT_PRICING = Object.entries(
  BUSINESS_PRICING.CUSTOM_DEVELOPMENT
).reduce((acc, [key, config]) => {
  acc[key] = config.defaultValue;
  return acc;
}, {});

const DEFAULT_ENTERPRISE_PRODUCT_PRICING = Object.entries(
  BUSINESS_PRICING.ENTERPRISE_PRODUCT
).reduce((acc, [key, config]) => {
  acc[key] = config.defaultValue;
  return acc;
}, {});

let ensuredConnectionId = null;
let ensureSchemaPromise = null;

const ensureSchema = async () => {
  const currentConnectionId = db.getConnectionId();
  if (ensuredConnectionId === currentConnectionId) return;
  if (ensureSchemaPromise) {
    await ensureSchemaPromise;
    if (ensuredConnectionId === currentConnectionId) return;
  }

  ensureSchemaPromise = (async () => {
    await db.run(`
      CREATE TABLE IF NOT EXISTS config_business_pricing (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        tax_rate REAL NOT NULL DEFAULT 6,
        management_rate REAL NOT NULL DEFAULT 12,
        sales_rate REAL NOT NULL DEFAULT 12,
        profit_rate REAL NOT NULL DEFAULT 15,
        rd_rate REAL NOT NULL DEFAULT 35,
        cac_rate REAL NOT NULL DEFAULT 40,
        cogs_rate REAL NOT NULL DEFAULT 15,
        csm_rate REAL NOT NULL DEFAULT 10,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const columns = await db.all(`PRAGMA table_info(config_business_pricing)`);
    const hasColumn = (columnName) =>
      Array.isArray(columns) && columns.some((column) => column.name === columnName);

    if (!hasColumn('rd_rate')) {
      await db.run(
        `ALTER TABLE config_business_pricing ADD COLUMN rd_rate REAL NOT NULL DEFAULT 35`
      );
    }
    if (!hasColumn('cac_rate')) {
      await db.run(
        `ALTER TABLE config_business_pricing ADD COLUMN cac_rate REAL NOT NULL DEFAULT 40`
      );
    }
    if (!hasColumn('cogs_rate')) {
      await db.run(
        `ALTER TABLE config_business_pricing ADD COLUMN cogs_rate REAL NOT NULL DEFAULT 15`
      );
    }
    if (!hasColumn('csm_rate')) {
      await db.run(
        `ALTER TABLE config_business_pricing ADD COLUMN csm_rate REAL NOT NULL DEFAULT 10`
      );
    }

    await db.run(
      `INSERT OR IGNORE INTO config_business_pricing
       (id, tax_rate, management_rate, sales_rate, profit_rate, rd_rate, cac_rate, cogs_rate, csm_rate)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        DEFAULT_CUSTOM_DEVELOPMENT_PRICING.tax_rate,
        DEFAULT_CUSTOM_DEVELOPMENT_PRICING.management_rate,
        DEFAULT_CUSTOM_DEVELOPMENT_PRICING.sales_rate,
        DEFAULT_CUSTOM_DEVELOPMENT_PRICING.profit_rate,
        DEFAULT_ENTERPRISE_PRODUCT_PRICING.rd_rate,
        DEFAULT_ENTERPRISE_PRODUCT_PRICING.cac_rate,
        DEFAULT_ENTERPRISE_PRODUCT_PRICING.cogs_rate,
        DEFAULT_ENTERPRISE_PRODUCT_PRICING.csm_rate,
      ]
    );

    await db.run(
      `UPDATE config_business_pricing
       SET rd_rate = COALESCE(rd_rate, ?),
           cac_rate = COALESCE(cac_rate, ?),
           cogs_rate = COALESCE(cogs_rate, ?),
           csm_rate = COALESCE(csm_rate, ?)
       WHERE id = 1`,
      [
        DEFAULT_ENTERPRISE_PRODUCT_PRICING.rd_rate,
        DEFAULT_ENTERPRISE_PRODUCT_PRICING.cac_rate,
        DEFAULT_ENTERPRISE_PRODUCT_PRICING.cogs_rate,
        DEFAULT_ENTERPRISE_PRODUCT_PRICING.csm_rate,
      ]
    );

    ensuredConnectionId = currentConnectionId;
  })();

  try {
    await ensureSchemaPromise;
  } finally {
    ensureSchemaPromise = null;
  }
};

// ============ 角色配置 ============

const getAllRoles = async () => {
  await ensureSchema();
  return await db.all("SELECT * FROM config_roles");
};

const createRole = async (roleData) => {
  await ensureSchema();
  const { role_name, unit_price } = roleData;
  const result = await db.run(
    `INSERT INTO config_roles (role_name, unit_price) VALUES (?, ?)`,
    [role_name, unit_price]
  );
  return { id: result.id };
};

const updateRole = async (id, roleData) => {
  await ensureSchema();
  const { role_name, unit_price } = roleData;
  const result = await db.run(
    `UPDATE config_roles SET role_name = ?, unit_price = ? WHERE id = ?`,
    [role_name, unit_price, id]
  );
  return { updated: result.id };
};

const deleteRole = async (id) => {
  await ensureSchema();
  const result = await db.run(`DELETE FROM config_roles WHERE id = ?`, [id]);
  return { deleted: result.id };
};

// ============ 风险评估项 ============

const getAllRiskItems = async () => {
  await ensureSchema();
  return await db.all("SELECT * FROM config_risk_items");
};

const createRiskItem = async (itemData) => {
  await ensureSchema();
  const { category, item_name, options_json } = itemData;
  const result = await db.run(
    `INSERT INTO config_risk_items (category, item_name, options_json) VALUES (?, ?, ?)`,
    [category, item_name, options_json]
  );
  return { id: result.id };
};

const updateRiskItem = async (id, itemData) => {
  await ensureSchema();
  const { category, item_name, options_json } = itemData;
  const result = await db.run(
    `UPDATE config_risk_items SET category = ?, item_name = ?, options_json = ? WHERE id = ?`,
    [category, item_name, options_json, id]
  );
  return { updated: result.id };
};

const deleteRiskItem = async (id) => {
  await ensureSchema();
  const result = await db.run(`DELETE FROM config_risk_items WHERE id = ?`, [id]);
  return { deleted: result.id };
};

// ============ 差旅成本 ============

const getAllTravelCosts = async () => {
  await ensureSchema();
  return await db.all("SELECT * FROM config_travel_costs");
};

const createTravelCost = async (costData) => {
  await ensureSchema();
  const { item_name, cost_per_month } = costData;
  const result = await db.run(
    `INSERT INTO config_travel_costs (item_name, cost_per_month) VALUES (?, ?)`,
    [item_name, cost_per_month]
  );
  return { id: result.id };
};

const updateTravelCost = async (id, costData) => {
  await ensureSchema();
  const { item_name, cost_per_month } = costData;
  const result = await db.run(
    `UPDATE config_travel_costs SET item_name = ?, cost_per_month = ? WHERE id = ?`,
    [item_name, cost_per_month, id]
  );
  return { updated: result.id };
};

const deleteTravelCost = async (id) => {
  await ensureSchema();
  const result = await db.run(`DELETE FROM config_travel_costs WHERE id = ?`, [id]);
  return { deleted: result.id };
};

// ============ 商务报价配置 ============

const getBusinessPricingConfig = async () => {
  await ensureSchema();
  const row = await db.get(
    `SELECT tax_rate, management_rate, sales_rate, profit_rate,
            rd_rate, cac_rate, cogs_rate, csm_rate
     FROM config_business_pricing
     WHERE id = 1`
  );

  return {
    custom_development: {
      ...DEFAULT_CUSTOM_DEVELOPMENT_PRICING,
      tax_rate: row?.tax_rate ?? DEFAULT_CUSTOM_DEVELOPMENT_PRICING.tax_rate,
      management_rate:
        row?.management_rate ?? DEFAULT_CUSTOM_DEVELOPMENT_PRICING.management_rate,
      sales_rate: row?.sales_rate ?? DEFAULT_CUSTOM_DEVELOPMENT_PRICING.sales_rate,
      profit_rate:
        row?.profit_rate ?? DEFAULT_CUSTOM_DEVELOPMENT_PRICING.profit_rate,
    },
    enterprise_product: {
      ...DEFAULT_ENTERPRISE_PRODUCT_PRICING,
      rd_rate: row?.rd_rate ?? DEFAULT_ENTERPRISE_PRODUCT_PRICING.rd_rate,
      cac_rate: row?.cac_rate ?? DEFAULT_ENTERPRISE_PRODUCT_PRICING.cac_rate,
      cogs_rate: row?.cogs_rate ?? DEFAULT_ENTERPRISE_PRODUCT_PRICING.cogs_rate,
      csm_rate: row?.csm_rate ?? DEFAULT_ENTERPRISE_PRODUCT_PRICING.csm_rate,
    },
  };
};

const updateBusinessPricingConfig = async (configData) => {
  await ensureSchema();
  const {
    custom_development,
    enterprise_product,
  } = configData;

  await db.run(
    `UPDATE config_business_pricing
     SET tax_rate = ?, management_rate = ?, sales_rate = ?, profit_rate = ?,
         rd_rate = ?, cac_rate = ?, cogs_rate = ?, csm_rate = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [
      custom_development.tax_rate,
      custom_development.management_rate,
      custom_development.sales_rate,
      custom_development.profit_rate,
      enterprise_product.rd_rate,
      enterprise_product.cac_rate,
      enterprise_product.cogs_rate,
      enterprise_product.csm_rate,
    ]
  );

  return await getBusinessPricingConfig();
};

const getCustomDevelopmentBusinessPricingConfig = async () => {
  const config = await getBusinessPricingConfig();
  return config.custom_development;
};

// ============ 聚合查询 ============

const getAllConfigs = async () => {
  const [roles, risk_items, travel_costs, business_pricing] = await Promise.all([
    getAllRoles(),
    getAllRiskItems(),
    getAllTravelCosts(),
    getBusinessPricingConfig(),
  ]);
  
  return { roles, risk_items, travel_costs, business_pricing };
};

// ============ 差旅成本总和查询 ============

const getTravelCostPerMonth = async () => {
  await ensureSchema();
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
  // 商务报价配置
  getBusinessPricingConfig,
  getCustomDevelopmentBusinessPricingConfig,
  updateBusinessPricingConfig,
  // 聚合
  getAllConfigs
};
