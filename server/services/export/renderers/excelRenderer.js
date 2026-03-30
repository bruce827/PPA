/**
 * 描述：Excel 渲染器。
 *       负责将已格式化的内部版/对外版导出数据结构渲染为 ExcelJS 工作簿，
 *       并应用统一的样式、列宽和汇总行等展示细节。
 */
const ExcelJS = require('exceljs');

const HEADER_BG = 'FF4472C4';
const HEADER_FONT_COLOR = 'FFFFFFFF';
const TOTAL_BG = 'FFF0F0F0';

/**
 * 描述：对表头行应用统一的背景色与字体加粗样式。
 * @param {import('exceljs').Row} row - 需要设置样式的表头行对象。
 * @returns {void} 无返回值，直接修改传入行的单元格样式。
 */
function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: HEADER_BG }
    };
    cell.font = {
      color: { argb: HEADER_FONT_COLOR },
      bold: true
    };
  });
}

/**
 * 描述：对“总计”行应用灰底加粗样式，用于强调汇总数据。
 * @param {import('exceljs').Row} row - 需要设置样式的总计行对象。
 * @returns {void} 无返回值，直接修改传入行的单元格样式。
 */
function styleTotalRow(row) {
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: TOTAL_BG }
    };
    cell.font = {
      bold: true
    };
  });
}

/**
 * 描述：根据列内容自动调整列宽，提升导出 Excel 的可读性。
 * @param {import('exceljs').Worksheet} sheet - 需要自适应列宽的工作表。
 * @returns {void} 无返回值，在工作表上就地修改列宽。
 */
function autoWidth(sheet) {
  sheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const v = cell.value;
      if (v == null) return;
      const len = String(v).length;
      if (len > maxLength) maxLength = len;
    });
    column.width = maxLength + 2;
  });
}

/**
 * 描述：渲染内部版 Excel 工作簿，包含 Summary、角色成本、差旅成本、
 *       维护成本、风险评估明细和 Rating Factor 说明等多个工作表。
 * @param {Object} formatted - 内部版标准化导出数据对象。
 * @returns {import('exceljs').Workbook} 构建完成的 ExcelJS 工作簿实例。
 */
function renderInternal(formatted) {
  const workbook = new ExcelJS.Workbook();
  const now = new Date();
  workbook.creator = 'PPA System';
  workbook.created = now;
  workbook.modified = now;

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: '分类', key: 'label', width: 20 },
    { header: '报价(万元)', key: 'value', width: 40 }
  ];
  styleHeaderRow(summarySheet.getRow(1));

  const summary = formatted.summary || {};
  summarySheet.addRow(['项目名称', summary.projectName || '']);
  summarySheet.addRow(['项目描述', summary.description || '']);
  summarySheet.addRow(['报价总计（万元）', summary.totalCost != null ? summary.totalCost : '']);
  summarySheet.addRow(['风险总分', summary.riskScore != null ? summary.riskScore : '']);
  summarySheet.addRow([
    '总工作量（人天）',
    summary.workloadDays != null ? summary.workloadDays : ''
  ]);
  summarySheet.addRow([
    'Rating Factor',
    summary.ratingFactor != null ? summary.ratingFactor : ''
  ]);
  summarySheet.addRow(['评估完成时间', summary.completedAt || '']);
  summarySheet.addRow(['导出时间', summary.exportedAt || '']);
  autoWidth(summarySheet);

  const roleSheet = workbook.addWorksheet('角色成本明细');
  roleSheet.columns = [
    { header: '一级模块', key: 'module1', width: 18 },
    { header: '二级模块', key: 'module2', width: 18 },
    { header: '三级模块', key: 'module3', width: 18 },
    { header: '角色', key: 'role', width: 20 },
    { header: '单价（元/人/天）', key: 'unitPrice', width: 20 },
    { header: '工作量（人天）', key: 'workloadDays', width: 18 },
    { header: '小计（元）', key: 'subtotal', width: 18 },
    { header: '小计（万元）', key: 'subtotalWan', width: 18 }
  ];
  styleHeaderRow(roleSheet.getRow(1));

  const roleCosts = Array.isArray(formatted.roleCosts) ? formatted.roleCosts : [];
  let totalWorkload = 0;
  let totalSubtotal = 0;
  let totalSubtotalWan = 0;

  roleCosts.forEach((rc) => {
    const unitPrice = Number(rc.unitPrice || 0);
    const workloadDays = Number(rc.workloadDays || 0);
    const subtotal = Number(rc.subtotal || 0);
    const subtotalWan = Number(rc.subtotalWan || 0);

    totalWorkload += workloadDays;
    totalSubtotal += subtotal;
    totalSubtotalWan += subtotalWan;

    roleSheet.addRow({
      module1: rc.module1 || '',
      module2: rc.module2 || '',
      module3: rc.module3 || rc.module || '',
      role: rc.role || '',
      unitPrice,
      workloadDays,
      subtotal,
      subtotalWan
    });
  });

  const totalRow = roleSheet.addRow({
    module1: '总计',
    module2: '',
    module3: '',
    role: '',
    unitPrice: '',
    workloadDays: totalWorkload,
    subtotal: totalSubtotal,
    subtotalWan: totalSubtotalWan
  });
  styleTotalRow(totalRow);
  roleSheet.getColumn('unitPrice').numFmt = '0.00';
  roleSheet.getColumn('workloadDays').numFmt = '0.0';
  roleSheet.getColumn('subtotal').numFmt = '0.00';
  roleSheet.getColumn('subtotalWan').numFmt = '0.00';
  autoWidth(roleSheet);

  const travelSheet = workbook.addWorksheet('差旅成本明细');
  travelSheet.columns = [
    { header: '项目', key: 'item', width: 30 },
    { header: '月度成本（元）', key: 'monthlyCost', width: 20 },
    { header: '项目周期（月）', key: 'months', width: 18 },
    { header: '小计（元）', key: 'subtotal', width: 18 },
    { header: '小计（万元）', key: 'subtotalWan', width: 18 }
  ];
  styleHeaderRow(travelSheet.getRow(1));

  const travelCosts = Array.isArray(formatted.travelCosts) ? formatted.travelCosts : [];
  let travelTotalMonthly = 0;
  let travelTotalSubtotal = 0;
  let travelTotalSubtotalWan = 0;

  travelCosts.forEach((tc) => {
    const monthlyCost = Number(tc.monthlyCost || 0);
    const months = Number(tc.months || 0);
    const subtotal = Number(tc.subtotal || 0);
    const subtotalWan = Number(tc.subtotalWan || 0);

    travelTotalMonthly += monthlyCost;
    travelTotalSubtotal += subtotal;
    travelTotalSubtotalWan += subtotalWan;

    travelSheet.addRow({
      item: tc.item || '',
      monthlyCost,
      months,
      subtotal,
      subtotalWan
    });
  });

  const travelTotalRow = travelSheet.addRow({
    item: '总计',
    monthlyCost: travelTotalMonthly,
    months: '',
    subtotal: travelTotalSubtotal,
    subtotalWan: travelTotalSubtotalWan
  });
  styleTotalRow(travelTotalRow);
  travelSheet.getColumn('monthlyCost').numFmt = '0.00';
  travelSheet.getColumn('months').numFmt = '0.0';
  travelSheet.getColumn('subtotal').numFmt = '0.00';
  travelSheet.getColumn('subtotalWan').numFmt = '0.00';
  autoWidth(travelSheet);

  const maintenanceSheet = workbook.addWorksheet('维护成本');
  maintenanceSheet.columns = [
    { header: '项目', key: 'item', width: 30 },
    { header: '值', key: 'value', width: 20 }
  ];
  styleHeaderRow(maintenanceSheet.getRow(1));

  const maintenance = formatted.maintenance || {};
  maintenanceSheet.addRow(['维护月数', maintenance.months != null ? maintenance.months : '']);
  maintenanceSheet.addRow([
    '月度维护成本（万元）',
    maintenance.monthlyCostWan != null ? maintenance.monthlyCostWan : ''
  ]);
  maintenanceSheet.addRow([
    '维护成本总计（万元）',
    maintenance.totalWan != null ? maintenance.totalWan : ''
  ]);
  autoWidth(maintenanceSheet);

  const riskSheet = workbook.addWorksheet('风险评估明细');
  riskSheet.columns = [
    { header: '类别', key: 'category', width: 25 },
    { header: '评估项', key: 'item', width: 30 },
    { header: '选择/描述', key: 'choice', width: 30 },
    { header: '得分', key: 'score', width: 10 }
  ];
  styleHeaderRow(riskSheet.getRow(1));

  const riskItems = Array.isArray(formatted.riskItems) ? formatted.riskItems : [];
  let totalRiskScore = 0;

  riskItems.forEach((ri) => {
    const score = Number(ri.score || 0);
    totalRiskScore += score;
    riskSheet.addRow({
      category: ri.category || '',
      item: ri.item || '',
      choice: ri.choice || '',
      score
    });
  });

  const riskTotalRow = riskSheet.addRow({
    category: '',
    item: '风险总分',
    choice: '',
    score: totalRiskScore
  });
  styleTotalRow(riskTotalRow);
  riskSheet.getColumn('score').numFmt = '0.0';
  autoWidth(riskSheet);

  const riskCostSheet = workbook.addWorksheet('风险成本明细');
  riskCostSheet.columns = [
    { header: '风险内容', key: 'description', width: 40 },
    { header: '预估费用（万元）', key: 'costWan', width: 20 }
  ];
  styleHeaderRow(riskCostSheet.getRow(1));

  const riskCosts = Array.isArray(formatted.riskCosts) ? formatted.riskCosts : [];
  let riskCostTotal = 0;

  riskCosts.forEach((rc) => {
    const costWan = Number(rc.costWan || 0);
    riskCostTotal += costWan;
    riskCostSheet.addRow({
      description: rc.description || '',
      costWan
    });
  });

  if (riskCosts.length) {
    const riskCostTotalRow = riskCostSheet.addRow({
      description: '总计',
      costWan: riskCostTotal
    });
    styleTotalRow(riskCostTotalRow);
  }
  riskCostSheet.getColumn('costWan').numFmt = '0.00';
  autoWidth(riskCostSheet);

  const ratingSheet = workbook.addWorksheet('Rating Factor 说明');
  ratingSheet.columns = [
    { header: '项目', key: 'item', width: 30 },
    { header: '值', key: 'value', width: 20 }
  ];
  styleHeaderRow(ratingSheet.getRow(1));

  const riskCalc = formatted.riskCalculation || {};
  ratingSheet.addRow([
    '风险总分',
    summary.riskScore != null ? summary.riskScore : ''
  ]);
  ratingSheet.addRow([
    '最大风险分值',
    riskCalc.max_risk_score != null ? riskCalc.max_risk_score : ''
  ]);
  ratingSheet.addRow([
    '放大系数',
    riskCalc.amplification_factor != null ? riskCalc.amplification_factor : ''
  ]);
  ratingSheet.addRow([
    'Rating Factor',
    summary.ratingFactor != null ? summary.ratingFactor : ''
  ]);
  autoWidth(ratingSheet);

  return workbook;
}

/**
 * 描述：渲染对外版 Excel 工作簿，包含“项目概览”和“模块报价明细”两个工作表。
 * @param {Object} formatted - 对外版标准化导出数据对象。
 * @returns {import('exceljs').Workbook} 构建完成的 ExcelJS 工作簿实例。
 */
function renderExternal(formatted) {
  const workbook = new ExcelJS.Workbook();
  const now = new Date();
  workbook.creator = 'PPA System';
  workbook.created = now;
  workbook.modified = now;

  const overviewSheet = workbook.addWorksheet('项目概览');
  overviewSheet.columns = [
    { header: '分类', key: 'label', width: 20 },
    { header: '报价(万元)', key: 'value', width: 40 }
  ];
  styleHeaderRow(overviewSheet.getRow(1));

  const summary = formatted.summary || {};
  overviewSheet.addRow(['项目名称', summary.projectName || '']);
  overviewSheet.addRow(['项目描述', summary.description || '']);
  overviewSheet.addRow([
    '报价总计（万元）',
    summary.totalCost != null ? summary.totalCost : ''
  ]);
  overviewSheet.addRow([
    '总工作量（人天）',
    summary.totalWorkloadDays != null ? summary.totalWorkloadDays : ''
  ]);
  overviewSheet.addRow(['导出时间', summary.exportedAt || '']);
  autoWidth(overviewSheet);

  const moduleSheet = workbook.addWorksheet('模块报价明细');
  moduleSheet.columns = [
    { header: '一级模块', key: 'module1', width: 25 },
    { header: '二级模块', key: 'module2', width: 25 },
    { header: '三级模块', key: 'module3', width: 25 },
    { header: '工作量（人天）', key: 'workloadDays', width: 20 },
    { header: '成本（万元）', key: 'costWan', width: 20 },
    { header: '备注', key: 'notes', width: 30 }
  ];
  styleHeaderRow(moduleSheet.getRow(1));

  const modules = Array.isArray(formatted.modules) ? formatted.modules : [];
  let totalWorkload = 0;
  let totalCostWan = 0;

  modules.forEach((m) => {
    const workloadDays = Number(m.workloadDays || 0);
    const costWan = Number(m.costWan || 0);
    totalWorkload += workloadDays;
    totalCostWan += costWan;
    moduleSheet.addRow({
      module1: m.module1 || '',
      module2: m.module2 || '',
      module3: m.module3 || m.moduleName || '',
      workloadDays,
      costWan,
      notes: ''
    });
  });

  const totalRow = moduleSheet.addRow({
    module1: '总计',
    module2: '',
    module3: '',
    workloadDays: totalWorkload,
    costWan: totalCostWan,
    notes: ''
  });
  styleTotalRow(totalRow);

  moduleSheet.getColumn('workloadDays').numFmt = '0.0';
  moduleSheet.getColumn('costWan').numFmt = '0.00';
  autoWidth(moduleSheet);

  return workbook;
}

function renderBusiness(formatted) {
  const workbook = new ExcelJS.Workbook();
  const now = new Date();
  workbook.creator = 'PPA System';
  workbook.created = now;
  workbook.modified = now;

  const summary = formatted.summary || {};

  const overviewSheet = workbook.addWorksheet('商务报价概览');
  overviewSheet.columns = [
    { header: '分类', key: 'label', width: 24 },
    { header: '值', key: 'value', width: 28 }
  ];
  styleHeaderRow(overviewSheet.getRow(1));
  overviewSheet.addRow(['项目名称', summary.projectName || '']);
  overviewSheet.addRow(['项目描述', summary.description || '']);
  overviewSheet.addRow(['报价模式', summary.pricingModeLabel || 'B端定制项目']);
  overviewSheet.addRow([
    summary.pricingMode === 'enterprise_product'
      ? '单客户实施基线（万元）'
      : '实施成本（万元）',
    summary.implementationCostWan || 0
  ]);
  if (summary.pricingMode === 'enterprise_product') {
    overviewSheet.addRow(['研发成本（R&D）占比（%）', summary.rdRate || 0]);
    overviewSheet.addRow(['研发成本（万元）', summary.rdCostWan || 0]);
    overviewSheet.addRow(['营销与获客成本（CAC）占比（%）', summary.cacRate || 0]);
    overviewSheet.addRow(['营销与获客成本（万元）', summary.cacCostWan || 0]);
    overviewSheet.addRow(['基础设施成本（COGS）占比（%）', summary.cogsRate || 0]);
    overviewSheet.addRow(['基础设施成本（万元）', summary.cogsCostWan || 0]);
    overviewSheet.addRow(['客户成功与运维（CSM）占比（%）', summary.csmRate || 0]);
    overviewSheet.addRow(['客户成功与运维（万元）', summary.csmCostWan || 0]);
    overviewSheet.addRow(['非可变成本合计（万元）', summary.nonVariableCostWan || 0]);
    overviewSheet.addRow(['可变成本占比（COGS+CSM）（%）', summary.variableCostShareRate || 0]);
    overviewSheet.addRow([
      '口径说明',
      '按 COGS + CSM 占比反推单客户总商业成本池'
    ]);
  } else {
    overviewSheet.addRow(['管理分摊率（%）', summary.managementRate || 0]);
    overviewSheet.addRow(['管理分摊金额（万元）', summary.managementFeeWan || 0]);
    overviewSheet.addRow(['销售商务率（%）', summary.salesRate || 0]);
    overviewSheet.addRow(['销售商务金额（万元）', summary.salesFeeWan || 0]);
    overviewSheet.addRow(['利润率（%）', summary.profitRate || 0]);
    overviewSheet.addRow(['利润金额（万元）', summary.profitFeeWan || 0]);
    overviewSheet.addRow(['税率（%）', summary.taxRate || 0]);
    overviewSheet.addRow(['税费金额（万元）', summary.taxFeeWan || 0]);
    overviewSheet.addRow(['税前小计（万元）', summary.subtotalBeforeTaxWan || 0]);
  }
  overviewSheet.addRow(['商务报价总计（万元）', summary.totalCost || 0]);
  if (summary.pricingMode !== 'enterprise_product') {
    overviewSheet.addRow(['毛利额（万元）', summary.grossProfitWan || 0]);
    overviewSheet.addRow(['毛利率（%）', summary.grossMarginRate || 0]);
  }
  overviewSheet.addRow(['备注', summary.remark || '']);
  overviewSheet.addRow(['报价时间', summary.quotedAt || '']);
  overviewSheet.addRow(['导出时间', summary.exportedAt || '']);
  overviewSheet.getColumn('value').numFmt = '0.00';
  autoWidth(overviewSheet);

  const moduleSheet = workbook.addWorksheet(
    formatted.moduleSheetName || '模块商务报价明细'
  );
  moduleSheet.columns = [
    { header: '一级模块', key: 'module1', width: 25 },
    { header: '二级模块', key: 'module2', width: 25 },
    { header: '三级模块', key: 'module3', width: 25 },
    { header: '工作量（人天）', key: 'workloadDays', width: 18 },
    { header: '占比（%）', key: 'costRatio', width: 15 },
    {
      header: formatted.moduleValueLabel || '商务报价（万元）',
      key: 'quoteCostWan',
      width: 20
    }
  ];
  styleHeaderRow(moduleSheet.getRow(1));

  const modules = Array.isArray(formatted.modules) ? formatted.modules : [];
  let totalWorkload = 0;
  let totalRatio = 0;
  let totalQuote = 0;

  modules.forEach((module) => {
    const workloadDays = Number(module.workloadDays || 0);
    const costRatio = Number(module.costRatio || 0);
    const quoteCostWan = Number(module.quoteCostWan || 0);
    totalWorkload += workloadDays;
    totalRatio += costRatio;
    totalQuote += quoteCostWan;
    moduleSheet.addRow({
      module1: module.module1 || '',
      module2: module.module2 || '',
      module3: module.module3 || module.moduleName || '',
      workloadDays,
      costRatio,
      quoteCostWan,
    });
  });

  const totalRow = moduleSheet.addRow({
    module1: '总计',
    module2: '',
    module3: '',
    workloadDays: totalWorkload,
    costRatio: totalRatio,
    quoteCostWan: totalQuote,
  });
  styleTotalRow(totalRow);
  moduleSheet.getColumn('workloadDays').numFmt = '0.0';
  moduleSheet.getColumn('costRatio').numFmt = '0.00';
  moduleSheet.getColumn('quoteCostWan').numFmt = '0.00';
  autoWidth(moduleSheet);

  return workbook;
}

/**
 * 描述：根据导出版本选择对应的渲染函数，生成最终 Excel 工作簿。
 * @param {Object} formattedData - 标准化导出数据对象。
 * @param {string} version - 导出版本标识，internal/external。
 * @returns {Promise<import('exceljs').Workbook>} 异步返回 ExcelJS 工作簿实例。
 */
async function render(formattedData, version) {
  if (version === 'external') {
    return renderExternal(formattedData);
  }
  if (version === 'business') {
    return renderBusiness(formattedData);
  }
  return renderInternal(formattedData);
}

module.exports = {
  render
};
