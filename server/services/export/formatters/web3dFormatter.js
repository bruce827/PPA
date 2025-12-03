const { HttpError } = require('../../../utils/errors');
const web3dProjectService = require('../../web3dProjectService');
const web3dConfigModel = require('../../../models/web3dConfigModel');
const configModel = require('../../../models/configModel');

const parseAssessment = (project) => {
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
    throw new HttpError(
      500,
      'Failed to parse assessment data',
      'ExportDataParseError',
      { rawMessage: error.message }
    );
  }
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatWeb3dExport = async (project) => {
  if (!project) {
    throw new HttpError(404, 'Project not found', 'NotFoundError');
  }
  if (project.project_type !== 'web3d') {
    throw new HttpError(400, 'Not a Web3D project', 'InvalidProjectType');
  }

  const assessment = parseAssessment(project);

  // 计算最新的风险/工作量/成本
  const calc = await web3dProjectService.calculate(assessment);

  // 补充风险项元数据
  const riskItems = await web3dConfigModel.getRiskItems();
  const riskMapByName = new Map(
    riskItems.map((ri) => [String(ri.item_name), ri])
  );

  const riskSelections = Array.isArray(assessment.risk_selections)
    ? assessment.risk_selections
    : [];

  const riskRows = riskSelections.map((sel) => {
    const meta = riskMapByName.get(String(sel.item_name)) || {};
    const options =
      meta.options_json && typeof meta.options_json === 'string'
        ? (() => {
            try {
              return JSON.parse(meta.options_json);
            } catch {
              return [];
            }
          })()
        : [];
    const matched =
      options.find((opt) => Number(opt.value) === Number(sel.selected_value)) ||
      options.find((opt) => opt.label === sel.label);
    const choice = matched?.label || sel.label || sel.selected_value;
    const value = toNumber(sel.selected_value);
    const weight = toNumber(meta.weight || 1);
    const weightedScore = toNumber(weight * value);
    return {
      step_name: meta.step_name || '',
      item_name: sel.item_name || '',
      choice,
      value,
      weight,
      weightedScore
    };
  });

  // 角色单价
  const roles = await configModel.getAllRoles();
  const roleMap = new Map((roles || []).map((r) => [r.role_name, r]));

  // 工作量明细（使用模板基准天数 + 角色单价）
  const templates = await web3dConfigModel.getWorkloadTemplates();
  const tplMap = new Map(
    templates.map((tpl) => [`${tpl.category}::${tpl.item_name}`, tpl])
  );

  const workloadItems = Array.isArray(assessment.workload_items)
    ? assessment.workload_items
    : [];

  const workloadRows = workloadItems.map((item) => {
    const tpl = tplMap.get(`${item.category}::${item.item_name}`);
    const baseDays = toNumber(
      item.base_days || (tpl && tpl.base_days),
      0
    );
    const quantity = toNumber(item.quantity, 1);
    const subtotalDays = toNumber(baseDays * quantity, 0);
    const roleNames = Array.isArray(item.role_names) ? item.role_names : [];
    let unitPriceYuan =
      Number.isFinite(Number(item.unit_price_yuan)) && Number(item.unit_price_yuan) > 0
        ? Number(item.unit_price_yuan)
        : undefined;
    if (!unitPriceYuan) {
      if (roleNames.length) {
        const sum = roleNames.reduce((acc, name) => acc + (roleMap.get(name)?.unit_price || 1200), 0);
        unitPriceYuan = sum / roleNames.length;
      } else {
        const role = roleMap.get(item.role_name || '');
        unitPriceYuan = role?.unit_price || 1200;
      }
    }
    return {
      category: item.category || (tpl && tpl.category) || '',
      item_name: item.item_name || (tpl && tpl.item_name) || '',
      base_days: baseDays,
      quantity,
      role_name: item.role_name || '',
      role_names: roleNames,
      unit_price_yuan: unitPriceYuan,
      subtotal_days: subtotalDays,
      unit: item.unit || (tpl && tpl.unit) || ''
    };
  });

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const exportedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return {
    summary: {
      projectName: project.name,
      description: project.description || '',
      totalCostWan:
        project.final_total_cost != null
          ? Number(project.final_total_cost)
          : calc.cost.total_cost_wan,
      baseCostWan: calc.cost.base_cost_wan,
      riskScore: calc.risk_score,
      riskMaxScore: calc.risk_max_score,
      riskRatio: calc.risk_ratio,
      riskLevel: calc.risk_level,
      riskFactor: calc.risk_factor,
      workloadDays: calc.workload.total_days,
      baseWorkloadDays: calc.workload.total_base_days,
      exportedAt
    },
    riskItems: riskRows,
    workload: {
      items: workloadRows,
      totals: {
        data_processing_days: calc.workload.data_processing_days,
        core_dev_days: calc.workload.core_dev_days,
        business_logic_days: calc.workload.business_logic_days,
        performance_days: calc.workload.performance_days,
        total_base_days: calc.workload.total_base_days,
        total_days: calc.workload.total_days
      }
    }
  };
};

module.exports = {
  formatWeb3dExport
};
