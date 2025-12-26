const dashboardService = require('../services/dashboardService');

// ------------------------------
// [Dashboard Refactor] New Dashboard (新接口)
// ------------------------------

// [Dashboard Refactor] GET /api/dashboard/overview
exports.getOverview = async (req, res, next) => {
  try {
    const data = await dashboardService.getOverview();
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

// [Dashboard Refactor] GET /api/dashboard/trend
exports.getTrend = async (req, res, next) => {
  try {
    const data = await dashboardService.getTrend();
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

// [Dashboard Refactor] GET /api/dashboard/cost-range
exports.getCostRange = async (req, res, next) => {
  try {
    const data = await dashboardService.getCostRange();
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

// [Dashboard Refactor] GET /api/dashboard/keywords
exports.getKeywords = async (req, res, next) => {
  try {
    const data = await dashboardService.getKeywords();
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

// [Dashboard Refactor] GET /api/dashboard/dna
exports.getDNA = async (req, res, next) => {
  try {
    const data = await dashboardService.getDNA();
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

// [Dashboard Refactor] GET /api/dashboard/top-roles
exports.getTopRoles = async (req, res, next) => {
  try {
    const data = await dashboardService.getTopRoles();
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

// [Dashboard Refactor] GET /api/dashboard/top-risks
exports.getTopRisks = async (req, res, next) => {
  try {
    const data = await dashboardService.getTopRisks();
    res.json({ data });
  } catch (error) {
    next(error);
  }
};
