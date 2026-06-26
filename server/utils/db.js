const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DEFAULT_SQLITE_DB_PATH = path.resolve(__dirname, '../ppa.db');

let db;
let dbType = 'postgres';
let connectionId = 0;
let pgPool = null;
let pgTransactionClient = null;
let activeInitConfigKey = null;
let initPromise = null;
let initPromiseConfigKey = null;

const getDefaultDatabasePath = () => (
  process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : DEFAULT_SQLITE_DB_PATH
);

const normalizeDbType = (value) => String(value || 'postgres').toLowerCase();

const getConfiguredDbType = () => {
  const type = normalizeDbType(process.env.DB_TYPE);
  if (!['sqlite', 'postgres'].includes(type)) {
    throw new Error(`Unsupported DB_TYPE: ${process.env.DB_TYPE}. Expected sqlite or postgres`);
  }
  return type;
};

const usesPostgres = () => getConfiguredDbType() === 'postgres';

const isPgSelectionQuery = (sql) => /^\s*select\s+1\s*;?\s*$/i.test(String(sql || ''));

const needsSqliteCompatQuery = (sql) => {
  const normalized = String(sql || '').trim().toLowerCase();
  return normalized.startsWith('pragma table_info(');
};

const isPostgresQuestionOperator = (text, index) => {
  let nextIndex = index + 1;
  while (nextIndex < text.length && /\s/.test(text[nextIndex])) {
    nextIndex += 1;
  }

  return text[nextIndex] === "'" || text[nextIndex] === '"' || text[nextIndex] === '|' || text[nextIndex] === '&';
};

const convertSqlPlaceholders = (sql, maxPlaceholders = Number.POSITIVE_INFINITY) => {
  const text = String(sql || '');
  let converted = '';
  let paramIndex = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      converted += char;
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      converted += char;
      if (char === '*' && next === '/') {
        converted += next;
        i += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === '-' && next === '-') {
      converted += char + next;
      i += 1;
      inLineComment = true;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && char === '/' && next === '*') {
      converted += char + next;
      i += 1;
      inBlockComment = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      converted += char;
      if (inSingleQuote && next === "'") {
        converted += next;
        i += 1;
      } else {
        inSingleQuote = !inSingleQuote;
      }
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      converted += char;
      if (inDoubleQuote && next === '"') {
        converted += next;
        i += 1;
      } else {
        inDoubleQuote = !inDoubleQuote;
      }
      continue;
    }

    if (
      !inSingleQuote &&
      !inDoubleQuote &&
      char === '?' &&
      paramIndex < maxPlaceholders &&
      !isPostgresQuestionOperator(text, i)
    ) {
      paramIndex += 1;
      converted += `$${paramIndex}`;
      continue;
    }

    converted += char;
  }

  return converted;
};

const convertSqliteSyntaxForPostgres = (sql) => {
  let text = String(sql || '');
  let insertIgnore = false;

  text = text.replace(/\bINTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT\b/gi, 'SERIAL PRIMARY KEY');
  text = text.replace(/^\s*BEGIN\s+IMMEDIATE\s*;?\s*$/i, 'BEGIN');

  text = text.replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i, (match) => {
    insertIgnore = true;
    return match.replace(/INSERT\s+OR\s+IGNORE\s+INTO/i, 'INSERT INTO');
  });

  if (insertIgnore && !/\bON\s+CONFLICT\b/i.test(text) && !/\bRETURNING\b/i.test(text)) {
    text = text.replace(/;?\s*$/, ' ON CONFLICT DO NOTHING');
  }

  // STRFTIME('%Y-%m', column) -> TO_CHAR(column, 'YYYY-MM')
  text = text.replace(
    /\bSTRFTIME\s*\(\s*'([^']*)'\s*,\s*([^)]+)\s*\)/gi,
    (_match, format, column) => {
      // Convert SQLite strftime format to PostgreSQL to_char format
      const pgFormat = format
        .replace(/%Y/g, 'YYYY')
        .replace(/%m/g, 'MM')
        .replace(/%d/g, 'DD')
        .replace(/%H/g, 'HH24')
        .replace(/%M/g, 'MI')
        .replace(/%S/g, 'SS');
      return `TO_CHAR(${column.trim()}, '${pgFormat}')`;
    }
  );

  text = text.replace(
    /\bdatetime\s*\(\s*'now'\s*,\s*('(?:''|[^'])*')\s*\)/gi,
    (_match, intervalLiteral) => `(CURRENT_TIMESTAMP + INTERVAL ${intervalLiteral})`
  );
  text = text.replace(
    /\bdatetime\s*\(\s*'now'\s*,\s*(\$\d+)\s*\)/gi,
    (_match, placeholder) => `(CURRENT_TIMESTAMP + (${placeholder})::interval)`
  );
  text = text.replace(/\bdatetime\s*\(\s*'now'\s*\)/gi, 'CURRENT_TIMESTAMP');
  text = text.replace(
    /\bdatetime\s*\(\s*(\$\d+)\s*\)/gi,
    (_match, placeholder) => `(${placeholder})::timestamp`
  );
  text = text.replace(
    /\bdatetime\s*\(\s*([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)\s*\)/gi,
    (_match, identifier) => `${identifier}::timestamp`
  );
  text = text.replace(
    /\bdate\s*\(\s*(\$\d+)\s*\)/gi,
    (_match, placeholder) => `(${placeholder})::date`
  );
  text = text.replace(
    /\bdate\s*\(\s*([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)\s*\)/gi,
    (_match, identifier) => `${identifier}::date`
  );
  text = text.replace(/\bDATETIME\b/gi, 'TIMESTAMP');

  return text;
};

const convertSqlForPostgres = (sql, params = []) => (
  convertSqliteSyntaxForPostgres(convertSqlPlaceholders(sql, params.length))
);

const buildPgConfig = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required when DB_TYPE=postgres');
  }

  const shouldUseSsl = /[?&]sslmode=require/i.test(connectionString) || process.env.PGSSLMODE === 'require';
  const config = {
    connectionString,
    max: parseInt(process.env.PG_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.PG_CONNECT_TIMEOUT || '30000', 10),
  };

  if (shouldUseSsl) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
};

const getPostgresInitConfigKey = () => {
  const config = buildPgConfig();
  return JSON.stringify({
    type: 'postgres',
    connectionString: config.connectionString,
    max: config.max,
    idleTimeoutMillis: config.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    ssl: config.ssl || null,
  });
};

const getSqliteInitConfigKey = (databasePath) => JSON.stringify({
  type: 'sqlite',
  databasePath: path.resolve(databasePath),
});

const hasActiveConnectionFor = (targetType, targetConfigKey) => {
  if (!db || dbType !== targetType || activeInitConfigKey !== targetConfigKey) {
    return false;
  }
  return targetType !== 'postgres' || Boolean(pgPool);
};

const close = async () => {
  if (dbType === 'postgres') {
    if (pgTransactionClient) {
      pgTransactionClient.release();
      pgTransactionClient = null;
    }

    if (pgPool) {
      await pgPool.end();
      pgPool = null;
    }
    db = null;
    activeInitConfigKey = null;
    connectionId += 1;
    return;
  }

  await new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        reject(err);
        return;
      }

      console.log('Database connection closed.');
      db = null;
      activeInitConfigKey = null;
      connectionId += 1;
      resolve();
    });
  });
};

const initSqlite = async (databasePath = getDefaultDatabasePath()) => {
  if (db) {
    await close();
  }

  const resolvedPath = path.resolve(databasePath);

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(resolvedPath, (err) => {
      if (err) {
        console.error('Error connecting to database:', err.message);
        reject(err);
        return;
      }

      db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
        if (pragmaErr) {
          console.error('Failed to enable foreign keys:', pragmaErr.message);
          reject(pragmaErr);
          return;
        }

        dbType = 'sqlite';
        connectionId += 1;
        console.log(`Connected to SQLite database: ${resolvedPath}`);
        resolve();
      });
    });
  });
};

const initPostgres = async () => {
  if (db || pgPool) {
    await close();
  }

  const { Pool } = require('pg');
  pgPool = new Pool(buildPgConfig());

  // 监听连接池错误事件，防止未处理的错误导致崩溃
  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err.message);
  });

  // 测试连接
  try {
    await pgPool.query('SELECT 1');
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    await pgPool.end().catch(() => {});
    pgPool = null;
    throw err;
  }

  db = pgPool;
  dbType = 'postgres';
  connectionId += 1;
  console.log('Connected to PostgreSQL database via Supabase.');
};

const init = async (databasePath = getDefaultDatabasePath()) => {
  const targetType = getConfiguredDbType();
  const targetConfigKey = targetType === 'postgres'
    ? getPostgresInitConfigKey()
    : getSqliteInitConfigKey(databasePath);

  if (hasActiveConnectionFor(targetType, targetConfigKey)) {
    return;
  }

  if (initPromise) {
    if (initPromiseConfigKey !== targetConfigKey) {
      throw new Error('Database initialization already in progress for a different configuration');
    }
    await initPromise;
    if (hasActiveConnectionFor(targetType, targetConfigKey)) {
      return;
    }
  }

  initPromiseConfigKey = targetConfigKey;
  initPromise = (async () => {
    if (targetType === 'postgres') {
      await initPostgres();
    } else {
      await initSqlite(databasePath);
    }
    activeInitConfigKey = targetConfigKey;
  })();

  try {
    await initPromise;
  } finally {
    initPromise = null;
    initPromiseConfigKey = null;
  }
};

const ensureInitialized = () => {
  if (!db) {
    throw new Error('Database not initialized. Call db.init() first.');
  }
};

const normalizeRunResult = (result, sql) => {
  if (dbType === 'postgres') {
    const row = result?.rows?.[0] || null;
    const lastID = row && row.id != null ? row.id : null;
    const changes = typeof result?.rowCount === 'number' ? result.rowCount : 0;

    return {
      id: lastID != null ? lastID : changes,
      lastID,
      changes,
      rows: result?.rows || [],
      rowCount: changes,
      command: result?.command,
      sql,
    };
  }

  const lastID = typeof result?.lastID === 'number' ? result.lastID : null;
  const changes = typeof result?.changes === 'number' ? result.changes : 0;

  return {
    id: lastID != null ? lastID : changes,
    lastID,
    changes,
    sql,
  };
};

const queryPostgres = async (sql, params = []) => {
  const text = convertSqlForPostgres(sql, params);
  const executor = pgTransactionClient || pgPool;
  
  try {
    return await executor.query(text, params);
  } catch (err) {
    // 如果是连接断开错误且不在事务中，尝试重连一次
    if (!pgTransactionClient && isConnectionError(err)) {
      console.warn('PostgreSQL connection lost, attempting to reconnect...');
      try {
        await reconnectPostgres();
        return await pgPool.query(text, params);
      } catch (reconnectErr) {
        console.error('Reconnection failed:', reconnectErr.message);
        throw reconnectErr;
      }
    }
    throw err;
  }
};

const isConnectionError = (err) => {
  const connectionErrors = [
    'Connection terminated unexpectedly',
    'Connection terminated',
    'connection timeout',
    'ECONNRESET',
    'EPIPE',
    'ENOTFOUND',
  ];
  return connectionErrors.some((msg) => err.message?.includes(msg));
};

const reconnectPostgres = async () => {
  if (pgPool) {
    await pgPool.end().catch(() => {});
  }
  const { Pool } = require('pg');
  pgPool = new Pool(buildPgConfig());
  pgPool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err.message);
  });
  await pgPool.query('SELECT 1');
  db = pgPool;
  console.log('Reconnected to PostgreSQL database.');
};

const getInsertTableName = (sql) => (
  String(sql || '')
    .trim()
    .match(/^insert\s+into\s+"?([a-z_][a-z0-9_]*)"?\b/i)?.[1] || null
);

const tableHasIdColumn = async (tableName) => {
  if (!tableName) return false;
  const result = await queryPostgres(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = ?
        AND column_name = 'id'
      LIMIT 1
    `,
    [tableName]
  );
  return result.rows.length > 0;
};

const isTransactionSql = (sql) => /^\s*(BEGIN|COMMIT|ROLLBACK)(?:\s+TRANSACTION)?\s*;?\s*$/i.test(String(sql || ''));

const runPostgresTransactionCommand = async (sql) => {
  const command = String(sql || '').trim().replace(/;+\s*$/, '').split(/\s+/)[0].toUpperCase();

  if (command === 'BEGIN') {
    if (pgTransactionClient) {
      throw new Error('Nested PostgreSQL transactions are not supported by db.run');
    }

    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      pgTransactionClient = client;
      return normalizeRunResult({ rowCount: 0, command: 'BEGIN', rows: [] }, 'BEGIN');
    } catch (error) {
      client.release();
      throw error;
    }
  }

  if (!pgTransactionClient) {
    const result = await pgPool.query(command);
    return normalizeRunResult(result, command);
  }

  try {
    const result = await pgTransactionClient.query(command);
    return normalizeRunResult(result, command);
  } finally {
    pgTransactionClient.release();
    pgTransactionClient = null;
  }
};

const get = async (sql, params = []) => {
  ensureInitialized();

  if (dbType === 'postgres') {
    if (isPgSelectionQuery(sql)) {
      const result = await queryPostgres('SELECT 1', []);
      return result.rows[0] || null;
    }

    if (needsSqliteCompatQuery(sql)) {
      const tableName = String(sql)
        .trim()
        .match(/^pragma\s+table_info\((.+)\)\s*;?$/i)?.[1]
        ?.replace(/^['"]|['"]$/g, '')
        ?.trim();

      if (!tableName) {
        return null;
      }

      const result = await queryPostgres(
        `
          SELECT
            information_schema.columns.ordinal_position - 1 AS cid,
            information_schema.columns.column_name AS name,
            information_schema.columns.data_type AS type,
            CASE WHEN information_schema.columns.is_nullable = 'NO' THEN 1 ELSE 0 END AS notnull,
            information_schema.columns.column_default AS dflt_value,
            CASE WHEN information_schema.columns.column_name = pk.column_name THEN 1 ELSE 0 END AS pk
          FROM information_schema.columns
          LEFT JOIN (
            SELECT kcu.table_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
          ) AS pk
            ON pk.table_name = information_schema.columns.table_name
              AND pk.column_name = information_schema.columns.column_name
          WHERE table_schema = current_schema()
            AND table_name = $1
          ORDER BY ordinal_position
        `,
        [tableName]
      );

      return result.rows[0] || null;
    }

    const result = await queryPostgres(sql, params);
    return result.rows[0] || null;
  }

  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
      if (err) {
        console.error('Error running get query:', err.message);
        reject(err);
        return;
      }

      resolve(result);
    });
  });
};

const all = async (sql, params = []) => {
  ensureInitialized();

  if (dbType === 'postgres') {
    if (needsSqliteCompatQuery(sql)) {
      const tableName = String(sql)
        .trim()
        .match(/^pragma\s+table_info\((.+)\)\s*;?$/i)?.[1]
        ?.replace(/^['"]|['"]$/g, '')
        ?.trim();

      if (!tableName) {
        return [];
      }

      const result = await queryPostgres(
        `
          SELECT
            c.ordinal_position - 1 AS cid,
            c.column_name AS name,
            c.data_type AS type,
            CASE WHEN c.is_nullable = 'NO' THEN 1 ELSE 0 END AS notnull,
            c.column_default AS dflt_value,
            CASE WHEN pk.column_name IS NULL THEN 0 ELSE 1 END AS pk
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT kcu.table_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
          ) AS pk
            ON pk.table_name = c.table_name AND pk.column_name = c.column_name
          WHERE c.table_schema = current_schema()
            AND c.table_name = $1
          ORDER BY ordinal_position
        `,
        [tableName]
      );

      return result.rows;
    }

    const result = await queryPostgres(sql, params);
    return result.rows;
  }

  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Error running all query:', err.message);
        reject(err);
        return;
      }

      resolve(rows);
    });
  });
};

const run = async (sql, params = []) => {
  ensureInitialized();

  if (dbType === 'postgres') {
    const text = convertSqlForPostgres(sql, params);
    const trimmed = String(text).trim().replace(/;+\s*$/, '');
    if (isTransactionSql(trimmed)) {
      return runPostgresTransactionCommand(trimmed);
    }

    const isInsert = /^insert\s+/i.test(trimmed);
    const hasReturning = /\breturning\b/i.test(trimmed);
    const shouldReturnId = isInsert && !hasReturning && await tableHasIdColumn(getInsertTableName(trimmed));
    const finalSql = shouldReturnId ? `${trimmed} RETURNING id` : trimmed;
    const result = await queryPostgres(finalSql, params);
    return normalizeRunResult(result, finalSql);
  }

  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error('Error running run query:', err.message);
        reject(err);
        return;
      }

      const lastID = typeof this.lastID === 'number' ? this.lastID : null;
      const changes = typeof this.changes === 'number' ? this.changes : 0;
      resolve({
        id: lastID != null ? lastID : changes,
        lastID,
        changes,
      });
    });
  });
};

const exec = async (sql) => {
  ensureInitialized();

  if (dbType === 'postgres') {
    return queryPostgres(sql);
  }

  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

const getConnectionId = () => connectionId;

const getDbType = () => dbType;

module.exports = {
  init,
  get,
  all,
  run,
  exec,
  close,
  getDefaultDatabasePath,
  getConnectionId,
  getDbType,
  getConfiguredDbType,
  _private: {
    convertSqlPlaceholders,
    convertSqliteSyntaxForPostgres,
    convertSqlForPostgres,
    getConfiguredDbType,
    isPostgresQuestionOperator,
    normalizeDbType,
    usesPostgres,
    getPostgresInitConfigKey,
    getSqliteInitConfigKey,
  },
};
