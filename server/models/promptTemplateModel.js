
const db = require('../config/db');

// 创建一个新的提示词模板
exports.create = (template) => {
  return new Promise((resolve, reject) => {
    const {
      template_name,
      category,
      description,
      system_prompt,
      user_prompt_template,
      variables_json
    } = template;

    const sql = `
      INSERT INTO prompt_templates 
      (template_name, category, description, system_prompt, user_prompt_template, variables_json, is_system)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `;

    db.run(sql, [template_name, category, description, system_prompt, user_prompt_template, variables_json], function(err) {
      if (err) {
        return reject(err);
      }
      db.get("SELECT * FROM prompt_templates WHERE id = ?", [this.lastID], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      });
    });
  });
};

// 获取所有提示词模板
exports.getAll = (filters) => {
  return new Promise((resolve, reject) => {
    let sql = "SELECT id, template_name, category, description, is_system, is_active, (SELECT COUNT(*) FROM json_each(variables_json)) as variable_count, created_at, updated_at FROM prompt_templates WHERE 1=1";
    const params = [];

    if (filters.category) {
      sql += " AND category = ?";
      params.push(filters.category);
    }
    if (filters.is_system) {
      sql += " AND is_system = ?";
      params.push(filters.is_system);
    }
    if (filters.is_active) {
      sql += " AND is_active = ?";
      params.push(filters.is_active);
    }
    if (filters.search) {
      sql += " AND template_name LIKE ?";
      params.push(`%${filters.search}%`);
    }

    sql += " ORDER BY created_at DESC";

    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      }
      resolve(rows);
    });
  });
};

// 通过ID获取单个提示词模板
exports.getById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM prompt_templates WHERE id = ?";
    db.get(sql, [id], (err, row) => {
      if (err) {
        reject(err);
      }
      resolve(row);
    });
  });
};

// 更新提示词模板
exports.update = (id, template) => {
  return new Promise((resolve, reject) => {
    const {
      template_name,
      category,
      description,
      system_prompt,
      user_prompt_template,
      variables_json,
      is_active
    } = template;

    const sql = `
      UPDATE prompt_templates
      SET 
        template_name = ?,
        category = ?,
        description = ?,
        system_prompt = ?,
        user_prompt_template = ?,
        variables_json = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(sql, [template_name, category, description, system_prompt, user_prompt_template, variables_json, is_active, id], function(err) {
      if (err) {
        reject(err);
      }
      resolve({ id, ...template });
    });
  });
};

// 删除提示词模板
exports.delete = (id) => {
  return new Promise((resolve, reject) => {
    const sql = "DELETE FROM prompt_templates WHERE id = ?";
    db.run(sql, [id], function(err) {
      if (err) {
        reject(err);
      }
      resolve({ changes: this.changes });
    });
  });
};

// 复制提示词模板
exports.copy = (id) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM prompt_templates WHERE id = ?", [id], (err, template) => {
      if (err) return reject(err);
      if (!template) return reject(new Error('Template not found'));

      const newName = `${template.template_name} (副本)`;
      const sql = `
        INSERT INTO prompt_templates (template_name, category, description, system_prompt, user_prompt_template, variables_json, is_system, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `;

      db.run(sql, [newName, template.category, template.description, template.system_prompt, template.user_prompt_template, template.variables_json, template.is_active], function(err) {
        if (err) return reject(err);
        db.get("SELECT * FROM prompt_templates WHERE id = ?", [this.lastID], (err, newTemplate) => {
          if (err) return reject(err);
          resolve(newTemplate);
        });
      });
    });
  });
};
