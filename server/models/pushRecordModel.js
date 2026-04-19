const db = require('../utils/db');

/**
 * 推送记录数据访问层
 */

async function ensureSchema() {
  // 表由迁移 009 创建，这里不做任何操作
  return true;
}

async function createPushRecord(data) {
  await ensureSchema();
  const {
    projectId,
    projectName,
    projectDescription,
    ourQuote,
    customerBudget,
    budgetDifference,
    costBreakdownJson,
    riskTotalScore,
    riskLevel,
    totalWorkloadDays,
    newDevWorkloadDays,
    travelCostTotal,
    top3RiskScores,
    attachmentFileIds,
    pushTime,
    pushStatus,
    pushError,
  } = data;

  const result = await db.run(
    `INSERT INTO project_push_records (
      project_id, project_name, project_description,
      our_quote, customer_budget, budget_difference, cost_breakdown_json,
      risk_total_score, risk_level,
      total_workload_days, new_dev_workload_days, travel_cost_total,
      top3_risk_scores, attachment_file_ids,
      push_time, push_status, push_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      projectName,
      projectDescription || null,
      ourQuote || null,
      customerBudget || null,
      budgetDifference || null,
      costBreakdownJson || null,
      riskTotalScore || null,
      riskLevel || null,
      totalWorkloadDays || null,
      newDevWorkloadDays || null,
      travelCostTotal || null,
      top3RiskScores ? JSON.stringify(top3RiskScores) : null,
      attachmentFileIds ? JSON.stringify(attachmentFileIds) : null,
      pushTime,
      pushStatus,
      pushError || null,
    ],
  );

  return { id: result.lastID, ...data };
}

async function getProjectPushHistory(projectId) {
  await ensureSchema();
  const rows = await db.all(
    `SELECT id, project_id, project_name, our_quote, customer_budget,
            budget_difference, risk_total_score, risk_level,
            top3_risk_scores, attachment_file_ids, push_time, push_status, push_error,
            created_at
     FROM project_push_records
     WHERE project_id = ?
     ORDER BY push_time DESC`,
    [projectId],
  );

  return rows.map((row) => ({
    ...row,
    top3RiskScores: row.top3_risk_scores ? safeParseJson(row.top3_risk_scores) : [],
    attachmentFileIds: row.attachment_file_ids ? safeParseJson(row.attachment_file_ids) : [],
  }));
}

function safeParseJson(str) {
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}

module.exports = {
  ensureSchema,
  createPushRecord,
  getProjectPushHistory,
};
