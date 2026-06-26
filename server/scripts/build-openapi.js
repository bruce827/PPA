#!/usr/bin/env node
/**
 * Builds the machine-readable API artifacts from the code-derived contract:
 *   - docs/api/openapi.json   the full OpenAPI 3.0 spec (the agent's tool spec)
 *   - docs/api-inventory.md   a human-readable index of every endpoint
 *
 * Run via `npm run build:api`. The spec is generated entirely from the zod
 * schemas + registerRoute calls, so it cannot drift from the source of truth.
 */
const fs = require('fs');
const path = require('path');
const { buildSpec } = require('../openapi/generate');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const API_DIR = path.join(REPO_ROOT, 'docs', 'api');
const SPEC_PATH = path.join(API_DIR, 'openapi.json');
const INVENTORY_PATH = path.join(REPO_ROOT, 'docs', 'api-inventory.md');

function buildInventory(spec) {
  const rows = [];
  for (const [p, item] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(item)) {
      rows.push({
        method: method.toUpperCase(),
        path: p,
        tag: (op.tags && op.tags[0]) || '',
        summary: op.summary || '',
      });
    }
  }
  rows.sort((a, b) =>
    a.tag === b.tag
      ? `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`)
      : a.tag.localeCompare(b.tag)
  );

  const lines = [];
  lines.push('# API Inventory');
  lines.push('');
  lines.push(
    '> 由 `npm run build:api` 从代码派生自动生成，请勿手工编辑。共 ' +
      `${rows.length} 个接口。`
  );
  lines.push('');

  let currentTag = null;
  for (const r of rows) {
    if (r.tag !== currentTag) {
      currentTag = r.tag;
      lines.push('');
      lines.push(`## ${currentTag || 'Uncategorized'}`);
      lines.push('');
      lines.push('| Method | Path | Summary |');
      lines.push('| --- | --- | --- |');
    }
    lines.push(`| ${r.method} | \`${r.path}\` | ${r.summary} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function main() {
  const spec = buildSpec();

  fs.mkdirSync(API_DIR, { recursive: true });
  fs.writeFileSync(SPEC_PATH, JSON.stringify(spec, null, 2) + '\n', 'utf8');
  fs.writeFileSync(INVENTORY_PATH, buildInventory(spec), 'utf8');

  const pathCount = Object.keys(spec.paths).length;
  const opCount = Object.values(spec.paths).reduce(
    (n, item) => n + Object.keys(item).length,
    0
  );
  const schemaCount = Object.keys((spec.components || {}).schemas || {}).length;

  console.log(`[build:api] wrote ${path.relative(REPO_ROOT, SPEC_PATH)}`);
  console.log(`[build:api] wrote ${path.relative(REPO_ROOT, INVENTORY_PATH)}`);
  console.log(
    `[build:api] ${pathCount} path templates, ${opCount} operations, ${schemaCount} schemas`
  );
}

main();
