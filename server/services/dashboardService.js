const dashboardModel = require('../models/dashboardModel');
const configModel = require('../models/configModel');
const logger = require('../utils/logger');

const NON_ROLE_KEYS = new Set([
  'delivery_factor',
  'scope_factor',
  'tech_factor',
  'module',
  'module1',
  'module2',
  'module3',
  'description',
  'complexity',
]);

/**
 * 将任意值安全转换为数字，无法转换时返回 0。
 * @param {*} value 任意输入
 * @returns {number} 可用的数值
 */
const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

/**
 * 安全解析评估详情 JSON，失败时返回 null 并记录告警。
 * @param {string} detailsJSON JSON 字符串
 * @returns {object|null} 解析后的对象
 */
const safeParseDetails = (detailsJSON) => {
  try {
    return JSON.parse(detailsJSON);
  } catch (error) {
    logger.warn('Failed to parse assessment_details_json', { error: error.message });
    // 为兼容旧有测试与排障习惯，保留 console.error 一份
    console.error('Failed to parse assessment_details_json', error);
    return null;
  }
};

/**
 * 将单条成本明细累加到汇总对象。
 * @param {object} composition 汇总对象
 * @param {object} costParts 单条成本数据
 */
const addComposition = (composition, costParts) => {
  composition.softwareDevelopment += costParts.softwareDevelopment || 0;
  composition.systemIntegration += costParts.systemIntegration || 0;
  composition.operations += costParts.operations || 0;
  composition.travel += costParts.travel || 0;
  composition.risk += costParts.risk || 0;
};

/**
 * 从新的 snapshot 结构提取成本（包含字段别名）。
 * @param {object} snapshot calculation_snapshot 对象
 * @returns {object} 成本片段
 */
const extractSnapshotCosts = (snapshot = {}) => {
  return {
    softwareDevelopment: toNumber(snapshot.software_dev_cost || snapshot.softwareDevelopmentCost),
    systemIntegration: toNumber(snapshot.system_integration_cost || snapshot.systemIntegrationCost),
    operations: toNumber(
      snapshot.maintenance_cost || snapshot.operationsCost || snapshot.operations_cost
    ),
    travel: toNumber(snapshot.travel_cost || snapshot.travelCost),
    risk: toNumber(snapshot.risk_cost || snapshot.riskCost),
  };
};

/**
 * 从旧版评估结构中提取成本。
 * @param {object} details 评估详情对象
 * @returns {object} 成本片段
 */
const extractLegacyCosts = (details = {}) => {
  return {
    softwareDevelopment: toNumber(
      details.softwareDevelopmentCost || details.software_dev_cost || details.software_dev_total
    ),
    systemIntegration: toNumber(
      details.systemIntegrationCost || details.system_integration_cost || details.integrationCost
    ),
    operations: toNumber(
      details.operationsCost || details.operations_cost || details.maintenance_cost
    ),
    travel: toNumber(details.travelCost || details.travel_cost),
    risk: toNumber(details.riskCost || details.risk_cost),
  };
};

/**
 * 按人天与单价累加角色成本。
 * @param {object} roleCosts 角色成本汇总映射
 * @param {string} roleName 角色名称
 * @param {number} manDays 人天
 * @param {Map} rolePriceMap 角色单价映射
 */
const addRoleCost = (roleCosts, roleName, manDays, rolePriceMap) => {
  if (roleName === undefined || roleName === null) return;
  const days = toNumber(manDays);
  const unitPrice = toNumber(rolePriceMap.get(roleName) ?? 0);
  const subtotal = days * unitPrice;
  roleCosts[roleName] = (roleCosts[roleName] || 0) + subtotal;
};

/**
 * 从 role_costs 快照数组累加角色成本。
 * @param {object} roleCosts 角色成本汇总映射
 * @param {Array} roleCostItems role_costs 数组
 */
const collectFromRoleCostsArray = (roleCosts, roleCostItems = []) => {
  if (!Array.isArray(roleCostItems)) return;
  roleCostItems.forEach((item) => {
    const role = item?.role || item?.role_name;
    const subtotal = toNumber(item?.subtotal || item?.subtotalWan || item?.total);
    if (role) {
      roleCosts[role] = (roleCosts[role] || 0) + subtotal;
    }
  });
};

/**
 * 从新版 workload 数组累加角色成本。
 * @param {object} roleCosts 角色成本汇总映射
 * @param {Array} workloadItems development/integration workload 数组
 * @param {Map} rolePriceMap 角色单价映射
 */
const collectFromWorkloadArray = (roleCosts, workloadItems = [], rolePriceMap) => {
  if (!Array.isArray(workloadItems)) return;
  workloadItems.forEach((item) => {
    Object.entries(item || {}).forEach(([key, value]) => {
      if (NON_ROLE_KEYS.has(key)) return;
      if (value === undefined || value === null) return;
      addRoleCost(roleCosts, key, value, rolePriceMap);
    });
  });
};

/**
 * 从旧版 workload 结构累加角色成本。
 * @param {object} roleCosts 角色成本汇总映射
 * @param {object} workload 旧版 workload 对象
 * @param {Map} rolePriceMap 角色单价映射
 */
const collectFromLegacyWorkload = (roleCosts, workload = {}, rolePriceMap) => {
  const features = workload.newFeatures || [];
  const integrations = workload.systemIntegration || [];

  features.forEach((feature) => {
    const roles = feature.roles || {};
    Object.entries(roles).forEach(([roleName, days]) => {
      addRoleCost(roleCosts, roleName, days, rolePriceMap);
    });
  });

  integrations.forEach((integration) => {
    const roles = integration.roles || {};
    Object.entries(roles).forEach(([roleName, days]) => {
      addRoleCost(roleCosts, roleName, days, rolePriceMap);
    });
  });
};

/**
 * 获取 Dashboard 概览：项目总数与平均成本。
 * @returns {{ totalProjects: number, averageCost: string|number }}
 */
exports.getSummary = async () => {
  const { count, avgCost } = await dashboardModel.getProjectCountAndAverage();
  return {
    totalProjects: count,
    averageCost: avgCost !== null && avgCost !== undefined ? toNumber(avgCost).toFixed(2) : 0,
  };
};

/**
 * 获取风险分布（按 final_risk_score 分组计数）。
 * @returns {Array<{ final_risk_score: number, count: number }>}
 */
exports.getRiskDistribution = async () => {
  const riskDistribution = await dashboardModel.getRiskDistribution();
  return riskDistribution || [];
};

/**
 * 汇总成本构成（兼容新旧评估结构）。
 * @returns {{ softwareDevelopment: number, systemIntegration: number, operations: number, travel: number, risk: number }}
 */
exports.getCostComposition = async () => {
  const projects = await dashboardModel.getAssessmentDetails();
  const composition = {
    softwareDevelopment: 0,
    systemIntegration: 0,
    operations: 0,
    travel: 0,
    risk: 0,
  };

  projects.forEach((project) => {
    const details = safeParseDetails(project.assessment_details_json);
    if (!details) return;

    const snapshotCosts = extractSnapshotCosts(details.calculation_snapshot || {});
    const hasSnapshotCost = Object.values(snapshotCosts).some((v) => v);

    if (hasSnapshotCost) {
      addComposition(composition, snapshotCosts);
      return;
    }

    const legacyCosts = extractLegacyCosts(details);
    addComposition(composition, legacyCosts);
  });

  return composition;
};

/**
 * 汇总角色成本分布（支持 role_costs 快照与工作量表）。
 * @returns {{ [roleName: string]: number }}
 */
exports.getRoleCostDistribution = async () => {
  const projects = await dashboardModel.getAssessmentDetails();
  const roles = await configModel.getAllRoles();
  const rolePriceMap = new Map(roles.map((role) => [role.role_name, role.unit_price]));
  const roleCosts = {};

  projects.forEach((project) => {
    const details = safeParseDetails(project.assessment_details_json);
    if (!details) return;

    if (Array.isArray(details.role_costs) && details.role_costs.length > 0) {
      collectFromRoleCostsArray(roleCosts, details.role_costs);
      return;
    }

    collectFromWorkloadArray(roleCosts, details.development_workload, rolePriceMap);
    collectFromWorkloadArray(roleCosts, details.integration_workload, rolePriceMap);
    collectFromLegacyWorkload(roleCosts, details.workload || {}, rolePriceMap);
  });

  return roleCosts;
};

/**
 * 获取按月聚合的成本趋势。
 * @returns {Array<{ month: string, totalCost: number }>}
 */
exports.getCostTrend = async () => {
  const costTrend = await dashboardModel.getCostTrend();
  return costTrend || [];
};

/**
 * 获取风险-成本散点数据。
 * @returns {Array<{ final_risk_score: number, final_total_cost: number }>}
 */
exports.getRiskCostCorrelation = async () => {
  const correlation = await dashboardModel.getRiskCostCorrelation();
  return correlation || [];
};
