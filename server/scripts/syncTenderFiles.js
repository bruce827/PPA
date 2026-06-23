const loadEnvFile = require('../config/loadEnv');
const db = require('../utils/db');
const tenderStagingModel = require('../models/tenderStagingModel');
const tenderStagingService = require('../services/tenderStagingService');

loadEnvFile();

function getArgValue(flagName) {
  const index = process.argv.indexOf(flagName);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const directoryPath = getArgValue('--dir');

  await db.init();
  await tenderStagingModel.ensureSchema();

  try {
    const result = await tenderStagingService.syncTenderFiles({ directoryPath });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
