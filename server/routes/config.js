const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const aiModelController = require('../controllers/aiModelController');
const promptTemplateController = require('../controllers/promptTemplateController');
const {
  validateGetAIModels,
  handleAIModelValidation,
} = require('../middleware/aiModelValidation');
const {
  validateCreatePromptTemplate,
  validateUpdatePromptTemplate,
  validatePromptTemplateId,
  validateGetPromptTemplates,
  handlePromptTemplateValidation,
} = require('../middleware/promptTemplateValidation');

// AI 模型配置路由
router.get(
  '/ai-models',
  validateGetAIModels,
  handleAIModelValidation,
  aiModelController.getAIModels
);
router.get('/ai-models/current', aiModelController.getCurrentModel);
router.get('/ai-models/:id', aiModelController.getAIModel);
router.post('/ai-models', aiModelController.createAIModel);
router.put('/ai-models/:id', aiModelController.updateAIModel);
router.delete('/ai-models/:id', aiModelController.deleteAIModel);
router.post('/ai-models/:id/set-current', aiModelController.setCurrentModel);
router.post('/ai-models/:id/test', aiModelController.testAIModel);
router.post('/ai-models/test-temp', aiModelController.testAIModelTemp); // 临时测试（不保存）

// 提示词模板路由 (Prompt Template Routes)
router.get(
  '/prompts',
  validateGetPromptTemplates,
  handlePromptTemplateValidation,
  promptTemplateController.getPromptTemplates
);
router.get(
  '/prompts/:id',
  validatePromptTemplateId,
  handlePromptTemplateValidation,
  promptTemplateController.getPromptTemplateById
);
router.post(
  '/prompts',
  validateCreatePromptTemplate,
  handlePromptTemplateValidation,
  promptTemplateController.createPromptTemplate
);
router.put(
  '/prompts/:id',
  validateUpdatePromptTemplate,
  handlePromptTemplateValidation,
  promptTemplateController.updatePromptTemplate
);
router.delete(
  '/prompts/:id',
  validatePromptTemplateId,
  handlePromptTemplateValidation,
  promptTemplateController.deletePromptTemplate
);
router.post(
  '/prompts/:id/copy',
  validatePromptTemplateId,
  handlePromptTemplateValidation,
  promptTemplateController.copyTemplate
);
router.post(
  '/prompts/:id/preview',
  validatePromptTemplateId,
  handlePromptTemplateValidation,
  promptTemplateController.previewTemplate
);

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

// 商务报价配置路由
router.get('/business-pricing', configController.getBusinessPricingConfig);
router.put('/business-pricing', configController.updateBusinessPricingConfig);

// 聚合配置路由
router.get('/all', configController.getAllConfigs);

module.exports = router;
