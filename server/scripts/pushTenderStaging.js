const loadEnvFile = require('../config/loadEnv');
const db = require('../utils/db');
const tenderStagingModel = require('../models/tenderStagingModel');
const tenderPushService = require('../services/tenderPushService');

loadEnvFile();

function getArgValue(flagName) {
  const index = process.argv.indexOf(flagName);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const id = Number(getArgValue('--id'));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('请通过 --id 传入要推送的 staging 记录 id');
  }

  await db.init();
  await tenderStagingModel.ensureSchema();

  try {
    const result = await tenderPushService.pushTenderStaging(id);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await db.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
