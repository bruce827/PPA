const configModel = require('../models/configModel');
const { DEFAULTS } = require('../utils/constants');

/**
 * 计算工作量和费用
 * @param {Array} workloadItems - 工作量项列表
 * @param {Array} roles - 角色列表
 * @param {Number} ratingFactor - 评分因子
 * @returns {Object} { totalWorkload, totalCost }
 */
const calculateWorkloadCost = (workloadItems, roles, ratingFactor) => {
  let totalWorkload = 0;
  let totalCost = 0;
  const rolePriceMap = new Map(roles.map(r => [r.role_name, r.unit_price / 10000])); // 转换为万元

  workloadItems.forEach(item => {
    let itemRoleCost = 0;
    let itemRoleDays = 0;
    
    roles.forEach(role => {
      const days = Number(item[role.role_name] || 0);
      itemRoleDays += days;
      itemRoleCost += days * (rolePriceMap.get(role.role_name) || 0);
    });

    const workload = itemRoleDays * Number(item.delivery_factor || 1);
    const cost = itemRoleCost * Number(item.delivery_factor || 1) * ratingFactor * 
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
  const ratingFactor = riskScore / 100;

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

  return {
    software_dev_cost: Math.round(dev.totalCost),
    system_integration_cost: Math.round(integration.totalCost),
    travel_cost: Math.round(travelCost),
    maintenance_cost: Math.round(maintenanceCost),
    risk_cost: Math.round(riskCost),
    total_cost: Math.round(totalExactCost),
    // 额外返回工作量数据（用于项目保存）
    total_workload_days: dev.totalWorkload + integration.totalWorkload + maintenanceWorkload,
    risk_score: riskScore
  };
};

module.exports = {
  calculateProjectCost,
  calculateWorkloadCost
};
