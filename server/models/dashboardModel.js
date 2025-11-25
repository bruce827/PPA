const db = require('../utils/db');

async function getProjectCountAndAverage() {
  const totalRow = await db.get('SELECT COUNT(*) as count FROM projects');
  const avgRow = await db.get('SELECT AVG(final_total_cost) as avgCost FROM projects');
  return {
    count: totalRow?.count || 0,
    avgCost: avgRow ? avgRow.avgCost : null,
  };
}

async function getRiskDistribution() {
  return db.all('SELECT final_risk_score, COUNT(*) as count FROM projects GROUP BY final_risk_score');
}

async function getAssessmentDetails() {
  return db.all('SELECT assessment_details_json FROM projects');
}

async function getCostTrend() {
  return db.all(
    "SELECT STRFTIME('%Y-%m', created_at) as month, SUM(final_total_cost) as totalCost FROM projects GROUP BY month ORDER BY month"
  );
}

async function getRiskCostCorrelation() {
  return db.all(
    'SELECT final_risk_score, final_total_cost FROM projects WHERE final_risk_score IS NOT NULL AND final_total_cost IS NOT NULL'
  );
}

module.exports = {
  getProjectCountAndAverage,
  getRiskDistribution,
  getAssessmentDetails,
  getCostTrend,
  getRiskCostCorrelation,
};
