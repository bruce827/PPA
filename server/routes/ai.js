const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.get('/prompts', aiController.getPrompts);
router.post('/assess-risk', aiController.assessRisk);
router.post('/normalize-risk-names', aiController.normalizeRiskNames);

module.exports = router;
