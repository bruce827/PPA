/**
 * 描述：内部版导出数据格式化器。
 *       负责解析项目 assessment_details_json，将成本、工作量、风险等信息
 *       转换为内部 Excel 模板所需的标准化结构。
 */
const { HttpError } = require('../../../utils/errors');
const { DEFAULTS } = require('../../../utils/constants');

/**
 * 描述：从项目记录中解析评估详情 JSON 字段。
 * @param {Object} project - 包含 assessment_details_json 字段的项目记录。
 * @returns {Object} 解析后的评估详情对象。
 * @throws {HttpError} 当字段缺失或 JSON 解析失败时抛出对应错误。
 */
function parseDetails(project) {
  if (!project || !project.assessment_details_json) {
    throw new HttpError(
      500,
      'Missing assessment_details_json on project',
      'ExportDataMissingError'
    );
  }

  try {
    return JSON.parse(project.assessment_details_json);
  } catch (error) {
    const err = new HttpError(
      500,
      'Failed to parse assessment data',
      'ExportDataParseError',
      { rawMessage: error.message }
    );
    throw err;
  }
}

/**
 * 描述：判断评估详情是否符合新导出数据结构（含 calculation_snapshot 等字段）。
 * @param {Object} details - 评估详情对象。
 * @returns {boolean} true 表示为新结构，false 表示为旧结构。
 */
function isNewExportShape(details) {
  if (!details || typeof details !== 'object') return false;
  if (details.calculation_snapshot) return true;
  if (Array.isArray(details.role_costs) && details.role_costs.length > 0) {
    return true;
  }
  if (Array.isArray(details.travel_costs) && details.travel_costs.length > 0) {
    return true;
  }
  if (details.maintenance) return true;
  return false;
}

/**
 * 描述：在旧版评估数据结构下，根据 roles 与 workload 列表生成角色成本明细行。
 * @param {Object} details - 评估详情对象，包含 roles、development_workload、integration_workload 等字段。
 * @returns {Array<Object>} 角色成本明细数组，每一项对应 Excel 中一行。
 */
function buildLegacyRoleCosts(details) {
  const roles = Array.isArray(details.roles) ? details.roles : [];
  const devItems = Array.isArray(details.development_workload)
    ? details.development_workload
    : [];
  const integrationItems = Array.isArray(details.integration_workload)
    ? details.integration_workload
    : [];
  const items = [...devItems, ...integrationItems];

  const rows = [];

  items.forEach((item) => {
    const moduleName =
      item.module3 || item.module2 || item.module1 || '未命名模块';
    const deliveryFactor = Number(item.delivery_factor || 1);

    roles.forEach((role) => {
      const daysRaw = item[role.role_name];
      const days = Number(daysRaw || 0);
      if (!Number.isFinite(days) || days <= 0) return;

      const unitPrice = Number(role.unit_price || 0);
      const workloadDays = days;
      const subtotal = unitPrice * days * deliveryFactor;
      const subtotalWan = subtotal / 10000;

      rows.push({
        module1: item.module1,
        module2: item.module2,
        module3: item.module3,
        module: moduleName,
        role: role.role_name,
        unitPrice,
        workloadDays,
        subtotal,
        subtotalWan
      });
    });
  });

  return rows;
}

/**
 * 描述：在旧版评估数据结构下，根据差旅月份与人数生成差旅成本明细。
 * @param {Object} details - 评估详情对象，包含 travel_months、travel_headcount 等字段。
 * @returns {Array<Object>} 差旅成本明细数组（可能为空）。
 */
function buildLegacyTravelCosts(details) {
  const travelMonths = Number(details.travel_months || 0);
  const travelHeadcount = Number(details.travel_headcount || 0);
  if (!travelMonths || !travelHeadcount) return [];

  const monthlyCostPerPerson = DEFAULTS.TRAVEL_COST_PER_MONTH;
  const monthlyCost = monthlyCostPerPerson * travelHeadcount;
  const subtotal = monthlyCost * travelMonths;
  const subtotalWan = subtotal / 10000;

  return [
    {
      item: '差旅成本（估算）',
      monthlyCost,
      months: travelMonths,
      subtotal,
      subtotalWan
    }
  ];
}

/**
 * 描述：在旧版评估数据结构下，计算运维成本的月度与总计（万元）。
 * @param {Object} details - 评估详情对象，包含 maintenance_months、maintenance_headcount、maintenance_daily_cost 等字段。
 * @returns {{months: number, monthlyCostWan: number, totalWan: number}} 运维成本概要信息。
 */
function buildLegacyMaintenance(details) {
  const months = Number(details.maintenance_months || 0);
  const headcount = Number(details.maintenance_headcount || 0);
  const dailyCost = Number(
    details.maintenance_daily_cost || DEFAULTS.MAINTENANCE_DAILY_COST
  );
  const workloadDays = months * headcount * DEFAULTS.WORK_DAYS_PER_MONTH;
  const monthlyCostWan =
    (headcount * DEFAULTS.WORK_DAYS_PER_MONTH * dailyCost) / 10000;
  const totalWan = (workloadDays * dailyCost) / 10000;

  return {
    months,
    monthlyCostWan,
    totalWan
  };
}

/**
 * 描述：在旧版评估数据结构下，将 risk_scores 对象转换为风险评估项列表。
 * @param {Object} details - 评估详情对象，包含 risk_scores 字段（键为评估项名，值为得分）。
 * @returns {Array<Object>} 风险评估项数组，用于填充“风险评估明细”工作表。
 */
function buildLegacyRiskItems(details) {
  const riskScores = details.risk_scores || {};
  const entries = Object.entries(riskScores);
  if (!entries.length) return [];

  return entries.map(([name, value]) => ({
    category: '',
    item: name,
    choice: '',
    score: Number(value || 0)
  }));
}

/**
 * 描述：根据项目记录生成内部版导出所需的标准化数据结构，
 *       同时兼容新旧两种 assessment_details_json 结构。
 * @param {Object} project - 项目记录，包含评估详情与聚合字段。
 * @returns {Object} 包含 summary、roleCosts、travelCosts、maintenance、riskItems 等字段的导出数据对象。
 * @throws {HttpError} 当评估详情缺失或解析失败时抛出错误。
 */
exports.formatForExport = (project) => {
  const details = parseDetails(project);
  const exportedAt = new Date().toISOString();

  if (isNewExportShape(details)) {
    const snapshot = details.calculation_snapshot || {};
    const roleCosts = Array.isArray(details.role_costs)
      ? details.role_costs
      : [];
    const travelCosts = Array.isArray(details.travel_costs)
      ? details.travel_costs
      : [];
    const rawRiskItems = Array.isArray(details.risk_items)
      ? details.risk_items
      : [];
    const maintenance = details.maintenance || {};
    const riskCalculation = details.risk_calculation || {};

    return {
      summary: {
        snapshotId: project.id,
        projectName: project.name,
        description: project.description,
        totalCost:
          snapshot.final_total_cost != null
            ? snapshot.final_total_cost
            : project.final_total_cost,
        riskScore:
          snapshot.final_risk_score != null
            ? snapshot.final_risk_score
            : project.final_risk_score,
        workloadDays:
          snapshot.final_workload_days != null
            ? snapshot.final_workload_days
            : project.final_workload_days,
        ratingFactor: snapshot.rating_factor,
        completedAt: details.completed_at,
        exportedAt,
        configVersion: details.config_version
      },
      roleCosts: roleCosts.map((rc) => ({
        module1: rc.module1,
        module2: rc.module2,
        module3: rc.module3,
        module: rc.module,
        role: rc.role,
        unitPrice: rc.unit_price,
        workloadDays: rc.workload_days,
        subtotal: rc.subtotal,
        subtotalWan: rc.subtotal != null ? rc.subtotal / 10000 : 0
      })),
      travelCosts: travelCosts.map((tc) => ({
        item: tc.item,
        monthlyCost: tc.monthly_cost,
        months: tc.months,
        subtotal: tc.subtotal,
        subtotalWan: tc.subtotal != null ? tc.subtotal / 10000 : 0
      })),
      maintenance: {
        months: maintenance.months,
        monthlyCostWan:
          maintenance.monthly_cost != null
            ? maintenance.monthly_cost / 10000
            : 0,
        totalWan:
          maintenance.total != null ? maintenance.total / 10000 : 0
      },
      riskItems: rawRiskItems.map((ri) => {
        const itemName = ri.item || '';
        let category = ri.category || '';

        // 如果 category 为空，尝试从 itemName 中提取中文前缀作为“评估类别”
        // 例如："项目阶段 (project_phase)" -> "项目阶段"
        if (!category && typeof itemName === 'string' && itemName.includes('(')) {
          category = itemName.split('(')[0].trim();
        }

        return {
          category,
          item: itemName,
          choice: ri.choice,
          score: ri.score
        };
      }),
      riskCalculation
    };
  }

  // 旧版（当前真实项目）数据结构的兼容逻辑
  const riskScores = details.risk_scores || {};
  const riskScoreFromDetails = Object.values(riskScores).reduce(
    (sum, v) => sum + Number(v || 0),
    0
  );

  const summary = {
    snapshotId: project.id,
    projectName: project.name,
    description: project.description,
    totalCost: project.final_total_cost,
    riskScore:
      project.final_risk_score != null
        ? project.final_risk_score
        : riskScoreFromDetails,
    workloadDays: project.final_workload_days,
    ratingFactor: null,
    completedAt: null,
    exportedAt,
    configVersion: null
  };

  const roleCostsLegacy = buildLegacyRoleCosts(details);
  const travelCostsLegacy = buildLegacyTravelCosts(details);
  const maintenanceLegacy = buildLegacyMaintenance(details);
  const riskItemsLegacy = buildLegacyRiskItems(details);

  return {
    summary,
    roleCosts: roleCostsLegacy,
    travelCosts: travelCostsLegacy,
    maintenance: maintenanceLegacy,
    riskItems: riskItemsLegacy,
    riskCalculation: {}
  };
};
