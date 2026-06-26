#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

cd "$REPO_ROOT/server"
npm test -- dashboardServiceCache.test.js dbAdapter.test.js slowQueryIndexes.test.js schemaWarmupService.test.js --watchman=false
