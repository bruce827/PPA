const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const exportController = require('../controllers/exportController');

// 模板路由
router.get('/templates', projectController.getAllTemplates);

// 导出路由
/**
 * @deprecated PDF 导出功能已被废弃。
 * 调用链: routes → exportController.exportPDF → exportService.generatePDF
 * PDF 内容仅含项目名称、描述和三个汇总数字，无格式化、无风险明细、无评分表格。
 * 前端无对应导出入口（exportProjectToPDF 已定义但从未被调用）。
 * 如需恢复，需: 1) 实现 PDF formatter/renderer; 2) 前端添加导出按钮; 3) 补充 export-spec.md
 * @see exportController.exportPDF
 */
router.get('/:id/export/pdf', exportController.exportPDF);
router.get('/:id/export/excel', exportController.exportExcel);
router.get('/:id/business-quote', projectController.getBusinessQuote);
router.post('/:id/business-quote', projectController.saveBusinessQuote);

// 项目 CRUD 路由
router.get('/:id', projectController.getProjectById);
router.get('/', projectController.getAllProjects);
router.post('/', projectController.createProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

module.exports = router;
