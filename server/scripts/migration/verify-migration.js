const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

const {
  TABLES_IN_ORDER,
  getPostgresConfig,
  getSqlitePath,
  quoteIdentifier,
} = require('./lib');

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

async function countSqliteRows(db, tableName) {
  const row = await sqliteGet(db, `SELECT COUNT(*) AS count FROM ${quoteIdentifier(tableName)}`);
  return Number(row?.count || 0);
}

async function countPostgresRows(pool, tableName) {
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(tableName)}`);
  return Number(result.rows[0]?.count || 0);
}

async function main() {
  const sqlitePath = getSqlitePath();
  const sqliteDb = new sqlite3.Database(sqlitePath);
  const pool = new Pool(getPostgresConfig());
  let hasMismatch = false;

  console.log(`Verifying SQLite data from ${sqlitePath}`);

  try {
    await pool.query('SELECT 1');
    for (const tableName of TABLES_IN_ORDER) {
      try {
        const sqliteCount = await countSqliteRows(sqliteDb, tableName);
        const postgresCount = await countPostgresRows(pool, tableName);
        const matched = sqliteCount === postgresCount;
        if (!matched) {
          hasMismatch = true;
        }

        console.log(
          `${matched ? 'OK' : 'MISMATCH'} ${tableName}: sqlite=${sqliteCount} postgres=${postgresCount}`
        );
      } catch (error) {
        hasMismatch = true;
        console.log(`ERROR ${tableName}: ${error.message}`);
      }
    }
  } finally {
    await pool.end();
    sqliteDb.close();
  }

  if (hasMismatch) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Verification failed: ${error.message}`);
    process.exit(1);
  });
}
