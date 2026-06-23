const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VALIDATION_DIR = path.join(ROOT, 'docs', 'validation');
const ANALYSIS_DIR = path.join(ROOT, 'docs', 'analysis');
const CSV_DIR = path.join(ROOT, 'docs', 'csv');
const REPORT_DATE = new Date().toISOString().slice(0, 10);

function toCsvValue(value) {
  if (value === null || typeof value === 'undefined') return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.map(toCsvValue).join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => toCsvValue(row[column])).join(','));
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function countBy(items, key) {
  const result = new Map();
  for (const item of items) {
    const value = item[key] || '';
    result.set(value, (result.get(value) || 0) + 1);
  }
  return [...result.entries()].sort((a, b) => b[1] - a[1]);
}

function loadBatchResults() {
  const files = fs
    .readdirSync(VALIDATION_DIR)
    .filter((name) => /^招标网站-url校验-batch-\d+\.json$/.test(name))
    .sort();

  const rows = [];
  const fileNames = [];

  for (const fileName of files) {
    const filePath = path.join(VALIDATION_DIR, fileName);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    rows.push(...(data.results || []));
    fileNames.push(fileName);
  }

  return { files: fileNames, rows };
}

function renderTopTable(rows) {
  if (rows.length === 0) return '无';

  return rows
    .map(
      (row) =>
        `- \`${row.name}\`  \n  URL: \`${row.url}\`  \n  问题: \`${row.issue_type}\`  \n  说明: ${row.issue_summary}`
    )
    .join('\n');
}

function main() {
  fs.mkdirSync(ANALYSIS_DIR, { recursive: true });
  fs.mkdirSync(CSV_DIR, { recursive: true });

  const { files, rows } = loadBatchResults();
  if (rows.length === 0) {
    throw new Error('未找到批量校验结果，请先运行 validate-bidding-sites-probe-batch.js');
  }

  const statusCounts = countBy(rows, 'status');
  const issueCounts = countBy(rows, 'issue_type');
  const hardProblems = rows
    .filter((row) => row.status === 'validated_failed')
    .sort((a, b) => {
      const statusA = a.http_status === null || typeof a.http_status === 'undefined' ? -1 : a.http_status;
      const statusB = b.http_status === null || typeof b.http_status === 'undefined' ? -1 : b.http_status;
      if (a.issue_type !== b.issue_type) return a.issue_type.localeCompare(b.issue_type, 'zh-CN');
      return statusA - statusB;
    });
  const authGateRows = rows.filter((row) => row.issue_type === 'auth_gate');
  const crossHostRows = rows.filter((row) => row.issue_type === 'cross_host_redirect');
  const nonBiddingRows = rows.filter((row) => row.issue_type === 'non_bidding_content');

  const hardProblemCsv = path.join(CSV_DIR, `招标网站-url-明显问题清单-${REPORT_DATE}.csv`);
  const attentionCsv = path.join(CSV_DIR, `招标网站-url-需关注清单-${REPORT_DATE}.csv`);
  const reportPath = path.join(ANALYSIS_DIR, `招标网站-url校验结果汇总-${REPORT_DATE}.md`);

  writeCsv(
    hardProblemCsv,
    hardProblems,
    [
      'id',
      'name',
      'source_level',
      'platform_type',
      'url',
      'status',
      'http_status',
      'final_url',
      'issue_type',
      'severity',
      'issue_summary',
    ]
  );

  writeCsv(
    attentionCsv,
    [...crossHostRows, ...authGateRows, ...nonBiddingRows],
    [
      'id',
      'name',
      'source_level',
      'platform_type',
      'url',
      'status',
      'http_status',
      'final_url',
      'issue_type',
      'severity',
      'issue_summary',
    ]
  );

  const issueCountLines = issueCounts.map(([key, value]) => `- \`${key}\`: \`${value}\``).join('\n');
  const statusCountLines = statusCounts.map(([key, value]) => `- \`${key}\`: \`${value}\``).join('\n');
  const hardTypeLines = countBy(hardProblems, 'issue_type')
    .map(([key, value]) => `- \`${key}\`: \`${value}\``)
    .join('\n');

  const report = `# 招标网站 URL 校验结果汇总

日期：${REPORT_DATE}

## 1. 校验方式

- 校验对象：\`opportunity_bidding_sites\` 当前全部 \`${rows.length}\` 条记录
- 校验模式：真实网络 \`probe_only\`
- 未调用 AI，只做 URL 探测、跳转追踪、编码解码、登录特征识别、启发式判断
- 批次文件：${files.map((name) => `\`${name}\``).join('、')}

## 2. 总体结果

状态分布：

${statusCountLines}

问题类型分布：

${issueCountLines}

结论摘要：

- 明显 URL 有问题的记录：\`${hardProblems.length}\`
- 需要登录/认证门槛的记录：\`${authGateRows.length}\`
- 发生跨主机跳转的记录：\`${crossHostRows.length}\`
- 内容不像招标/采购站点的记录：\`${nonBiddingRows.length}\`

## 3. 明显 URL 有问题

这部分主要包含：

${hardTypeLines}

完整清单见：

- [招标网站-url-明显问题清单-${REPORT_DATE}.csv](${hardProblemCsv})

代表性问题样例：

${renderTopTable(hardProblems.slice(0, 20))}

## 4. 需要关注但不一定是坏链

这部分不直接判定为“坏 URL”，但需要业务确认：

- \`auth_gate\`：站点能打开，但页面有明显登录/统一认证特征
- \`cross_host_redirect\`：录入 URL 会跳到另一个主机，可能说明主地址应调整
- \`non_bidding_content\`：页面可访问，但当前启发式识别不像典型招标/采购/公共资源站

完整清单见：

- [招标网站-url-需关注清单-${REPORT_DATE}.csv](${attentionCsv})

跨主机跳转名单：

${renderTopTable(crossHostRows)}

## 5. 建议处理顺序

1. 先处理 \`${hardProblems.length}\` 条明显问题 URL
2. 再复核 \`${crossHostRows.length}\` 条跨主机跳转，决定是否更新主 URL
3. 最后按业务需要审查 \`${authGateRows.length}\` 条需要登录的站点，以及 \`${nonBiddingRows.length}\` 条内容识别偏弱的站点
`;

  fs.writeFileSync(reportPath, report, 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        rows: rows.length,
        hardProblemCount: hardProblems.length,
        authGateCount: authGateRows.length,
        crossHostCount: crossHostRows.length,
        nonBiddingCount: nonBiddingRows.length,
        outputs: {
          report: reportPath,
          hardProblemCsv,
          attentionCsv,
        },
      },
      null,
      2
    )
  );
}

main();
