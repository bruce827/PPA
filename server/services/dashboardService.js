const db = require('../utils/db'); // Assuming db utility exists for SQLite connection

exports.getSummary = async () => {
  // Implement logic to get total projects and average cost
  const totalProjects = await db.get('SELECT COUNT(*) as count FROM projects');
  const averageCost = await db.get('SELECT AVG(final_total_cost) as avgCost FROM projects');
  return {
    totalProjects: totalProjects ? totalProjects.count : 0,
    averageCost: averageCost ? parseFloat(averageCost.avgCost).toFixed(2) : 0,
  };
};

exports.getRiskDistribution = async () => {
  // Implement logic to get risk distribution
  const riskDistribution = await db.all('SELECT final_risk_score, COUNT(*) as count FROM projects GROUP BY final_risk_score');
  // Further processing might be needed to categorize into Low, Medium, High
  return riskDistribution;
};

exports.getCostComposition = async () => {
  // Implement logic to get cost composition from assessment_details_json
  // This will require parsing JSON and aggregating
  const projects = await db.all('SELECT assessment_details_json FROM projects');
  const composition = { softwareDevelopment: 0, systemIntegration: 0, operations: 0, travel: 0, risk: 0 };

  projects.forEach(project => {
    try {
      const details = JSON.parse(project.assessment_details_json);
      composition.softwareDevelopment += parseFloat(details.softwareDevelopmentCost || 0);
      composition.systemIntegration += parseFloat(details.systemIntegrationCost || 0);
      composition.operations += parseFloat(details.operationsCost || 0);
      composition.travel += parseFloat(details.travelCost || 0);
      composition.risk += parseFloat(details.riskCost || 0);
    } catch (e) {
      console.error('Error parsing assessment_details_json:', e);
    }
  });
  return composition;
};

exports.getRoleCostDistribution = async () => {
  // Implement logic to get role cost distribution
  const projects = await db.all('SELECT assessment_details_json FROM projects');
  const roles = await db.all('SELECT role_name, unit_price FROM config_roles');
  const rolePrices = roles.reduce((acc, role) => { acc[role.role_name] = role.unit_price; return acc; }, {});

  const roleCosts = {};

  projects.forEach(project => {
    try {
      const details = JSON.parse(project.assessment_details_json);
      if (details.workload && details.workload.newFeatures) {
        details.workload.newFeatures.forEach(feature => {
          if (feature.roles) {
            Object.keys(feature.roles).forEach(roleName => {
              const manDays = parseFloat(feature.roles[roleName] || 0);
              const unitPrice = rolePrices[roleName] || 0;
              roleCosts[roleName] = (roleCosts[roleName] || 0) + (manDays * unitPrice);
            });
          }
        });
      }
      // Similar logic for systemIntegration workload
      if (details.workload && details.workload.systemIntegration) {
        details.workload.systemIntegration.forEach(integration => {
          if (integration.roles) {
            Object.keys(integration.roles).forEach(roleName => {
              const manDays = parseFloat(integration.roles[roleName] || 0);
              const unitPrice = rolePrices[roleName] || 0;
              roleCosts[roleName] = (roleCosts[roleName] || 0) + (manDays * unitPrice);
            });
          }
        });
      }
    } catch (e) {
      console.error('Error parsing assessment_details_json for role costs:', e);
    }
  });

  return roleCosts;
};

exports.getCostTrend = async () => {
  // Implement logic to get cost trend over time
  const costTrend = await db.all(`SELECT STRFTIME('%Y-%m', created_at) as month, SUM(final_total_cost) as totalCost FROM projects GROUP BY month ORDER BY month`);
  return costTrend;
};

exports.getRiskCostCorrelation = async () => {
  // Implement logic to get risk-cost correlation
  const correlation = await db.all('SELECT final_risk_score, final_total_cost FROM projects WHERE final_risk_score IS NOT NULL AND final_total_cost IS NOT NULL');
  return correlation;
};
