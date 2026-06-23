const fs = require('fs');
const path = require('path');

const db = require('../server/utils/db');
const biddingSiteModel = require('../server/models/biddingSiteModel');
const validationService = require('../server/services/biddingSiteValidationService');

const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'validation');

function parseArgs(argv) {
  const args = {
    offset: 0,
    limit: 50,
    concurrency: 4,
    onlyEnabled: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--offset' && next) {
      args.offset = Math.max(parseInt(next, 10) || 0, 0);
      i += 1;
      continue;
    }

    if (arg === '--limit' && next) {
      args.limit = Math.max(parseInt(next, 10) || 50, 1);
      i += 1;
      continue;
    }

    if (arg === '--concurrency' && next) {
      args.concurrency = Math.min(Math.max(parseInt(next, 10) || 4, 1), 10);
      i += 1;
      continue;
    }

    if (arg === '--include-disabled') {
      args.onlyEnabled = false;
    }
  }

  return args;
}

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

function buildErrorProbe(site, error) {
  return {
    ok: false,
    explicit_failure: true,
    status_code: null,
    final_url: site.url,
    redirect_chain: [],
    title: '',
    snippet: '',
    charset: '',
    content_type: '',
    body_truncated: false,
    has_auth_marker: false,
    error_message: error.message || '网络探测失败',
  };
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (_error) {
    return '';
  }
}

function classifyIssue(site, probeResult, heuristicResult) {
  const summary = probeResult.error_message || heuristicResult.summary || '';
  const finalHost = safeHostname(probeResult.final_url || '');
  const originalHost = safeHostname(site.url);
  const crossHostRedirect =
    finalHost && originalHost && finalHost !== originalHost && probeResult.ok;

  if (!probeResult.ok) {
    const message = String(summary).toLowerCase();
    if (/超时/.test(summary)) {
      return {
        obvious_problem: true,
        severity: 'high',
        issue_type: 'timeout',
        issue_summary: summary,
      };
    }
    if (/enotfound|eai_again|getaddrinfo|name or service not known/.test(message)) {
      return {
        obvious_problem: true,
        severity: 'high',
        issue_type: 'dns_error',
        issue_summary: summary,
      };
    }
    if (/certificate|ssl|tls/.test(message)) {
      return {
        obvious_problem: true,
        severity: 'high',
        issue_type: 'ssl_error',
        issue_summary: summary,
      };
    }
    if (probeResult.status_code === 404 || probeResult.status_code === 410) {
      return {
        obvious_problem: true,
        severity: 'high',
        issue_type: 'http_not_found',
        issue_summary: `${probeResult.status_code} 页面不存在`,
      };
    }
    if (probeResult.status_code >= 500) {
      return {
        obvious_problem: true,
        severity: 'high',
        issue_type: 'http_server_error',
        issue_summary: `${probeResult.status_code} 服务端错误`,
      };
    }
    return {
      obvious_problem: true,
      severity: 'high',
      issue_type: 'network_error',
      issue_summary: summary || '网络探测失败',
    };
  }

  if (probeResult.status_code === 401 || probeResult.status_code === 403) {
    return {
      obvious_problem: true,
      severity: 'medium',
      issue_type: 'auth_gate',
      issue_summary: `HTTP ${probeResult.status_code}，疑似需要登录或授权`,
    };
  }

  if (heuristicResult.auth_required === true) {
    return {
      obvious_problem: true,
      severity: 'medium',
      issue_type: 'auth_gate',
      issue_summary: summary || '页面存在明显登录或认证特征',
    };
  }

  if (crossHostRedirect) {
    return {
      obvious_problem: true,
      severity: 'medium',
      issue_type: 'cross_host_redirect',
      issue_summary: `跳转到不同主机: ${finalHost}`,
    };
  }

  if (heuristicResult.is_bidding_site === false) {
    return {
      obvious_problem: true,
      severity: 'medium',
      issue_type: 'non_bidding_content',
      issue_summary: summary || '页面内容不像招标/采购/公共资源类站点',
    };
  }

  if ((probeResult.redirect_chain || []).length > 3) {
    return {
      obvious_problem: true,
      severity: 'medium',
      issue_type: 'too_many_redirects',
      issue_summary: `跳转次数过多: ${(probeResult.redirect_chain || []).length - 1} 次`,
    };
  }

  return {
    obvious_problem: false,
    severity: 'none',
    issue_type: 'ok',
    issue_summary: summary || '可访问',
  };
}

function buildValidationUpdate(site, probeResult, heuristicResult, issue) {
  const validationPayload = {
    mode: 'probe_only',
    site: {
      id: site.id,
      name: site.name,
      url: site.url,
      normalized_url: site.normalized_url,
    },
    probe: probeResult,
    heuristic: heuristicResult,
    issue,
  };

  return {
    validation_status: probeResult.ok ? 'heuristic_only' : 'validated_failed',
    validation_summary:
      probeResult.ok
        ? heuristicResult.summary || issue.issue_summary || '已完成 URL 探测'
        : issue.issue_summary || probeResult.error_message || 'URL 探测失败',
    auth_required: probeResult.ok ? heuristicResult.auth_required : null,
    is_bidding_site: probeResult.ok ? heuristicResult.is_bidding_site : null,
    http_status: probeResult.status_code,
    final_url: probeResult.final_url || site.url,
    redirect_chain_json: JSON.stringify(probeResult.redirect_chain || []),
    validation_confidence: probeResult.ok ? heuristicResult.confidence : null,
    validation_payload_json: JSON.stringify(validationPayload),
    last_validated_at: new Date().toISOString(),
  };
}

async function probeAndPersist(site) {
  let probeResult;
  try {
    probeResult = await validationService.probeUrl(site.url);
  } catch (error) {
    probeResult = buildErrorProbe(site, error);
  }

  const heuristicResult = probeResult.ok
    ? validationService.buildHeuristicResult(site, probeResult)
    : {
        auth_required: null,
        is_bidding_site: null,
        confidence: null,
        summary: probeResult.error_message || '网络探测失败',
        keyword_hits: [],
      };

  const issue = classifyIssue(site, probeResult, heuristicResult);
  const update = buildValidationUpdate(site, probeResult, heuristicResult, issue);

  await biddingSiteModel.updateValidationResult(site.id, update);

  return {
    id: site.id,
    name: site.name,
    source_level: site.source_level,
    platform_type: site.platform_type,
    url: site.url,
    status: update.validation_status,
    http_status: update.http_status,
    final_url: update.final_url,
    redirect_count: (probeResult.redirect_chain || []).length > 0
      ? (probeResult.redirect_chain || []).length - 1
      : 0,
    auth_required: update.auth_required,
    is_bidding_site: update.is_bidding_site,
    issue_type: issue.issue_type,
    severity: issue.severity,
    obvious_problem: issue.obvious_problem ? 'yes' : 'no',
    issue_summary: issue.issue_summary,
  };
}

async function runPool(items, concurrency, iterator) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= items.length) return;
      results[current] = await iterator(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await db.init();
  await biddingSiteModel.ensureSchema();

  const whereClause = args.onlyEnabled ? 'WHERE enabled = 1' : '';
  const sites = await db.all(
    `SELECT * FROM opportunity_bidding_sites ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`,
    [args.limit, args.offset]
  );

  const totalRow = await db.get(
    `SELECT COUNT(1) AS total FROM opportunity_bidding_sites ${whereClause}`
  );

  const startedAt = new Date();
  const startedAtIso = startedAt.toISOString();
  const batchIndex = Math.floor(args.offset / args.limit) + 1;
  const batchLabel = `batch-${String(batchIndex).padStart(3, '0')}`;

  const results = await runPool(sites, args.concurrency, async (site, index) => {
    const result = await probeAndPersist(site);
    console.log(
      JSON.stringify({
        batch: batchLabel,
        progress: `${index + 1}/${sites.length}`,
        id: result.id,
        name: result.name,
        issue_type: result.issue_type,
        status: result.status,
      })
    );
    return result;
  });

  const obviousProblems = results.filter((item) => item.obvious_problem === 'yes');
  const failed = results.filter((item) => item.status === 'validated_failed');
  const authGate = results.filter((item) => item.issue_type === 'auth_gate');

  const baseName = `招标网站-url校验-${batchLabel}`;
  const jsonPath = path.join(OUTPUT_DIR, `${baseName}.json`);
  const csvPath = path.join(OUTPUT_DIR, `${baseName}.csv`);

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        started_at: startedAtIso,
        finished_at: new Date().toISOString(),
        offset: args.offset,
        limit: args.limit,
        concurrency: args.concurrency,
        total_in_scope: totalRow?.total || 0,
        processed_count: results.length,
        obvious_problem_count: obviousProblems.length,
        failed_count: failed.length,
        auth_gate_count: authGate.length,
        results,
      },
      null,
      2
    ),
    'utf8'
  );

  writeCsv(csvPath, results, [
    'id',
    'name',
    'source_level',
    'platform_type',
    'url',
    'status',
    'http_status',
    'final_url',
    'redirect_count',
    'auth_required',
    'is_bidding_site',
    'issue_type',
    'severity',
    'obvious_problem',
    'issue_summary',
  ]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        batch: batchLabel,
        offset: args.offset,
        limit: args.limit,
        processedCount: results.length,
        obviousProblemCount: obviousProblems.length,
        failedCount: failed.length,
        authGateCount: authGate.length,
        output: {
          json: jsonPath,
          csv: csvPath,
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
