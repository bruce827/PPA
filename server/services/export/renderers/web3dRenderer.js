const ExcelJS = require('exceljs');

const HEADER_BG = 'FF2F5597';
const HEADER_FONT_COLOR = 'FFFFFFFF';
const TOTAL_BG = 'FFF0F0F0';

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

function styleTotalRow(row) {
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: TOTAL_BG }
    };
    cell.font = { bold: true };
  });
}

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

const renderWeb3d = (formatted) => {
  const workbook = new ExcelJS.Workbook();
  const now = new Date();
  workbook.creator = 'PPA System';
  workbook.created = now;
  workbook.modified = now;

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: '字段', key: 'label', width: 24 },
    { header: '值', key: 'value', width: 40 }
  ];
  styleHeaderRow(summarySheet.getRow(1));

  const s = formatted.summary || {};
  summarySheet.addRow(['项目名称', s.projectName || '']);
  summarySheet.addRow(['项目描述', s.description || '']);
  summarySheet.addRow(['报价总计（万元）', s.totalCostWan != null ? s.totalCostWan : '']);
  summarySheet.addRow(['基础报价（万元）', s.baseCostWan != null ? s.baseCostWan : '']);
  summarySheet.addRow(['总工作量（人天）', s.workloadDays != null ? s.workloadDays : '']);
  summarySheet.addRow(['基础工作量（人天）', s.baseWorkloadDays != null ? s.baseWorkloadDays : '']);
  summarySheet.addRow(['风险总分', s.riskScore != null ? s.riskScore : '']);
  summarySheet.addRow(['风险满分', s.riskMaxScore != null ? s.riskMaxScore : '']);
  summarySheet.addRow(['风险系数', s.riskFactor != null ? s.riskFactor : '']);
  summarySheet.addRow(['风险等级', s.riskLevel || '']);
  summarySheet.addRow(['风险占比', s.riskRatio != null ? s.riskRatio : '']);
  summarySheet.addRow(['导出时间', s.exportedAt || '']);
  autoWidth(summarySheet);

  const riskSheet = workbook.addWorksheet('风险选择');
  riskSheet.columns = [
    { header: '步骤', key: 'step_name', width: 20 },
    { header: '评估项', key: 'item_name', width: 30 },
    { header: '选择', key: 'choice', width: 25 },
    { header: '得分', key: 'value', width: 10 },
    { header: '权重', key: 'weight', width: 10 },
    { header: '加权分', key: 'weightedScore', width: 12 }
  ];
  styleHeaderRow(riskSheet.getRow(1));

  const riskItems = Array.isArray(formatted.riskItems) ? formatted.riskItems : [];
  let riskTotal = 0;
  riskItems.forEach((ri) => {
    riskTotal += Number(ri.weightedScore || 0);
    riskSheet.addRow({
      step_name: ri.step_name || '',
      item_name: ri.item_name || '',
      choice: ri.choice || '',
      value: ri.value != null ? ri.value : '',
      weight: ri.weight != null ? ri.weight : '',
      weightedScore: ri.weightedScore != null ? ri.weightedScore : ''
    });
  });
  const riskTotalRow = riskSheet.addRow({
    step_name: '总计',
    item_name: '',
    choice: '',
    value: '',
    weight: '',
    weightedScore: riskTotal
  });
  styleTotalRow(riskTotalRow);
  autoWidth(riskSheet);

  const workloadSheet = workbook.addWorksheet('工作量明细');
  workloadSheet.columns = [
    { header: '类别', key: 'category', width: 20 },
    { header: '工作项', key: 'item_name', width: 30 },
    { header: '单位', key: 'unit', width: 10 },
    { header: '单元工时（天）', key: 'base_days', width: 16 },
    { header: '数量', key: 'quantity', width: 12 },
    { header: '小计（天）', key: 'subtotal_days', width: 14 }
  ];
  styleHeaderRow(workloadSheet.getRow(1));

  const workloadItems = formatted.workload?.items || [];
  workloadItems.forEach((item) => {
    workloadSheet.addRow({
      category: item.category || '',
      item_name: item.item_name || '',
      unit: item.unit || '',
      base_days: item.base_days != null ? item.base_days : '',
      quantity: item.quantity != null ? item.quantity : '',
      subtotal_days: item.subtotal_days != null ? item.subtotal_days : ''
    });
  });

  const totals = formatted.workload?.totals || {};
  const workloadTotalRow = workloadSheet.addRow({
    category: '总计',
    item_name: '',
    unit: '',
    base_days: '',
    quantity: '',
    subtotal_days: totals.total_days != null ? totals.total_days : ''
  });
  styleTotalRow(workloadTotalRow);

  autoWidth(workloadSheet);

  return workbook;
};

module.exports = {
  renderWeb3d
};
