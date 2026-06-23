/**
 * 描述：商务版导出数据格式化器。
 *       基于已保存的商务报价快照与模块成本占比，生成商务报价 Excel 所需的数据结构。
 */
const { HttpError } = require('../../../utils/errors');
const externalFormatter = require('./externalFormatter');

function normalizePricingMode(mode) {
  return mode === 'enterprise_product'
    ? 'enterprise_product'
    : 'custom_development';
}

function buildEnterpriseAmounts(baseCostWan, rates) {
  const variableShareRate =
    Number(rates?.cogs_rate || 0) + Number(rates?.csm_rate || 0);
  if (variableShareRate <= 0) {
    throw new HttpError(
      400,
      'Invalid enterprise product variable share rates',
      'BusinessQuoteInvalidError'
    );
  }

  const quoteTotal = baseCostWan / (variableShareRate / 100);
  return {
    rd_cost_wan: Number((quoteTotal * (Number(rates?.rd_rate || 0) / 100)).toFixed(2)),
    cac_cost_wan: Number((quoteTotal * (Number(rates?.cac_rate || 0) / 100)).toFixed(2)),
    cogs_cost_wan: Number((quoteTotal * (Number(rates?.cogs_rate || 0) / 100)).toFixed(2)),
    csm_cost_wan: Number((quoteTotal * (Number(rates?.csm_rate || 0) / 100)).toFixed(2)),
    variable_cost_share_rate: Number(variableShareRate.toFixed(2)),
    non_variable_cost_wan: Number(
      (
        quoteTotal * (Number(rates?.rd_rate || 0) / 100) +
        quoteTotal * (Number(rates?.cac_rate || 0) / 100)
      ).toFixed(2)
    ),
    quote_total_wan: Number(quoteTotal.toFixed(2)),
  };
}

function normalizeBusinessQuote(project) {
  const businessQuote = parseBusinessQuote(project);
  const pricingMode = normalizePricingMode(businessQuote.pricing_mode);

  if (pricingMode !== 'enterprise_product') {
    return {
      ...businessQuote,
      pricing_mode: pricingMode,
      pricing_mode_label:
        businessQuote.pricing_mode_label || 'B端定制项目',
    };
  }

  const baseCostWan = Number(businessQuote.base_cost_wan || 0);
  const rates = businessQuote.rates || {};

  return {
    ...businessQuote,
    pricing_mode: pricingMode,
    pricing_mode_label:
      businessQuote.pricing_mode_label || '企业级产品',
    base_cost_wan: Number(baseCostWan.toFixed(2)),
    amounts: buildEnterpriseAmounts(baseCostWan, rates),
  };
}

function parseBusinessQuote(project) {
  if (!project || !project.business_quote_json) {
    throw new HttpError(
      400,
      'Business quote not found for this project',
      'BusinessQuoteMissingError'
    );
  }

  try {
    const parsed = JSON.parse(project.business_quote_json);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid business quote payload');
    }
    return parsed;
  } catch (error) {
    throw new HttpError(
      500,
      'Failed to parse business quote data',
      'BusinessQuoteParseError',
      { rawMessage: error.message }
    );
  }
}

exports.formatForExport = (project) => {
  const businessQuote = normalizeBusinessQuote(project);
  const pricingMode = normalizePricingMode(businessQuote.pricing_mode);
  const externalData = externalFormatter.formatForExport(project);
  const quoteTotalWan = Number(businessQuote?.amounts?.quote_total_wan || 0);
  const implementationBaseWan = Number(businessQuote.base_cost_wan || 0);
  const moduleValueWan =
    pricingMode === 'enterprise_product' ? implementationBaseWan : quoteTotalWan;

  const modules = (externalData.modules || []).map((module) => {
    const costRatio = Number(module.costRatio || 0);
    return {
      module1: module.module1,
      module2: module.module2,
      module3: module.module3,
      moduleName: module.moduleName,
      workloadDays: Number(module.workloadDays || 0),
      quoteCostWan: Number((moduleValueWan * costRatio).toFixed(2)),
      costRatio: Number((costRatio * 100).toFixed(2)),
    };
  });

  return {
    summary: {
      projectName: project.name,
      description: project.description || '',
      pricingMode,
      pricingModeLabel:
        businessQuote.pricing_mode_label ||
        (pricingMode === 'enterprise_product' ? '企业级产品' : 'B端定制项目'),
      implementationCostWan: implementationBaseWan,
      managementRate: Number(businessQuote?.rates?.management_rate || 0),
      salesRate: Number(businessQuote?.rates?.sales_rate || 0),
      profitRate: Number(businessQuote?.rates?.profit_rate || 0),
      taxRate: Number(businessQuote?.rates?.tax_rate || 0),
      managementFeeWan: Number(businessQuote?.amounts?.management_fee_wan || 0),
      salesFeeWan: Number(businessQuote?.amounts?.sales_fee_wan || 0),
      profitFeeWan: Number(businessQuote?.amounts?.profit_fee_wan || 0),
      subtotalBeforeTaxWan: Number(businessQuote?.amounts?.subtotal_before_tax_wan || 0),
      taxFeeWan: Number(businessQuote?.amounts?.tax_fee_wan || 0),
      rdRate: Number(businessQuote?.rates?.rd_rate || 0),
      cacRate: Number(businessQuote?.rates?.cac_rate || 0),
      cogsRate: Number(businessQuote?.rates?.cogs_rate || 0),
      csmRate: Number(businessQuote?.rates?.csm_rate || 0),
      rdCostWan: Number(businessQuote?.amounts?.rd_cost_wan || 0),
      cacCostWan: Number(businessQuote?.amounts?.cac_cost_wan || 0),
      cogsCostWan: Number(businessQuote?.amounts?.cogs_cost_wan || 0),
      csmCostWan: Number(businessQuote?.amounts?.csm_cost_wan || 0),
      variableCostShareRate: Number(
        businessQuote?.amounts?.variable_cost_share_rate || 0
      ),
      nonVariableCostWan: Number(
        businessQuote?.amounts?.non_variable_cost_wan || 0
      ),
      totalCost: quoteTotalWan,
      totalWorkloadDays: Number(project.final_workload_days || 0),
      grossProfitWan: Number(businessQuote?.amounts?.gross_profit_wan || 0),
      grossMarginRate: Number(businessQuote?.amounts?.gross_margin_rate || 0),
      remark: businessQuote.remark || '',
      quotedAt: businessQuote.updated_at || '',
      exportedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      exportedAtISO: new Date().toISOString(),
    },
    moduleSheetName:
      pricingMode === 'enterprise_product' ? '模块实施基线明细' : '模块商务报价明细',
    moduleValueLabel:
      pricingMode === 'enterprise_product'
        ? '实施基线（万元）'
        : '商务报价（万元）',
    modules,
  };
};
