const {
  buildPostgresConnectionConfig,
  getSslModeFromConnectionString,
  removeSslModeQueryParams,
  resolvePostgresSsl,
} = require('../utils/postgresConfig');

describe('postgres connection config', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('removes ssl query params before passing connection string to pg', () => {
    const connectionString =
      'postgresql://postgres.ref:secret@example.supabase.com:6543/postgres?sslmode=require&application_name=ppa';

    expect(removeSslModeQueryParams(connectionString)).toBe(
      'postgresql://postgres.ref:secret@example.supabase.com:6543/postgres?application_name=ppa'
    );
  });

  test('uses sslmode=require from url without leaving pg-connection-string warning params', () => {
    delete process.env.PGSSLMODE;
    const config = buildPostgresConnectionConfig(
      'postgresql://postgres.ref:secret@example.supabase.com:6543/postgres?sslmode=require'
    );

    expect(config).toEqual({
      connectionString: 'postgresql://postgres.ref:secret@example.supabase.com:6543/postgres',
      ssl: { rejectUnauthorized: false },
    });
  });

  test('PGSSLMODE overrides url ssl mode', () => {
    process.env.PGSSLMODE = 'disable';

    expect(
      resolvePostgresSsl(
        'postgresql://postgres.ref:secret@example.supabase.com:6543/postgres?sslmode=require'
      )
    ).toBe(false);
  });

  test('detects sslmode from connection string', () => {
    expect(
      getSslModeFromConnectionString(
        'postgresql://postgres.ref:secret@example.supabase.com:6543/postgres?sslmode=verify-full'
      )
    ).toBe('verify-full');
  });
});
