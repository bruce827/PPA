/**
 * 描述：导出文件日志记录服务。
 *       负责将每一次导出请求的基础信息、请求参数、项目快照、
 *       格式化数据及错误详情落地到本地文件系统，便于后续排查与审计。
 */
const fs = require('fs/promises');
const path = require('path');

/**
 * 描述：将数字补齐为两位字符串（前导 0），用于日期/时间格式化。
 * @param {number|string} n - 待补齐的数值。
 * @returns {string} 两位宽度的字符串表示。
 */
function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * 描述：获取导出日志的根目录，支持通过环境变量 EXPORT_LOG_DIR 覆盖默认路径。
 * @returns {string} 日志根目录的绝对路径。
 */
function getBaseDir() {
  return process.env.EXPORT_LOG_DIR || path.resolve(__dirname, '..', 'logs', 'export');
}

/**
 * 描述：确保指定目录存在，不存在时以递归方式创建。
 * @param {string} dir - 目标目录路径。
 * @returns {Promise<void>} 异步完成目录创建或确认。
 */
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
}

/**
 * 描述：保存一次导出操作的日志信息，包括基础索引、请求参数、
 *       项目快照、格式化数据、错误详情以及可选备注。
 *       日志结构与目录层级设计与 docs/prd/export-spec.md 保持一致。
 * @param {Object} params - 导出日志相关参数对象。
 * @param {string|number} params.projectId - 项目 ID。
 * @param {string} params.projectName - 项目名称。
 * @param {string} params.exportVersion - 导出版本（internal/external）。
 * @param {string} params.status - 导出状态（success/fail）。
 * @param {number} params.durationMs - 导出耗时（毫秒）。
 * @param {number} params.fileSizeKb - 导出文件大小（KB，若未知可为 0）。
 * @param {string} params.configVersion - 配置版本号。
 * @param {string|number} params.userId - 操作用户标识。
 * @param {Object} params.request - 原始请求信息（路由、方法、参数等）。
 * @param {Object|null} params.projectSnapshot - 项目数据快照（成功时记录）。
 * @param {Object|null} params.formattedData - 已格式化的导出数据（成功时记录）。
 * @param {Object|null} params.errorDetails - 错误详情（失败时记录）。
 * @param {Array<string>} [params.notes] - 额外备注行。
 * @returns {Promise<void>} 异步完成日志写入，无返回值。
 */
async function save({
  projectId,
  projectName,
  exportVersion,
  status,
  durationMs,
  fileSizeKb,
  configVersion,
  userId,
  request,
  projectSnapshot,
  formattedData,
  errorDetails,
  notes = []
}) {
  try {
    const enabled = process.env.EXPORT_LOG_ENABLED;
    if (enabled !== undefined && !/^true$/i.test(String(enabled))) {
      return;
    }

    const base = getBaseDir();
    const now = new Date();
    const dateDir = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(
      now.getDate()
    )}`;
    const timePart = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(
      now.getSeconds()
    )}`;
    const shortHash = String(projectId).padStart(6, '0');
    const dir = path.join(base, dateDir, `${timePart}_${shortHash}`);
    await ensureDir(dir);

    const index = {
      project_id: projectId,
      project_name: projectName,
      export_version: exportVersion,
      status,
      duration_ms: durationMs,
      file_size_kb: fileSizeKb,
      timestamp: now.toISOString(),
      user_id: userId,
      config_version: configVersion
    };

    await fs.writeFile(
      path.join(dir, 'index.json'),
      JSON.stringify(index, null, 2),
      'utf8'
    );

    if (request) {
      await fs.writeFile(
        path.join(dir, 'request.json'),
        JSON.stringify(request, null, 2),
        'utf8'
      );
    }

    if (status === 'success' && projectSnapshot) {
      await fs.writeFile(
        path.join(dir, 'project.json'),
        JSON.stringify(projectSnapshot, null, 2),
        'utf8'
      );
    }

    if (status === 'success' && formattedData) {
      await fs.writeFile(
        path.join(dir, 'formatted.json'),
        JSON.stringify(formattedData, null, 2),
        'utf8'
      );
    }

    if (status !== 'success' && errorDetails) {
      const errorLog = [
        `Error Type: ${errorDetails.type || 'UNKNOWN'}`,
        `Error Message: ${errorDetails.message}`,
        `Timestamp: ${now.toISOString()}`,
        '',
        'Stack Trace:',
        errorDetails.stack || 'No stack trace available'
      ].join('\n');
      await fs.writeFile(path.join(dir, 'error.log'), errorLog, 'utf8');
    }

    if (notes.length > 0) {
      await fs.writeFile(path.join(dir, 'notes.log'), notes.join('\n'), 'utf8');
    }

    // eslint-disable-next-line no-console
    console.info(`[Export File Logger] saved to: ${dir}`);
  } catch (e) {
    try {
      // eslint-disable-next-line no-console
      console.warn('[Export File Logger] write failed:', e.message);
    } catch (ignore) {}
  }
}

module.exports = {
  save
};
