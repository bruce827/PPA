const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const aiModelController = require('../controllers/aiModelController');
const promptTemplateController = require('../controllers/promptTemplateController');

// AI 模型配置路由
router.get('/ai-models', aiModelController.getAIModels);
router.get('/ai-models/current', aiModelController.getCurrentModel);
router.get('/ai-models/:id', aiModelController.getAIModel);
router.post('/ai-models', aiModelController.createAIModel);
router.put('/ai-models/:id', aiModelController.updateAIModel);
router.delete('/ai-models/:id', aiModelController.deleteAIModel);
router.post('/ai-models/:id/set-current', aiModelController.setCurrentModel);
router.post('/ai-models/:id/test', aiModelController.testAIModel);
router.post('/ai-models/test-temp', aiModelController.testAIModelTemp); // 临时测试（不保存）

// 提示词模板路由 (Prompt Template Routes)
router.get('/prompts', promptTemplateController.getPromptTemplates);
router.get('/prompts/:id', promptTemplateController.getPromptTemplateById);
router.post('/prompts', promptTemplateController.createPromptTemplate);
router.put('/prompts/:id', promptTemplateController.updatePromptTemplate);
router.delete('/prompts/:id', promptTemplateController.deletePromptTemplate);
router.post('/prompts/:id/copy', promptTemplateController.copyTemplate);
router.post('/prompts/:id/preview', promptTemplateController.previewTemplate);

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
