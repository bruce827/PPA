/**
 * 描述：导出结果一致性校验工具。
 *       在生成 Excel 之前，对内部版/对外版导出的关键数值进行兜底校验，
 *       防止 Summary 与明细表之间出现明显不一致。
 */
const { HttpError } = require('../../utils/errors');

/**
 * 描述：将任意输入安全转换为数字，不可解析时返回 0。
 * @param {*} value - 待转换的原始值。
 * @returns {number} 转换后的数值，无法转换时为 0。
 */
function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 描述：对数值进行指定小数位的四舍五入，无法转换时返回 0。
 * @param {*} value - 原始数值或可转换为数值的输入。
 * @param {number} decimals - 保留的小数位数。
 * @returns {number} 四舍五入后的数值。
 */
function roundToDecimals(value, decimals) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** decimals;
  return Math.round((numeric + Number.EPSILON) * factor) / factor;
}

/**
 * 描述：对内部版导出数据执行一致性校验，目前校验 Summary 中的风险总分
 *       是否与“风险评估明细”表中的得分求和一致。
 * @param {Object} formatted - 内部版标准化导出数据对象。
 * @returns {void} 无返回值，如校验失败则抛出 HttpError。
 * @throws {HttpError} 当风险总分差异超过允许阈值时抛出 ExportConsistencyError。
 */
function validateInternal(formatted) {
  if (!formatted || typeof formatted !== 'object') {
    return;
  }

  const summary = formatted.summary || {};
  const riskItems = Array.isArray(formatted.riskItems)
    ? formatted.riskItems
    : [];

  if (riskItems.length > 0) {
    const riskFromItems = riskItems.reduce(
      (sum, item) => sum + toNumber(item.score),
      0
    );
    const summaryRisk = toNumber(summary.riskScore);
    const diff = Math.abs(riskFromItems - summaryRisk);

    // 误差超过 0.1 认为数据不一致
    if (diff > 0.1) {
      throw new HttpError(
        500,
        `Internal export consistency check failed: summary.riskScore (${summaryRisk}) != sum(riskItems.score) (${riskFromItems})`,
        'ExportConsistencyError',
        {
          type: 'internal',
          field: 'riskScore',
          summaryRisk,
          riskFromItems,
          diff: roundToDecimals(diff, 2)
        }
      );
    }
  }
}

/**
 * 描述：对对外版导出数据执行一致性校验，目前校验 Summary 中的报价总计
 *       是否与模块报价明细中各模块成本之和一致。
 * @param {Object} formatted - 对外版标准化导出数据对象。
 * @returns {void} 无返回值，如校验失败则抛出 HttpError。
 * @throws {HttpError} 当成本合计偏差超过允许阈值时抛出 ExportConsistencyError。
 */
function validateExternal(formatted) {
  if (!formatted || typeof formatted !== 'object') {
    return;
  }

  const summary = formatted.summary || {};
  const modules = Array.isArray(formatted.modules) ? formatted.modules : [];

  if (!modules.length) {
    return;
  }

  const summaryTotalCost = toNumber(summary.totalCost);
  const summaryTotalWorkload = toNumber(summary.totalWorkloadDays);

  const modulesTotalCost = modules.reduce(
    (sum, m) => sum + toNumber(m.costWan != null ? m.costWan : m.cost),
    0
  );

  // 成本一致性校验：项目概览 vs 模块报价明细
  if (summaryTotalCost > 0 || modulesTotalCost > 0) {
    const diffCost = Math.abs(summaryTotalCost - modulesTotalCost);
    // 允许 0.05 万以内的浮点/四舍五入误差
    if (diffCost > 0.05) {
      throw new HttpError(
        500,
        `External export consistency check failed: summary.totalCost (${summaryTotalCost}) != sum(modules.costWan) (${modulesTotalCost})`,
        'ExportConsistencyError',
        {
          type: 'external',
          field: 'totalCost',
          summaryTotalCost,
          modulesTotalCost,
          diff: roundToDecimals(diffCost, 3)
        }
      );
    }
  }

  // 工作量：由于当前模块级 workloadDays 与项目级 totalWorkloadDays 口径不一致，
  // 这里暂不强制做一致性校验，只保留成本的一致性兜底。
}

/**
 * 描述：根据导出版本分派到内部版或对外版的具体一致性校验函数。
 * @param {Object} formatted - 标准化导出数据对象。
 * @param {string} version - 导出版本标识，internal/external。
 * @returns {void} 无返回值，如校验失败则抛出 HttpError。
 */
function validateExportData(formatted, version) {
  const normalized = (version || 'internal').toLowerCase();
  if (normalized === 'external') {
    validateExternal(formatted);
  } else {
    validateInternal(formatted);
  }
}

module.exports = {
  validateExportData
};
