const dashboardService = require('../services/dashboardService');

// ------------------------------
// Legacy Dashboard (旧接口) - 后续可按 PRD Step 1.6 清理
// ------------------------------

exports.getSummary = async (req, res) => {
  try {
    const summary = await dashboardService.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error in getSummary:', error);
    res.status(500).json({ message: 'Failed to retrieve summary data', error: error.message });
  }
};

exports.getRiskDistribution = async (req, res) => {
  try {
    const riskDistribution = await dashboardService.getRiskDistribution();
    res.json(riskDistribution);
  } catch (error) {
    console.error('Error in getRiskDistribution:', error);
    res.status(500).json({ message: 'Failed to retrieve risk distribution data', error: error.message });
  }
};

exports.getCostComposition = async (req, res) => {
  try {
    const costComposition = await dashboardService.getCostComposition();
    res.json(costComposition);
  } catch (error) {
    console.error('Error in getCostComposition:', error);
    res.status(500).json({ message: 'Failed to retrieve cost composition data', error: error.message });
  }
};

exports.getRoleCostDistribution = async (req, res) => {
  try {
    const roleCostDistribution = await dashboardService.getRoleCostDistribution();
    res.json(roleCostDistribution);
  } catch (error) {
    console.error('Error in getRoleCostDistribution:', error);
    res.status(500).json({ message: 'Failed to retrieve role cost distribution data', error: error.message });
  }
};

exports.getCostTrend = async (req, res) => {
  try {
    const costTrend = await dashboardService.getCostTrend();
    res.json(costTrend);
  } catch (error) {
    console.error('Error in getCostTrend:', error);
    res.status(500).json({ message: 'Failed to retrieve cost trend data', error: error.message });
  }
};

exports.getRiskCostCorrelation = async (req, res) => {
  try {
    const riskCostCorrelation = await dashboardService.getRiskCostCorrelation();
    res.json(riskCostCorrelation);
  } catch (error) {
    console.error('Error in getRiskCostCorrelation:', error);
    res.status(500).json({ message: 'Failed to retrieve risk cost correlation data', error: error.message });
  }
};

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
