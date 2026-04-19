/**
 * Migration 013: 将 prompt_templates.category 从 CHECK 枚举约束改为自由 module_tag
 *
 * - 删除旧的 CHECK 约束
 * - 将 category 列改名为 module_tag
 * - 设置 DEFAULT 'general'
 * - 迁移历史数据到新值（LEGACY_CATEGORY_MAP）
 */

const db = require('../utils/db');

async function migrate() {
  console.log('[Migration 013] Starting prompt_templates category → module_tag 迁移...');

  // 1. 迁移历史数据
  const legacyMap = {
    risk_analysis: 'assessment',
    workload_evaluation: 'assessment',
    module_analysis: 'assessment',
    web3d_step4_analysis: 'web3d',
    project_tagging: 'tender',
    report_generation: 'report',
    web_search: 'bidding_search',
    tender_field_parse: 'tender',
    custom: 'general',
  };

  let migratedCount = 0;
  for (const [oldVal, newVal] of Object.entries(legacyMap)) {
    const result = await db.run(
      `UPDATE prompt_templates SET category = ? WHERE category = ? AND is_system = 0`,
      [newVal, oldVal]
    );
    if (result.changes > 0) {
      console.log(`  迁移 ${result.changes} 条: ${oldVal} → ${newVal}`);
      migratedCount += result.changes;
    }
  }
  console.log(`[Migration 013] 共迁移 ${migratedCount} 条记录`);

  // 2. 删除旧 CHECK 约束
  try {
    await db.run(`DROP INDEX IF EXISTS idx_prompt_templates_category`);
  } catch (_) {}

  // 3. 删除旧 CHECK 约束（SQLite 不支持 DROP CONSTRAINT，直接重建表）
  // SQLite 重建表是最稳妥的方式
  const createTableSql = await db.get(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='prompt_templates'`
  );
  if (createTableSql?.sql) {
    console.log('[Migration 013] 原始建表语句:', createTableSql.sql);
  }

  // 重建表，去掉 CHECK 约束
  await db.run(`ALTER TABLE prompt_templates RENAME TO prompt_templates_old`);

  await db.run(`
    CREATE TABLE prompt_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_name TEXT NOT NULL,
      module_tag TEXT NOT NULL DEFAULT 'general',
      description TEXT,
      system_prompt TEXT NOT NULL,
      user_prompt_template TEXT NOT NULL,
      variables_json TEXT,
      is_system INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      is_current INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 迁移系统模板数据（category 值保持不变，因为它们是 is_system=1）
  await db.run(`
    INSERT INTO prompt_templates
      (id, template_name, module_tag, description, system_prompt, user_prompt_template,
       variables_json, is_system, is_active, is_current, created_at, updated_at)
    SELECT
      id, template_name,
      CASE category
        WHEN 'risk_analysis' THEN 'assessment'
        WHEN 'workload_evaluation' THEN 'assessment'
        WHEN 'module_analysis' THEN 'assessment'
        WHEN 'web3d_step4_analysis' THEN 'web3d'
        WHEN 'project_tagging' THEN 'tender'
        WHEN 'report_generation' THEN 'report'
        WHEN 'web_search' THEN 'bidding_search'
        WHEN 'tender_field_parse' THEN 'tender'
        ELSE 'general'
      END,
      description, system_prompt, user_prompt_template,
      variables_json, is_system, is_active, is_current, created_at, updated_at
    FROM prompt_templates_old
  `);

  await db.run(`DROP TABLE prompt_templates_old`);

  // 重建索引
  await db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_templates_module_tag ON prompt_templates(module_tag)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_current ON prompt_templates(is_current)`);
  await db.run(`CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_active ON prompt_templates(is_active)`);

  console.log('[Migration 013] 完成');
}

module.exports = { migrate };
