const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INPUT_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-直接补充-同名待确认.csv');
const OUTPUT_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-同名归并建议.csv');
const OUTPUT_MD = path.join(ROOT, 'docs/analysis/招标网站-xml-同名归并建议说明.md');

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

function getHost(url) {
  try {
    return new URL(url).host;
  } catch (_error) {
    return '';
  }
}

function getPath(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname || '/'}${parsed.search || ''}`;
  } catch (_error) {
    return '';
  }
}

function getHostRelation(existingUrl, proposedUrl) {
  const existingHost = getHost(existingUrl);
  const proposedHost = getHost(proposedUrl);

  if (existingHost === proposedHost) return 'same_host';

  const existingRoot = existingHost.split('.').slice(-2).join('.');
  const proposedRoot = proposedHost.split('.').slice(-2).join('.');
  if (existingRoot && existingRoot === proposedRoot) return 'same_root_domain';
  if (/gov\.cn$/.test(existingHost) && /gov\.cn$/.test(proposedHost)) {
    return 'different_gov_host';
  }
  return 'different_host';
}

function getPathRelation(existingUrl, proposedUrl) {
  const existingPath = getPath(existingUrl);
  const proposedPath = getPath(proposedUrl);

  if (existingPath === proposedPath) return 'same_path';
  if (
    (proposedPath === '/' || proposedPath === '') &&
    existingPath &&
    existingPath !== '/' &&
    !existingPath.includes('?')
  ) {
    return 'proposed_root_simpler';
  }
  if (
    (existingPath === '/' || existingPath === '') &&
    proposedPath &&
    proposedPath !== '/'
  ) {
    return 'proposed_deeper_entry';
  }
  return 'different_path';
}

const OVERRIDES = {
  军队采购网: {
    suggested_resolution: 'candidate_update_primary_url_after_validation',
    preferred_url_candidate: 'proposed',
    confidence: 'high',
    rationale: '同名站点从 .cn 域切到 .mil.cn 域，像官方主域收敛，优先视为主 URL 更新候选',
  },
  河北省公共资源交易服务平台: {
    suggested_resolution: 'manual_verify_then_update_primary_url',
    preferred_url_candidate: 'proposed',
    confidence: 'medium',
    rationale: '同省 gov 域从 szj 子域切到 ggzy 独立子域，更像面向交易平台的主入口，但需先验证新旧关系',
  },
  辽宁政府采购网: {
    suggested_resolution: 'candidate_update_primary_url',
    preferred_url_candidate: 'proposed',
    confidence: 'high',
    rationale: '同主机下 proposed URL 收敛到根路径，优先于 portalindex 入口页，适合作为主 URL 候选',
  },
  浙江政府采购网: {
    suggested_resolution: 'manual_verify_then_update_primary_url',
    preferred_url_candidate: 'proposed',
    confidence: 'medium',
    rationale: '同名站点从旧 ccgp 域切到财政厅子域，像官方迁移，但需要先验证是否稳定可访问',
  },
  福建省政府采购网: {
    suggested_resolution: 'manual_verify_then_update_primary_url',
    preferred_url_candidate: 'proposed',
    confidence: 'medium',
    rationale: '同名站点从旧 ccgp 域切到财政厅子域，像官方迁移，但需要先验证是否稳定可访问',
  },
  河南省公共资源交易中心: {
    suggested_resolution: 'manual_verify_then_update_primary_url',
    preferred_url_candidate: 'proposed',
    confidence: 'medium',
    rationale: '同名站点从旧省级交易中心域切到发改委服务平台域，疑似主入口升级，但需先确认是否为现主站',
  },
  广西政府采购网: {
    suggested_resolution: 'manual_verify_then_update_primary_url',
    preferred_url_candidate: 'proposed',
    confidence: 'medium',
    rationale: '同名站点从旧 ccgp 域切到自治区政府 zfcg 域，像官方迁移，但应先校验再更新',
  },
};

function buildSuggestion(row) {
  const override = OVERRIDES[row.name];
  if (override) return override;

  const hostRelation = getHostRelation(row.exact_name_match_url, row.url);
  const pathRelation = getPathRelation(row.exact_name_match_url, row.url);

  if (hostRelation === 'same_host' && pathRelation === 'proposed_root_simpler') {
    return {
      suggested_resolution: 'candidate_update_primary_url',
      preferred_url_candidate: 'proposed',
      confidence: 'high',
      rationale: '同主机且 proposed URL 更简洁，适合作为主 URL 候选',
    };
  }

  if (hostRelation === 'different_gov_host') {
    return {
      suggested_resolution: 'manual_verify_then_update_primary_url',
      preferred_url_candidate: 'proposed',
      confidence: 'medium',
      rationale: '同名站点落在不同政府域，像官方迁移，但必须先验证新旧关系',
    };
  }

  return {
    suggested_resolution: 'keep_existing_add_proposed_to_notes',
    preferred_url_candidate: 'existing',
    confidence: 'medium',
    rationale: '现阶段无法仅凭 URL 形态判断主次，先保留现有 URL，再记录 proposed URL',
  };
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

function buildMarkdown(rows) {
  const now = new Date().toISOString();
  const resolutionCounts = summarizeCounts(rows, 'suggested_resolution');
  const confidenceCounts = summarizeCounts(rows, 'confidence');
  const previewRows = rows.map((row) => ({
    name: row.name,
    existing_url: row.existing_url,
    proposed_url: row.proposed_url,
    suggested_resolution: row.suggested_resolution,
    preferred_url_candidate: row.preferred_url_candidate,
    confidence: row.confidence,
  }));

  return `# 招标网站 XML 同名归并建议说明

- 输入清单：\`docs/csv/招标网站-xml-直接补充-同名待确认.csv\`
- 输出清单：\`docs/csv/招标网站-xml-同名归并建议.csv\`
- 生成时间：${now}
- 说明：本轮只做归并建议，不执行任何数据库写入

## 1. 总体结论

- 同名待确认总数：\`${rows.length}\`

## 2. 建议分布

${renderMarkdownTable(
    Object.entries(resolutionCounts).map(([suggested_resolution, count]) => ({
      suggested_resolution,
      count,
    })),
    ['suggested_resolution', 'count']
  )}

## 3. 置信度分布

${renderMarkdownTable(
    Object.entries(confidenceCounts).map(([confidence, count]) => ({
      confidence,
      count,
    })),
    ['confidence', 'count']
  )}

## 4. 逐条建议

${renderMarkdownTable(previewRows, [
    'name',
    'existing_url',
    'proposed_url',
    'suggested_resolution',
    'preferred_url_candidate',
    'confidence',
  ])}

## 5. 执行建议

1. \`candidate_update_primary_url\` 可以优先纳入最终 dry-run 变更表。
2. \`candidate_update_primary_url_after_validation\` 和 \`manual_verify_then_update_primary_url\` 先做人工点验或在线校验，再决定是否改主 URL。
3. 这 7 条不建议作为“新增站点”处理，应统一并入归并阶段。
`;
}

function main() {
  const rows = parseCsv(fs.readFileSync(INPUT_CSV, 'utf8'));

  const outputRows = rows.map((row, index) => {
    const suggestion = buildSuggestion(row);
    const existingUrl = row.exact_name_match_url;
    const proposedUrl = row.url;

    return {
      review_order: index + 1,
      name: row.name,
      province: row.province,
      existing_url: existingUrl,
      proposed_url: proposedUrl,
      existing_host: getHost(existingUrl),
      proposed_host: getHost(proposedUrl),
      host_relation: getHostRelation(existingUrl, proposedUrl),
      path_relation: getPathRelation(existingUrl, proposedUrl),
      suggested_resolution: suggestion.suggested_resolution,
      preferred_url_candidate: suggestion.preferred_url_candidate,
      confidence: suggestion.confidence,
      rationale: suggestion.rationale,
      suggested_notes_append: `XML 新源同名候选 URL: ${proposedUrl}`,
      next_step: /validation|verify/.test(suggestion.suggested_resolution)
        ? '先做人工点验或在线校验'
        : '可并入最终 dry-run 变更表',
    };
  });

  const headers = [
    'review_order',
    'name',
    'province',
    'existing_url',
    'proposed_url',
    'existing_host',
    'proposed_host',
    'host_relation',
    'path_relation',
    'suggested_resolution',
    'preferred_url_candidate',
    'confidence',
    'rationale',
    'suggested_notes_append',
    'next_step',
  ];

  writeCsv(OUTPUT_CSV, outputRows, headers);
  fs.writeFileSync(OUTPUT_MD, buildMarkdown(outputRows), 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        total: outputRows.length,
        resolutionCounts: summarizeCounts(outputRows, 'suggested_resolution'),
        confidenceCounts: summarizeCounts(outputRows, 'confidence'),
        outputs: {
          csv: path.relative(ROOT, OUTPUT_CSV),
          markdown: path.relative(ROOT, OUTPUT_MD),
        },
      },
      null,
      2
    )
  );
}

main();
