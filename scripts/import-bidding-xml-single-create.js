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
  const parts = [row.rationale || '来源: 招标网站.xml 最终 dry-run 执行包'];
  parts.push(`导入方式: 单条决策导入`);
  parts.push(`导入时间: ${new Date().toISOString()}`);
  if (row.precheck_requirement) {
    parts.push(`决策依据: ${row.precheck_requirement}`);
  }
  return parts.join('；');
}

async function main() {
  const targetName = process.argv[2];

  if (!targetName) {
    throw new Error('请传入要导入的站点名称');
  }

  const rows = parseCsv(fs.readFileSync(INPUT_CSV, 'utf8'));
  const row = rows.find(
    (item) => item.operation_type === 'create' && item.name === targetName
  );

  if (!row) {
    throw new Error(`未在最终 dry-run 变更表中找到 create 记录: ${targetName}`);
  }

  await db.init();
  await biddingSiteModel.ensureSchema();

  const normalized = biddingSiteService.normalizeUrl(row.final_target_url);
  const existing = await biddingSiteModel.getBiddingSiteByNormalizedUrl(
    normalized.normalized_url
  );

  if (existing) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          action: 'skipped',
          reason: 'normalized_url 已存在',
          existing: {
            id: existing.id,
            name: existing.name,
            url: existing.url,
          },
        },
        null,
        2
      )
    );
    await db.close();
    return;
  }

  const created = await biddingSiteService.createBiddingSite({
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
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        action: 'created',
        created: {
          id: created.id,
          name: created.name,
          url: created.url,
          province: created.province,
          platform_type: created.platform_type,
        },
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
