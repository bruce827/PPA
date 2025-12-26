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

module.exports = router;
