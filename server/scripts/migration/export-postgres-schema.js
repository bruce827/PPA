const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const { TABLES_IN_ORDER, getSqlitePath } = require('./lib');

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

function convertSchemaToPostgres(sql) {
  return String(sql)
    .replace(/\bINTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT\b/gi, 'SERIAL PRIMARY KEY')
    .replace(/(\bfinal_risk_score\s+)INTEGER\b/gi, '$1REAL')
    .replace(/\bBOOLEAN\b/gi, 'INTEGER')
    .replace(/\bDATETIME\b/gi, 'TIMESTAMP')
    .replace(/\bdatetime\s*\(\s*'now'\s*\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/\bCURRENT_TIMESTAMP\b/gi, 'CURRENT_TIMESTAMP')
    .replace(/\s+WITHOUT\s+ROWID\b/gi, '');
}

async function readSqliteSchema(db) {
  const tableStatements = [];
  const missingTables = [];

  for (const tableName of TABLES_IN_ORDER) {
    const row = await sqliteGet(
      db,
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`,
      [tableName]
    );

    if (row?.sql) {
      tableStatements.push(row.sql);
    } else {
      missingTables.push(tableName);
    }
  }

  const indexes = await sqliteAll(
    db,
    `
      SELECT sql
      FROM sqlite_master
      WHERE type = 'index'
        AND sql IS NOT NULL
        AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `
  );

  return {
    statements: [...tableStatements, ...indexes.map((row) => row.sql)].filter(Boolean),
    missingTables,
  };
}

async function exportSchema({ sqlitePath, outputPath }) {
  const sqliteDb = new sqlite3.Database(sqlitePath);

  try {
    const { statements, missingTables } = await readSqliteSchema(sqliteDb);
    if (statements.length === 0) {
      throw new Error(`No SQLite schema statements found in ${sqlitePath}`);
    }

    const converted = statements.map(convertSchemaToPostgres).join(';\n\n');
    const warning = missingTables.length > 0
      ? `-- WARNING: Missing source tables: ${missingTables.join(', ')}\n\n`
      : '';

    fs.writeFileSync(outputPath, `${warning}${converted.trim()};\n`, 'utf8');
    return { missingTables };
  } finally {
    sqliteDb.close();
  }
}

async function main() {
  const sqlitePath = getSqlitePath();
  const outputPath = path.resolve(
    process.argv[2] || path.join(__dirname, '02-convert-to-postgresql.sql')
  );
  const { missingTables } = await exportSchema({ sqlitePath, outputPath });

  console.log(`PostgreSQL schema written to ${outputPath}`);
  if (missingTables.length > 0) {
    console.log(`WARNING missing source tables: ${missingTables.join(', ')}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Schema export failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  convertSchemaToPostgres,
  exportSchema,
  readSqliteSchema,
};
