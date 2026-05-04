const fs = require('fs');
const path = require('path');

const { initDatabase } = require('../../../../../server/init-db');

const defaultDbPath = path.resolve(__dirname, '../../../.tmp/ppa-e2e.db');
const dbPath = path.resolve(process.env.DB_PATH || defaultDbPath);
const safeRoot = path.resolve(__dirname, '../../../.tmp');

async function main() {
  if (!dbPath.startsWith(safeRoot) && process.env.PPA_E2E_ALLOW_DB_RESET !== '1') {
    throw new Error(
      `Refusing to reset DB outside ${safeRoot}. Set PPA_E2E_ALLOW_DB_RESET=1 to override.`
    );
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  await initDatabase(dbPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
