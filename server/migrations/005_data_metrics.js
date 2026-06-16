/**
 * 数据指标设计模块 - 数据库迁移
 * 创建 data_metrics 和 data_metric_categories 表
 */

module.exports = function migration005(db) {
  console.log('[Migration 005] Creating data metrics tables...');

  // 数据指标主表
  db.exec(`
    CREATE TABLE IF NOT EXISTS data_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      
      -- 关联信息
      project_id INTEGER,
      
      -- 业务字段（对应Excel模板的13列）
      application TEXT,
      module_name TEXT NOT NULL,
      scene_l1 TEXT NOT NULL,
      scene_l2 TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      display_type TEXT NOT NULL,
      data_source_logic TEXT,
      algorithm TEXT,
      collection_cycle TEXT,
      source_system TEXT,
      source_module TEXT,
      integration_method TEXT,
      remark TEXT,
      
      -- 系统字段
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- 外键约束
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    )
  `);

  // 场景分类表
  db.exec(`
    CREATE TABLE IF NOT EXISTS data_metric_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      
      -- 分类信息
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      parent_id INTEGER,
      
      -- 排序
      sort_order INTEGER DEFAULT 0,
      
      -- 系统字段
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- 唯一约束：同一父级下名称不重复
      UNIQUE(type, name, parent_id)
    )
  `);

  // 索引
  db.exec('CREATE INDEX IF NOT EXISTS idx_data_metrics_project_id ON data_metrics(project_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_data_metrics_module_name ON data_metrics(module_name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_data_metrics_scene_l1 ON data_metrics(scene_l1)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_data_metrics_display_type ON data_metrics(display_type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_data_metric_categories_parent ON data_metric_categories(parent_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_data_metric_categories_type ON data_metric_categories(type)');

  console.log('[Migration 005] Data metrics tables created successfully');
};
