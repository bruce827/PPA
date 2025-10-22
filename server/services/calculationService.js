const configModel = require('../models/configModel');
const { DEFAULTS } = require('../utils/constants');
const { computeRatingFactor } = require('../utils/rating');

/**
 * 计算工作量和费用
 * @param {Array} workloadItems - 工作量项列表
 * @param {Array} roles - 角色列表
 * @param {Number} ratingFactor - 评分因子
 * @returns {Object} { totalWorkload, totalCost }
 */
const roundToDecimals = (value, decimals = 2) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  const factor = 10 ** decimals;
  return Math.round((numericValue + Number.EPSILON) * factor) / factor;
};

const calculateWorkloadCost = (workloadItems, roles, ratingFactor) => {
  let totalWorkload = 0;
  let totalCost = 0;
  const rolePriceMap = new Map(roles.map(r => [r.role_name, r.unit_price / 10000])); // 转换为万元
  const normalizedFactor = Number.isFinite(Number(ratingFactor)) ? Number(ratingFactor) : 1;

  workloadItems.forEach(item => {
    let itemRoleCost = 0;
    let itemRoleDays = 0;
    
    roles.forEach(role => {
      const days = Number(item[role.role_name] || 0);
      itemRoleDays += days;
      itemRoleCost += days * (rolePriceMap.get(role.role_name) || 0);
    });

    const workload = itemRoleDays * Number(item.delivery_factor || 1);
    const cost = itemRoleCost * Number(item.delivery_factor || 1) * normalizedFactor * 
                 (item.scope_factor || 1) * (item.tech_factor || 1);
    
    totalWorkload += workload;
    totalCost += cost;
  });
  
  return { totalWorkload, totalCost };
};

/**
 * 实时计算项目成本
 * @param {Object} assessmentData - 评估数据
 * @returns {Object} 计算结果
 */
const calculateProjectCost = async (assessmentData) => {
  // 1. 计算评分因子
  const riskScore = Object.values(assessmentData.risk_scores || {})
    .reduce((sum, score) => sum + Number(score), 0);
  const { factor: ratingFactor, ratio: ratingRatio, maxScore: ratingMaxScore } = await computeRatingFactor(riskScore);

  // 2. 计算各项工作量和费用
  const dev = calculateWorkloadCost(
    assessmentData.development_workload || [], 
    assessmentData.roles || [], 
    ratingFactor
  );
  
  const integration = calculateWorkloadCost(
    assessmentData.integration_workload || [], 
    assessmentData.roles || [], 
    ratingFactor
  );

  // 3. 计算其他成本
  // 3.1 差旅成本
  const travelCostPerMonth = await configModel.getTravelCostPerMonth();
  const travelMonths = Number(assessmentData.travel_months || 0);
  const travelHeadcount = Number(assessmentData.travel_headcount || 0);
  const travelCost = travelMonths * travelHeadcount * (travelCostPerMonth / 10000); // 转换为万元

  // 3.2 维护成本
  const maintenanceWorkload = Number(assessmentData.maintenance_months || 0)
    * Number(assessmentData.maintenance_headcount || 0)
    * DEFAULTS.WORK_DAYS_PER_MONTH;
  const maintenanceDailyCost = Number(assessmentData.maintenance_daily_cost || DEFAULTS.MAINTENANCE_DAILY_COST);
  const maintenanceCost = maintenanceWorkload * (maintenanceDailyCost / 10000);

  // 3.3 风险成本
  const riskCost = (assessmentData.risk_items || [])
    .reduce((sum, item) => sum + Number(item.cost || 0), 0);

  // 4. 汇总
  const totalExactCost = dev.totalCost + integration.totalCost + travelCost + maintenanceCost + riskCost;

  const softwareDevWorkload = dev.totalWorkload;
  const systemIntegrationWorkload = integration.totalWorkload;
  const maintenanceWorkloadDays = maintenanceWorkload;
  const totalWorkload = softwareDevWorkload + systemIntegrationWorkload + maintenanceWorkloadDays;

  const softwareDevCost = roundToDecimals(dev.totalCost);
  const systemIntegrationCost = roundToDecimals(integration.totalCost);
  const travelCostRounded = roundToDecimals(travelCost);
  const maintenanceCostRounded = roundToDecimals(maintenanceCost);
  const riskCostRounded = roundToDecimals(riskCost);
  const totalCostExact = roundToDecimals(totalExactCost);

  return {
    software_dev_cost: softwareDevCost,
    system_integration_cost: systemIntegrationCost,
    travel_cost: travelCostRounded,
    maintenance_cost: maintenanceCostRounded,
    risk_cost: riskCostRounded,
    total_cost_exact: totalCostExact,
    total_cost: Math.round(totalExactCost),
    // 额外返回工作量数据（用于项目保存）
    software_dev_workload_days: Math.round(softwareDevWorkload),
    system_integration_workload_days: Math.round(systemIntegrationWorkload),
    maintenance_workload_days: Math.round(maintenanceWorkloadDays),
    total_workload_days: Math.round(totalWorkload),
    risk_score: riskScore,
    rating_factor: Number(ratingFactor.toFixed(4)),
    rating_ratio: Number(ratingRatio.toFixed(4)),
    risk_max_score: ratingMaxScore
  };
};

module.exports = {
  calculateProjectCost,
  calculateWorkloadCost
};
