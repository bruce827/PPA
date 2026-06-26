const {
  agent,
  cleanupTracked,
  closePostgresTestDb,
  createStandardProject,
  expectOk,
  extractId,
  initPostgresTestDb,
  standardAssessment,
  track,
  uniquePrefix,
} = require('./helpers');

describe('PostgreSQL regression - projects, exports, push and dashboard APIs', () => {
  let prefix;

  beforeAll(async () => {
    await initPostgresTestDb();
    prefix = uniquePrefix('project');
  });

  afterAll(async () => {
    await cleanupTracked();
    await closePostgresTestDb();
  });

  test('calculation endpoint returns deterministic cost breakdown', async () => {
    const res = await agent().post('/api/calculate').send(standardAssessment(prefix));
    expectOk(res);
    expect(res.body.data).toMatchObject({
      total_cost: expect.any(Number),
      software_dev_cost: expect.any(Number),
      total_workload_days: expect.any(Number),
      risk_score: expect.any(Number),
    });
  });

  test('project CRUD, filters and template aliases work in PostgreSQL', async () => {
    const { id: projectId } = await createStandardProject(prefix, {
      tags: ['postgres-regression', prefix],
    });

    const detailRes = await agent().get(`/api/projects/${projectId}`);
    expectOk(detailRes);
    expect(detailRes.body.data.name).toBe(`${prefix}_project`);

    const updateRes = await agent()
      .put(`/api/projects/${projectId}`)
      .send({
        name: `${prefix}_project_updated`,
        description: 'Updated PostgreSQL regression project',
        is_template: 0,
        assessmentData: standardAssessment(`${prefix}_updated`),
        tags: ['updated', prefix],
      });
    expectOk(updateRes);

    expectOk(await agent().get('/api/projects').query({ name: prefix }));
    expectOk(await agent().get('/api/projects').query({ sort_by: 'final_total_cost', sort_order: 'asc' }));

    const templateRes = await agent()
      .post('/api/projects')
      .send({
        name: `${prefix}_template`,
        description: 'Template via projects endpoint',
        is_template: 1,
        assessmentData: standardAssessment(`${prefix}_template`),
      });
    expectOk(templateRes, [200, 201]);
    const templateId = track('projects', extractId(templateRes));

    expectOk(await agent().get('/api/projects/templates'));
    expectOk(await agent().get('/api/templates'));
    expectOk(await agent().get('/api/templates/templates'));
    expectOk(await agent().get(`/api/templates/${templateId}`));

    expectOk(await agent().delete(`/api/projects/${templateId}`));
    expectOk(await agent().delete(`/api/projects/${projectId}`));
  });

  test('business quote, attachment, push and export endpoints work on one project', async () => {
    const { id: projectId } = await createStandardProject(`${prefix}_flow`);

    const businessQuoteContext = await agent().get(`/api/projects/${projectId}/business-quote`);
    expectOk(businessQuoteContext);
    expect(businessQuoteContext.body.data.project_id).toBe(projectId);

    const saveQuoteRes = await agent()
      .post(`/api/projects/${projectId}/business-quote`)
      .send({
        pricing_mode: 'custom_development',
        tax_rate: 6,
        management_rate: 12,
        sales_rate: 12,
        profit_rate: 15,
        remark: 'PostgreSQL regression quote',
      });
    expectOk(saveQuoteRes);
    expect(saveQuoteRes.body.data.project_id).toBe(projectId);

    const checkBeforeUpload = await agent().get(`/api/projects/${projectId}/attachments/check`);
    expectOk(checkBeforeUpload);

    const uploadRes = await agent()
      .post(`/api/projects/${projectId}/attachments/upload`)
      .attach('file', Buffer.from('postgres regression attachment'), {
        filename: `${prefix}.txt`,
        contentType: 'text/plain',
      });
    expectOk(uploadRes);
    const filename = uploadRes.body.data.filename;

    const listRes = await agent().get(`/api/projects/${projectId}/attachments`);
    expectOk(listRes);
    expect(listRes.body.data.some((item) => item.filename === filename)).toBe(true);

    const downloadRes = await agent().get(`/api/projects/${projectId}/attachments/download/${filename}`);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.text || downloadRes.body.toString()).toContain('postgres regression attachment');

    const validatePushRes = await agent()
      .post(`/api/projects/${projectId}/push/validate`)
      .send({ customerBudget: 100 });
    expectOk(validatePushRes);

    const pushRes = await agent().post(`/api/projects/${projectId}/push`).send({ customerBudget: 100 });
    expectOk(pushRes);

    const historyRes = await agent().get(`/api/projects/${projectId}/push-history`);
    expectOk(historyRes);
    expect(Array.isArray(historyRes.body.data)).toBe(true);

    const pdfRes = await agent().get(`/api/projects/${projectId}/export/pdf`);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');

    const excelRes = await agent().get(`/api/projects/${projectId}/export/excel`);
    expect(excelRes.status).toBe(200);
    expect(excelRes.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    expectOk(await agent().delete(`/api/projects/${projectId}/attachments/${filename}`));
  });

  test('dashboard aggregate endpoints work after project writes', async () => {
    const { id } = await createStandardProject(`${prefix}_dashboard`);
    track('projects', id);

    const endpoints = [
      '/api/dashboard/overview',
      '/api/dashboard/trend',
      '/api/dashboard/cost-range',
      '/api/dashboard/keywords',
      '/api/dashboard/dna',
      '/api/dashboard/top-roles',
      '/api/dashboard/top-risks',
    ];

    for (const endpoint of endpoints) {
      const res = await agent().get(endpoint);
      expectOk(res);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    }

    const topRoleAliasRes = await agent().get('/api/dashboard/top-role');
    expectOk(topRoleAliasRes);
    expect(topRoleAliasRes.body.success).toBe(true);
    expect(Array.isArray(topRoleAliasRes.body.data)).toBe(true);
  });
});
