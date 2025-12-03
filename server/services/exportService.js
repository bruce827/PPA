/**
 * 描述：导出服务入口，负责根据项目数据生成 PDF/Excel 报告，
 *       并协调格式化器、渲染器和配置数据，对导出结果做一致性校验。
 */
const PDFDocument = require('pdfkit');
const internalFormatter = require('./export/formatters/internalFormatter');
const externalFormatter = require('./export/formatters/externalFormatter');
const excelRenderer = require('./export/renderers/excelRenderer');
const { formatWeb3dExport } = require('./export/formatters/web3dFormatter');
const { renderWeb3d } = require('./export/renderers/web3dRenderer');
const configModel = require('../models/configModel');
const { HttpError } = require('../utils/errors');
const { validateExportData } = require('./export/exportValidator');

/**
 * 描述：解析风险评估项配置中的 options_json，提取可用的选项列表。
 * @param {string} optionsJson - 风险评估项配置表中存储的 JSON 字符串。
 * @returns {Array<{label: string, value: number}>} 解析后的选项数组，包含展示文案和对应分值。
 */
function parseRiskOptions(optionsJson) {
  if (!optionsJson) return [];
  try {
    const parsed = JSON.parse(optionsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((opt) => {
        const label = opt?.label || opt?.name || '';
        const rawValue = opt?.score ?? opt?.value;
        const value = Number(rawValue);
        if (!label || !Number.isFinite(value)) return null;
        return { label, value };
      })
      .filter(Boolean);
  } catch (_e) {
    return [];
  }
}

/**
 * 描述：基于配置中心的风险评估项信息，补充内部导出结构中的“评估类别”和“选项”字段。
 *       仅对 internal 版本生效，对 external 版本不做处理。
 * @param {Object} formatted - 已由 formatter 标准化后的导出数据结构。
 * @param {string} version - 导出版本标识，internal/external。
 * @returns {Promise<void>} 无返回值，直接在 formatted 引用对象上进行补充。
 */
async function enrichRiskItemsFromConfig(formatted, version) {
  const normalized = (version || 'internal').toLowerCase();
  if (normalized !== 'internal') return;
  if (!formatted || !Array.isArray(formatted.riskItems) || !formatted.riskItems.length) {
    return;
  }

  let configRiskItems = [];
  try {
    configRiskItems = await configModel.getAllRiskItems();
  } catch (_e) {
    // 配置读取失败时不阻断导出，仅跳过丰富逻辑
    return;
  }

  if (!Array.isArray(configRiskItems) || !configRiskItems.length) {
    return;
  }

  const configMap = new Map();
  configRiskItems.forEach((cfg) => {
    if (!cfg || !cfg.item_name) return;
    configMap.set(String(cfg.item_name), cfg);
  });

  formatted.riskItems = formatted.riskItems.map((ri) => {
    const itemName = ri.item || '';
    const cfg = configMap.get(String(itemName)) || configMap.get(String(itemName).trim());
    if (!cfg) {
      return ri;
    }

    const next = { ...ri };

    // 类别：优先使用配置中的“评估类别”
    if (!next.category && cfg.category) {
      next.category = cfg.category;
    }

    // 选项：从配置的 options_json 中，根据得分匹配出标签
    if (!next.choice) {
      const options = parseRiskOptions(cfg.options_json);
      const scoreNum = Number(next.score);
      if (options.length && Number.isFinite(scoreNum)) {
        let best = options[0];
        let bestDiff = Math.abs(scoreNum - best.value);
        for (const opt of options) {
          const diff = Math.abs(scoreNum - opt.value);
          if (diff < bestDiff) {
            best = opt;
            bestDiff = diff;
          }
        }
        next.choice = best.label;
      }
    }

    return next;
  });
}

/**
 * 描述：根据项目顶层聚合结果生成简要 PDF 报告，并通过 HTTP 响应流输出。
 * @param {Object} project - 项目记录，包含名称、描述以及最终报价/风险/工作量等聚合字段。
 * @param {import('express').Response} res - Express 响应对象，用于写入 PDF 二进制流。
 * @returns {void} 无返回值，PDF 内容通过响应流直接输出给客户端。
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
 * 描述：生成 Excel 导出结果，根据导出版本选择内部/对外格式，
 *       补充风险评估配置数据，执行一致性校验后返回工作簿和中间结构。
 * @param {Object} project - 项目记录，需包含 assessment_details_json 等原始评估数据。
 * @param {string} version - 导出版本标识，支持 internal（内部版）和 external（对外版）。
 * @returns {Promise<{workbook: any, formattedData: Object, version: string}>}
 *          返回 ExcelJS 工作簿、格式化后的导出数据及归一化版本标识。
 */
const generateExcel = async (project, version) => {
  if (!project) {
    throw new HttpError(404, 'Project not found', 'NotFoundError');
  }

  if (project.project_type === 'web3d') {
    const formatted = await formatWeb3dExport(project);
    const workbook = renderWeb3d(formatted);
    return {
      workbook,
      formattedData: formatted,
      version: 'web3d'
    };
  }

  const normalizedVersion = (version || 'internal').toLowerCase();
  if (!['internal', 'external'].includes(normalizedVersion)) {
    throw new HttpError(
      400,
      'Invalid export version',
      'InvalidExportVersionError'
    );
  }

  const formatter =
    normalizedVersion === 'external' ? externalFormatter : internalFormatter;

  const formattedData = await formatter.formatForExport(project);

  // 使用配置中的风险评估项信息，补充风险评估明细中的“类别”和“选项”列
  await enrichRiskItemsFromConfig(formattedData, normalizedVersion);

  // 统一的导出一致性兜底校验：
  // - 内部版：校验风险总分（Summary vs 风险评估明细）
  // - 对外版：校验报价总计（项目概览 vs 模块报价明细）
  validateExportData(formattedData, normalizedVersion);

  const workbook = await excelRenderer.render(formattedData, normalizedVersion);

  return {
    workbook,
    formattedData,
    version: normalizedVersion
  };
};

module.exports = {
  generatePDF,
  generateExcel
};
