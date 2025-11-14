const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.get('/prompts', aiController.getPrompts);
// 模块梳理提示词
router.get('/module-prompts', aiController.getModulePrompts);
router.post('/assess-risk', aiController.assessRisk);
router.post('/normalize-risk-names', aiController.normalizeRiskNames);
// 模块梳理分析
router.post('/analyze-project-modules', aiController.analyzeProjectModules);

module.exports = router;
