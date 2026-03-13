const db = require('../server/utils/db');
const biddingSiteModel = require('../server/models/biddingSiteModel');

function buildFriendlySummary(row, payload) {
  const issue = payload?.issue || {};
  const probe = payload?.probe || {};
  const issueType = issue.issue_type || '';
  const httpStatus = row.http_status || probe.status_code || null;
  const rawMessage =
    issue.original_issue_summary ||
    issue.issue_summary ||
    row.validation_summary ||
    probe.error_message ||
    '';

  switch (issueType) {
    case 'http_not_found':
      return `URL 返回 ${httpStatus || '4xx'}，页面不存在或已下线，建议核对最新入口地址`;
    case 'http_server_error':
      return `URL 当前返回 ${httpStatus || '5xx'} 服务端错误，建议稍后复查；若持续失败，建议更换入口地址`;
    case 'timeout':
      return 'URL 请求超时，疑似站点响应过慢或入口失效，建议复查或更换更稳定入口';
    case 'ssl_error':
      return 'URL 存在 SSL/证书握手问题，当前环境无法正常访问，建议检查证书兼容性或改用新域名';
    case 'network_error':
      if (/socket hang up/i.test(rawMessage)) {
        return 'URL 连接被站点中断，疑似旧入口失效或服务异常，建议核对最新地址';
      }
      if (/invalid header token/i.test(rawMessage)) {
        return '站点响应报文异常，当前入口不可稳定访问，建议核对可替换入口';
      }
      return '网络探测失败，疑似入口失效或站点服务异常，建议复查最新地址';
    default:
      if (httpStatus && httpStatus >= 400) {
        return `URL 当前不可直接访问，返回 ${httpStatus}，建议核对最新地址`;
      }
      return 'URL 当前不可直接访问，建议核对最新地址或访问方式';
  }
}

async function main() {
  await db.init();
  await biddingSiteModel.ensureSchema();

  const rows = await db.all(
    `SELECT id, name, url, validation_status, validation_summary, http_status, validation_payload_json
     FROM opportunity_bidding_sites
     WHERE validation_status = 'validated_failed'
     ORDER BY id ASC`
  );

  const updated = [];

  for (const row of rows) {
    let payload = {};
    try {
      payload = row.validation_payload_json ? JSON.parse(row.validation_payload_json) : {};
    } catch (_error) {
      payload = {};
    }

    if (!payload.issue) {
      payload.issue = {};
    }

    const originalSummary = payload.issue.issue_summary || row.validation_summary || '';
    if (!payload.issue.original_issue_summary && originalSummary) {
      payload.issue.original_issue_summary = originalSummary;
    }

    const friendlySummary = buildFriendlySummary(row, payload);
    payload.issue.issue_summary = friendlySummary;

    await db.run(
      `UPDATE opportunity_bidding_sites
         SET validation_status = ?,
             validation_summary = ?,
             validation_payload_json = ?,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        'validated_failed',
        friendlySummary,
        JSON.stringify(payload),
        row.id,
      ]
    );

    updated.push({
      id: row.id,
      name: row.name,
      old_summary: row.validation_summary,
      new_summary: friendlySummary,
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        updatedCount: updated.length,
        samples: updated.slice(0, 12),
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
