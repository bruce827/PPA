/**
 * 描述：对外版导出数据格式化器。
 *       负责将角色/模块成本按比例分摊到各模块，生成对外报价 Excel 所需的数据结构。
 */
const { HttpError } = require('../../../utils/errors');

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
 * 描述：基于新结构中的 role_costs 列表，按模块聚合工作量与角色成本。
 * @param {Array<Object>} roleCosts - 角色成本明细数组（新结构字段 role_costs）。
 * @returns {Array<Object>} 模块级聚合结果，每条记录包含模块层级、总工作量和总角色成本。
 */
function buildModulesFromRoleCosts(roleCosts) {
  const modules = {};

  roleCosts.forEach((rc) => {
    const module1 = rc.module1;
    const module2 = rc.module2;
    const module3 = rc.module3;
    const moduleName = rc.module || module3 || module2 || module1 || '未命名模块';

    const key = `${module1 || ''}|||${module2 || ''}|||${module3 || ''}`;
    if (!modules[key]) {
      modules[key] = {
        module1,
        module2,
        module3,
        moduleName,
        workloadDays: 0,
        roleCost: 0
      };
    }
    const workload = Number(rc.workload_days || 0);
    const subtotal = Number(rc.subtotal || 0);
    modules[key].workloadDays += workload;
    modules[key].roleCost += subtotal;
  });

  return Object.values(modules);
}

/**
 * 描述：在旧版评估数据结构下，基于 roles 与 workload 列表按模块聚合成本与工作量。
 * @param {Object} details - 评估详情对象，包含 roles、development_workload、integration_workload 等字段。
 * @returns {Array<Object>} 模块级聚合结果数组。
 */
function buildModulesFromLegacy(details) {
  const roles = Array.isArray(details.roles) ? details.roles : [];
  const devItems = Array.isArray(details.development_workload)
    ? details.development_workload
    : [];
  const integrationItems = Array.isArray(details.integration_workload)
    ? details.integration_workload
    : [];
  const items = [...devItems, ...integrationItems];

  const modules = {};

  items.forEach((item) => {
    const module1 = item.module1;
    const module2 = item.module2;
    const module3 = item.module3;
    const moduleName =
      module3 || module2 || module1 || '未命名模块';

    const key = `${module1 || ''}|||${module2 || ''}|||${module3 || ''}`;
    if (!modules[key]) {
      modules[key] = {
        module1,
        module2,
        module3,
        moduleName,
        workloadDays: 0,
        roleCost: 0
      };
    }

    const deliveryFactor = Number(item.delivery_factor || 1);
    const workloadItem = Number(item.workload || 0);
    modules[key].workloadDays += Number.isFinite(workloadItem)
      ? workloadItem
      : 0;

    roles.forEach((role) => {
      const daysRaw = item[role.role_name];
      const days = Number(daysRaw || 0);
      if (!Number.isFinite(days) || days <= 0) return;
      const unitPrice = Number(role.unit_price || 0);
      const subtotal = unitPrice * days * deliveryFactor;
      modules[key].roleCost += subtotal;
    });
  });

  return Object.values(modules);
}

/**
 * 描述：根据项目记录生成对外版导出所需的标准化数据结构，
 *       将总报价按模块角色成本比例分摊，形成模块报价明细。
 * @param {Object} project - 项目记录，包含评估详情与聚合字段。
 * @returns {{summary: Object, modules: Array<Object>}} 包含项目概览与模块报价明细的数据对象。
 * @throws {HttpError} 当角色成本为空或成本分摊合计与总报价偏差过大时抛出错误。
 */
exports.formatForExport = (project) => {
  const details = parseDetails(project);

  const roleCosts = Array.isArray(details.role_costs)
    ? details.role_costs
    : [];
  const snapshot = details.calculation_snapshot || {};

  let moduleListRaw;
  if (roleCosts.length > 0) {
    moduleListRaw = buildModulesFromRoleCosts(roleCosts);
  } else {
    moduleListRaw = buildModulesFromLegacy(details);
  }

  const totalRoleCost = moduleListRaw.reduce(
    (sum, m) => sum + (Number.isFinite(m.roleCost) ? m.roleCost : 0),
    0
  );

  if (!Number.isFinite(totalRoleCost) || totalRoleCost <= 0) {
    throw new HttpError(
      500,
      'Invalid assessment data structure: total role_costs is zero',
      'ExportDataInvalidError'
    );
  }

  const totalCostWan = Number(
    snapshot.final_total_cost || project.final_total_cost || 0
  );
  const totalWorkloadDays = Number(
    snapshot.final_workload_days || project.final_workload_days || 0
  );

  const totalCostYuan = totalCostWan * 10000;

  const moduleList = moduleListRaw.map((m) => {
    const moduleCostRatio = m.roleCost / totalRoleCost;
    const finalCostYuan = totalCostYuan * moduleCostRatio;
    const finalCostWan = finalCostYuan / 10000;
    return {
      module1: m.module1,
      module2: m.module2,
      module3: m.module3,
      moduleName: m.moduleName,
      workloadDays: m.workloadDays,
      costWan: finalCostWan,
      costRatio: moduleCostRatio
    };
  });

  const sumCostWan = moduleList.reduce(
    (sum, m) => sum + (Number.isFinite(m.costWan) ? m.costWan : 0),
    0
  );
  const diff = Math.abs(sumCostWan - totalCostWan);

  if (diff > 0.05) {
    throw new HttpError(
      500,
      `Cost allocation mismatch: expected ${totalCostWan}, got ${sumCostWan}`,
      'ExportCostMismatchError'
    );
  }

  const exportedAt = new Date().toISOString();

  return {
    summary: {
      snapshotId: project.id,
      projectName: project.name,
      description: project.description,
      totalCost: totalCostWan,
      totalWorkloadDays,
      exportedAt
    },
    modules: moduleList
  };
};
