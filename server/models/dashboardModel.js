const db = require('../utils/db');

// [Dashboard Refactor] 统一口径：默认排除模板，未知 project_type 归为 standard
const STANDARD_WHERE = "is_template = 0 AND (project_type IS NULL OR project_type = 'standard' OR project_type NOT IN ('web3d'))";
// [Dashboard Refactor] Web3D 项目口径（排除模板）
const WEB3D_WHERE = "is_template = 0 AND project_type = 'web3d'";

// ------------------------------
// Legacy Dashboard (旧接口) - 后续可按 PRD Step 1.6 清理
// ------------------------------
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

// ------------------------------
// [Dashboard Refactor] New Dashboard (新接口)
// ------------------------------
// [Dashboard Refactor] 最近 N 天项目数（固定用于 recent_30d = 30）
async function getRecentProjectCount(days = 30) {
  const safeDays = Number.isFinite(Number(days)) ? Math.max(0, Math.floor(Number(days))) : 30;
  return db.get(
    `SELECT COUNT(*) AS count FROM projects WHERE is_template = 0 AND datetime(updated_at) >= datetime('now', ?)`,
    [`-${safeDays} days`]
  );
}

// [Dashboard Refactor] standard 项目总数（未知类型按 standard 归类）
async function getProjectCountStandard() {
  return db.get(`SELECT COUNT(*) AS count FROM projects WHERE ${STANDARD_WHERE}`);
}

// [Dashboard Refactor] web3d 项目总数
async function getProjectCountWeb3d() {
  return db.get(`SELECT COUNT(*) AS count FROM projects WHERE ${WEB3D_WHERE}`);
}

// [Dashboard Refactor] 配置资产统计（roles/risks/web3d 配置）
async function getConfigCounts() {
  const [roleRow, riskRow, web3dRiskRow, web3dWorkloadRow] = await Promise.all([
    db.get('SELECT COUNT(*) AS count FROM config_roles'),
    db.get('SELECT COUNT(*) AS count FROM config_risk_items'),
    db.get('SELECT COUNT(*) AS count FROM web3d_risk_items'),
    db.get('SELECT COUNT(*) AS count FROM web3d_workload_templates'),
  ]);
  return {
    role_count: roleRow?.count || 0,
    risk_count: riskRow?.count || 0,
    web3d_risk_count: web3dRiskRow?.count || 0,
    web3d_workload_template_count: web3dWorkloadRow?.count || 0,
  };
}

// [Dashboard Refactor] AI 模型统计（总数 + 当前模型名）
async function getAIModelCount() {
  const [totalRow, currentRow] = await Promise.all([
    db.get('SELECT COUNT(*) AS count FROM ai_model_configs'),
    db.get("SELECT model_name FROM ai_model_configs WHERE is_current = 1"),
  ]);
  return {
    total: totalRow?.count || 0,
    current_name: currentRow?.model_name || null,
  };
}

async function getAssessmentDetails() {
  return db.all('SELECT assessment_details_json FROM projects');
}

// [Dashboard Refactor] 拉取评估详情与聚合字段（用于 DNA/TopRoles/TopRisks）
async function getAllAssessmentDetails() {
  return db.all(
    `SELECT assessment_details_json, final_total_cost, final_risk_score, final_workload_days
     FROM projects
     WHERE ${STANDARD_WHERE}
     ORDER BY created_at DESC`
  );
}

// [Dashboard Refactor] 拉取文本字段（用于 keywords 词云）
async function getAllProjectTextData() {
  return db.all(
    `SELECT name, description
     FROM projects
     WHERE ${STANDARD_WHERE}
     ORDER BY created_at DESC`
  );
}

// [Dashboard Refactor] 拉取成本字段（用于 cost-range 分桶）
async function getProjectCosts() {
  return db.all(
    `SELECT final_total_cost
     FROM projects
     WHERE ${STANDARD_WHERE} AND final_total_cost IS NOT NULL`
  );
}

async function getCostTrend() {
  return db.all(
    "SELECT STRFTIME('%Y-%m', created_at) as month, SUM(final_total_cost) as totalCost FROM projects GROUP BY month ORDER BY month"
  );
}

// [Dashboard Refactor] 近 12 个月趋势（按月+项目类型分组，用于堆积图）
async function getTrendLast12Months() {
  return db.all(
    `SELECT
       STRFTIME('%Y-%m', updated_at) AS month,
       CASE 
         WHEN project_type = 'web3d' THEN 'Web3D'
         ELSE 'SaaS/平台'
       END AS project_type,
       COUNT(*) AS project_count,
       AVG(final_total_cost) AS avg_total_cost_wan,
       AVG(final_risk_score) AS avg_risk_score
     FROM projects
     WHERE is_template = 0
       AND datetime(updated_at) >= datetime('now', '-12 months')
     GROUP BY month, project_type
     ORDER BY month, project_type`
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
  getRecentProjectCount,
  getProjectCountStandard,
  getProjectCountWeb3d,
  getConfigCounts,
  getAIModelCount,
  getAssessmentDetails,
  getAllAssessmentDetails,
  getAllProjectTextData,
  getProjectCosts,
  getCostTrend,
  getTrendLast12Months,
  getRiskCostCorrelation,
};
