const db = require('../utils/db');

// [Dashboard Refactor] 统一口径：默认排除模板，未知 project_type 归为 standard
const STANDARD_WHERE = "is_template = 0 AND (project_type IS NULL OR project_type = 'standard' OR project_type NOT IN ('web3d'))";
// [Dashboard Refactor] Web3D 项目口径（排除模板）
const WEB3D_WHERE = "is_template = 0 AND project_type = 'web3d'";

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
  const row = await db.get(`
    SELECT
      COUNT(*) AS count,
      MAX(CASE WHEN is_current = 1 THEN model_name ELSE NULL END) AS current_name
    FROM ai_model_configs
  `);
  return {
    total: row?.count || 0,
    current_name: row?.current_name || null,
  };
}

async function getOverviewMetrics(days = 30) {
  const safeDays = Number.isFinite(Number(days)) ? Math.max(0, Math.floor(Number(days))) : 30;
  return db.get(
    `SELECT
       (SELECT COUNT(*) FROM projects WHERE is_template = 0 AND datetime(updated_at) >= datetime('now', ?)) AS recent_30d,
       (SELECT COUNT(*) FROM projects WHERE ${STANDARD_WHERE}) AS saas_count,
       (SELECT COUNT(*) FROM projects WHERE ${WEB3D_WHERE}) AS web3d_count,
       (SELECT COUNT(*) FROM config_roles) AS role_count,
       (SELECT COUNT(*) FROM config_risk_items) AS risk_count,
       (SELECT COUNT(*) FROM web3d_risk_items) AS web3d_risk_count,
       (SELECT COUNT(*) FROM web3d_workload_templates) AS web3d_workload_template_count,
       (SELECT COUNT(*) FROM ai_model_configs) AS ai_model_total,
       (SELECT model_name FROM ai_model_configs WHERE is_current = 1 LIMIT 1) AS ai_model_current_name`,
    [`-${safeDays} days`]
  );
}

async function getAssessmentDetails() {
  return db.all('SELECT assessment_details_json FROM projects');
}

// [Dashboard Refactor] 拉取评估详情与聚合字段（用于 DNA/TopRoles/TopRisks）
async function getAllAssessmentDetails() {
  return db.all(
    `SELECT assessment_details_json, final_total_cost, final_risk_score, final_workload_days
     FROM projects
     WHERE ${STANDARD_WHERE}`
  );
}

// [Dashboard Refactor] 拉取文本字段（用于 keywords 词云）
async function getAllProjectTextData() {
  return db.all(
    `SELECT name, description
     FROM projects
     WHERE ${STANDARD_WHERE}`
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

async function getCostRangeBuckets() {
  return db.get(
    `SELECT
       SUM(CASE WHEN final_total_cost < 50 THEN 1 ELSE 0 END) AS lt_50,
       SUM(CASE WHEN final_total_cost >= 50 AND final_total_cost < 100 THEN 1 ELSE 0 END) AS range_50_100,
       SUM(CASE WHEN final_total_cost >= 100 AND final_total_cost < 300 THEN 1 ELSE 0 END) AS range_100_300,
       SUM(CASE WHEN final_total_cost >= 300 THEN 1 ELSE 0 END) AS gt_300
     FROM projects
     WHERE ${STANDARD_WHERE}
       AND final_total_cost IS NOT NULL`
  );
}

async function getCostTrend() {
  return db.all(
    "SELECT STRFTIME('%Y-%m', created_at) as month, SUM(final_total_cost) as totalCost FROM projects GROUP BY STRFTIME('%Y-%m', created_at) ORDER BY month"
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
     GROUP BY STRFTIME('%Y-%m', updated_at), CASE 
         WHEN project_type = 'web3d' THEN 'Web3D'
         ELSE 'SaaS/平台'
       END
     ORDER BY month, project_type`
  );
}

async function getRiskCostCorrelation() {
  return db.all(
    'SELECT final_risk_score, final_total_cost FROM projects WHERE final_risk_score IS NOT NULL AND final_total_cost IS NOT NULL'
  );
}

// [Dashboard Refactor] 合并查询：一次性获取所有 dashboard 需要的项目数据
// 替代 getAllAssessmentDetails + getAllProjectTextData + getProjectCosts 三次查询
async function getAllDashboardProjectData() {
  return db.all(
    `SELECT 
       name,
       description,
       assessment_details_json,
       final_total_cost,
       final_risk_score,
       final_workload_days
     FROM projects
     WHERE ${STANDARD_WHERE}`
  );
}

module.exports = {
  getRecentProjectCount,
  getProjectCountStandard,
  getProjectCountWeb3d,
  getConfigCounts,
  getAIModelCount,
  getOverviewMetrics,
  getAssessmentDetails,
  getAllAssessmentDetails,
  getAllProjectTextData,
  getProjectCosts,
  getCostRangeBuckets,
  getCostTrend,
  getTrendLast12Months,
  getRiskCostCorrelation,
  getAllDashboardProjectData,
};
