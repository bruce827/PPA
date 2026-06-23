const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIRECT_ADD_INPUT = path.join(ROOT, 'docs/csv/招标网站-xml-直接补充-dry-run.csv');
const SAME_NAME_INPUT = path.join(ROOT, 'docs/csv/招标网站-xml-同名归并建议.csv');
const OUTPUT_FINAL_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-最终dry-run变更表.csv');
const OUTPUT_VALIDATE_CSV = path.join(ROOT, 'docs/csv/招标网站-xml-待在线校验后再变更.csv');
const OUTPUT_MD = path.join(ROOT, 'docs/analysis/招标网站-xml-最终dry-run执行包说明.md');

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

function buildMarkdown({ finalRows, validateRows, actionCounts, confidenceCounts }) {
  const now = new Date().toISOString();
  const finalPreview = finalRows.slice(0, 20).map((row) => ({
    execution_order: row.execution_order,
    operation_type: row.operation_type,
    name: row.name,
    province: row.province,
    final_target_url: row.final_target_url,
    confidence: row.confidence,
  }));
  const validatePreview = validateRows.slice(0, 20).map((row) => ({
    name: row.name,
    existing_url: row.existing_url,
    proposed_url: row.proposed_url,
    suggested_resolution: row.suggested_resolution,
    confidence: row.confidence,
  }));

  return `# 招标网站 XML 最终 Dry Run 执行包说明

- 输入 1：\`docs/csv/招标网站-xml-直接补充-dry-run.csv\`
- 输入 2：\`docs/csv/招标网站-xml-同名归并建议.csv\`
- 输出 1：\`docs/csv/招标网站-xml-最终dry-run变更表.csv\`
- 输出 2：\`docs/csv/招标网站-xml-待在线校验后再变更.csv\`
- 生成时间：${now}
- 说明：本轮只生成最终 dry-run 执行包，不执行任何数据库写入

## 1. 总体结论

- 可直接进入最终 dry-run 变更表：\`${finalRows.length}\`
- 需在线校验后再变更：\`${validateRows.length}\`

## 2. 最终 dry-run 动作分布

${renderMarkdownTable(
    Object.entries(actionCounts).map(([operation_type, count]) => ({
      operation_type,
      count,
    })),
    ['operation_type', 'count']
  )}

## 3. 最终 dry-run 置信度分布

${renderMarkdownTable(
    Object.entries(confidenceCounts).map(([confidence, count]) => ({
      confidence,
      count,
    })),
    ['confidence', 'count']
  )}

## 4. 最终 dry-run 变更表（前 20）

${renderMarkdownTable(finalPreview, [
    'execution_order',
    'operation_type',
    'name',
    'province',
    'final_target_url',
    'confidence',
  ])}

## 5. 待在线校验后再变更（前 20）

${renderMarkdownTable(validatePreview, [
    'name',
    'existing_url',
    'proposed_url',
    'suggested_resolution',
    'confidence',
  ])}

## 6. 执行建议

1. 先执行 \`create\`，再执行 \`update_primary_url\`。
2. \`待在线校验后再变更\` 这 6 条不要直接入最终变更表。
3. 最终写库前，再加一版真实校验结果回填即可进入实施。
`;
}

function main() {
  const directAddRows = parseCsv(fs.readFileSync(DIRECT_ADD_INPUT, 'utf8'));
  const sameNameRows = parseCsv(fs.readFileSync(SAME_NAME_INPUT, 'utf8'));

  const finalRows = [];

  directAddRows
    .filter((row) => row.dry_run_decision === 'create_candidate')
    .forEach((row) => {
      finalRows.push({
        execution_order: finalRows.length + 1,
        operation_type: 'create',
        source: 'direct_add_dry_run',
        name: row.name,
        province: row.province,
        source_level: row.source_level,
        track: row.track,
        platform_type: row.platform_type,
        final_target_url: row.url,
        current_url: '',
        confidence: row.import_confidence,
        rationale: row.notes,
        precheck_requirement: row.manual_check_reason || '',
      });
    });

  sameNameRows
    .filter((row) => row.suggested_resolution === 'candidate_update_primary_url')
    .forEach((row) => {
      finalRows.push({
        execution_order: finalRows.length + 1,
        operation_type: 'update_primary_url',
        source: 'same_name_merge_review',
        name: row.name,
        province: row.province,
        source_level: '',
        track: '',
        platform_type: '',
        final_target_url: row.proposed_url,
        current_url: row.existing_url,
        confidence: row.confidence,
        rationale: row.rationale,
        precheck_requirement: '',
      });
    });

  const validateRows = sameNameRows.filter((row) =>
    ['candidate_update_primary_url_after_validation', 'manual_verify_then_update_primary_url'].includes(
      row.suggested_resolution
    )
  );

  const finalHeaders = [
    'execution_order',
    'operation_type',
    'source',
    'name',
    'province',
    'source_level',
    'track',
    'platform_type',
    'current_url',
    'final_target_url',
    'confidence',
    'rationale',
    'precheck_requirement',
  ];

  writeCsv(OUTPUT_FINAL_CSV, finalRows, finalHeaders);
  writeCsv(
    OUTPUT_VALIDATE_CSV,
    validateRows,
    [
      'review_order',
      'name',
      'province',
      'existing_url',
      'proposed_url',
      'suggested_resolution',
      'preferred_url_candidate',
      'confidence',
      'rationale',
      'next_step',
    ]
  );

  const markdown = buildMarkdown({
    finalRows,
    validateRows,
    actionCounts: summarizeCounts(finalRows, 'operation_type'),
    confidenceCounts: summarizeCounts(finalRows, 'confidence'),
  });
  fs.writeFileSync(OUTPUT_MD, markdown, 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        finalRows: finalRows.length,
        validateRows: validateRows.length,
        actionCounts: summarizeCounts(finalRows, 'operation_type'),
        confidenceCounts: summarizeCounts(finalRows, 'confidence'),
        outputs: {
          finalCsv: path.relative(ROOT, OUTPUT_FINAL_CSV),
          validateCsv: path.relative(ROOT, OUTPUT_VALIDATE_CSV),
          markdown: path.relative(ROOT, OUTPUT_MD),
        },
      },
      null,
      2
    )
  );
}

main();
