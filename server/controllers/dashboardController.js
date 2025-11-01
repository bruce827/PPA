const dashboardService = require('../services/dashboardService');

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
