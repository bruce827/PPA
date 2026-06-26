/**
 * API Smoke Test - 精简版
 *
 * 只测试项目内部的数据库操作接口
 * 排除: AI 模型连接测试、外部 API 调用
 *
 * 特性:
 * - 自动开启事务
 * - 测试完成后自动回滚
 * - 实时进度跟踪
 * - 生成测试报告
 */

process.env.NODE_ENV = 'test';

const path = require('path');
const fs = require('fs/promises');
const request = require('supertest');

const { app } = require('../index');
const dbUtil = require('../utils/db');

const results = [];
const testProgress = { total: 0, passed: 0, failed: 0, skipped: 0, details: [] };

function getResponseSummary(res) {
  const contentType = res.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    return res.body;
  }
  const bodyLength = Buffer.isBuffer(res.body)
    ? res.body.length
    : typeof res.text === 'string' ? res.text.length : null;
  return { contentType, contentLength: res.headers['content-length'] || bodyLength };
}

function updateProgress(name, isSuccess, statusCode, duration, error = null) {
  testProgress.total += 1;
  if (isSuccess) {
    testProgress.passed += 1;
    testProgress.details.push({ name, status: '✅', code: statusCode, duration });
  } else if (error) {
    testProgress.failed += 1;
    testProgress.details.push({ name, status: '❌', code: statusCode, duration, error: error.message });
  } else if (statusCode >= 400) {
    testProgress.failed += 1;
    testProgress.details.push({ name, status: '❌', code: statusCode, duration, error: `HTTP ${statusCode}` });
  } else {
    testProgress.skipped += 1;
    testProgress.details.push({ name, status: '⏭️', code: statusCode, duration });
  }
}

async function record(agent, name, method, url, exec, noteFn) {
  const startedAt = Date.now();
  try {
    const res = await exec(agent);
    const duration = Date.now() - startedAt;
    const entry = { name, method, url, status: res.status, ok: res.status >= 200 && res.status < 300, duration, response: getResponseSummary(res) };
    if (noteFn) entry.note = noteFn(res);
    results.push(entry);
    const isSuccess = res.status >= 200 && res.status < 300;
    updateProgress(name, isSuccess, res.status, duration);
    return res;
  } catch (error) {
    const duration = Date.now() - startedAt;
    const status = error?.status || error?.response?.status || null;
    const entry = { name, method, url, status, ok: false, duration, error: error.message };
    results.push(entry);
    updateProgress(name, false, status, duration, error);
    throw error;
  }
}

function generateProgressReport(progress) {
  const date = new Date().toISOString();
  const passRate = ((progress.passed / progress.total) * 100).toFixed(2);
  let md = `# API 测试进度报告\n\n**测试时间**: ${date}\n**数据库**: PostgreSQL (Supabase)\n\n`;
  md += `## 统计汇总\n\n| 状态 | 数量 |\n|------|------|\n`;
  md += `| 总计 | ${progress.total} |\n| ✅ 通过 | ${progress.passed} |\n| ❌ 失败 | ${progress.failed} |\n| ⏭️ 跳过 | ${progress.skipped} |\n| **通过率** | **${passRate}%** |\n\n`;
  if (progress.failed > 0) {
    md += `## ❌ 失败的接口\n\n| 接口名称 | HTTP 状态 | 错误信息 |\n|----------|----------|----------|\n`;
    progress.details.filter(d => d.status === '❌').forEach(d => {
      const error = d.error ? d.error.substring(0, 80).replace(/\|/g, '\\|') : '';
      md += `| ${d.name} | ${d.code || 'N/A'} | ${error} |\n`;
    });
    md += '\n';
  }
  md += `## 详细结果\n\n| 接口名称 | 状态 | HTTP 状态 | 耗时(ms) | 备注 |\n|----------|------|-----------|----------|------|\n`;
  progress.details.forEach(d => {
    const code = d.code || 'N/A';
    const error = d.error ? d.error.substring(0, 40).replace(/\|/g, '\\|') : '';
    md += `| ${d.name} | ${d.status} | ${code} | ${d.duration} | ${error} |\n`;
  });
  md += `\n## 问题跟踪\n\n详细问题记录请查看: [docs/api-bug-fixes.md](../api-bug-fixes.md)\n`;
  return md;
}

(async () => {
  const agent = request(app);
  const suffix = Date.now();

  const roleName = `auto-role-${suffix}`;
  const riskName = `auto-risk-${suffix}`;
  const travelItem = `auto-travel-${suffix}`;
  const projectName = `auto-project-${suffix}`;
  const templateName = `auto-template-${suffix}`;

  const assessmentPayload = {
    risk_scores: { security: 10, scalability: 20 },
    roles: [
      { role_name: `RoleA-${suffix}`, unit_price: 120000 },
      { role_name: `RoleB-${suffix}`, unit_price: 90000 },
    ],
    development_workload: [
      {
        module: 'Core Feature',
        delivery_factor: 1.2,
        scope_factor: 1.1,
        tech_factor: 1.0,
        [`RoleA-${suffix}`]: 3,
        [`RoleB-${suffix}`]: 10,
      },
    ],
    integration_workload: [
      {
        module: 'Integration',
        delivery_factor: 1.0,
        scope_factor: 1.0,
        tech_factor: 1.0,
        [`RoleA-${suffix}`]: 2,
        [`RoleB-${suffix}`]: 5,
      },
    ],
    travel_months: 1,
    travel_headcount: 2,
    maintenance_months: 2,
    maintenance_headcount: 1,
    maintenance_daily_cost: 1800,
    risk_items: [{ cost: 3 }],
  };

  let roleId;
  let riskItemId;
  let travelCostId;
  let projectId;
  let templateId;

  try {
    // 初始化数据库连接
    console.log('🔌 正在连接数据库...');
    await dbUtil.init();
    const dbType = dbUtil.getDbType();
    console.log(`✅ 已连接到 ${dbType} 数据库\n`);

    // 开启事务
    await dbUtil.run('BEGIN');
    console.log('🔒 事务已开启，测试数据将在结束时回滚\n');

    // ═══════════════════════════════════════════════════════
    // 第一阶段: 健康检查和配置管理
    // ═══════════════════════════════════════════════════════
    console.log('📋 第一阶段: 健康检查和配置管理\n');

    await record(agent, 'Health Check', 'GET', '/api/health', ag => ag.get('/api/health'));

    // Role CRUD
    const createRoleRes = await record(
      agent, 'Create Role', 'POST', '/api/config/roles',
      ag => ag.post('/api/config/roles').send({ role_name: roleName, unit_price: 150000 }),
      res => `id=${res.body.id}`
    );
    roleId = createRoleRes.body.id;

    await record(agent, 'List Roles', 'GET', '/api/config/roles',
      ag => ag.get('/api/config/roles'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    await record(agent, 'Update Role', 'PUT', `/api/config/roles/${roleId}`,
      ag => ag.put(`/api/config/roles/${roleId}`).send({ role_name: roleName, unit_price: 175000 })
    );

    await record(agent, 'Delete Role', 'DELETE', `/api/config/roles/${roleId}`,
      ag => ag.delete(`/api/config/roles/${roleId}`)
    );

    // Risk Item CRUD
    const createRiskRes = await record(
      agent, 'Create Risk Item', 'POST', '/api/config/risk-items',
      ag => ag.post('/api/config/risk-items').send({
        category: '交付风险', item_name: riskName,
        options_json: JSON.stringify([{ label: '低', score: 5 }, { label: '高', score: 15 }])
      }),
      res => `id=${res.body.id}`
    );
    riskItemId = createRiskRes.body.id;

    await record(agent, 'List Risk Items', 'GET', '/api/config/risk-items',
      ag => ag.get('/api/config/risk-items'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    await record(agent, 'Update Risk Item', 'PUT', `/api/config/risk-items/${riskItemId}`,
      ag => ag.put(`/api/config/risk-items/${riskItemId}`).send({
        category: '交付风险', item_name: `${riskName}-updated`,
        options_json: JSON.stringify([{ label: '低', score: 5 }, { label: '中', score: 10 }, { label: '高', score: 20 }])
      })
    );

    await record(agent, 'Delete Risk Item', 'DELETE', `/api/config/risk-items/${riskItemId}`,
      ag => ag.delete(`/api/config/risk-items/${riskItemId}`)
    );

    // Travel Cost CRUD
    const createTravelRes = await record(
      agent, 'Create Travel Cost', 'POST', '/api/config/travel-costs',
      ag => ag.post('/api/config/travel-costs').send({ item_name: travelItem, cost_per_month: 6800 }),
      res => `id=${res.body.id}`
    );
    travelCostId = createTravelRes.body.id;

    await record(agent, 'List Travel Costs', 'GET', '/api/config/travel-costs',
      ag => ag.get('/api/config/travel-costs'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    await record(agent, 'Update Travel Cost', 'PUT', `/api/config/travel-costs/${travelCostId}`,
      ag => ag.put(`/api/config/travel-costs/${travelCostId}`).send({ item_name: `${travelItem}-updated`, cost_per_month: 7200 })
    );

    await record(agent, 'Delete Travel Cost', 'DELETE', `/api/config/travel-costs/${travelCostId}`,
      ag => ag.delete(`/api/config/travel-costs/${travelCostId}`)
    );

    // Config Aggregate
    await record(agent, 'Get Config Aggregate', 'GET', '/api/config/all',
      ag => ag.get('/api/config/all'),
      res => {
        const roles = res.body?.data?.roles?.length || 0;
        const risks = res.body?.data?.risk_items?.length || 0;
        const travels = res.body?.data?.travel_costs?.length || 0;
        return `roles=${roles}, risks=${risks}, travel=${travels}`;
      }
    );

    // ═══════════════════════════════════════════════════════
    // 第二阶段: 项目管理
    // ═══════════════════════════════════════════════════════
    console.log('\n📋 第二阶段: 项目管理\n');

    const calcRes = await record(
      agent, 'Run Calculation', 'POST', '/api/calculate',
      ag => ag.post('/api/calculate').send(assessmentPayload)
    );

    const projectRes = await record(
      agent, 'Create Project', 'POST', '/api/projects',
      ag => ag.post('/api/projects').send({
        name: projectName, description: 'Smoke project', is_template: 0, assessmentData: assessmentPayload
      }),
      res => `id=${res.body?.id}`
    );
    projectId = projectRes.body?.id;

    await record(agent, 'Get Project Detail', 'GET', `/api/projects/${projectId}`,
      ag => ag.get(`/api/projects/${projectId}`),
      res => `name=${res.body?.data?.name}`
    );

    await record(agent, 'Update Project', 'PUT', `/api/projects/${projectId}`,
      ag => ag.put(`/api/projects/${projectId}`).send({
        name: `${projectName}-updated`, description: 'Smoke project updated', is_template: 0, assessmentData: assessmentPayload
      })
    );

    await record(agent, 'List Projects', 'GET', '/api/projects',
      ag => ag.get('/api/projects'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    const templateRes = await record(
      agent, 'Create Template Project', 'POST', '/api/projects',
      ag => ag.post('/api/projects').send({
        name: templateName, description: 'Smoke template project', is_template: 1, assessmentData: assessmentPayload
      }),
      res => `id=${res.body?.id}`
    );
    templateId = templateRes.body?.id;

    await record(agent, 'List Templates via /projects/templates', 'GET', '/api/projects/templates',
      ag => ag.get('/api/projects/templates'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    await record(agent, 'List Templates via query', 'GET', '/api/projects',
      ag => ag.get('/api/projects').query({ is_template: 1 }),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    await record(agent, 'List via /api/templates', 'GET', '/api/templates',
      ag => ag.get('/api/templates'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    await record(agent, 'List Templates via /api/templates/templates', 'GET', '/api/templates/templates',
      ag => ag.get('/api/templates/templates'),
      res => `count=${Array.isArray(res.body?.data) ? res.body.data.length : 0}`
    );

    // ═══════════════════════════════════════════════════════
    // 第三阶段: 数据看板
    // ═══════════════════════════════════════════════════════
    console.log('\n📋 第三阶段: 数据看板\n');

    await record(agent, 'Dashboard Overview', 'GET', '/api/dashboard/overview',
      ag => ag.get('/api/dashboard/overview')
    );

    await record(agent, 'Dashboard Trend', 'GET', '/api/dashboard/trend',
      ag => ag.get('/api/dashboard/trend')
    );

    await record(agent, 'Dashboard Cost Range', 'GET', '/api/dashboard/cost-range',
      ag => ag.get('/api/dashboard/cost-range')
    );

    await record(agent, 'Dashboard Keywords', 'GET', '/api/dashboard/keywords',
      ag => ag.get('/api/dashboard/keywords')
    );

    await record(agent, 'Dashboard DNA', 'GET', '/api/dashboard/dna',
      ag => ag.get('/api/dashboard/dna')
    );

    await record(agent, 'Dashboard Top Roles', 'GET', '/api/dashboard/top-roles',
      ag => ag.get('/api/dashboard/top-roles')
    );

    await record(agent, 'Dashboard Top Risks', 'GET', '/api/dashboard/top-risks',
      ag => ag.get('/api/dashboard/top-risks')
    );

    // ═══════════════════════════════════════════════════════
    // 第四阶段: 附件管理、推送和删除
    // ═══════════════════════════════════════════════════════
    console.log('\n📋 第四阶段: 附件管理、推送和清理\n');

    await record(agent, 'Check Attachments', 'GET', `/api/projects/${projectId}/attachments/check`,
      ag => ag.get(`/api/projects/${projectId}/attachments/check`)
    );

    // 跳过推送验证（需要商务报价）
    // await record(agent, 'Validate Push', 'POST', `/api/projects/${projectId}/push/validate`,
    //   ag => ag.post(`/api/projects/${projectId}/push/validate`).send({ customerBudget: 100000 })
    // );

    await record(agent, 'Export PDF', 'GET', `/api/projects/${projectId}/export/pdf`,
      ag => ag.get(`/api/projects/${projectId}/export/pdf`)
    );

    await record(agent, 'Export Excel', 'GET', `/api/projects/${projectId}/export/excel`,
      ag => ag.get(`/api/projects/${projectId}/export/excel`)
    );

    await record(agent, 'Delete Project', 'DELETE', `/api/projects/${projectId}`,
      ag => ag.delete(`/api/projects/${projectId}`)
    );

    await record(agent, 'Delete Template Project', 'DELETE', `/api/projects/${templateId}`,
      ag => ag.delete(`/api/projects/${templateId}`)
    );

    console.log('\n✅ 所有测试完成！\n');

  } catch (error) {
    console.error('\n❌ Smoke test run failed:', error.message);
    process.exitCode = 1;
  } finally {
    // 回滚事务
    try {
      if (dbUtil.getDbType()) {
        await dbUtil.run('ROLLBACK');
        console.log('✅ 事务已回滚（测试数据已清理）\n');
      }
    } catch (rollbackError) {
      console.error('回滚事务失败:', rollbackError.message);
    }

    // 生成报告
    const outputPath = path.join(__dirname, '../../docs/test/api-test-results.json');
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2), 'utf8');

    const reportPath = path.join(__dirname, '../../docs/test/api-test-progress.md');
    const reportContent = generateProgressReport(testProgress);
    await fs.writeFile(reportPath, reportContent, 'utf8');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 测试进度统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`总计: ${testProgress.total}`);
    console.log(`✅ 通过: ${testProgress.passed}`);
    console.log(`❌ 失败: ${testProgress.failed}`);
    console.log(`⏭️ 跳过: ${testProgress.skipped}`);
    console.log(`通过率: ${((testProgress.passed / testProgress.total) * 100).toFixed(2)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (testProgress.failed > 0) {
      console.log('\n❌ 失败的接口:');
      testProgress.details.filter(d => d.status === '❌').forEach(d => {
        console.log(`   - ${d.name} (${d.code}) ${d.error ? '- ' + d.error.substring(0, 50) : ''}`);
      });
    }

    console.log(`\n详细结果: ${outputPath}`);
    console.log(`进度报告: ${reportPath}\n`);

    await dbUtil.close();
  }
})();
