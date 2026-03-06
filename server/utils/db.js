const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db; // Declare db globally but don't initialize immediately
let connectionId = 0;

const DB_PATH = path.resolve(__dirname, '../ppa.db'); // Adjust path as needed

exports.init = async (databasePath = DB_PATH) => {
  if (db) {
    await exports.close();
  }

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(databasePath, (err) => {
      if (err) {
        console.error('Error connecting to database:', err.message);
        reject(err);
      } else {
        console.log('Connected to the SQLite database.');
        connectionId += 1;
        resolve();
      }
    });
  });
};

exports.getConnectionId = () => connectionId;

// Promisify db operations for async/await
exports.get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not initialized. Call db.init() first.'));
    db.get(sql, params, (err, result) => {
      if (err) {
        console.error('Error running get query:', err.message);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

exports.all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not initialized. Call db.init() first.'));
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Error running all query:', err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

exports.run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('Database not initialized. Call db.init() first.'));
    db.run(sql, params, function (err) {
      if (err) {
        console.error('Error running run query:', err.message);
        reject(err);
      } else {
        const lastID = typeof this.lastID === 'number' ? this.lastID : null;
        const changes = typeof this.changes === 'number' ? this.changes : 0;
        resolve({
          // 兼容旧代码：INSERT 返回 lastID；UPDATE/DELETE 返回 changes
          id: lastID != null ? lastID : changes,
          lastID,
          changes,
        });
      }
    });
  });
};


exports.close = () => {
  return new Promise((resolve, reject) => {
    if (!db) return resolve(); // Already closed or not initialized
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        reject(err);
      } else {
        console.log('Database connection closed.');
        db = null; // Clear the db instance
        resolve();
      }
    });
  });
};

exports.db = db; // Export the database instance if needed directly
