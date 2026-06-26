#!/usr/bin/env node

const path = require('path');

const scriptPath = path.resolve(
  __dirname,
  '../../../server/scripts/migration/apply-slow-query-indexes'
);

const { applyIndexes } = require(scriptPath);

const shouldApply =
  process.argv.includes('--apply') || process.env.PPA_APPLY_SLOW_QUERY_INDEXES === '1';

applyIndexes({ dryRun: !shouldApply }).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
