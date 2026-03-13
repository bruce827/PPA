const fs = require('fs');
const path = require('path');
const sqlite3 = require('../server/node_modules/sqlite3').verbose();

const ROOT = path.resolve(__dirname, '..');
const INPUT_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-直接补充候选.csv');
const DB_PATH = path.join(ROOT, 'server/ppa.db');
const OUTPUT_DRY_RUN_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-直接补充-dry-run.csv');
const OUTPUT_REVIEW_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-直接补充-同名待确认.csv');
const OUTPUT_MD = path.join(ROOT, 'docs/analysis/招标网站-xml-直接补充-dry-run说明.md');

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

function csvEscape(value) {
  if (value === null || typeof value === 'undefined') return '';
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  });
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function allAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

function normalizeProvince(value) {
  if (!value) return '全国';

  const direct = {
    北京市: '北京',
    北京: '北京',
    上海市: '上海',
    上海: '上海',
    天津市: '天津',
    天津: '天津',
    重庆市: '重庆',
    重庆: '重庆',
    内蒙古自治区: '内蒙古',
    内蒙古: '内蒙古',
    广西壮族自治区: '广西',
    广西: '广西',
    西藏自治区: '西藏',
    西藏: '西藏',
    宁夏回族自治区: '宁夏',
    宁夏: '宁夏',
    新疆维吾尔自治区: '新疆',
    新疆: '新疆',
    新疆生产建设兵团: '兵团',
    兵团: '兵团',
    青海省: '青海',
    河北省: '河北',
    山西省: '山西',
    辽宁省: '辽宁',
    吉林省: '吉林',
    江苏省: '江苏',
    浙江省: '浙江',
    福建省: '福建',
    江西省: '江西',
    山东省: '山东',
    河南省: '河南',
    湖北省: '湖北',
    广东省: '广东',
    海南省: '海南',
    四川省: '四川',
    贵州省: '贵州',
    云南省: '云南',
    陕西省: '陕西',
    甘肃省: '甘肃',
  };

  return direct[value] || String(value).replace(/省$|市$|自治区$|特别行政区$/g, '').trim();
}

function inferTrack(record) {
  const text = `${record.source_section || ''} ${record.candidate_platform_type || ''} ${record.site_name || ''} ${record.url || ''}`;
  if (/政府采购|采购中心/.test(text)) return '政府采购';
  if (/军采|军队/.test(text)) return '军采';
  if (/plap\.mil\.cn|自采/.test(text)) return '军采';
  if (/公共资源|招标投标/.test(text)) return '公共资源交易';
  return '其他';
}

function inferTrackFromExisting(row) {
  const text = `${row.platform_type || ''} ${row.name || ''}`;
  if (/军采|军队采购/.test(text)) return '军采';
  if (/政府采购|采购中心/.test(text)) return '政府采购';
  if (/公共资源|招标投标/.test(text)) return '公共资源交易';
  return '其他';
}

function getUrlFlags(url) {
  try {
    const parsed = new URL(url);
    const pathDepth = parsed.pathname.split('/').filter(Boolean).length;
    const flags = [];

    if (parsed.search) flags.push('has_query');
    if (pathDepth >= 2) flags.push('deep_path');
    if (/index\.jsp|index\.html|homepage/i.test(parsed.pathname)) flags.push('entry_file');

    return flags;
  } catch (_error) {
    return ['invalid_url_shape'];
  }
}

function inferConfidence(record) {
  const flags = [];
  const urlFlags = getUrlFlags(record.url);
  flags.push(...urlFlags);

  if (record.candidate_platform_type === '待判定') {
    flags.push('platform_type_pending');
  }
  if (/中心/.test(record.site_name)) {
    flags.push('name_contains_center');
  }
  if (/自采/.test(record.site_name)) {
    flags.push('self_procurement_entry');
  }

  if (
    flags.some((flag) =>
      ['platform_type_pending', 'self_procurement_entry', 'has_query', 'deep_path', 'entry_file'].includes(
        flag
      )
    )
  ) {
    return { confidence: 'medium', flags };
  }

  return { confidence: 'high', flags };
}

function summarizeCounts(rows, key) {
  return rows.reduce((accumulator, row) => {
    const value = row[key] || '(empty)';
    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});
}

function renderMarkdownTable(rows, headers) {
  if (!rows.length) return '_无_';
  const head = `| ${headers.join(' | ')} |`;
  const divider = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${headers.map((header) => row[header] ?? '').join(' | ')} |`);
  return [head, divider, ...body].join('\n');
}

function buildMarkdown({
  dryRunRows,
  createRows,
  sameNameReviewRows,
  decisionCounts,
  confidenceCounts,
  trackCounts,
}) {
  const now = new Date().toISOString();
  const createPreview = createRows.slice(0, 20).map((row) => ({
    site_name: row.name,
    province: row.province,
    track: row.track,
    import_confidence: row.import_confidence,
    manual_check_reason: row.manual_check_reason || '-',
  }));
  const reviewPreview = sameNameReviewRows.slice(0, 20).map((row) => ({
    site_name: row.name,
    existing_name: row.exact_name_match_name,
    existing_url: row.exact_name_match_url,
    proposed_url: row.url,
    dry_run_decision: row.dry_run_decision,
  }));

  return `# 招标网站 XML 直接补充 Dry Run 说明

- 输入清单：\`docs/csv/招标网站-xml-直接补充候选.csv\`
- 输出清单：\`docs/csv/招标网站-xml-直接补充-dry-run.csv\`
- 同名待确认：\`docs/csv/招标网站-xml-直接补充-同名待确认.csv\`
- 生成时间：${now}
- 说明：本轮仅做 dry-run 规划，不执行任何数据库写入

## 1. 总体结论

- 直接补充候选总数：\`${dryRunRows.length}\`
- 拟新增候选：\`${createRows.length}\`
- 同名待确认：\`${sameNameReviewRows.length}\`

## 2. 决策分布

${renderMarkdownTable(
    Object.entries(decisionCounts).map(([dry_run_decision, count]) => ({
      dry_run_decision,
      count,
    })),
    ['dry_run_decision', 'count']
  )}

## 3. 拟新增候选置信度

${renderMarkdownTable(
    Object.entries(confidenceCounts).map(([import_confidence, count]) => ({
      import_confidence,
      count,
    })),
    ['import_confidence', 'count']
  )}

## 4. 拟新增候选按轨道分布

${renderMarkdownTable(
    Object.entries(trackCounts).map(([track, count]) => ({
      track,
      count,
    })),
    ['track', 'count']
  )}

## 5. 拟新增候选（前 20）

${renderMarkdownTable(createPreview, [
    'site_name',
    'province',
    'track',
    'import_confidence',
    'manual_check_reason',
  ])}

## 6. 同名待确认（前 20）

${renderMarkdownTable(reviewPreview, [
    'site_name',
    'existing_name',
    'existing_url',
    'proposed_url',
    'dry_run_decision',
  ])}

## 7. 执行建议

1. \`same_name_review\` 这批不要直接新增，先确认是 URL 更新、别名补充，还是并行新源。
2. \`create_candidate\` 才能进入下一步 dry-run 导入表。
3. \`import_confidence = medium\` 的拟新增项，在真正入库前建议至少做一次人工点验。
4. 省级主站虽然是拟新增，但多数属于“同省同轨补充源”，不代表当前省份完全缺站。
`;
}

async function main() {
  const inputRows = parseCsv(fs.readFileSync(INPUT_CSV, 'utf8'));
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  try {
    const existingRows = await allAsync(
      db,
      `SELECT id, name, url, normalized_url, province, platform_type
       FROM opportunity_bidding_sites
       ORDER BY id ASC`
    );

    const existingByExactName = new Map();
    existingRows.forEach((row) => {
      if (!existingByExactName.has(row.name)) {
        existingByExactName.set(row.name, []);
      }
      existingByExactName.get(row.name).push(row);
    });

    const dryRunRows = inputRows.map((record, index) => {
      const provinceNormalized = normalizeProvince(record.province);
      const track = inferTrack(record);
      const sameProvinceTrackRows = existingRows.filter(
        (row) =>
          normalizeProvince(row.province) === provinceNormalized &&
          inferTrackFromExisting(row) === track
      );
      const exactNameMatches = existingByExactName.get(record.site_name) || [];
      const confidenceResult = inferConfidence(record);
      const sameProvinceTrackNames = sameProvinceTrackRows
        .map((row) => `${row.name} | ${row.url}`)
        .join(' || ');

      let dryRunDecision = 'create_candidate';
      let manualCheckReason = '';

      if (exactNameMatches.length > 0) {
        dryRunDecision = 'same_name_review';
        manualCheckReason = '现有库已存在同名记录，需先判断是 URL 更新还是并行新源';
      } else if (confidenceResult.confidence === 'medium') {
        manualCheckReason = confidenceResult.flags.join(' / ');
      }

      const notes = [
        '来源: 招标网站.xml',
        `栏目: ${record.source_section}`,
        `轨道: ${track}`,
        sameProvinceTrackRows.length > 0
          ? `现有同省同轨记录: ${sameProvinceTrackRows.map((row) => row.name).join('、')}`
          : '现有库暂无同省同轨记录',
      ].join('；');

      const exactMatch = exactNameMatches[0] || null;

      return {
        dry_run_order: index + 1,
        source_row_no: record.row_no,
        dry_run_decision: dryRunDecision,
        name: record.site_name,
        alias_name: '',
        url: record.url,
        normalized_url: record.normalized_url,
        source_level: record.candidate_source_level,
        province: provinceNormalized === '全国' ? '全国' : provinceNormalized,
        city: '',
        track,
        platform_type: record.candidate_platform_type === '待判定' ? track : record.candidate_platform_type,
        is_official: 1,
        enabled: 1,
        validation_status: 'never_validated',
        import_confidence: confidenceResult.confidence,
        confidence_flags: confidenceResult.flags.join(' / '),
        same_province_track_count: sameProvinceTrackRows.length,
        same_province_track_names: sameProvinceTrackNames,
        exact_name_match_count: exactNameMatches.length,
        exact_name_match_id: exactMatch ? exactMatch.id : '',
        exact_name_match_name: exactMatch ? exactMatch.name : '',
        exact_name_match_url: exactMatch ? exactMatch.url : '',
        notes,
        manual_check_reason: manualCheckReason,
      };
    });

    const createRows = dryRunRows.filter((row) => row.dry_run_decision === 'create_candidate');
    const sameNameReviewRows = dryRunRows.filter((row) => row.dry_run_decision === 'same_name_review');

    const headers = [
      'dry_run_order',
      'source_row_no',
      'dry_run_decision',
      'name',
      'alias_name',
      'url',
      'normalized_url',
      'source_level',
      'province',
      'city',
      'track',
      'platform_type',
      'is_official',
      'enabled',
      'validation_status',
      'import_confidence',
      'confidence_flags',
      'same_province_track_count',
      'same_province_track_names',
      'exact_name_match_count',
      'exact_name_match_id',
      'exact_name_match_name',
      'exact_name_match_url',
      'notes',
      'manual_check_reason',
    ];

    writeCsv(OUTPUT_DRY_RUN_CSV, dryRunRows, headers);
    writeCsv(OUTPUT_REVIEW_CSV, sameNameReviewRows, headers);

    const decisionCounts = summarizeCounts(dryRunRows, 'dry_run_decision');
    const confidenceCounts = summarizeCounts(createRows, 'import_confidence');
    const trackCounts = summarizeCounts(createRows, 'track');
    const markdown = buildMarkdown({
      dryRunRows,
      createRows,
      sameNameReviewRows,
      decisionCounts,
      confidenceCounts,
      trackCounts,
    });

    fs.writeFileSync(OUTPUT_MD, markdown, 'utf8');

    console.log(
      JSON.stringify(
        {
          ok: true,
          total: dryRunRows.length,
          createCandidates: createRows.length,
          sameNameReview: sameNameReviewRows.length,
          decisionCounts,
          confidenceCounts,
          trackCounts,
          outputs: {
            dryRun: path.relative(ROOT, OUTPUT_DRY_RUN_CSV),
            review: path.relative(ROOT, OUTPUT_REVIEW_CSV),
            markdown: path.relative(ROOT, OUTPUT_MD),
          },
        },
        null,
        2
      )
    );
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
