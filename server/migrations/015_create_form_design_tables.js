/**
 * 表单设计模块数据库迁移
 * 创建设计项目、表单应用、表单定义、字段定义四张表
 */

const db = require('../utils/db');

exports.up = async function () {
  // 1. 设计项目表（新增）
  await db.run(`
    CREATE TABLE IF NOT EXISTS form_project (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_name TEXT NOT NULL,
      project_desc TEXT,
      linked_project_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. 表单应用表（对应 app_name）
  await db.run(`
    CREATE TABLE IF NOT EXISTS form_app (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL UNIQUE,
      app_code TEXT NOT NULL UNIQUE,
      project_id INTEGER DEFAULT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES form_project(id) ON DELETE CASCADE
    )
  `);

  // 检查并添加 project_id 字段（如果表已存在但没有该字段）
  try {
    const columns = await db.all('PRAGMA table_info(form_app)');
    const hasProjectId = columns.some(col => col.name === 'project_id');
    if (!hasProjectId) {
      await db.run('ALTER TABLE form_app ADD COLUMN project_id INTEGER DEFAULT NULL');
      console.log('Added project_id column to form_app');
    }
  } catch (err) {
    // 表可能还不存在，忽略错误
    console.log('form_app table will be created with project_id column');
  }

  // 3. 表单定义表（对应 form_name）
  await db.run(`
    CREATE TABLE IF NOT EXISTS form_definition (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL,
      form_name TEXT NOT NULL,
      form_code TEXT NOT NULL UNIQUE,
      filter_condition TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (app_id) REFERENCES form_app(id) ON DELETE CASCADE
    )
  `);

  // 4. 字段定义表
  await db.run(`
    CREATE TABLE IF NOT EXISTS form_field (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      field_code TEXT NOT NULL,
      is_primary_key INTEGER DEFAULT 0,
      is_virtual INTEGER DEFAULT 0,
      field_type TEXT,
      field_length INTEGER,
      field_precision INTEGER,
      default_value TEXT,

      input_type TEXT,
      input_type_code TEXT,
      input_component TEXT,
      input_params TEXT,

      is_required INTEGER DEFAULT 0,
      is_unique INTEGER DEFAULT 0,
      placeholder TEXT,
      remark TEXT,

      card_group TEXT DEFAULT '基本信息',
      card_sort INTEGER,
      card_width TEXT DEFAULT '半行',
      card_width_span INTEGER DEFAULT 12,

      add_control TEXT DEFAULT '读写',
      update_control TEXT DEFAULT '读写',
      detail_control TEXT DEFAULT '读写',

      list_width INTEGER,
      list_control TEXT DEFAULT '显示',
      list_sort INTEGER,
      list_formatter TEXT,

      is_filter INTEGER DEFAULT 0,
      filter_mode TEXT,
      filter_default TEXT,
      filter_placeholder TEXT,
      source_system TEXT,

      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (form_id) REFERENCES form_definition(id) ON DELETE CASCADE,
      UNIQUE(form_id, field_code)
    )
  `);

  // 创建索引
  await db.run(`CREATE INDEX IF NOT EXISTS idx_form_field_form_id ON form_field(form_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_form_definition_app_id ON form_definition(app_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_form_app_project_id ON form_app(project_id)`);

  console.log('Form design tables created successfully');
};

exports.down = async function () {
  await db.run('DROP TABLE IF EXISTS form_field');
  await db.run('DROP TABLE IF EXISTS form_definition');
  await db.run('DROP TABLE IF EXISTS form_app');
  await db.run('DROP TABLE IF EXISTS form_project');
};
