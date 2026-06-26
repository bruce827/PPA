const {
  SLOW_QUERY_INDEXES,
  applyIndexes,
  normalizeSql,
} = require('../scripts/migration/apply-slow-query-indexes');

describe('slow query PostgreSQL indexes', () => {
  const ORIGINAL_LOG = console.log;

  afterEach(() => {
    console.log = ORIGINAL_LOG;
  });

  test('index definitions are uniquely named and use concurrent idempotent creation', () => {
    const names = SLOW_QUERY_INDEXES.map((indexDef) => indexDef.name);
    expect(new Set(names).size).toBe(names.length);

    SLOW_QUERY_INDEXES.forEach((indexDef) => {
      const sql = normalizeSql(indexDef.sql).toLowerCase();
      expect(indexDef.table).toEqual(expect.any(String));
      expect(indexDef.reason).toEqual(expect.any(String));
      expect(sql).toContain(`create index concurrently if not exists ${indexDef.name}`.toLowerCase());
      expect(sql).toContain(` on ${indexDef.table} `.toLowerCase());
    });
  });

  test('dry run prints SQL without requiring DATABASE_URL', async () => {
    const logs = [];
    console.log = (...args) => logs.push(args.join(' '));
    delete process.env.DATABASE_URL;

    await expect(applyIndexes({ dryRun: true })).resolves.toBeUndefined();

    expect(logs.join('\n')).toContain('Dry run: no schema changes will be executed.');
    expect(logs.join('\n')).toContain('idx_prompt_tpl_module_created_desc');
    expect(logs.join('\n')).toContain('idx_projects_standard_cost_not_null');
  });
});
