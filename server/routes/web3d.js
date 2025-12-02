const express = require('express');
const router = express.Router();

const web3dConfigController = require('../controllers/web3dConfigController');
const web3dProjectController = require('../controllers/web3dProjectController');

// Config: 风险项
router.get('/config/risk-items', web3dConfigController.getRiskItems);
router.post('/config/risk-items', web3dConfigController.createRiskItem);
router.put('/config/risk-items/:id', web3dConfigController.updateRiskItem);
router.delete('/config/risk-items/:id', web3dConfigController.deleteRiskItem);

// Config: 工作量模板
router.get('/config/workload-templates', web3dConfigController.getWorkloadTemplates);
router.post('/config/workload-templates', web3dConfigController.createWorkloadTemplate);
router.put('/config/workload-templates/:id', web3dConfigController.updateWorkloadTemplate);
router.delete('/config/workload-templates/:id', web3dConfigController.deleteWorkloadTemplate);

// Projects
router.post('/projects/calculate', web3dProjectController.calculate);
router.post('/projects/:id/calculate', web3dProjectController.calculate);
router.get('/projects/:id/export', web3dProjectController.exportProject);
router.get('/projects/:id', web3dProjectController.getProjectById);
router.get('/projects', web3dProjectController.getAllProjects);
router.post('/projects', web3dProjectController.createProject);
router.put('/projects/:id', web3dProjectController.updateProject);
router.delete('/projects/:id', web3dProjectController.deleteProject);

module.exports = router;
