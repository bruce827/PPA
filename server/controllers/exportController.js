const projectService = require('../services/projectService');
const exportService = require('../services/exportService');

/**
 * 导出项目为 PDF
 */
exports.exportPDF = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    exportService.generatePDF(project, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(404).send('Project not found');
    }
  }
};

/**
 * 导出项目为 Excel
 */
exports.exportExcel = async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    await exportService.generateExcel(project, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(404).send('Project not found');
    }
  }
};
