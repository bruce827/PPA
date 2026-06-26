const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const {
  TABLES_IN_ORDER,
  getPostgresConfig,
  getSqlitePath,
  quoteIdentifier,
} = require('./lib');

function sqliteAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function sqliteGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

async function sqliteTableExists(db, tableName) {
  const row = await sqliteGet(
    db,
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    [tableName]
  );
  return Boolean(row);
}

async function countPostgresRows(client, tableName) {
  const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(tableName)}`);
  return Number(result.rows[0]?.count || 0);
}

async function setSequence(client, tableName) {
  const sequenceResult = await client.query(`SELECT pg_get_serial_sequence($1, 'id') AS sequence_name`, [
    tableName,
  ]);
  const sequenceName = sequenceResult.rows[0]?.sequence_name;

  if (!sequenceName) {
    return;
  }

  const maxResult = await client.query(
    `SELECT COALESCE(MAX(id), 0)::bigint AS max_id FROM ${quoteIdentifier(tableName)}`
  );
  const maxId = Number(maxResult.rows[0]?.max_id || 0);

  await client.query('SELECT setval($1, $2, $3)', [sequenceName, Math.max(maxId, 1), maxId > 0]);
}

async function migrateTable(sqliteDb, client, tableName) {
  if (!await sqliteTableExists(sqliteDb, tableName)) {
    console.log(`${tableName}: skipped, source table missing`);
    return;
  }

  const rows = await sqliteAll(sqliteDb, `SELECT * FROM ${quoteIdentifier(tableName)}`);
  if (rows.length === 0) {
    const targetCount = await countPostgresRows(client, tableName);
    if (targetCount !== 0) {
      throw new Error(`${tableName}: source has 0 rows but target has ${targetCount}`);
    }

    console.log(`${tableName}: 0 rows`);
    return;
  }

  const columns = Object.keys(rows[0]);
  const columnList = columns.map(quoteIdentifier).join(', ');
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const insertSql = `
    INSERT INTO ${quoteIdentifier(tableName)} (${columnList})
    VALUES (${placeholders})
    ON CONFLICT DO NOTHING
  `;

  for (const row of rows) {
    const values = columns.map((column) => row[column]);
    await client.query(insertSql, values);
  }

  if (columns.includes('id')) {
    await setSequence(client, tableName);
  }

  const targetCount = await countPostgresRows(client, tableName);
  if (targetCount !== rows.length) {
    throw new Error(`${tableName}: migrated row count mismatch sqlite=${rows.length} postgres=${targetCount}`);
  }

  console.log(`${tableName}: migrated ${rows.length} rows`);
}

async function main() {
  const sqlitePath = getSqlitePath();
  const sqliteDb = new sqlite3.Database(sqlitePath);
  const pool = new Pool(getPostgresConfig());
  let client;

  console.log(`Migrating SQLite data from ${sqlitePath}`);
  console.log('PostgreSQL connection configured from DATABASE_URL');

  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    await client.query('BEGIN');
    for (const tableName of TABLES_IN_ORDER) {
      await migrateTable(sqliteDb, client, tableName);
    }
    await client.query('COMMIT');
    console.log('Migration completed');
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    sqliteDb.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exit(1);
  });
}
