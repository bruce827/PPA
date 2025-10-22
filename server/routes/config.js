const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

// 角色配置路由
router.get('/roles', configController.getAllRoles);
router.post('/roles', configController.createRole);
router.put('/roles/:id', configController.updateRole);
router.delete('/roles/:id', configController.deleteRole);

// 风险评估项路由
router.get('/risk-items', configController.getAllRiskItems);
router.post('/risk-items', configController.createRiskItem);
router.put('/risk-items/:id', configController.updateRiskItem);
router.delete('/risk-items/:id', configController.deleteRiskItem);

// 差旅成本路由
router.get('/travel-costs', configController.getAllTravelCosts);
router.post('/travel-costs', configController.createTravelCost);
router.put('/travel-costs/:id', configController.updateTravelCost);
router.delete('/travel-costs/:id', configController.deleteTravelCost);

// 聚合配置路由
router.get('/all', configController.getAllConfigs);

module.exports = router;
