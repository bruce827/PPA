# Supabase PostgreSQL Migration Scripts

These scripts are intentionally credential-free. Provide secrets through environment variables only.

For Supabase, keep `DATABASE_URL` as the plain PostgreSQL URI and set `PGSSLMODE=require`
separately. Avoid appending `?sslmode=require` to the URL when using Node `pg`, because
the connection string parser may enforce certificate validation that fails against Supabase's
certificate chain in local development.

## 1. Export PostgreSQL Schema

```bash
SQLITE_DB_PATH="server/ppa.db" \
node server/scripts/migration/export-postgres-schema.js server/scripts/migration/02-convert-to-postgresql.sql
```

The exporter reads the current SQLite schema from `sqlite_master`, so run the existing SQLite migrations first if the source database may be old. Review the generated SQL before running it in Supabase.

## 2. Migrate Data

```bash
DB_TYPE=postgres \
DATABASE_URL="postgresql://..." \
PGSSLMODE=require \
SQLITE_DB_PATH="server/ppa.db" \
node server/scripts/migration/migrate-data.js
```

The script inserts rows in dependency order inside one PostgreSQL transaction and uses `ON CONFLICT DO NOTHING`. It exits non-zero if post-insert row counts do not match.

## 3. Verify Row Counts

```bash
DATABASE_URL="postgresql://..." \
PGSSLMODE=require \
SQLITE_DB_PATH="server/ppa.db" \
node server/scripts/migration/verify-migration.js
```

Any table mismatch exits with code `1`.
