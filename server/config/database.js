const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 数据库连接单例
let db = null;

/**
 * 获取数据库连接实例
 * @returns {sqlite3.Database}
 */
const getDatabase = () => {
  if (db) {
    return db;
  }

  const dbPath = path.join(__dirname, '..', 'ppa.db');
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      throw err;
    } else {
      console.log('Successfully connected to the SQLite database.');
    }
  });

  return db;
};

/**
 * 关闭数据库连接
 */
const closeDatabase = () => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
    db = null;
  }
};

module.exports = {
  getDatabase,
  closeDatabase
};
