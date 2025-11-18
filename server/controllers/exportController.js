const projectService = require('../services/projectService');
const exportService = require('../services/exportService');
const exportFileLogger = require('../services/exportFileLogger');
const logger = require('../utils/logger');

function formatTimestampForFilename(isoString) {
  const date = isoString ? new Date(isoString) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

/**
 * 导出项目为 PDF
 */
exports.exportPDF = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found', project_id: req.params.id });
    }
    exportService.generatePDF(project, res);
  } catch (error) {
    logger.error('Export PDF failed', {
      route: 'GET /api/projects/:id/export/pdf',
      projectId: req.params.id,
      error: error.message
    });
    if (!res.headersSent) {
      next(error);
    }
  }
};

/**
 * 导出项目为 Excel
 */
exports.exportExcel = async (req, res, next) => {
  const startedAt = Date.now();
  const { id } = req.params;
  const { version = 'internal' } = req.query;

  let status = 'success';
  let errorDetails = null;
  let formattedData = null;
  let projectSnapshot = null;
  let fileSizeKb = 0;

  try {
    const project = await projectService.getProjectById(id);
    if (!project) {
      status = 'fail';
      if (!res.headersSent) {
        res.status(404).json({ error: 'Project not found', project_id: id });
      }
      return;
    }

    projectSnapshot = project;

    const { workbook, formattedData: data, version: normalizedVersion } =
      await exportService.generateExcel(project, version);

    formattedData = data;

    const exportedAt =
      (formattedData && formattedData.summary && formattedData.summary.exportedAt) ||
      new Date().toISOString();
    const ts = formatTimestampForFilename(exportedAt);
    const safeName = encodeURIComponent(
      `${project.name}_${normalizedVersion}_${ts}.xlsx`
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename=${safeName}`);

    // 使用流式写入响应，避免落地临时文件
    await workbook.xlsx.write(res);
    // ExcelJS 不提供直接的已写入字节数，这里将 fileSizeKb 置为 0，仅用于日志字段占位
    fileSizeKb = 0;
    res.end();
  } catch (error) {
    status = 'fail';
    errorDetails = {
      type: error.name || 'UNKNOWN_ERROR',
      message: error.message,
      stack: error.stack
    };

    logger.error('Export Excel failed', {
      route: 'GET /api/projects/:id/export/excel',
      projectId: id,
      version,
      error: error.message
    });

    if (!res.headersSent) {
      const statusCode = error.statusCode || 500;
      let errorMessage = error.message || 'Failed to generate export file';

      if (error.name === 'InvalidExportVersionError') {
        errorMessage = 'Invalid export version';
      } else if (error.name === 'ExportDataParseError') {
        errorMessage = 'Failed to parse assessment data';
      } else if (error.name === 'ExportDataInvalidError') {
        errorMessage = 'Invalid assessment data structure';
      } else if (error.name === 'ExportCostMismatchError') {
        errorMessage = error.message;
      } else if (error.name === 'ExportConsistencyError') {
        errorMessage = error.message;
      }

      res.status(statusCode).json({
        error: errorMessage,
        project_id: id
      });
    }
  } finally {
    const durationMs = Date.now() - startedAt;
    if (durationMs > 5000) {
      logger.warn('Export Excel duration exceeds 5s threshold', {
        route: 'GET /api/projects/:id/export/excel',
        projectId: id,
        version,
        durationMs
      });
    }
    try {
      await exportFileLogger.save({
        projectId: id,
        projectName: projectSnapshot?.name || 'unknown',
        exportVersion: version || 'internal',
        status,
        durationMs,
        fileSizeKb,
        configVersion: projectSnapshot?.config_version || 'unknown',
        userId: (req.user && req.user.id) || 'anonymous',
        request: {
          route: req.route && req.route.path,
          method: req.method,
          params: req.params,
          query: req.query,
          timestamp: new Date().toISOString()
        },
        projectSnapshot: status === 'success' ? projectSnapshot : null,
        formattedData: status === 'success' ? formattedData : null,
        errorDetails: status === 'fail' ? errorDetails : null
      });
    } catch (logError) {
      logger.warn('Export file logger failed', { error: logError.message });
    }
  }
};
