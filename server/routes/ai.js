const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.get('/prompts', aiController.getPrompts);
// 模块梳理提示词
router.get('/module-prompts', aiController.getModulePrompts);
// 工作量评估提示词
router.get('/workload-prompts', aiController.getWorkloadPrompts);
router.get('/project-tag-prompts', aiController.getProjectTagPrompts);
router.post('/assess-risk', aiController.assessRisk);
router.post('/normalize-risk-names', aiController.normalizeRiskNames);
// 模块梳理分析
router.post('/analyze-project-modules', aiController.analyzeProjectModules);
// 工作量评估
router.post('/evaluate-workload', aiController.evaluateWorkload);
router.post('/generate-project-tags', aiController.generateProjectTags);

module.exports = router;
