const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

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
