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
  summarySheet.addRow(['配置版本', summary.configVersion || '']);
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
  return renderInternal(formattedData);
}

module.exports = {
  render
};
