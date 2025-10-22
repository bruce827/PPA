const { getDatabase } = require('../config/database');

/**
 * 项目相关的数据库操作
 */

const createProject = (projectData) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const { 
      name, 
      description, 
      is_template, 
      final_total_cost, 
      final_risk_score, 
      final_workload_days, 
      assessment_details_json 
    } = projectData;
    
    const sql = `INSERT INTO projects 
      (name, description, is_template, final_total_cost, final_risk_score, final_workload_days, assessment_details_json) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      name, 
      description, 
      is_template || 0, 
      final_total_cost, 
      final_risk_score, 
      final_workload_days, 
      assessment_details_json
    ];

    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID });
    });
  });
};

const getProjectById = (id) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.get("SELECT * FROM projects WHERE id = ?", [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const getAllProjects = () => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all(
      "SELECT id, name, final_total_cost, final_risk_score, created_at FROM projects WHERE is_template = 0 ORDER BY created_at DESC",
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

const getAllTemplates = () => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.all(
      "SELECT id, name, description FROM projects WHERE is_template = 1 ORDER BY created_at DESC",
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

const updateProject = (id, projectData) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    const { 
      name, 
      description, 
      is_template, 
      final_total_cost, 
      final_risk_score, 
      final_workload_days, 
      assessment_details_json 
    } = projectData;

    const sql = `UPDATE projects 
      SET name = ?, description = ?, is_template = ?, final_total_cost = ?, 
          final_risk_score = ?, final_workload_days = ?, assessment_details_json = ? 
      WHERE id = ?`;
    
    const params = [
      name, 
      description, 
      is_template || 0, 
      final_total_cost, 
      final_risk_score, 
      final_workload_days, 
      assessment_details_json, 
      id
    ];

    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ updated: this.changes });
    });
  });
};

const deleteProject = (id) => {
  return new Promise((resolve, reject) => {
    const db = getDatabase();
    db.run(`DELETE FROM projects WHERE id = ?`, [id], function(err) {
      if (err) reject(err);
      else resolve({ deleted: this.changes });
    });
  });
};

module.exports = {
  createProject,
  getProjectById,
  getAllProjects,
  getAllTemplates,
  updateProject,
  deleteProject
};
