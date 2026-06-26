#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"

cd "$SERVER_DIR"

export NODE_ENV="${NODE_ENV:-test}"
export DB_TYPE="postgres"
export AI_LOG_ENABLED="${AI_LOG_ENABLED:-false}"
export EXPORT_LOG_ENABLED="${EXPORT_LOG_ENABLED:-false}"
export PG_POOL_MAX="${PG_POOL_MAX:-1}"
export PG_CONNECT_TIMEOUT="${PG_CONNECT_TIMEOUT:-30000}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required for PostgreSQL regression tests." >&2
  exit 1
fi

WORKERS="${PPA_REGRESSION_WORKERS:-2}"
export PPA_REGRESSION_TEST_TIMEOUT_MS="${PPA_REGRESSION_TEST_TIMEOUT_MS:-180000}"

if [[ "$WORKERS" == "1" ]]; then
  npx jest "tests/postgresql-regression" --watchman=false --runInBand "$@"
else
  npx jest "tests/postgresql-regression" --watchman=false --maxWorkers="$WORKERS" "$@"
fi
