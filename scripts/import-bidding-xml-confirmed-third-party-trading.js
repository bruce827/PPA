const fs = require('fs');
const path = require('path');

const db = require('../server/utils/db');
const biddingSiteModel = require('../server/models/biddingSiteModel');
const biddingSiteService = require('../server/services/biddingSiteService');

const ROOT = path.resolve(__dirname, '..');
const INPUT_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-review-二轮分组.csv');

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(current);
      if (row.some((cell) => cell !== '')) {
        rows.push(row);
      }
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current !== '' || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const [header, ...dataRows] = rows;

  return dataRows.map((dataRow) => {
    const record = {};
    header.forEach((key, index) => {
      record[key] = dataRow[index] ?? '';
    });
    return record;
  });
}

function softKey(url) {
  try {
    const parsed = new URL(url);
    const pathValue = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
    const hasDefaultPort =
      (parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443');
    const port = parsed.port && !hasDefaultPort ? `:${parsed.port}` : '';
    return `${parsed.hostname.toLowerCase()}${port}${pathValue}${parsed.search}`;
  } catch (_error) {
    return String(url).toLowerCase().trim();
  }
}

function scoreCandidate(name, url) {
  let score = 0;

  if (/^https:/.test(url)) score += 2;
  if (/招标投标交易平台|电子招投标交易平台|电子招标采购交易平台/.test(name)) score += 3;
  if (/招标采购平台|电子交易平台|招采平台|招投标平台|交易平台/.test(name)) score += 2;
  if (/服务平台|专区|云采购|云采链/.test(name)) score -= 4;

  return score + name.length / 100;
}

function shouldPend(row) {
  return /服务平台|专区|云采购|云采链/.test(row.site_name);
}

function buildImportNotes(row, aliasName = null) {
  const parts = [
    '来源: 招标网站.xml',
    `栏目: ${row.source_section}`,
    '导入批次: 第三方交易平台默认纳入',
    `导入时间: ${new Date().toISOString()}`,
  ];

  if (aliasName) {
    parts.push(`同 URL 归并别名: ${aliasName}`);
  }

  return parts.join('；');
}

async function main() {
  const allRows = parseCsv(fs.readFileSync(INPUT_CSV, 'utf8'));
  const sourceRows = allRows.filter((row) => row.review_bucket === 'third_party_trading_platform');

  const pending = [];
  const canonicalBySoftKey = new Map();

  for (const row of sourceRows) {
    if (shouldPend(row)) {
      pending.push({ name: row.site_name, url: row.url, reason: 'service-or-zone-platform' });
      continue;
    }

    const key = softKey(row.url);
    const previous = canonicalBySoftKey.get(key);

    if (!previous) {
      canonicalBySoftKey.set(key, {
        row,
        aliasNames: [],
      });
      continue;
    }

    if (previous.row.site_name === row.site_name && previous.row.url === row.url) {
      pending.push({ name: row.site_name, url: row.url, reason: 'duplicate-exact' });
      continue;
    }

    if (scoreCandidate(row.site_name, row.url) > scoreCandidate(previous.row.site_name, previous.row.url)) {
      previous.aliasNames.push(previous.row.site_name);
      pending.push({
        name: previous.row.site_name,
        url: previous.row.url,
        reason: `soft-duplicate-replaced-by:${row.site_name}`,
      });
      canonicalBySoftKey.set(key, {
        row,
        aliasNames: previous.aliasNames,
      });
    } else {
      previous.aliasNames.push(row.site_name);
      pending.push({
        name: row.site_name,
        url: row.url,
        reason: `soft-duplicate-merged-into:${previous.row.site_name}`,
      });
    }
  }

  const candidates = [...canonicalBySoftKey.values()];

  await db.init();
  await biddingSiteModel.ensureSchema();

  const beforeRow = await db.get('SELECT COUNT(1) AS total FROM opportunity_bidding_sites');

  const created = [];
  const skipped = [];

  for (const candidate of candidates) {
    const row = candidate.row;
    const aliasName = candidate.aliasNames.length > 0 ? candidate.aliasNames.join(' / ') : null;
    const normalized = biddingSiteService.normalizeUrl(row.url);
    const existingByName = await db.get(
      'SELECT id, name, url FROM opportunity_bidding_sites WHERE name = ?',
      [row.site_name]
    );
    const existingByNormalized = await biddingSiteModel.getBiddingSiteByNormalizedUrl(
      normalized.normalized_url
    );

    if (existingByName) {
      skipped.push({
        name: row.site_name,
        url: row.url,
        reason: `name 已存在，id=${existingByName.id}`,
      });
      continue;
    }

    if (existingByNormalized) {
      skipped.push({
        name: row.site_name,
        url: row.url,
        reason: `normalized_url 已存在，id=${existingByNormalized.id}`,
      });
      continue;
    }

    const createdRow = await biddingSiteService.createBiddingSite({
      name: row.site_name,
      alias_name: aliasName,
      url: row.url,
      source_level: '第三方综合',
      province: '全国',
      city: '全国',
      platform_type: '聚合平台',
      is_official: false,
      enabled: true,
      notes: buildImportNotes(row, aliasName),
      validation_status: 'never_validated',
    });

    created.push({
      id: createdRow.id,
      name: createdRow.name,
      url: createdRow.url,
      alias_name: createdRow.alias_name,
    });
  }

  const afterRow = await db.get('SELECT COUNT(1) AS total FROM opportunity_bidding_sites');

  console.log(
    JSON.stringify(
      {
        ok: true,
        sourceCount: sourceRows.length,
        candidateCount: candidates.length,
        pendingCount: pending.length,
        createdCount: created.length,
        skippedCount: skipped.length,
        beforeTotal: beforeRow?.total || 0,
        afterTotal: afterRow?.total || 0,
        created,
        skipped,
        pending,
      },
      null,
      2
    )
  );

  await db.close();
}

main().catch(async (error) => {
  try {
    await db.close();
  } catch (_closeError) {}
  console.error(error);
  process.exit(1);
});
