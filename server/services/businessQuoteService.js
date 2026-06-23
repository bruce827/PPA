const configModel = require('../models/configModel');
const projectModel = require('../models/projectModel');
const calculationService = require('./calculationService');
const { HttpError } = require('../utils/errors');
const { BUSINESS_PRICING } = require('../utils/constants');

const PRICING_MODES = {
  CUSTOM_DEVELOPMENT: 'custom_development',
  ENTERPRISE_PRODUCT: 'enterprise_product',
};

const PRICING_MODE_LABELS = {
  [PRICING_MODES.CUSTOM_DEVELOPMENT]: 'B端定制项目',
  [PRICING_MODES.ENTERPRISE_PRODUCT]: '企业级产品',
};

const ENTERPRISE_PRODUCT_SUM_TARGET = 100;

const RATE_FIELDS_BY_MODE = {
  [PRICING_MODES.CUSTOM_DEVELOPMENT]: [
    'tax_rate',
    'management_rate',
    'sales_rate',
    'profit_rate',
  ],
  [PRICING_MODES.ENTERPRISE_PRODUCT]: [
    'rd_rate',
    'cac_rate',
    'cogs_rate',
    'csm_rate',
  ],
};

const RANGE_BY_MODE = {
  [PRICING_MODES.CUSTOM_DEVELOPMENT]: BUSINESS_PRICING.CUSTOM_DEVELOPMENT,
  [PRICING_MODES.ENTERPRISE_PRODUCT]: BUSINESS_PRICING.ENTERPRISE_PRODUCT,
};

const normalizePricingMode = (input) => {
  if (
    input === PRICING_MODES.CUSTOM_DEVELOPMENT ||
    input === 'single_snapshot' ||
    input == null
  ) {
    return PRICING_MODES.CUSTOM_DEVELOPMENT;
  }
  if (input === PRICING_MODES.ENTERPRISE_PRODUCT) {
    return PRICING_MODES.ENTERPRISE_PRODUCT;
  }
  throw new HttpError(400, '无效的商务报价模式', 'ValidationError');
};

const parseJsonObject = (raw, errorName) => {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (_error) {
    throw new HttpError(500, `Failed to parse ${errorName}`, 'BusinessQuoteParseError');
  }
  return {};
};

const normalizeRates = (pricingMode, input) => {
  const normalized = {};
  const fields = RATE_FIELDS_BY_MODE[pricingMode];
  const ranges = RANGE_BY_MODE[pricingMode];

  fields.forEach((field) => {
    const numeric = Number(input?.[field]);
    const range = ranges[field];
    if (!Number.isFinite(numeric)) {
      throw new HttpError(400, `${range.label}必须是有效数字`, 'ValidationError');
    }
    if (numeric < range.min || numeric > range.max) {
      throw new HttpError(
        400,
        `${range.label}必须在 ${range.min}% 到 ${range.max}% 之间`,
        'ValidationError'
      );
    }
    normalized[field] = numeric;
  });

  if (pricingMode === PRICING_MODES.ENTERPRISE_PRODUCT) {
    const totalRate = fields.reduce(
      (sum, field) => sum + Number(normalized[field] || 0),
      0
    );
    if (Math.abs(totalRate - ENTERPRISE_PRODUCT_SUM_TARGET) > 0.001) {
      throw new HttpError(
        400,
        `企业级产品成本结构合计必须为 ${ENTERPRISE_PRODUCT_SUM_TARGET}%`,
        'ValidationError'
      );
    }
  }

  return normalized;
};

const buildAmounts = (pricingMode, baseCostWan, rates) => {
  if (pricingMode === PRICING_MODES.ENTERPRISE_PRODUCT) {
    const variableShareRate = Number(rates.cogs_rate || 0) + Number(rates.csm_rate || 0);
    if (variableShareRate <= 0) {
      throw new HttpError(
        400,
        '企业级产品模式下 COGS 与 CSM 占比之和必须大于 0',
        'ValidationError'
      );
    }

    const quoteTotal = baseCostWan / (variableShareRate / 100);
    const rdCost = quoteTotal * (rates.rd_rate / 100);
    const cacCost = quoteTotal * (rates.cac_rate / 100);
    const cogsCost = quoteTotal * (rates.cogs_rate / 100);
    const csmCost = quoteTotal * (rates.csm_rate / 100);

    return {
      rd_cost_wan: Number(rdCost.toFixed(2)),
      cac_cost_wan: Number(cacCost.toFixed(2)),
      cogs_cost_wan: Number(cogsCost.toFixed(2)),
      csm_cost_wan: Number(csmCost.toFixed(2)),
      variable_cost_share_rate: Number(variableShareRate.toFixed(2)),
      non_variable_cost_wan: Number((rdCost + cacCost).toFixed(2)),
      quote_total_wan: Number(quoteTotal.toFixed(2)),
    };
  }

  const managementFee = baseCostWan * (rates.management_rate / 100);
  const salesFee = baseCostWan * (rates.sales_rate / 100);
  const profitFee = baseCostWan * (rates.profit_rate / 100);
  const subtotalBeforeTax = baseCostWan + managementFee + salesFee + profitFee;
  const taxFee = subtotalBeforeTax * (rates.tax_rate / 100);
  const quoteTotal = subtotalBeforeTax + taxFee;
  const grossProfit = quoteTotal - baseCostWan - taxFee;
  const grossMarginRate =
    quoteTotal > 0 ? (grossProfit / quoteTotal) * 100 : 0;

  return {
    management_fee_wan: Number(managementFee.toFixed(2)),
    sales_fee_wan: Number(salesFee.toFixed(2)),
    profit_fee_wan: Number(profitFee.toFixed(2)),
    subtotal_before_tax_wan: Number(subtotalBeforeTax.toFixed(2)),
    tax_fee_wan: Number(taxFee.toFixed(2)),
    quote_total_wan: Number(quoteTotal.toFixed(2)),
    gross_profit_wan: Number(grossProfit.toFixed(2)),
    gross_margin_rate: Number(grossMarginRate.toFixed(2)),
  };
};

const buildBusinessQuoteSnapshot = ({
  project,
  baseCostWan,
  rates,
  remark,
  pricingMode,
}) => {
  const amounts = buildAmounts(pricingMode, baseCostWan, rates);

  return {
    project_id: project.id,
    project_name: project.name,
    pricing_mode: pricingMode,
    pricing_mode_label: PRICING_MODE_LABELS[pricingMode],
    base_cost_wan: Number(baseCostWan.toFixed(2)),
    rates,
    amounts,
    remark: typeof remark === 'string' ? remark.trim() : '',
    updated_at: new Date().toISOString(),
  };
};

const normalizeBusinessQuoteSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return null;
  }

  const pricingMode = normalizePricingMode(snapshot.pricing_mode);
  const rates = normalizeRates(pricingMode, snapshot.rates || {});
  const baseCostWan = Number(snapshot.base_cost_wan || 0);

  return {
    ...snapshot,
    pricing_mode: pricingMode,
    pricing_mode_label: PRICING_MODE_LABELS[pricingMode],
    rates,
    base_cost_wan: Number(baseCostWan.toFixed(2)),
    amounts: buildAmounts(pricingMode, baseCostWan, rates),
  };
};

const getProjectOrThrow = async (projectId) => {
  const project = await projectModel.getProjectById(projectId);
  if (!project) {
    throw new HttpError(404, 'Project not found', 'NotFoundError');
  }
  if (!project.assessment_details_json) {
    throw new HttpError(400, '项目缺少评估明细，无法生成商务报价', 'BusinessQuoteUnavailableError');
  }
  return project;
};

const calculateExactBaseCost = async (project) => {
  const details = parseJsonObject(project.assessment_details_json, 'assessment_details_json');
  const roles =
    Array.isArray(details.roles) && details.roles.length > 0
      ? details.roles
      : await configModel.getAllRoles();
  const calculation = await calculationService.calculateProjectCost({
    ...details,
    roles,
  });
  return {
    calculation,
    baseCostWan: Number(calculation.total_cost_exact || calculation.total_cost || 0),
  };
};

const getBusinessQuoteContext = async (projectId) => {
  const project = await getProjectOrThrow(projectId);
  const [defaultConfig, { baseCostWan }] = await Promise.all([
    configModel.getBusinessPricingConfig(),
    calculateExactBaseCost(project),
  ]);

  return {
    project_id: project.id,
    project_name: project.name,
    base_cost_wan: Number(baseCostWan.toFixed(2)),
    default_pricing_mode: PRICING_MODES.CUSTOM_DEVELOPMENT,
    default_rates: defaultConfig.custom_development,
    default_rates_by_mode: defaultConfig,
    business_quote: project.business_quote_json
      ? normalizeBusinessQuoteSnapshot(
          parseJsonObject(project.business_quote_json, 'business_quote_json')
        )
      : null,
  };
};

const saveBusinessQuote = async (projectId, payload) => {
  const project = await getProjectOrThrow(projectId);
  const { baseCostWan } = await calculateExactBaseCost(project);
  const defaultConfig = await configModel.getBusinessPricingConfig();
  const pricingMode = normalizePricingMode(payload?.pricing_mode);
  const defaultRates = defaultConfig[pricingMode];
  const rates = normalizeRates(pricingMode, {
    ...defaultRates,
    ...(payload || {}),
  });
  const snapshot = buildBusinessQuoteSnapshot({
    project,
    baseCostWan,
    rates,
    remark: payload?.remark,
    pricingMode,
  });

  await projectModel.updateProjectFields(projectId, {
    business_quote_json: JSON.stringify(snapshot),
  });

  return snapshot;
};

module.exports = {
  getBusinessQuoteContext,
  saveBusinessQuote,
};
