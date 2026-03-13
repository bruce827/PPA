const fs = require('fs');
const path = require('path');
const sqlite3 = require('../server/node_modules/sqlite3').verbose();

const ROOT = path.resolve(__dirname, '..');
const INPUT_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-结构化清单.csv');
const DB_PATH = path.join(ROOT, 'server/ppa.db');
const OUTPUT_DIFF_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-差异清单.csv');
const OUTPUT_ADD_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-直接补充候选.csv');
const OUTPUT_MERGE_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-疑似归并清单.csv');
const OUTPUT_REVIEW_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-review-二轮分组.csv');
const OUTPUT_MD = path.join(ROOT, 'docs/analysis/招标网站-xml-差异分析与二轮审查建议.md');

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

function normalizePathForSoftKey(pathname) {
  if (!pathname || pathname === '/') return '';
  return pathname.replace(/\/+$/, '');
}

function getSoftKeyFromUrl(rawUrl) {
  if (!rawUrl) return '';

  try {
    const parsed = new URL(rawUrl);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    const hasDefaultPort =
      (protocol === 'http:' && parsed.port === '80') ||
      (protocol === 'https:' && parsed.port === '443');
    const port = parsed.port && !hasDefaultPort ? `:${parsed.port}` : '';
    const pathname = normalizePathForSoftKey(parsed.pathname);
    return `${hostname}${port}${pathname}`;
  } catch (_error) {
    return String(rawUrl).trim().toLowerCase();
  }
}

function normalizeProvince(value) {
  if (!value) return '';

  const direct = {
    北京: '北京',
    北京市: '北京',
    上海: '上海',
    上海市: '上海',
    天津: '天津',
    天津市: '天津',
    重庆: '重庆',
    重庆市: '重庆',
    内蒙古: '内蒙古',
    内蒙古自治区: '内蒙古',
    广西: '广西',
    广西壮族自治区: '广西',
    西藏: '西藏',
    西藏自治区: '西藏',
    宁夏: '宁夏',
    宁夏回族自治区: '宁夏',
    新疆: '新疆',
    新疆维吾尔自治区: '新疆',
    兵团: '兵团',
    新疆生产建设兵团: '兵团',
    香港: '香港',
    香港特别行政区: '香港',
    澳门: '澳门',
    澳门特别行政区: '澳门',
    台湾: '台湾',
  };

  if (direct[value]) return direct[value];

  return String(value)
    .replace(/省$|市$|自治区$|特别行政区$/g, '')
    .trim();
}

function detectReviewBucket(record) {
  const text = `${record.site_name || ''} ${record.platform_type || ''}`.toLowerCase();
  const cloudLike =
    /政采云|苏采云|徽采云|乐采云|云平台|采云/.test(record.site_name || '') ||
    /zcygov\.cn|gpmall-main-web|mall\./i.test(record.url || '');

  if (record.candidate_action === 'exclude') {
    return 'exclude_noise';
  }

  if (cloudLike) {
    return 'cloud_platform_variant';
  }

  if (record.candidate_action === 'keep') {
    return 'main_site_candidate';
  }

  if (record.source_section === '企业招标采购平台') {
    if (/招标|招投标|投标|交易/.test(record.site_name)) {
      return 'enterprise_bidding_platform';
    }
    if (/采购|采办|供应链|电子商务|商城|物资|阳光采购|招采/.test(record.site_name)) {
      return 'enterprise_procurement_platform';
    }
    if (/ecp|ebid|ebuy|eps|esp/.test(text)) {
      return 'enterprise_procurement_platform';
    }
    return 'enterprise_other_platform';
  }

  if (record.source_section === '第三方交易平台') {
    if (/监督平台|监管平台|行政监督/.test(record.site_name)) {
      return 'third_party_regulatory_noise';
    }
    return 'third_party_trading_platform';
  }

  return 'other_review';
}

function getRecommendedBatch(record, dbMatchType, reviewBucket) {
  if (record.candidate_action === 'exclude' || reviewBucket === 'exclude_noise') {
    return 'E-排除';
  }

  if (dbMatchType === 'strict_match' || dbMatchType === 'soft_match') {
    return 'B-现有库归并';
  }

  if (reviewBucket === 'cloud_platform_variant') {
    return 'C-企业招投标与云平台审查';
  }

  if (record.candidate_action === 'keep') {
    return 'A-直接补充主站';
  }

  if (
    reviewBucket === 'enterprise_bidding_platform' ||
    reviewBucket === 'cloud_platform_variant'
  ) {
    return 'C-企业招投标与云平台审查';
  }

  return 'D-企业采购与第三方待定';
}

function getRecommendedAction(record, dbMatchType, reviewBucket) {
  if (record.candidate_action === 'exclude' || reviewBucket === 'exclude_noise') {
    return 'exclude';
  }

  if (dbMatchType === 'strict_match') {
    return 'merge_strict_match';
  }

  if (dbMatchType === 'soft_match') {
    return 'merge_soft_match';
  }

  if (
    reviewBucket === 'enterprise_bidding_platform' ||
    reviewBucket === 'cloud_platform_variant'
  ) {
    return 'manual_review_high';
  }

  if (record.candidate_action === 'keep') {
    return 'add_candidate';
  }

  if (reviewBucket === 'enterprise_procurement_platform') {
    return 'manual_review_medium';
  }

  if (reviewBucket === 'third_party_trading_platform') {
    return 'manual_review_low';
  }

  if (reviewBucket === 'third_party_regulatory_noise') {
    return 'exclude_candidate';
  }

  return 'manual_review';
}

function pickExistingMatch(record, strictMatches, softMatches) {
  const sameProvinceStrict = strictMatches.find(
    (item) => normalizeProvince(item.province) === normalizeProvince(record.province)
  );
  if (sameProvinceStrict) {
    return { matchType: 'strict_match', matches: strictMatches, chosen: sameProvinceStrict };
  }
  if (strictMatches.length > 0) {
    return { matchType: 'strict_match', matches: strictMatches, chosen: strictMatches[0] };
  }

  const sameProvinceSoft = softMatches.find(
    (item) => normalizeProvince(item.province) === normalizeProvince(record.province)
  );
  if (sameProvinceSoft) {
    return { matchType: 'soft_match', matches: softMatches, chosen: sameProvinceSoft };
  }
  if (softMatches.length > 0) {
    return { matchType: 'soft_match', matches: softMatches, chosen: softMatches[0] };
  }

  return { matchType: 'no_match', matches: [], chosen: null };
}

function summarizeCounts(rows, key) {
  return rows.reduce((accumulator, row) => {
    const value = row[key] || '(empty)';
    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});
}

function renderMarkdownTable(rows, headers) {
  if (!rows.length) {
    return '_无_';
  }

  const head = `| ${headers.join(' | ')} |`;
  const divider = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${headers.map((header) => row[header] ?? '').join(' | ')} |`);
  return [head, divider, ...body].join('\n');
}

function buildAnalysisMarkdown({
  diffRows,
  directAddRows,
  mergeRows,
  reviewRows,
  batchCounts,
  matchCounts,
  reviewBucketCounts,
  topAddRows,
  topMergeRows,
  topReviewRows,
}) {
  const now = new Date().toISOString();

  return `# 招标网站 XML 差异分析与二轮审查建议

- 数据源：\`docs/招标网站.xml\`
- 底稿：\`docs/csv/招标网站-xml-结构化清单.csv\`
- 差异清单：\`docs/csv/招标网站-xml-差异清单.csv\`
- 直接补充候选：\`docs/csv/招标网站-xml-直接补充候选.csv\`
- 疑似归并清单：\`docs/csv/招标网站-xml-疑似归并清单.csv\`
- review 二轮分组：\`docs/csv/招标网站-xml-review-二轮分组.csv\`
- 生成时间：${now}
- 说明：本轮仅做只读分析，不执行任何数据库写入

## 1. 总体结论

- XML 结构化记录总数：\`${diffRows.length}\`
- 可直接补充候选：\`${directAddRows.length}\`
- 疑似归并项：\`${mergeRows.length}\`
- review 二轮审查项：\`${reviewRows.length}\`

## 2. 与现有库匹配情况

${renderMarkdownTable(
    Object.entries(matchCounts).map(([matchType, count]) => ({
      matchType,
      count,
    })),
    ['matchType', 'count']
  )}

说明：

- \`strict_match\`：按当前模块的正式 \`normalized_url\` 命中现有库
- \`soft_match\`：忽略 \`http/https\` 与根路径尾斜杠差异后命中现有库
- \`no_match\`：现有库未覆盖

## 3. 建议批次

${renderMarkdownTable(
    Object.entries(batchCounts).map(([batch, count]) => ({
      batch,
      count,
    })),
    ['batch', 'count']
  )}

## 4. review 二轮分组

${renderMarkdownTable(
    Object.entries(reviewBucketCounts).map(([reviewBucket, count]) => ({
      reviewBucket,
      count,
    })),
    ['reviewBucket', 'count']
  )}

## 5. 可直接补充候选（前 20）

${renderMarkdownTable(topAddRows, [
    'site_name',
    'province',
    'source_section',
    'platform_type',
    'recommended_batch',
  ])}

## 6. 疑似归并清单（前 20）

${renderMarkdownTable(topMergeRows, [
    'site_name',
    'province',
    'db_match_type',
    'existing_name',
    'existing_url',
    'recommended_action',
  ])}

## 7. 二轮优先审查项（前 20）

${renderMarkdownTable(topReviewRows, [
    'site_name',
    'source_section',
    'review_bucket',
    'recommended_action',
    'action_reason',
  ])}

## 8. 执行建议

1. 先只处理 \`A-直接补充主站\`，这批风险最低。
2. 再处理 \`B-现有库归并\`，主要修正同站不同写法、名称别名和现有库覆盖关系。
3. \`C-企业招投标与云平台审查\` 单独复核，不和第三方平台混做。
4. \`D-企业采购与第三方待定\` 暂不直接导入，除非你明确放宽主库口径。
5. \`E-排除\` 继续保持排除，不进入当前招标网站主库。
`;
}

async function main() {
  const csvText = fs.readFileSync(INPUT_CSV, 'utf8');
  const xmlRows = parseCsv(csvText);
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  try {
    const existingRows = await allAsync(
      db,
      `SELECT id, name, alias_name, url, normalized_url, source_level, province, city, platform_type
       FROM opportunity_bidding_sites
       ORDER BY id ASC`
    );

    const strictMap = new Map();
    const softMap = new Map();

    existingRows.forEach((row) => {
      const strictKey = row.normalized_url || '';
      const softKey = getSoftKeyFromUrl(row.url || row.normalized_url || '');

      if (strictKey) {
        strictMap.set(strictKey, [...(strictMap.get(strictKey) || []), row]);
      }
      if (softKey) {
        softMap.set(softKey, [...(softMap.get(softKey) || []), row]);
      }
    });

    const diffRows = xmlRows.map((record) => {
      const reviewBucket = detectReviewBucket(record);
      const effectiveSoftKey = getSoftKeyFromUrl(record.url || record.normalized_url || '');
      const strictMatches = strictMap.get(record.normalized_url) || [];
      const softMatches = softMap.get(effectiveSoftKey) || [];
      const picked = pickExistingMatch(record, strictMatches, softMatches);
      const recommendedBatch = getRecommendedBatch(record, picked.matchType, reviewBucket);
      const recommendedAction = getRecommendedAction(record, picked.matchType, reviewBucket);

      return {
        ...record,
        effective_soft_match_key: effectiveSoftKey,
        review_bucket: reviewBucket,
        db_match_type: picked.matchType,
        db_match_count: picked.matches.length,
        existing_id: picked.chosen ? picked.chosen.id : '',
        existing_name: picked.chosen ? picked.chosen.name : '',
        existing_url: picked.chosen ? picked.chosen.url : '',
        existing_normalized_url: picked.chosen ? picked.chosen.normalized_url : '',
        existing_source_level: picked.chosen ? picked.chosen.source_level : '',
        existing_platform_type: picked.chosen ? picked.chosen.platform_type : '',
        recommended_batch: recommendedBatch,
        recommended_action: recommendedAction,
      };
    });

    const diffHeaders = [
      'row_no',
      'source_section',
      'province',
      'site_name',
      'url',
      'normalized_url',
      'soft_match_key',
      'effective_soft_match_key',
      'candidate_source_level',
      'candidate_platform_type',
      'candidate_action',
      'action_reason',
      'xml_strict_url_dup_count',
      'xml_name_dup_count',
      'xml_soft_dup_count',
      'review_bucket',
      'db_match_type',
      'db_match_count',
      'existing_id',
      'existing_name',
      'existing_url',
      'existing_normalized_url',
      'existing_source_level',
      'existing_platform_type',
      'recommended_batch',
      'recommended_action',
    ];

    const directAddRows = diffRows.filter(
      (row) => row.recommended_batch === 'A-直接补充主站' && row.recommended_action === 'add_candidate'
    );
    const mergeRows = diffRows.filter((row) =>
      ['merge_strict_match', 'merge_soft_match'].includes(row.recommended_action)
    );
    const reviewRows = diffRows.filter((row) =>
      row.recommended_batch === 'C-企业招投标与云平台审查' ||
      row.recommended_batch === 'D-企业采购与第三方待定'
    );

    writeCsv(OUTPUT_DIFF_CSV, diffRows, diffHeaders);
    writeCsv(OUTPUT_ADD_CSV, directAddRows, diffHeaders);
    writeCsv(OUTPUT_MERGE_CSV, mergeRows, diffHeaders);
    writeCsv(OUTPUT_REVIEW_CSV, reviewRows, diffHeaders);

    const batchCounts = summarizeCounts(diffRows, 'recommended_batch');
    const matchCounts = summarizeCounts(diffRows, 'db_match_type');
    const reviewBucketCounts = summarizeCounts(reviewRows, 'review_bucket');

    const topAddRows = directAddRows.slice(0, 20).map((row) => ({
      site_name: row.site_name,
      province: row.province,
      source_section: row.source_section,
      platform_type: row.candidate_platform_type,
      recommended_batch: row.recommended_batch,
    }));
    const topMergeRows = mergeRows.slice(0, 20).map((row) => ({
      site_name: row.site_name,
      province: row.province,
      db_match_type: row.db_match_type,
      existing_name: row.existing_name,
      existing_url: row.existing_url,
      recommended_action: row.recommended_action,
    }));
    const topReviewRows = reviewRows.slice(0, 20).map((row) => ({
      site_name: row.site_name,
      source_section: row.source_section,
      review_bucket: row.review_bucket,
      recommended_action: row.recommended_action,
      action_reason: row.action_reason,
    }));

    const markdown = buildAnalysisMarkdown({
      diffRows,
      directAddRows,
      mergeRows,
      reviewRows,
      batchCounts,
      matchCounts,
      reviewBucketCounts,
      topAddRows,
      topMergeRows,
      topReviewRows,
    });
    fs.writeFileSync(OUTPUT_MD, markdown, 'utf8');

    console.log(
      JSON.stringify(
        {
          ok: true,
          diffRows: diffRows.length,
          directAddRows: directAddRows.length,
          mergeRows: mergeRows.length,
          reviewRows: reviewRows.length,
          batchCounts,
          matchCounts,
          reviewBucketCounts,
          outputs: {
            diff: path.relative(ROOT, OUTPUT_DIFF_CSV),
            add: path.relative(ROOT, OUTPUT_ADD_CSV),
            merge: path.relative(ROOT, OUTPUT_MERGE_CSV),
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
