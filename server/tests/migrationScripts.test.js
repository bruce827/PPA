process.env.NODE_ENV = 'test';

const { convertSchemaToPostgres } = require('../scripts/migration/export-postgres-schema');
const { TABLES_IN_ORDER } = require('../scripts/migration/lib');

describe('migration scripts', () => {
  test('schema conversion preserves existing integer boolean semantics', () => {
    const converted = convertSchemaToPostgres(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        is_template BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    expect(converted).toContain('id SERIAL PRIMARY KEY');
    expect(converted).toContain('is_template INTEGER NOT NULL DEFAULT 0');
    expect(converted).toContain('created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  });

  test('schema conversion keeps project risk scores decimal-compatible', () => {
    const converted = convertSchemaToPostgres(`
      CREATE TABLE projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        final_risk_score INTEGER
      )
    `);

    expect(converted).toContain('final_risk_score REAL');
  });

  test('table migration order keeps referenced parents before children', () => {
    const position = (tableName) => TABLES_IN_ORDER.indexOf(tableName);

    expect(position('form_project')).toBeLessThan(position('form_app'));
    expect(position('form_app')).toBeLessThan(position('form_definition'));
    expect(position('form_definition')).toBeLessThan(position('form_field'));
    expect(position('data_metrics_project')).toBeLessThan(position('data_metrics'));
    expect(position('data_metrics_project')).toBeLessThan(position('data_metric_categories'));
    expect(position('projects')).toBeLessThan(position('wiki_project_relations'));
    expect(position('opportunity_tender_staging')).toBeLessThan(
      position('tender_staging_web_search_results')
    );
  });
});
