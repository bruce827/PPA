const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'ppa.db');

const CREATE_BIDDING_SITE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS opportunity_bidding_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    alias_name TEXT,
    url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    source_level TEXT,
    province TEXT,
    city TEXT,
    platform_type TEXT,
    is_official INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    notes TEXT,
    validation_status TEXT NOT NULL DEFAULT 'never_validated',
    validation_summary TEXT,
    auth_required INTEGER,
    is_bidding_site INTEGER,
    http_status INTEGER,
    final_url TEXT,
    redirect_chain_json TEXT,
    validation_confidence REAL,
    validation_payload_json TEXT,
    last_validated_at DATETIME,
    has_script INTEGER NOT NULL DEFAULT 0,
    script_filename TEXT,
    script_uploaded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_normalized_url
    ON opportunity_bidding_sites(normalized_url);
  CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_source_level
    ON opportunity_bidding_sites(source_level);
  CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_platform_type
    ON opportunity_bidding_sites(platform_type);
  CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_enabled
    ON opportunity_bidding_sites(enabled);
  CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_validation_status
    ON opportunity_bidding_sites(validation_status);
  CREATE INDEX IF NOT EXISTS idx_opportunity_bidding_sites_has_script
    ON opportunity_bidding_sites(has_script);
`;

function execSql(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

async function runMigration() {
  console.log('开始执行招标网站相关迁移...');
  console.log('数据库路径:', dbPath);

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('数据库连接失败:', err.message);
      process.exit(1);
    }
  });

  try {
    await execSql(db, CREATE_BIDDING_SITE_TABLE_SQL);
    console.log('✅ 招标网站表与索引创建完成');
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接失败:', err.message);
        return;
      }
      console.log('数据库连接已关闭');
      console.log('迁移完成');
    });
  }
}

runMigration();
