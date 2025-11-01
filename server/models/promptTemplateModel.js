const db = require('../utils/db');

// 创建一个新的提示词模板
exports.create = async (template) => {
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

  const result = await db.run(sql, [template_name, category, description, system_prompt, user_prompt_template, variables_json]);
  return db.get("SELECT * FROM prompt_templates WHERE id = ?", [result.id]);
};

// 获取所有提示词模板
exports.getAll = async (filters) => {
  const { current = 1, pageSize = 10, category, is_system, is_active, search } = filters;
  const offset = (current - 1) * pageSize;

  // Base queries
  let countSql = "SELECT COUNT(*) as total FROM prompt_templates WHERE 1=1";
  let sql = "SELECT id, template_name, category, description, is_system, is_active, variables_json, created_at, updated_at FROM prompt_templates WHERE 1=1";

  const params = [];
  const countParams = [];

  // Append filters
  if (category) {
    countSql += " AND category = ?";
    sql += " AND category = ?";
    countParams.push(category);
    params.push(category);
  }
  if (is_system) {
    countSql += " AND is_system = ?";
    sql += " AND is_system = ?";
    countParams.push(is_system);
    params.push(is_system);
  }
  if (is_active) {
    countSql += " AND is_active = ?";
    sql += " AND is_active = ?";
    countParams.push(is_active);
    params.push(is_active);
  }
  if (search) {
    const searchTerm = `%${search}%`;
    countSql += " AND template_name LIKE ?";
    sql += " AND template_name LIKE ?";
    countParams.push(searchTerm);
    params.push(searchTerm);
  }

  // Add ordering and pagination to the main query
  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(pageSize, offset);

  try {
    const [countRow, rows] = await Promise.all([
      db.get(countSql, countParams),
      db.all(sql, params)
    ]);

    // Calculate variable_count in application code for robustness
    const processedRows = rows.map(row => {
      let variable_count = 0;
      if (row.variables_json) {
        try {
          const variables = JSON.parse(row.variables_json);
          if (Array.isArray(variables)) {
            variable_count = variables.length;
          } else if (typeof variables === 'object' && variables !== null) {
            variable_count = Object.keys(variables).length;
          }
        } catch (e) {
          // Ignore parse errors, count remains 0
        }
      }
      const { variables_json, ...rest } = row;
      return { ...rest, variable_count };
    });

    return {
      data: processedRows,
      total: countRow.total,
      current: parseInt(current, 10),
      pageSize: parseInt(pageSize, 10),
    };
  } catch (err) {
    console.error("Error in getAll prompt templates:", err);
    throw err;
  }
};

// 通过ID获取单个提示词模板
exports.getById = async (id) => {
  const sql = "SELECT * FROM prompt_templates WHERE id = ?";
  return db.get(sql, [id]);
};

// 更新提示词模板
exports.update = async (id, template) => {
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
  
  await db.run(sql, [template_name, category, description, system_prompt, user_prompt_template, variables_json, is_active, id]);
  return { id, ...template };
};

// 删除提示词模板
exports.delete = async (id) => {
  const sql = "DELETE FROM prompt_templates WHERE id = ?";
  return db.run(sql, [id]);
};

// 复制提示词模板
exports.copy = async (id) => {
  const template = await exports.getById(id);
  if (!template) {
    throw new Error('Template not found');
  }

  const newName = `${template.template_name} (副本)`;
  const sql = `
    INSERT INTO prompt_templates (template_name, category, description, system_prompt, user_prompt_template, variables_json, is_system, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `;

  const result = await db.run(sql, [newName, template.category, template.description, template.system_prompt, template.user_prompt_template, template.variables_json, template.is_active]);
  return exports.getById(result.id);
};