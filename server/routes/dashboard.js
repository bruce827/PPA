const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// ------------------------------
// [Dashboard Refactor] New Dashboard (新接口)
// ------------------------------
// GET /api/dashboard/overview - 获取 Header 数据
router.get('/overview', dashboardController.getOverview);
// GET /api/dashboard/trend - 获取月度趋势
router.get('/trend', dashboardController.getTrend);
// GET /api/dashboard/cost-range - 获取成本区间
router.get('/cost-range', dashboardController.getCostRange);
// GET /api/dashboard/keywords - 获取词云数据
router.get('/keywords', dashboardController.getKeywords);
// GET /api/dashboard/dna - 获取雷达图数据
router.get('/dna', dashboardController.getDNA);
// GET /api/dashboard/top-roles - 获取 Top 角色
router.get('/top-roles', dashboardController.getTopRoles);
// GET /api/dashboard/top-risks - 获取 Top 风险
router.get('/top-risks', dashboardController.getTopRisks);

// ------------------------------
// Legacy Dashboard (旧接口) - 后续可按 PRD Step 1.6 清理
// ------------------------------
// Deprecated: 旧接口已被新 Dashboard 接口替代，待前端完成切换后按 PRD Step 1.6 Phase C 删除
// GET /api/dashboard/summary
router.get('/summary', dashboardController.getSummary);

// GET /api/dashboard/risk-distribution
router.get('/risk-distribution', dashboardController.getRiskDistribution);

// GET /api/dashboard/cost-composition
router.get('/cost-composition', dashboardController.getCostComposition);

// GET /api/dashboard/role-cost-distribution
router.get('/role-cost-distribution', dashboardController.getRoleCostDistribution);

// GET /api/dashboard/cost-trend
router.get('/cost-trend', dashboardController.getCostTrend);

// GET /api/dashboard/risk-cost-correlation
router.get('/risk-cost-correlation', dashboardController.getRiskCostCorrelation);

module.exports = router;
