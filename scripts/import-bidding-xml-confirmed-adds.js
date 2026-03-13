const fs = require('fs');
const path = require('path');

const db = require('../server/utils/db');
const biddingSiteModel = require('../server/models/biddingSiteModel');
const biddingSiteService = require('../server/services/biddingSiteService');

const ROOT = path.resolve(__dirname, '..');
const INPUT_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-最终dry-run变更表.csv');

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

function buildNotes(row) {
  const base = row.rationale || '来源: 招标网站.xml 最终 dry-run 执行包';
  return `${base}；导入批次: XML 新源高置信度新增；导入时间: ${new Date().toISOString()}`;
}

async function main() {
  const allRows = parseCsv(fs.readFileSync(INPUT_CSV, 'utf8'));
  const targetRows = allRows.filter(
    (row) => row.operation_type === 'create' && row.confidence === 'high'
  );

  await db.init();
  await biddingSiteModel.ensureSchema();

  const beforeRow = await db.get(
    'SELECT COUNT(1) AS total FROM opportunity_bidding_sites'
  );

  const created = [];
  const skipped = [];

  for (const row of targetRows) {
    const normalized = biddingSiteService.normalizeUrl(row.final_target_url);
    const existing = await biddingSiteModel.getBiddingSiteByNormalizedUrl(
      normalized.normalized_url
    );

    if (existing) {
      skipped.push({
        name: row.name,
        url: row.final_target_url,
        reason: `normalized_url 已存在，id=${existing.id}`,
      });
      continue;
    }

    const payload = {
      name: row.name,
      alias_name: null,
      url: row.final_target_url,
      source_level: row.source_level,
      province: row.province,
      city: null,
      platform_type: row.platform_type,
      is_official: true,
      enabled: true,
      notes: buildNotes(row),
      validation_status: 'never_validated',
    };

    const inserted = await biddingSiteService.createBiddingSite(payload);
    created.push({
      id: inserted.id,
      name: inserted.name,
      url: inserted.url,
      province: inserted.province,
      platform_type: inserted.platform_type,
    });
  }

  const afterRow = await db.get(
    'SELECT COUNT(1) AS total FROM opportunity_bidding_sites'
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        targetRows: targetRows.length,
        createdCount: created.length,
        skippedCount: skipped.length,
        beforeTotal: beforeRow?.total || 0,
        afterTotal: afterRow?.total || 0,
        created,
        skipped,
      },
      null,
      2
    )
  );

  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
