const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

/**
 * 生成 PDF 导出流
 */
const generatePDF = (project, res) => {
  const doc = new PDFDocument();
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(project.name)}.pdf`);
  doc.pipe(res);

  // PDF 内容
  doc.fontSize(25).text(project.name, { align: 'center' });
  doc.fontSize(12).text(project.description || '', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(18).text('评估总览');
  doc.fontSize(14).text(`报价总计: ${project.final_total_cost} 万元`);
  doc.fontSize(14).text(`风险总分: ${project.final_risk_score}`);
  doc.fontSize(14).text(`总工作量: ${project.final_workload_days.toFixed(2)} 人天`);

  doc.end();
};

/**
 * 生成 Excel 导出流
 */
const generateExcel = async (project, res) => {
  const assessmentData = JSON.parse(project.assessment_details_json);
  const workbook = new ExcelJS.Workbook();

  // 1. 风险评分 sheet
  const riskSheet = workbook.addWorksheet('风险评分');
  riskSheet.columns = [
    { header: '评估项', key: 'name', width: 40 },
    { header: '选择/描述', key: 'choice', width: 40 },
    { header: '得分', key: 'score', width: 10 },
  ];
  // TODO: 从 assessmentData.risk_scores 中解析数据并添加行

  // 2. 工作量 sheet (简化版)
  const devSheet = workbook.addWorksheet('新功能开发');
  // TODO: 从 assessmentData.development_workload 中解析数据并添加行

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(project.name)}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  generatePDF,
  generateExcel
};
