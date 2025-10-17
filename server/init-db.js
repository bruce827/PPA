
const sqlite3 = require('sqlite3').verbose();

// SQL语句
const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      is_template BOOLEAN NOT NULL DEFAULT 0,
      final_total_cost REAL,
      final_risk_score INTEGER,
      final_workload_days REAL,
      assessment_details_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS config_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT NOT NULL UNIQUE,
      unit_price REAL NOT NULL,
      is_active BOOLEAN DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS config_risk_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      item_name TEXT NOT NULL,
      options_json TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS config_travel_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL UNIQUE,
      cost_per_month REAL NOT NULL,
      is_active BOOLEAN DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user'
  );
`;

// 连接数据库并执行
const db = new sqlite3.Database('./ppa.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the in-memory SQLite database.');
});

db.serialize(() => {
  db.exec(CREATE_TABLES_SQL, (err) => {
    if (err) {
      return console.error('Error creating tables:', err.message);
    }
    console.log('Tables created successfully.');
  });
});

// 关闭数据库连接
db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Closed the database connection.');
});

