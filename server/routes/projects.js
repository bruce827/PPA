const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const exportController = require('../controllers/exportController');

// 模板路由
router.get('/templates', projectController.getAllTemplates);

// 导出路由
router.get('/:id/export/pdf', exportController.exportPDF);
router.get('/:id/export/excel', exportController.exportExcel);

// 项目 CRUD 路由
router.get('/:id', projectController.getProjectById);
router.get('/', projectController.getAllProjects);
router.post('/', projectController.createProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

module.exports = router;
