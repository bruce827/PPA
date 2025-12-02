const web3dProjectModel = require('../models/web3dProjectModel');
const web3dConfigModel = require('../models/web3dConfigModel');
const configModel = require('../models/configModel');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const assertString = (value, field) => {
  if (!value || typeof value !== 'string') {
    const error = new Error(`${field} is required`);
    error.name = 'ValidationError';
    error.statusCode = 400;
    throw error;
  }
};

const roundToDecimals = (value, decimals = 2) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }
  const factor = 10 ** decimals;
  return Math.round((numericValue + Number.EPSILON) * factor) / factor;
};

const parseOptions = (optionsJson) => {
  if (!optionsJson) return [];
  try {
    const parsed = typeof optionsJson === 'string' ? JSON.parse(optionsJson) : optionsJson;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const resolveOptionValue = (options, selection) => {
  const byNumber =
    selection?.selected_value ??
    selection?.value ??
    selection?.option_value;

  if (Number.isFinite(Number(byNumber))) {
    return Number(byNumber);
  }

  if (selection?.label) {
    const matched = options.find((opt) => opt.label === selection.label);
    if (matched && Number.isFinite(Number(matched.value))) {
      return Number(matched.value);
    }
  }

  return null;
};

const computeRiskScore = (selections = [], riskItems = []) => {
  let score = 0;
  let maxScore = 0;

  const selectionByKey = new Map();
  selections.forEach((sel) => {
    if (sel.item_id) selectionByKey.set(`id:${sel.item_id}`, sel);
    if (sel.item_name) selectionByKey.set(`name:${sel.item_name}`, sel);
  });

  riskItems.forEach((item) => {
    const options = parseOptions(item.options_json);
    const maxOptionValue = options.reduce(
      (max, opt) => (Number.isFinite(Number(opt.value)) && Number(opt.value) > max ? Number(opt.value) : max),
      0
    );
    maxScore += Number(item.weight || 1) * maxOptionValue;

    const sel = selectionByKey.get(`id:${item.id}`) || selectionByKey.get(`name:${item.item_name}`);
    if (!sel) return;
    const selectedValue = resolveOptionValue(options, sel);
    if (!Number.isFinite(selectedValue)) return;

    score += Number(item.weight || 1) * selectedValue;
  });

  const ratio = maxScore > 0 ? score / maxScore : 0;
  const riskLevel = ratio >= 0.7 ? 'high' : ratio >= 0.4 ? 'medium' : 'low';

  return {
    risk_score: roundToDecimals(score, 2),
    risk_max_score: roundToDecimals(maxScore, 2),
    risk_ratio: roundToDecimals(ratio, 4),
    risk_level: riskLevel
  };
};

const computeWorkload = (workloadItems = [], templates = [], roles = []) => {
  const rolePriceMap = new Map(
    (roles || []).map((r) => [r.role_name, Number(r.unit_price || 0)])
  );
  const defaultRolePrice = 1200;

  const templateMap = new Map(
    templates.map((tpl) => [`${tpl.category}::${tpl.item_name}`, tpl])
  );

  const totals = {
    data_processing: 0,
    core_dev: 0,
    business_logic: 0
  };

  const details = [];
  let baseCostWan = 0;

  workloadItems.forEach((item) => {
    if (!item || !item.category || !item.item_name) {
      const error = new Error('workload item must include category and item_name');
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }

    const key = `${item.category}::${item.item_name}`;
    const tpl = templateMap.get(key);
    const baseDays = Number.isFinite(Number(item.base_days))
      ? Number(item.base_days)
      : Number(tpl?.base_days);
    if (!Number.isFinite(baseDays) || baseDays <= 0) {
      const error = new Error(`Invalid base_days for workload item ${item.item_name}`);
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }

    const quantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1;
    const subtotal = baseDays * quantity;

    if (totals[item.category] === undefined) {
      const error = new Error(`Unknown workload category: ${item.category}`);
      error.name = 'ValidationError';
      error.statusCode = 400;
      throw error;
    }

    totals[item.category] += subtotal;
    const roleNames = Array.isArray(item.role_names) ? item.role_names : [];
    const roleName = item.role_name || roleNames[0] || '';

    let unitPriceYuan = Number.isFinite(Number(item.unit_price_yuan))
      ? Number(item.unit_price_yuan)
      : undefined;

    if (!unitPriceYuan) {
      if (roleNames.length) {
        const sum = roleNames.reduce((acc, name) => acc + (rolePriceMap.get(name) || defaultRolePrice), 0);
        unitPriceYuan = sum / roleNames.length;
      } else {
        unitPriceYuan = rolePriceMap.get(roleName) || defaultRolePrice;
      }
    }

    const subtotalCostWan = roundToDecimals(
      (subtotal * unitPriceYuan) / 10000,
      4
    );
    baseCostWan += subtotalCostWan;

    details.push({
      ...item,
      base_days: baseDays,
      quantity,
      role_name: roleName,
      role_names: roleNames,
      unit_price_yuan: unitPriceYuan,
      subtotal_days: roundToDecimals(subtotal, 2),
      subtotal_cost_wan: subtotalCostWan
    });
  });

  const totalBaseDays = totals.data_processing + totals.core_dev + totals.business_logic;

  return {
    totals: {
      data_processing_days: roundToDecimals(totals.data_processing, 2),
      core_dev_days: roundToDecimals(totals.core_dev, 2),
      business_logic_days: roundToDecimals(totals.business_logic, 2),
      total_base_days: roundToDecimals(totalBaseDays, 2)
    },
    details,
    base_cost_wan: roundToDecimals(baseCostWan, 4)
  };
};

const calculate = async (assessment = {}) => {
  const [riskItems, workloadTemplates, roles] = await Promise.all([
    web3dConfigModel.getRiskItems(),
    web3dConfigModel.getWorkloadTemplates(),
    configModel.getAllRoles()
  ]);

  const riskResult = computeRiskScore(assessment.risk_selections || [], riskItems);
  const workloadResult = computeWorkload(
    assessment.workload_items || [],
    workloadTemplates.map((tpl) => ({
      ...tpl,
    })),
    roles
  );

  const extraFactor =
    Number.isFinite(Number(assessment.risk_factor_extra))
      ? Number(assessment.risk_factor_extra)
      : 0;

  const providedFactor =
    Number.isFinite(Number(assessment.risk_factor)) && Number(assessment.risk_factor) > 0
      ? Number(assessment.risk_factor)
      : null;

  let riskFactor = providedFactor;
  if (!riskFactor) {
    riskFactor = 1 + Math.min(1, riskResult.risk_ratio) * 0.5 + extraFactor;
    if (assessment.mix_tech === true || assessment.mix_tech === 'true') {
      riskFactor += 0.3;
    }
  }

  const normalizedRiskFactor = clamp(roundToDecimals(riskFactor, 4), 1, 3);
  const totalWorkloadDays = workloadResult.totals.total_base_days * normalizedRiskFactor;

  const baseCostWan = workloadResult.base_cost_wan;
  const totalCostWan = roundToDecimals(baseCostWan * normalizedRiskFactor, 2);

  return {
    ...riskResult,
    risk_factor: normalizedRiskFactor,
    workload: {
      ...workloadResult.totals,
      total_days: roundToDecimals(totalWorkloadDays, 2),
      items: workloadResult.details
    },
    cost: {
      base_cost_wan: roundToDecimals(baseCostWan, 2),
      total_cost_wan: totalCostWan,
      roles: roles || []
    }
  };
};

const createProject = async (payload) => {
  assertString(payload.name, 'name');
  const assessment = payload.assessment || {};

  if (payload.is_template) {
    await web3dProjectModel.clearAllTemplateFlags();
  }

  const calculation = await calculate(assessment);
  const dbData = {
    name: payload.name,
    description: payload.description || '',
    is_template: payload.is_template || 0,
    final_total_cost: calculation.cost.total_cost_wan,
    final_risk_score: calculation.risk_score,
    final_workload_days: calculation.workload.total_days,
    assessment_details_json: JSON.stringify(assessment)
  };

  const result = await web3dProjectModel.createProject(dbData);
  return { ...result, calculation };
};

const updateProject = async (id, payload) => {
  assertString(payload.name, 'name');
  const assessment = payload.assessment || {};

  if (payload.is_template) {
    await web3dProjectModel.clearAllTemplateFlags();
  }

  const calculation = await calculate(assessment);
  const dbData = {
    name: payload.name,
    description: payload.description || '',
    is_template: payload.is_template || 0,
    final_total_cost: calculation.cost.total_cost_wan,
    final_risk_score: calculation.risk_score,
    final_workload_days: calculation.workload.total_days,
    assessment_details_json: JSON.stringify(assessment)
  };

  const result = await web3dProjectModel.updateProject(id, dbData);
  return { ...result, calculation };
};

const getProjectById = async (id) => {
  const project = await web3dProjectModel.getProjectById(id);
  if (!project) {
    const error = new Error('Project not found');
    error.statusCode = 404;
    throw error;
  }
  return project;
};

const getAllProjects = () => web3dProjectModel.getAllProjects();

const deleteProject = (id) => web3dProjectModel.deleteProject(id);

module.exports = {
  calculate,
  createProject,
  updateProject,
  getProjectById,
  getAllProjects,
  deleteProject
};
