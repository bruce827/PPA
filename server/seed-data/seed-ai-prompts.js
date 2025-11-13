#!/usr/bin/env node

/**
 * 初始化 AI 风险评估提示词
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'ppa.db');

const prompts = [
  {
    id: 'risk-general',
    name: '通用风险评估',
    description: '适用于绝大多数项目招标场景的风险扫描模板',
    content: `You are an experienced project risk analyst.
Analyze the provided project brief and current risk evaluation state.
Return a JSON object with keys: risk_scores, missing_risks, overall_suggestion, confidence.
Each risk_scores item must include item_name, suggested_score (1-5), reason.
Missing risks should highlight uncovered risk categories with suggested scores.
Document:
{{document}}

Known risk items:
{{current_risk_items}}

Existing scores:
{{current_scores}}

Additional instructions:
{{risk_items}}
`,
    variables: [
      {
        name: 'risk_items',
        display_name: '风险项列表',
        description: '需要重点覆盖的风险项，逗号分隔',
        default_value: '技术风险,团队风险,成本风险'
      }
    ],
    model_hint: 'gpt-4-turbo'
  }
];

console.log('🚀 开始初始化 AI 提示词数据...');
console.log('数据库路径:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  }
  console.log('成功连接到 SQLite 数据库');
});

db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO ai_prompts
      (id, name, description, content, variables_json, model_hint, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  prompts.forEach((prompt) => {
    stmt.run(
      prompt.id,
      prompt.name,
      prompt.description,
      prompt.content,
      JSON.stringify(prompt.variables || []),
      prompt.model_hint
    );
  });

  stmt.finalize((err) => {
    if (err) {
      console.error('写入提示词失败:', err.message);
      db.run('ROLLBACK');
      process.exit(1);
    }
    db.run('COMMIT');
    console.log(`✅ 已写入 ${prompts.length} 条 AI 提示词记录`);
  });
});

db.close((err) => {
  if (err) {
    console.error('关闭数据库失败:', err.message);
    process.exit(1);
  }
  console.log('数据库连接已关闭');
  console.log('AI 提示词初始化完成！');
});
